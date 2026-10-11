"""Session lifecycle, QR expiry and generation isolation, independent of HTTP."""
from __future__ import annotations

import io
from pathlib import Path
import queue
import threading
import time
from typing import Callable
import uuid

import segno

from .connector import NativeWorker
from .locking import acquire_lock
from .chat_store import ChatStore
import json

DETAILS = {
    "idle": "Ready to connect to WhatsApp.",
    "connecting": "Connecting to WhatsApp…",
    "qr": "WhatsApp → Settings → Linked devices → Link a device.",
    "refreshing": "Refreshing your WhatsApp QR…",
    "paired": "QR accepted. Finishing the connection…",
    "connected": "WhatsApp is linked.",
    "expired": "QR expired. Select Regenerate QR to try again.",
    "disconnected": "WhatsApp disconnected. Select Regenerate QR to reconnect.",
    "error": "Unable to connect. Select Regenerate QR to retry.",
}
REGENERATE_INTERVAL = 5.0
QR_REFRESH_GRACE = 3.0  # Allow the native QR channel to deliver its next code first.
CONNECT_TIMEOUT = 45.0
ERRORS = {
    "pairing_rejected": "WhatsApp rejected pairing. Request a fresh QR and try again.",
    "logged_out": "This device was unlinked. Regenerate the QR to link it again.",
    "session_replaced": "Another connection is using this session. Close it and retry.",
    "temporarily_unavailable": "WhatsApp temporarily refused the connection. Try later.",
    "client_outdated": "The WhatsApp connector needs an update.",
    "dependency_unavailable": "The WhatsApp connector could not load. Run the setup script again.",
    "connection_failed": "Could not connect to WhatsApp. Check the network and retry.",
    "connection_timeout": "WhatsApp did not respond in time. Regenerate the QR to retry.",
}


class AlreadyLinked(Exception):
    pass


