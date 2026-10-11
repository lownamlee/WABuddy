"""Single isolated WhatsApp client; stopping retains its linked-device session."""
from __future__ import annotations

import logging
from pathlib import Path
import queue
import secrets
import threading
import time


def connector_main(session_dir: str, events, stop, commands, responses) -> None:
    """Spawned process: callbacks send small events to the Python API owner."""
    logging.getLogger().setLevel(logging.ERROR)

    def emit(kind: str, **fields):
        if not stop.is_set():
            try:
                events.put_nowait({"kind": kind, **fields})
            except queue.Full:
                pass

    try:
        from neonize.client import NewClient
        from neonize.events import (
            ConnectedEv, DisconnectedEv, PairStatusEv, LoggedOutEv,
            StreamReplacedEv, TemporaryBanEv, ConnectFailureEv, ClientOutdatedEv,
        )
        from neonize.proto.waCompanionReg.WAWebProtobufsCompanionReg_pb2 import DeviceProps

        folder = Path(session_dir)
        folder.mkdir(parents=True, exist_ok=True)
        client = NewClient(
            str(folder / "session.sqlite3"),
            uuid="wabuddy-" + secrets.token_hex(8),
            props=DeviceProps(os="WABuddy", platformType=DeviceProps.CHROME, requireFullSync=True),
        )
        from .live_connector import install_live
        sync_connected = install_live(client, folder, commands, responses, stop, emit)
        qr_count = 0

        @client.event.qr
        def on_qr(_client, raw: bytes):
            # Neonize 0.5.2 supplies UTF-8 pairing PAYLOAD, not PNG bytes.
            nonlocal qr_count
            qr_count += 1
            emit("qr", payload=raw.decode("utf-8"),
                 expires_at=time.time() + (58 if qr_count == 1 else 18))

        @client.event(PairStatusEv)
        def on_pair(_client, event):
            if event.Status == PairStatusEv.SUCCESS:
                emit("paired")
            else:
                emit("error", code="pairing_rejected")

        @client.event(ConnectedEv)
        def on_connected(_client, _event):
            try:
                sync_connected()
            except Exception:
                emit('sync_error')
            emit("connected")

        @client.event(DisconnectedEv)
        def on_disconnected(_client, _event):
            emit("disconnected")

        def on_failure(_client, event):
            codes = {
                LoggedOutEv: "logged_out", StreamReplacedEv: "session_replaced",
                TemporaryBanEv: "temporarily_unavailable", ConnectFailureEv: "connection_failed",
                ClientOutdatedEv: "client_outdated",
            }
            emit("error", code=codes.get(type(event), "connection_failed"))

        for event in (LoggedOutEv, StreamReplacedEv, TemporaryBanEv, ConnectFailureEv, ClientOutdatedEv):
            client.event(event)(on_failure)

        def watch_stop():
            stop.wait()
            try:
                client.stop()  # Retains the session; never logs the account out.
            except Exception:
                pass

        threading.Thread(target=watch_stop, name="whatsapp-stop", daemon=True).start()
        client.connect()
    except Exception as exc:
        # Do not serialize exceptions that may contain QR/session credentials.
        emit("error", code="dependency_unavailable" if isinstance(exc, ImportError) else "connection_failed")
    finally:
        emit("ended")


class NativeWorker:
    def __init__(self, session_dir: Path):
        import multiprocessing as mp
        ctx = mp.get_context("spawn")
        self.events = ctx.Queue(maxsize=64)
        self.commands = ctx.Queue(maxsize=32)
        self.responses = ctx.Queue(maxsize=32)
        self.command_lock = threading.Lock()
        self.stop_signal = ctx.Event()
        self.process = ctx.Process(
            target=connector_main,
            args=(str(session_dir), self.events, self.stop_signal, self.commands, self.responses),
            name="wabuddy-whatsapp", daemon=True,
        )
        self.process.start()

    def is_alive(self) -> bool:
        return self.process.is_alive()

    def request(self, action, **fields):
        with self.command_lock:
            request_id = secrets.token_hex(16)
            self.commands.put({'id':request_id,'action':action,**fields},timeout=2)
            deadline = time.monotonic()+(180 if action in ('send_rich','download_media') else 35)
            while time.monotonic()<deadline:
                try:
                    response = self.responses.get(timeout=max(.01,deadline-time.monotonic()))
                except queue.Empty:
                    break
                if response['id']==request_id:
                    if not response.get('ok'):
                        raise RuntimeError(response['error'])
                    return response.get('result',{})
            raise RuntimeError('WhatsApp did not confirm this action. Check the chat before retrying.')

    def close(self) -> None:
        self.stop_signal.set()
        self.process.join(timeout=3)
        if self.process.is_alive():
            self.process.terminate()
            self.process.join(timeout=2)
        if self.process.is_alive():
            self.process.kill()
            self.process.join(timeout=2)
        if self.process.is_alive():
            raise RuntimeError("WhatsApp worker could not be stopped safely.")
        self.events.close()
        self.events.cancel_join_thread()
        for channel in (self.commands,self.responses):
            channel.close()
            channel.cancel_join_thread()
        self.process.close()
