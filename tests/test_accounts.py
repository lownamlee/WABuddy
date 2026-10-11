import pytest

from test_app import app_client, login
from wabuddy.accounts import AccountRegistry
from wabuddy.media import MediaStore
from wabuddy.pairing import PairingService
from test_pairing import FakeWorker


def test_switch_isolates_chats_media_and_rejects_stale_tabs(app_client):
    client, original, _ = app_client
    headers = {**login(client), 'X-WABuddy-Account': 'default'}
    original.chats.activate('111@s.whatsapp.net', 'Original')
    original.chats.message('222@s.whatsapp.net', 'original-message', 'original text', True, 100)
    attachment = MediaStore(original.chats).put('document', 'test.txt', 'text/plain', b'original attachment')
    result = client.post('/api/accounts', json={'label': 'Personal', 'mode': 'standard'}, headers=headers)
    assert result.status_code == 200
    slot = result.json()['account_id']
    second = client.app.state.accounts.get(slot)
    assert second.data_dir == original.data_dir / 'accounts' / slot
    second.chats.activate('333@s.whatsapp.net', 'Personal')
    second.chats.message('222@s.whatsapp.net', 'personal-message', 'personal text', True, 100)
    current = {**headers, 'X-WABuddy-Account': slot}
    assert client.get('/api/whatsapp/chats', headers=headers).status_code == 409
    assert client.get('/api/whatsapp/chats').status_code == 409
    assert client.post('/api/whatsapp/messages', headers=headers, json={
        'request_id': 'stale-tab-message', 'chat': '222@s.whatsapp.net', 'text': 'must not send'}).status_code == 409
    assert client.post('/api/whatsapp/logout', headers=headers).status_code == 409
    assert client.get('/api/whatsapp/avatar?chat=222@s.whatsapp.net&account=default').status_code == 409
    assert client.get(attachment['url'], headers=current).status_code == 404
    snapshot = client.get('/api/whatsapp/chats', headers=current).json()
    assert snapshot['account']['name'] == 'Personal'
    assert 'original text' not in str(snapshot)
    assert client.post('/api/accounts/select', json={'account_id': 'default'}, headers=current).status_code == 200
    assert original.chats.account() == '111@s.whatsapp.net'
    assert second.chats.account() == '333@s.whatsapp.net'
    assert client.get(attachment['url'], headers=headers).content == b'original attachment'
    assert 'original text' in str(client.get('/api/whatsapp/chats', headers=headers).json())


def test_registry_restores_selection_without_moving_original_session(tmp_path):
    first = PairingService(tmp_path, FakeWorker)
    registry = AccountRegistry(first)
    registry.open()
    first.chats.activate('111@s.whatsapp.net', 'Original')
    slot = registry.add('Personal', 'standard')
    registry.select(slot)
    registry.get(slot).chats.activate('333@s.whatsapp.net', 'Personal')
    registry.close()
    restored = AccountRegistry(PairingService(tmp_path, FakeWorker))
    restored.open()
    try:
        assert restored.selected == slot
        assert restored.get('default').data_dir == tmp_path
        assert restored.get('default').chats.account() == '111@s.whatsapp.net'
        assert restored.get(slot).chats.account() == '333@s.whatsapp.net'
        assert len(restored.listing(slot)['accounts']) == 2
        with pytest.raises(ValueError):
            restored.select('../other')
    finally:
        restored.close()


def test_account_management_requires_session_and_csrf(app_client):
    client, _, _ = app_client
    assert client.get('/api/accounts').status_code == 401
    assert client.post('/api/accounts', json={}).status_code == 401
    login(client)
    assert client.post('/api/accounts', json={}).status_code == 403
    headers = login(client)
    assert client.post('/api/accounts/select', json={'account_id': '../outside'}, headers=headers).status_code == 404
    assert len(client.get('/api/accounts').json()['accounts']) == 1


def test_logout_only_unlinks_selected_slot(app_client):
    client, original, _ = app_client
    headers = {**login(client), 'X-WABuddy-Account': 'default'}
    original.chats.activate('111@s.whatsapp.net', 'Original')
    slot = client.post('/api/accounts', json={}, headers=headers).json()['account_id']
    selected = client.app.state.accounts.get(slot)
    selected.chats.activate('333@s.whatsapp.net', 'Personal')
    selected.connect()
    commands = []
    selected._worker.request = lambda action: commands.append(action)
    selected.accept_event(selected._epoch, {'kind': 'connected'})
    result = client.post('/api/whatsapp/logout', headers={**headers, 'X-WABuddy-Account': slot})
    assert result.status_code == 200
    assert commands == ['logout']
    assert selected.chats.account() == ''
    assert original.chats.account() == '111@s.whatsapp.net'
