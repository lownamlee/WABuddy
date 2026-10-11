"""Loopback web app. Pairing codes and credentials never enter the static build."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import secrets
import threading
import time
import re
from typing import Literal
from urllib.parse import urlsplit, quote

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field

from . import __version__
from .pairing import AlreadyLinked, PairingService
from .accounts import AccountRegistry
from .workspace import WorkspaceStore, ReportData, RevisionConflict, build_report
from .agent_runtime import AgentRuntime
from .agent_provider import Providers, APIWorkers
from .agent_routes import register_agent_routes
from .whatsapp_control import register_control_routes
from .browser_sessions import BrowserSessions, LIFETIME
import base64

ROOT = Path(__file__).resolve().parents[2]
COOKIE = "wabuddy_session"


class SendText(BaseModel):
    expected_account: str = Field(default='', max_length=160)
    request_id: str = Field(min_length=16, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    chat: str = Field(min_length=3, max_length=160, pattern=r'^[0-9:-]+@(s\.whatsapp\.net|lid|g\.us)$')
    text: str = Field(min_length=1, max_length=10000)
    reply_to: str = Field(default='', max_length=200)


class MessageAction(BaseModel):
    expected_account: str = Field(default='', max_length=160)
    request_id: str = Field(min_length=16,max_length=100,pattern=r'^[A-Za-z0-9_-]+$')
    chat: str = Field(max_length=160,pattern=r'^[0-9:-]+@(s\.whatsapp\.net|lid|g\.us)$')
    message_id: str = Field(min_length=1,max_length=200)
    operation: Literal['edit','revoke','react','read']
    text: str = Field(default='',max_length=10000)


class RichMessage(BaseModel):
    expected_account: str = Field(default='', max_length=160)
    request_id: str = Field(min_length=16,max_length=100,pattern=r'^[A-Za-z0-9_-]+$')
    chat: str = Field(max_length=160,pattern=r'^[0-9:-]+@(s\.whatsapp\.net|lid|g\.us)$')
    kind: Literal['image','video','audio','document','sticker','contact','poll','event']
    media_id: str = Field(default='',max_length=100,pattern=r'^[a-f0-9]*$')
    caption: str = Field(default='',max_length=1024)
    name: str = Field(default='',max_length=255)
    phone: str = Field(default='',max_length=25,pattern=r'^\+?[0-9]*$')
    options: list[str] = Field(default_factory=list,max_length=12)
    multiple: bool = False
    voice: bool = False
    start: int = Field(default=0,ge=0)
    end: int = Field(default=0,ge=0)
    description: str = Field(default='',max_length=2048)
    location: str = Field(default='',max_length=255)
    reply_to: str = Field(default='',max_length=200)


class AddAccount(BaseModel):
    label: str = Field(default='Personal', max_length=60)
    mode: Literal['standard', 'business'] = 'standard'


class SelectAccount(BaseModel):
    account_id: str = Field(max_length=30)


class SaveWorkspace(BaseModel):
    expected_revision: int = Field(ge=0)
    state: dict


class ExportReport(BaseModel):
    report: ReportData


def create_app(service: PairingService | None = None, build_dir: Path | None = None) -> FastAPI:
    service = service or PairingService(ROOT / ".local")
    registry = AccountRegistry(service)
    workspace = WorkspaceStore(service.data_dir / 'workspace.sqlite3')
    agent_runtime = AgentRuntime(registry)
    providers = Providers(agent_runtime.store.root)
    api_workers = APIWorkers(agent_runtime, providers)
    build_dir = build_dir or ROOT / "frontend" / "dist"
    sessions = BrowserSessions(service.data_dir)
    sessions_lock = threading.Lock()

    @asynccontextmanager
    async def lifespan(_app):
        registry.open()
        agent_runtime.start()
        api_workers.start()
        try:
            yield
        finally:
            api_workers.close()
            agent_runtime.close()
            registry.close()

    app = FastAPI(title="WABuddy", version=__version__, lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)
    app.state.pairing = service
    app.state.accounts = registry
    app.state.agent_runtime = agent_runtime
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]", "wabuddy.my"])

    def local_operator(request):
        return (request.url.hostname in {'localhost','127.0.0.1','::1'}
                and not any(request.headers.get(h) for h in ('cf-connecting-ip','x-forwarded-host','forwarded')))

    def check_origin(request: Request):
        if request.headers.get("sec-fetch-site") == "cross-site":
            raise HTTPException(403, "Cross-site requests are not allowed.")
        origin = request.headers.get("origin")
        if origin:
            parsed = urlsplit(origin)
            own = f"{request.url.scheme}://{request.url.netloc}"
            dev = {"http://127.0.0.1:5173", "http://localhost:5173"}
            if origin != own and origin not in dev:
                raise HTTPException(403, "Origin is not allowed.")
            if origin != 'https://wabuddy.my' and (parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}):
                raise HTTPException(403, "Only the local app may access pairing.")

    def authenticate(request: Request, mutation: bool = False):
        check_origin(request)
        with sessions_lock:
            entry = sessions.get(request.cookies.get(COOKIE, ""))
        if not entry:
            raise HTTPException(401, "Open WABuddy to start a browser session.")
        if entry[3] == 'local' and not local_operator(request):
            raise HTTPException(403, 'This session is only available on the host computer.')
        if mutation and not secrets.compare_digest(request.headers.get("x-csrf-token", ""), entry[0]):
            raise HTTPException(403, "Invalid browser request token.")
        return entry

    def require_operator(request):
        if authenticate(request)[3] != 'local' or not local_operator(request):
            raise HTTPException(403, 'This setting is managed on the host computer.')

    def selected_service(request: Request, mutation: bool = False):
        entry = authenticate(request, mutation)
        if not registry.allowed(entry[2],entry[3]):
            raise HTTPException(403,'This account belongs to another browser workspace.')
        expected = request.headers.get('x-wabuddy-account') or request.query_params.get('account')
        if (expected and expected != entry[2]) or (not expected and len(registry.entries) > 1):
            raise HTTPException(409, 'The active account changed. Reload WABuddy before continuing.')
        return registry.get(entry[2])

    @app.middleware("http")
    async def headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, max-age=0"
        return response

    @app.get("/healthz")
    def health():
        return {"service": "wabuddy", "version": __version__, "ok": True}

    @app.get("/api/bootstrap")
    def bootstrap(request: Request, account: str | None = None):
        check_origin(request)
        if not local_operator(request) and request.url.scheme != 'https':
            raise HTTPException(403,'Open https://wabuddy.my to link your account.')
        now = time.time()
        session_id = request.cookies.get(COOKIE, "")
        with sessions_lock:
            entry = sessions.get(session_id)
            if entry is None:
                if local_operator(request):
                    slot = account or registry.selected
                    if not registry.allowed(slot,'local'):
                        raise HTTPException(404,'Account not found.')
                    owner = 'local'
                else:
                    if account is not None:
                        raise HTTPException(403,'This browser has no session for that account. Open the homepage to pair your own WhatsApp.')
                    owner = secrets.token_hex(24)
                    try:
                        slot = registry.add('My WhatsApp','standard',owner)
                    except ValueError as exc:
                        raise HTTPException(429,str(exc)) from None
                session_id, entry = sessions.create(slot,owner)
            elif entry[3]=='local' and not local_operator(request):
                raise HTTPException(403,'This session is only available on the host computer.')
            entry = (entry[0],now+LIFETIME,entry[2],entry[3])
            sessions.save(session_id,entry)
        response = JSONResponse({"csrf_token": entry[0], "account_id": entry[2], "mode": registry.entries[entry[2]]["mode"], 'operator':entry[3]=='local'})
        response.set_cookie(COOKIE, session_id, httponly=True, secure=request.url.scheme=='https', samesite="strict", max_age=LIFETIME, path="/")
        return response

    @app.get('/api/accounts')
    def accounts(request: Request):
        entry = authenticate(request)
        return registry.listing(entry[2],entry[3])

    def switch_account(request: Request, slot: str):
        selected_service(request, mutation=True)
        owner = authenticate(request)[3]
        if not registry.allowed(slot,owner):
            raise HTTPException(404,'Account not found in this browser workspace.')
        try:
            if owner=='local': registry.select(slot)
            else: registry.get(slot)
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from None
        with sessions_lock:
            cookie = request.cookies[COOKIE]
            entry = sessions.get(cookie)
            sessions.save(cookie,(entry[0], entry[1], slot,entry[3]))
        return {'account_id': slot}

    @app.post('/api/accounts')
    def add_account(request: Request, body: AddAccount):
        selected_service(request, mutation=True)
        owner = authenticate(request)[3]
        try:
            slot = registry.add(body.label, body.mode,owner)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from None
        if owner=='local': registry.select(slot)
        else: registry.get(slot)
        with sessions_lock:
            cookie = request.cookies[COOKIE]
            entry = sessions.get(cookie)
            sessions.save(cookie,(entry[0], entry[1], slot,entry[3]))
        return {'account_id': slot}

    @app.post('/api/accounts/select')
    def select_account(request: Request, body: SelectAccount):
        return switch_account(request, body.account_id)

    @app.get("/api/whatsapp/state")
    def state(request: Request):
        service = selected_service(request)
        return service.snapshot()

    def connect(request: Request, regenerate: bool):
        service = selected_service(request, mutation=True)
        try:
            return service.connect(regenerate=regenerate)
        except AlreadyLinked:
            raise HTTPException(409, "WhatsApp is already linked or completing pairing.") from None

    @app.post("/api/whatsapp/connect")
    def start(request: Request):
        return connect(request, False)

    @app.post("/api/whatsapp/regenerate")
    def regenerate(request: Request):
        return connect(request, True)

    @app.get('/api/whatsapp/chats')
    def chats(request: Request):
        service = selected_service(request)
        return {**service.chats.snapshot(), 'connection':service.snapshot()['status']}

    @app.post('/api/whatsapp/messages')
    def send_message(request: Request, body: SendText):
        service = selected_service(request, mutation=True)
        if not body.text.strip():
            raise HTTPException(422,'Enter a message.')
        try:
            return service.send_text(body.request_id,body.chat,body.text,body.reply_to,body.expected_account)
        except ValueError as exc:
            raise HTTPException(400,str(exc)) from None
        except RuntimeError as exc:
            raise HTTPException(409,str(exc)) from None

    @app.get('/api/whatsapp/avatar')
    def avatar(request: Request, chat: str):
        service = selected_service(request)
        data=service.chats.photo(chat)
        if not data:
            raise HTTPException(404,'Profile picture unavailable.')
        return Response(data,media_type='image/jpeg')

    @app.post('/api/whatsapp/uploads')
    async def upload(request: Request, kind: Literal['image','video','audio','document','sticker'], name: str = 'attachment'):
        from .media import MediaStore, MAX_MEDIA
        service = selected_service(request, mutation=True)
        if service.snapshot()['status'] != 'connected':
            raise HTTPException(409,'Wait for WhatsApp to reconnect.')
        buffer=bytearray()
        async for chunk in request.stream():
            if len(buffer)+len(chunk)>MAX_MEDIA: raise HTTPException(413,'Maximum attachment size is 64 MB.')
            buffer.extend(chunk)
        try:
            return MediaStore(service.chats).upload(kind,name,bytes(buffer))
        except (ValueError,OSError) as exc:
            raise HTTPException(422,str(exc)) from None

    @app.post('/api/whatsapp/rich-messages')
    def send_rich(request: Request, body: RichMessage):
        service = selected_service(request, mutation=True)
        if body.kind in ('contact','poll','event') and not body.name.strip(): raise HTTPException(422,'Enter a name or question.')
        if body.kind=='contact' and (len(body.phone.lstrip('+'))<7 or '\n' in body.name or '\r' in body.name): raise HTTPException(422,'Enter a valid contact name and phone number.')
        if body.kind=='poll' and (not 2<=len(body.options)<=12 or any(not o.strip() or len(o)>100 for o in body.options) or len({o.strip().casefold() for o in body.options})!=len(body.options)): raise HTTPException(422,'Enter 2–12 different poll options, up to 100 characters each.')
        if body.kind=='event' and (body.start<time.time() or body.end and body.end<=body.start): raise HTTPException(422,'Choose a future start and a later end time.')
        try:
            return service.send_rich(body.model_dump())
        except ValueError as exc: raise HTTPException(400,str(exc)) from None
        except RuntimeError as exc: raise HTTPException(409,str(exc)) from None

    @app.get('/api/whatsapp/media/{media_id}')
    def attachment(request: Request, media_id: str, download: bool = False):
        from .media import MediaStore
        service = selected_service(request)
        try:
            media=MediaStore(service.chats)
            row=media.get(media_id)
            if row['data'] is None:
                service.download_media(media_id)
                row=media.get(media_id)
            inline=row['mime'] in ('image/jpeg','image/png','image/webp','image/gif') or row['mime'].startswith(('audio/','video/'))
            disposition='attachment' if download or not inline else 'inline'
            data=row['data']; size=len(data)
            headers={'Content-Disposition':disposition+"; filename*=UTF-8''"+quote(row['name']),'Accept-Ranges':'bytes','Cache-Control':'private, no-store'}
            status=200
            if request.headers.get('range'):
                match=re.fullmatch(r'bytes=(\d*)-(\d*)',request.headers['range'])
                if not match or not any(match.groups()): return Response(status_code=416,headers={'Content-Range':f'bytes */{size}'})
                start=int(match[1]) if match[1] else max(0,size-int(match[2]))
                end=min(size-1,int(match[2])) if match[1] and match[2] else size-1
                if start>end or start>=size: return Response(status_code=416,headers={'Content-Range':f'bytes */{size}'})
                headers['Content-Range']=f'bytes {start}-{end}/{size}';data=data[start:end+1];status=206
            return Response(data,status_code=status,media_type=row['mime'] if inline else 'application/octet-stream',headers=headers)
        except ValueError as exc: raise HTTPException(404,str(exc)) from None
        except RuntimeError as exc: raise HTTPException(409,str(exc)) from None

    @app.post('/api/whatsapp/message-action')
    def message_action(request: Request, body: MessageAction):
        service = selected_service(request, mutation=True)
        if body.operation=='edit' and not body.text.strip():
            raise HTTPException(422,'Enter a message.')
        if body.operation=='react' and body.text not in ('','👍','❤️','😂','😮','😢','🙏','😀','😃','😄','😁','😊','🥰','😍','😎','🤩','🥳','🤣','😉','🙂','🙃','😌','😘','🤔','🫡','😅','😴','👋','🙌','👏','🤝','💪','💚','✨','🔥','🎉','🌿','☀️','🌈','☕','🍕','🎈','📚','💻','🚀'):
            raise HTTPException(422,'Choose a supported reaction.')
        try:
            return service.message_action(body.request_id,body.chat,body.message_id,body.operation,body.text,body.expected_account)
        except ValueError as exc:
            raise HTTPException(400,str(exc)) from None
        except RuntimeError as exc:
            raise HTTPException(409,str(exc)) from None

    @app.post('/api/whatsapp/logout')
    def logout(request: Request):
        service = selected_service(request, mutation=True)
        try:
            return service.logout()
        except RuntimeError as exc:
            raise HTTPException(409,str(exc)) from None

    @app.get("/api/whatsapp/qr/{version}.png")
    def qr(request: Request, version: str):
        service = selected_service(request)
        png = service.qr_image(version)
        if png is None:
            raise HTTPException(410, "This pairing QR has expired or been replaced.")
        return Response(png, media_type="image/png")

    @app.post("/api/shutdown")
    def shutdown(request: Request):
        require_operator(request)
        authenticate(request, mutation=True)
        callback = getattr(app.state, "request_shutdown", None)
        if callback is None:
            raise HTTPException(409, "Use the process supervisor to stop this server.")
        callback()
        return {"stopping": True}

    @app.get('/api/workspace')
    def get_workspace(request: Request):
        selected_service(request)
        return workspace.get(authenticate(request)[2])

    @app.post('/api/workspace')
    def save_workspace(request: Request, body: SaveWorkspace):
        selected_service(request, mutation=True)
        try:
            return workspace.save(authenticate(request)[2], body.expected_revision, body.state)
        except RevisionConflict as exc:
            raise HTTPException(409, str(exc)) from None
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @app.post('/api/workspace/report')
    def export_workspace_report(request: Request, body: ExportReport):
        selected_service(request, mutation=True)
        try:
            content = build_report(body.report)
            return {'content_base64': base64.b64encode(content).decode('ascii'), 'mode': 'preview', 'verified': True}
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    register_agent_routes(app, agent_runtime, providers, selected_service, authenticate, require_operator)
    register_control_routes(app, selected_service)

    if (build_dir / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=build_dir / "assets"), name="assets")

    @app.get("/")
    @app.get("/phone-animation.html")
    def index():
        entry = build_dir / "phone-animation.html"
        if not entry.is_file():
            return Response("Frontend has not been built. Run npm run build.", status_code=503)
        return FileResponse(entry, headers={"Cache-Control": "no-cache"})

    return app
