import queue

import pytest

from wabuddy.pairing import AlreadyLinked, PairingService


class FakeWorker:
    def __init__(self, folder):
        self.folder = folder
        self.events = queue.Queue()
        self.closed = False

    def is_alive(self):
        return not self.closed

    def close(self):
        self.closed = True


@pytest.fixture
def pairing(tmp_path):
    now = [1000.0]
    service = PairingService(tmp_path, FakeWorker, lambda: now[0])
    yield service, now
    service.close()


def publish(service, now, payload='test-only pairing payload'):
    service.accept_event(service._epoch, {'kind': 'qr', 'payload': payload, 'expires_at': now[0] + 20})
    return service.snapshot()


def test_idempotent_connect_and_regenerate_rejects_old_callbacks(pairing):
    service, now = pairing
    service.connect()
    old_worker, old_epoch = service._worker, service._epoch
    first = publish(service, now)
    assert service.connect()['qr_version'] == first['qr_version']
    # A burst immediately after receiving a QR keeps the existing attempt.
    assert service.connect(regenerate=True)['qr_version'] == first['qr_version']
    assert service._worker is old_worker
    now[0] += 6
    service.connect(regenerate=True)
    assert old_worker.closed
    assert service.qr_image(first['qr_version']) is None
    service.accept_event(old_epoch, {'kind': 'qr', 'payload': 'stale', 'expires_at': now[0] + 30})
    service.accept_event(old_epoch, {'kind': 'connected'})
    assert service.snapshot()['status'] == 'connecting'
    new = publish(service, now)
    assert new['qr_version'] != first['qr_version']
    assert service.qr_image(new['qr_version']).startswith(b'\x89PNG\r\n\x1a\n')
    assert 'payload' not in new


def test_idle_qr_is_removed_and_renewed_automatically(pairing):
    service, now = pairing
    service.connect()
    first = publish(service, now)
    now[0] += 21
    old_worker = service._worker
    assert service.snapshot()['status'] == 'refreshing'
    assert service.qr_image(first['qr_version']) is None
    assert service.snapshot()['qr_url'] is None
    service._maintain()
    assert service._worker is old_worker  # Give the native channel time to rotate.
    now[0] += 4
    service._maintain()
    assert old_worker.closed
    assert service.snapshot()['status'] == 'connecting'
    second = publish(service, now)
    assert second['status'] == 'qr'
    assert second['qr_version'] != first['qr_version']


def test_native_rotation_during_refresh_grace_keeps_connection(pairing):
    service, now = pairing
    service.connect()
    first = publish(service, now)
    worker = service._worker
    now[0] += 21
    assert service.snapshot()['status'] == 'refreshing'
    second = publish(service, now, 'new native code')
    now[0] += 4
    service._maintain()
    assert service._worker is worker
    assert not worker.closed
    assert service.snapshot()['qr_version'] == second['qr_version']
    assert service.qr_image(first['qr_version']) is None


def test_regeneration_clicks_coalesce_until_whatsapp_produces_qr(pairing):
    from concurrent.futures import ThreadPoolExecutor

    service, now = pairing
    service.connect()
    publish(service, now)
    old_worker, old_epoch = service._worker, service._epoch
    now[0] += 6
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: service.connect(regenerate=True), range(20)))
    assert all(result['status'] == 'connecting' for result in results)
    assert old_worker.closed
    assert service._epoch == old_epoch + 1
    pending_worker = service._worker
    now[0] += 10  # Even after cooldown, waiting for QR is a single attempt.
    service.connect(regenerate=True)
    assert service._worker is pending_worker
    assert service.snapshot()['can_regenerate'] is False
    publish(service, now)
    assert service.snapshot()['can_regenerate'] is True


def test_connection_timeout_does_not_leave_permanent_spinner(pairing):
    service, now = pairing
    service.connect()
    now[0] += 46
    service._maintain()
    state = service.snapshot()
    assert state['status'] == 'error'
    assert state['can_regenerate'] is True
    worker = service._worker
    service.connect(regenerate=True)
    assert worker.closed
    assert service.snapshot()['status'] == 'connecting'


def test_scan_during_expiry_grace_cancels_automatic_renewal(pairing):
    service, now = pairing
    service.connect()
    publish(service, now)
    worker = service._worker
    now[0] += 21
    service.snapshot()
    service.accept_event(service._epoch, {'kind': 'paired'})
    now[0] += 4
    service._maintain()
    assert service._worker is worker
    assert not worker.closed
    assert service.snapshot()['status'] == 'paired'


def test_exhausted_native_channel_renews_instead_of_staying_disconnected(pairing):
    service, now = pairing
    service.connect()
    publish(service, now)
    worker = service._worker
    now[0] += 6
    service.accept_event(service._epoch, {'kind': 'disconnected'})
    service.accept_event(service._epoch, {'kind': 'ended'})
    assert service.snapshot()['status'] == 'refreshing'
    now[0] += 4
    service._maintain()
    assert worker.closed
    assert service.snapshot()['status'] == 'connecting'


def test_scan_clears_qr_and_regenerate_cannot_unlink_account(pairing):
    service, now = pairing
    service.connect()
    first = publish(service, now)
    now[0] += 50
    service.accept_event(service._epoch, {'kind': 'paired'})
    assert service._started_at == now[0]
    assert service.qr_image(first['qr_version']) is None
    for status in ['paired', 'connected']:
        service.accept_event(service._epoch, {'kind': status})
        with pytest.raises(AlreadyLinked):
            service.connect(regenerate=True)
        service.accept_event(service._epoch, {'kind': 'qr', 'payload': 'late', 'expires_at': now[0] + 20})
        assert service.snapshot()['status'] == status


def test_close_keeps_saved_credentials(pairing, tmp_path):
    service, _ = pairing
    folder = tmp_path / 'whatsapp'
    folder.mkdir()
    session = folder / 'session.sqlite3'
    session.write_bytes(b'test persisted session')
    service.connect()
    worker = service._worker
    service.close()
    assert worker.closed
    assert session.read_bytes() == b'test persisted session'


def test_only_one_owner_can_open_session_folder(tmp_path):
    first = PairingService(tmp_path, FakeWorker)
    second = PairingService(tmp_path, FakeWorker)
    first.open()
    try:
        with pytest.raises(RuntimeError, match='already in use'):
            second.open()
    finally:
        first.close()
