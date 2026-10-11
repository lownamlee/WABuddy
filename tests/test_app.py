from fastapi.testclient import TestClient
import pytest

from wabuddy.app import create_app
from wabuddy.pairing import PairingService
from test_pairing import FakeWorker


@pytest.fixture
def app_client(tmp_path):
    now = [1000.0]
    service = PairingService(tmp_path / 'private', FakeWorker, lambda: now[0])
    build = tmp_path / 'dist'
    (build / 'assets').mkdir(parents=True)
    (build / 'phone-animation.html').write_text('<html>phone</html>')
    with TestClient(create_app(service, build), base_url='http://127.0.0.1:8787') as client:
        yield client, service, now


def login(client):
    return {'X-CSRF-Token': client.get('/api/bootstrap').json()['csrf_token']}


def test_pairing_requires_browser_session_and_csrf(app_client):
    client, _, _ = app_client
    assert client.get('/api/whatsapp/state').status_code == 401
    assert client.post('/api/whatsapp/connect').status_code == 401
    headers = login(client)
    assert client.post('/api/whatsapp/connect').status_code == 403
    assert client.post('/api/whatsapp/connect', headers=headers).status_code == 200
    assert client.get('/api/whatsapp/state').json()['status'] == 'connecting'


def test_cross_site_requests_and_untrusted_hosts_are_rejected(app_client):
    client, _, _ = app_client
    assert client.get('/api/bootstrap', headers={'Origin': 'https://example.com'}).status_code == 403
    assert client.get('/api/bootstrap', headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 403
    assert client.get('/healthz', headers={'Host': 'attacker.example'}).status_code == 400
    headers = login(client)
    headers['Origin'] = 'http://127.0.0.1:9999'
    assert client.post('/api/whatsapp/connect', headers=headers).status_code == 403


def test_qr_no_store_and_expiry_and_linked_conflict(app_client):
    client, service, now = app_client
    headers = login(client)
    client.post('/api/whatsapp/connect', headers=headers)
    service.accept_event(service._epoch, {'kind': 'qr', 'payload': 'test-only', 'expires_at': 1020})
    state = client.get('/api/whatsapp/state').json()
    result = client.get(state['qr_url'])
    assert result.status_code == 200
    assert result.headers['content-type'] == 'image/png'
    assert 'no-store' in result.headers['cache-control']
    now[0] = 1021
    assert client.get(state['qr_url']).status_code == 410
    service.accept_event(service._epoch, {'kind': 'connected'})
    assert client.post('/api/whatsapp/regenerate', headers=headers).status_code == 409


def test_only_built_assets_are_served(app_client):
    client, _, _ = app_client
    assert client.get('/').status_code == 200
    assert client.get('/phone-animation.html').status_code == 200
    for path in ['/.local/whatsapp/session.sqlite3', '/backend/wabuddy/app.py', '/.git/config', '/assets/../private/app.lock']:
        assert client.get(path).status_code == 404