class PairingService:
    def __init__(self, data_dir: Path, worker_factory=NativeWorker, clock: Callable[[], float] = time.time):
        self.data_dir = data_dir
        self.worker_factory = worker_factory
        self.clock = clock
        self._lock = threading.RLock()
        self._operation = threading.Lock()
        self._worker = None
        self._epoch = 0
        self._revision = 0
        self._status = "idle"
        self._detail = DETAILS["idle"]
        self._qr: bytes | None = None
        self._qr_version: str | None = None
        self._expires_at: float | None = None
        self._started_at = 0.0
        self._last_start = float("-inf")
        self._refresh_at: float | None = None
        self._closed = threading.Event()
        self._monitor: threading.Thread | None = None
        self._ownership = None
        self.chats = ChatStore(data_dir / 'chats.sqlite3')
        self._restore = False
        self._retry_at = 0.0

    def open(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._ownership = acquire_lock(self.data_dir / "app.lock")
        self._monitor = threading.Thread(target=self._watch, name="pairing-events", daemon=True)
        self._monitor.start()
        if (self.data_dir / 'whatsapp' / 'session.sqlite3').is_file():
            self._restore = True
            self.connect()

    def _clear_qr(self) -> None:
        self._qr = self._qr_version = self._expires_at = None

    def _transition(self, status: str, detail: str | None = None) -> None:
        self._status = status
        self._detail = detail or DETAILS[status]
        self._revision += 1
        if status != "qr":
            self._clear_qr()
        if status != "refreshing":
            self._refresh_at = None

    def _schedule_refresh(self) -> None:
        if self._status != "refreshing":
            self._transition("refreshing")
            self._refresh_at = self.clock() + QR_REFRESH_GRACE

    def _expire(self) -> None:
        if self._expires_at is not None and self.clock() >= self._expires_at:
            self._schedule_refresh()

    def snapshot(self) -> dict:
        with self._lock:
            self._expire()
            return {
                "status": self._status, "detail": self._detail,
                "revision": self._revision, "server_time": self.clock(),
                "qr_version": self._qr_version, "expires_at": self._expires_at,
                "qr_url": f"/api/whatsapp/qr/{self._qr_version}.png" if self._qr else None,
                "can_regenerate": (
                    self._status in ("idle", "qr", "expired", "disconnected", "error")
                    and self.clock() - self._last_start >= REGENERATE_INTERVAL
                ),
            }

    def qr_image(self, version: str) -> bytes | None:
        with self._lock:
            self._expire()
            return self._qr if self._status == "qr" and self._qr_version == version else None

    def connect(self, *, regenerate: bool = False) -> dict:
        with self._operation:
            with self._lock:
                if self._closed.is_set():
                    return self.snapshot()
                self._expire()
                if self._status in ("connected", "paired"):
                    if regenerate:
                        raise AlreadyLinked()
                    return self.snapshot()
                # Coalesce clicks while a request is already waiting for WhatsApp.
                if self._status == "connecting" or (regenerate and self._status == "refreshing"):
                    return self.snapshot()
                if not regenerate and self._status == "qr":
                    return self.snapshot()
                if self.clock() - self._last_start < REGENERATE_INTERVAL:
                    return self.snapshot()
                self._epoch += 1  # Invalidate callbacks before stopping the old process.
                old_worker, self._worker = self._worker, None
                self._transition("connecting")
                self._started_at = self._last_start = self.clock()
            try:
                if old_worker is not None:
                    old_worker.close()
                worker = self.worker_factory(self.data_dir / "whatsapp")
            except Exception:
                with self._lock:
                    self._transition("error", ERRORS["connection_failed"])
                return self.snapshot()
            with self._lock:
                self._worker = worker
            return self.snapshot()

    def accept_event(self, epoch: int, event: dict) -> None:
        """Ignore callbacks from an old QR request, including delayed QR payloads."""
        with self._lock:
            if epoch != self._epoch or self._closed.is_set():
                return
            kind = event.get("kind")
            if kind == "qr":
                if self._status in ("paired", "connected"):
                    return
                self.chats.deactivate()
                expires = float(event["expires_at"])
                if expires <= self.clock():
                    self._schedule_refresh()
                    return
                output = io.BytesIO()
                segno.make_qr(event["payload"], error="m").save(output, kind="png", scale=8, border=4)
                self._transition("qr")
                self._qr = output.getvalue()
                self._qr_version = uuid.uuid4().hex
                self._expires_at = expires
            elif kind == "paired":
                if self._status != "connected":
                    self._started_at = self.clock()
                    self._transition("paired")
            elif kind == "connected":
                self._restore = True
                self._transition("connected")
            elif kind == "disconnected":
                if self._status in ("qr", "refreshing"):
                    self._schedule_refresh()
                elif self._status != "error":
                    self._transition("disconnected")
            elif kind == "error":
                if event.get('code') in ('logged_out','session_replaced','temporarily_unavailable','client_outdated'):
                    self._restore = False
                if event.get('code') == 'logged_out':
                    self.chats.deactivate()
                self._transition("error", ERRORS.get(event.get("code"), ERRORS["connection_failed"]))
            elif kind == "ended" and self._status not in ("error", "expired"):
                if self._status in ("qr", "refreshing"):
                    self._schedule_refresh()
                else:
                    self._transition("disconnected")

    def _maintain(self) -> None:
        """Renew exhausted QR channels, and bound a connection's waiting time."""
        with self._lock:
            if self._closed.is_set():
                return
            self._expire()
            if self._status in ("connecting", "paired") and self.clock() - self._started_at > CONNECT_TIMEOUT:
                self._transition("error", ERRORS["connection_timeout"])
            refresh = (
                self._status == "refreshing" and self._refresh_at is not None
                and self.clock() >= self._refresh_at
            )
            restore = (self._restore and self._status in ('disconnected','error')
                       and self.clock() >= self._retry_at
                       and self.clock() - self._last_start >= 10)
            if restore:
                self._retry_at = self.clock() + 15
        if refresh or restore:
            # The operation lock and connect's state checks prevent racing a scan
            # or a manual regeneration that completed while we were waiting.
            self.connect()

    def send_text(self, token: str, chat: str, text: str, reply_to: str = '', expected_account: str = '') -> dict:
        with self._operation:
            if expected_account and self.chats.account()!=expected_account:
                raise ValueError('Account identity changed. Read the account again before acting.')
            if self._status != 'connected' or self._worker is None:
                raise RuntimeError('WhatsApp is disconnected. Wait for reconnection before sending.')
            if reply_to:
                self.chats.get_message(chat,reply_to)
            previous = self.chats.reserve_send(token, chat, json.dumps([text,reply_to]) if reply_to else text)
            if previous:
                if previous['status'] == 'sent':
                    return json.loads(previous['result'])
                raise RuntimeError('This request is pending or unconfirmed. Check the chat; it will not be sent twice.')
            try:
                return self._worker.request('send', token=token, chat=chat, text=text, reply_to=reply_to)
            except Exception:
                self.chats.finish_send(token,'unknown',{})
                raise

    def send_rich(self, body):
        from .media import MediaStore
        with self._operation:
            if body.get('expected_account') and self.chats.account()!=body['expected_account']:
                raise ValueError('Account identity changed. Read the account again before acting.')
            if self._status != 'connected' or self._worker is None:
                raise RuntimeError('Wait for WhatsApp to reconnect.')
            if body.get('media_id'): MediaStore(self.chats).get(body['media_id'])
            if body.get('reply_to'): self.chats.get_message(body['chat'],body['reply_to'])
            token=body['request_id']
            previous=self.chats.reserve_send(token,body['chat'],json.dumps(body,sort_keys=True))
            if previous:
                if previous['status']=='sent': return json.loads(previous['result'])
                raise RuntimeError('Send not confirmed. Check the conversation; this request will not be sent twice.')
            try:
                return self._worker.request('send_rich',token=token,body=body)
            except Exception:
                self.chats.finish_send(token,'unknown',{})
                raise

    def download_media(self, id):
        if self._status != 'connected' or self._worker is None:
            raise RuntimeError('Reconnect to download this attachment.')
        return self._worker.request('download_media',media_id=id)

    def message_action(self, token, chat, message_id, operation, text, expected_account=''):
        with self._operation:
            if expected_account and self.chats.account()!=expected_account:
                raise ValueError('Account identity changed. Read the account again before acting.')
            if self._status != 'connected' or self._worker is None:
                raise RuntimeError('Wait for WhatsApp to reconnect.')
            item=self.chats.get_message(chat,message_id)
            if operation in ('edit','revoke') and not item['outgoing']:
                raise ValueError('Only your own messages can be changed.')
            previous=self.chats.reserve_send(token,chat,json.dumps([operation,message_id,text]))
            if previous:
                if previous['status']=='sent':
                    return json.loads(previous['result'])
                raise RuntimeError('Action not confirmed. Check WhatsApp before trying again.')
            try:
                result=self._worker.request('message_action',chat=chat,message_id=message_id,operation=operation,text=text)
                self.chats.finish_send(token,'sent',result)
                return result
            except Exception:
                self.chats.finish_send(token,'unknown',{})
                raise

    def logout(self) -> dict:
        with self._operation:
            with self._lock:
                worker = self._worker
                if worker is None or self._status != 'connected':
                    raise RuntimeError('Reconnect WhatsApp before unlinking this device.')
                self._restore = False
            try:
                worker.request('logout')
            except Exception:
                self._restore = True
                raise
            with self._lock:
                self._epoch += 1
                self._worker = None
                self.chats.deactivate()
                self._transition('idle')
            worker.close()
            return self.snapshot()

    def _watch(self) -> None:
        while not self._closed.wait(0.1):
            with self._lock:
                worker, epoch = self._worker, self._epoch
            if worker is not None:
                try:
                    while True:
                        self.accept_event(epoch, worker.events.get_nowait())
                except queue.Empty:
                    pass
                except (ValueError, OSError):
                    continue  # A concurrent regeneration closed this worker queue.
                with self._lock:
                    if worker is self._worker:
                        try:
                            alive = worker.is_alive()
                        except ValueError:
                            alive = False
                        if not alive and self._status not in ("error", "expired", "disconnected"):
                            if self._status in ("qr", "refreshing"):
                                self._schedule_refresh()
                            else:
                                self._transition("disconnected")
            # Drain callbacks before deciding to reconnect: a queued successful
            # scan or a freshly rotated code always wins over an expiry timer.
            self._maintain()

    def close(self) -> None:
        self._closed.set()
        with self._operation:
            with self._lock:
                self._epoch += 1
                worker, self._worker = self._worker, None
                self._clear_qr()
            if worker is not None:
                worker.close()
        if self._monitor is not None:
            self._monitor.join(timeout=2)
        if self._ownership is not None:
            self._ownership.close()
