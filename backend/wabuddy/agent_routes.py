"""Prompt-first HTTP surface shared by the website and MCP bridge."""
from typing import Literal
from io import BytesIO
import re
import segno
from .usage_limits import UsageLimit
from fastapi import HTTPException, Request, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field


class GoalRequest(BaseModel):
    prompt: str = Field(min_length=1,max_length=4000)
    request_id: str = Field(min_length=16,max_length=100,pattern=r'^[A-Za-z0-9_-]+$')
    followup_of: str | None = Field(default=None,max_length=100)
    replace_schedule: str | None = Field(default=None,max_length=100)


class CompletionRequest(BaseModel):
    lease: str = Field(min_length=32,max_length=32)
    result: dict


class FailureRequest(BaseModel):
    lease: str = Field(min_length=32,max_length=32)
    error: str = Field(min_length=1,max_length=1000)


class LeaseRequest(BaseModel):
    lease: str = Field(min_length=32,max_length=32)


class ControlRequest(BaseModel):
    action: Literal['cancel','retry']


class AnswerRequest(BaseModel):
    answer: str = Field(min_length=1,max_length=10000)
    remember: bool = True
    scope: Literal['customer','business'] = 'customer'


class Provider(BaseModel):
    base_url: str = Field(max_length=2000)
    model: str = Field(max_length=200)
    api_key: str | None = Field(default=None,max_length=4000)


class ProviderRequest(BaseModel):
    enabled: bool = False
    engine: Literal['api','codex'] | None = None
    text: Provider | None = None
    vision: Provider | None = None


class ScheduleControl(BaseModel):
    enabled: bool


class ExecutionRequest(BaseModel):
    engine: Literal['api','codex']
    enabled: bool


class DemoScopeRequest(BaseModel):
    conversation_ids: list[str] = Field(min_length=1,max_length=5)


def register_agent_routes(app, runtime, providers, selected_service, authenticate, require_operator):
    def account(request, mutation=False):
        selected_service(request,mutation=mutation)
        return authenticate(request)[2]

    def invoke(fn,*args):
        try:
            return fn(*args)
        except UsageLimit as exc:
            raise HTTPException(429,str(exc),headers={'Retry-After':'600'}) from None
        except ValueError as exc:
            # Pydantic errors may contain full model inputs. Do not reflect those.
            from pydantic import ValidationError
            if isinstance(exc,ValidationError):
                raise HTTPException(422,'Agent output does not match the job result schema.') from None
            raise HTTPException(422,str(exc)) from None
        except RuntimeError as exc:
            raise HTTPException(409,str(exc)) from None

    @app.get('/api/agent/context')
    def context(request: Request):
        slot=account(request)
        value=invoke(runtime.context,slot)
        value['ai_capacity']=runtime.budget.capacity(runtime.identity(slot)[1])
        return value

    @app.get('/api/agent/capabilities')
    def capabilities(request: Request):
        account(request)
        return {'mode':'live','execution':['mcp','openai_compatible_api','local_codex_chatgpt'],
            'providers':providers.public(),'parallel_workers':3,
            'live_history':True,'verified_excel':True,'live_spreadsheet':True,'short_commands':['orders','learn','phishing','stop'],
            'parallel_analysis':'Text and image order specialists when both types are present',
            'event_monitoring':True,
            'owner_memory':True,'phishing_filter':'local_review_queue',
            'automatic_sending':False,'full_whatsapp_history_guaranteed':False,
            'audio_transcription':False,'video_analysis':False}

    @app.get('/api/agent/sheet')
    def sheet(request: Request, offset: int=Query(0,ge=0), limit: int=Query(100,ge=1,le=100),
              query: str=Query('',max_length=200), status: str='all'):
        return invoke(runtime.sheet,account(request),offset,limit,query,status)

    @app.post('/api/agent/demo-scope')
    def demo_scope(request: Request, body: DemoScopeRequest):
        return invoke(runtime.set_demo_scope,account(request,True),body.conversation_ids)

    @app.post('/api/agent/goals')
    def submit(request: Request, body: GoalRequest):
        return invoke(runtime.submit,account(request,True),body.prompt,body.request_id,body.followup_of,body.replace_schedule)

    @app.get('/api/agent/runs/{run_id}')
    def run(request: Request, run_id: str):
        return invoke(runtime.run,account(request),run_id)

    @app.post('/api/agent/runs/{run_id}/control')
    def control(request: Request, run_id: str, body: ControlRequest):
        return invoke(runtime.control,account(request,True),run_id,body.action)

    @app.post('/api/agent/jobs/claim')
    def claim(request: Request):
        require_operator(request)
        return {'job':invoke(runtime.claim,account(request,True))}

    @app.post('/api/agent/jobs/{job_id}/complete')
    def complete(request: Request, job_id: str, body: CompletionRequest):
        require_operator(request)
        return invoke(runtime.complete,account(request,True),job_id,body.lease,body.result)

    @app.post('/api/agent/jobs/{job_id}/fail')
    def fail(request: Request, job_id: str, body: FailureRequest):
        require_operator(request)
        invoke(runtime.fail,account(request,True),job_id,body.lease,body.error)
        return {'ok':True}

    @app.post('/api/agent/jobs/{job_id}/images/{message_id}')
    def image(request: Request, job_id: str, message_id: str, body: LeaseRequest):
        require_operator(request)
        # A lease travels in the request body, never URL/access logs.
        content=invoke(runtime.image,account(request,True),job_id,body.lease,message_id)
        return Response(content,media_type='image/jpeg')

    @app.get('/api/agent/artifacts/{artifact_id}')
    def artifact(request: Request, artifact_id: str):
        target=invoke(runtime.artifact,account(request),artifact_id)
        return FileResponse(target,filename='WhatsApp orders.xlsx',media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    @app.post('/api/agent/attention/{attention_id}/answer')
    def answer(request: Request, attention_id: str, body: AnswerRequest):
        return invoke(runtime.answer,account(request,True),attention_id,body.answer,body.remember,body.scope)

    @app.get('/api/agent/providers')
    def get_providers(request: Request):
        account(request)
        return providers.public()

    @app.get('/api/agent/execution')
    def execution_status(request: Request):
        require_operator(request)
        account(request)
        from .codex_provider import login_status
        return {**providers.public(),'codex_status':login_status()}

    @app.post('/api/agent/execution')
    def configure_execution(request: Request, body: ExecutionRequest):
        require_operator(request)
        account(request,True)
        return invoke(providers.save,body.model_dump())

    @app.post('/api/agent/schedules/{schedule_id}')
    def schedule_control(request: Request, schedule_id: str, body: ScheduleControl):
        return invoke(runtime.set_schedule,account(request,True),schedule_id,body.enabled)

    @app.put('/api/agent/providers')
    def save_providers(request: Request, body: ProviderRequest):
        require_operator(request)
        account(request,True)
        return invoke(providers.save,body.model_dump())

    @app.get('/api/agent/sharing-qr')
    def sharing_qr(request: Request):
        slot=account(request)
        service,_=invoke(runtime.identity,slot)
        phone=service.chats.account().split('@')[0].split(':')[0]
        if not re.fullmatch(r'[0-9]{7,15}',phone):
            raise HTTPException(409,'The linked account phone number is unavailable.')
        out=BytesIO()
        segno.make('https://wa.me/'+phone,error='m',micro=False).save(out,kind='png',scale=8,border=4)
        return Response(out.getvalue(),media_type='image/png')
