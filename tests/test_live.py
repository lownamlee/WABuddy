import json

import pytest

from wabuddy.chat_store import ChatStore
from wabuddy.pairing import PairingService
from test_pairing import FakeWorker
from test_app import app_client, login


def test_cache_is_private_deduplicated_and_account_scoped(tmp_path):
    store = ChatStore(tmp_path / 'chat.sqlite3')
    store.activate('111@s.whatsapp.net','Test')
    store.message('222@s.whatsapp.net','m1','hello',True,1000)
    store.receipt('222@s.whatsapp.net',['m1'],'read')
    store.message('222@s.whatsapp.net','m1','hello',True,1000)
    store.receipt('222@s.whatsapp.net',['m1'],'delivered')
    snapshot = store.snapshot()
    assert len(snapshot['messages']['222@s.whatsapp.net']) == 1
    assert snapshot['messages']['222@s.whatsapp.net'][0]['status'] == 'read'
    store.receipt('222@s.whatsapp.net',['early'],'read')
    store.receipt('222@s.whatsapp.net',['early'],'delivered')
    store.message('222@s.whatsapp.net','early','race',True,1_700_000_000_000)
    assert store.snapshot()['messages']['222@s.whatsapp.net'][-1]['status'] == 'read'
    assert store.snapshot()['messages']['222@s.whatsapp.net'][-1]['sentAt'] == 1_700_000_000_000
    snapshot = store.snapshot()
    assert ChatStore(store.path).snapshot() == snapshot
    store.activate('333@s.whatsapp.net','Other')
    assert store.snapshot()['chats'] == []
    store.deactivate()
    assert store.snapshot()['account'] is None


def test_contact_identity_avatar_and_chat_preview_receipt(tmp_path):
    store=ChatStore(tmp_path / 'chats.sqlite3')
    store.activate('111@s.whatsapp.net','Me')
    jid='222@s.whatsapp.net'
    store.contact(jid,'Old push name')
    store.contact(jid,'',push_name='Display name',authoritative=True)
    store.message(jid,'incoming','ping',False,1000,name='New push name')
    store.profile(jid,about='About',photo=b'private-photo')
    store.message(jid,'outgoing','reply',True,1001)
    store.receipt(jid,['outgoing'],'read')
    chat=store.snapshot()['chats'][0]
    assert chat['name']=='+222'
    assert chat['pushName']=='New push name'
    assert not chat['savedContact']
    assert chat['lastStatus']=='read'
    assert chat['photoVersion']==1
    assert store.photo(jid)==b'private-photo'
    store.contact(jid,'Saved name',authoritative=True)
    store.message(jid,'next','ping',False,1002,name='Another push name')
    assert store.snapshot()['chats'][0]['name']=='Saved name'
    store.activate('333@s.whatsapp.net','Other')
    assert store.photo(jid) is None


def test_avatar_and_actions_authentication(app_client):
    client, service, _=app_client
    assert client.get('/api/whatsapp/avatar?chat=222@s.whatsapp.net').status_code==401
    headers=login(client)
    service.chats.activate('111@s.whatsapp.net','Me')
    service.chats.contact('222@s.whatsapp.net')
    service.chats.profile('222@s.whatsapp.net',photo=b'image')
    response=client.get('/api/whatsapp/avatar?chat=222@s.whatsapp.net')
    assert response.content==b'image'
    assert response.headers['cache-control'].startswith('no-store')
    body={'request_id':'action-test-12345','chat':'222@s.whatsapp.net','message_id':'m1','operation':'react','text':'👍'}
    assert client.post('/api/whatsapp/message-action',json=body).status_code==403
    assert client.post('/api/whatsapp/message-action',headers=headers,json={**body,'operation':'invented'}).status_code==422
    assert client.post('/api/whatsapp/message-action',headers=headers,json={**body,'text':'arbitrary payload'}).status_code==422


def test_avatar_download_rejects_untrusted_urls():
    from wabuddy.live_connector import fetch_profile_photo
    for url in ('http://example.com','https://whatsapp.net.evil.test/pic','file:///private','https://127.0.0.1/pic'):
        with pytest.raises(ValueError):
            fetch_profile_photo(url)


def test_contacts_are_not_conversations_and_numbers_use_international_format(tmp_path):
    from wabuddy.chat_store import display_phone
    assert display_phone('601123456789@s.whatsapp.net')=='+60 11-2345 6789'
    store=ChatStore(tmp_path/'chat.sqlite3')
    store.activate('6281234567890@s.whatsapp.net','Me')
    store.contact('6281234567890@s.whatsapp.net','Me')
    assert store.snapshot()['chats']==[]
    assert len(store.snapshot()['contacts'])==1
    store.message('601123456789@s.whatsapp.net','incoming','ping',False,100)
    assert len(store.snapshot()['chats'])==1
    assert store.snapshot()['chats'][0]['name']=='+60 11-2345 6789'


def test_reactions_have_participants_removals_and_activity_previews(tmp_path):
    store=ChatStore(tmp_path/'chat.sqlite3')
    me,chat='111@s.whatsapp.net','222@s.whatsapp.net'
    store.activate(me,'Me')
    store.message(chat,'m','ping',False,100,chat)
    store.reaction(chat,'m',me,'👍',110)
    store.reaction(chat,'m',chat,'❤️',111)
    item=store.snapshot()['messages'][chat][0]
    assert len(item['reactions'])==2
    assert item['reaction']=='👍'
    store.reaction(chat,'m',me,'',112)
    store.reaction(chat,'m',me,'👍',109)  # Late replay must not restore a removed reaction.
    item=store.snapshot()['messages'][chat][0]
    assert len(item['reactions'])==1
    assert item['reaction'] is None
    store.reaction(chat,'m',me,'😂',114)
    preview=store.snapshot()['chats'][0]
    assert preview['preview']=='You reacted 😂 to: "ping"'
    assert preview['previewType']=='reaction'
    assert not preview['outgoing']  # No delivery ticks on a reaction activity preview.
    store.message(chat,'next','reply',True,115)
    assert store.snapshot()['chats'][0]['previewType']=='message'


def test_quotes_keep_original_text_and_resolve_formatted_sender(tmp_path):
    store=ChatStore(tmp_path/'chat.sqlite3')
    chat='601123456789@s.whatsapp.net'
    store.activate('111@s.whatsapp.net','Me')
    store.message(chat,'m','original',False,100,chat,name='Sample Customer')
    store.message(chat,'q','reply',True,101)
    store.update_message(chat,'q',reply={'id':'m','text':'original','senderJid':chat})
    store.update_message(chat,'m',text='edited',edited=True)
    quote=store.snapshot()['messages'][chat][1]['reply']
    assert quote=={'id':'m','text':'original','senderJid':chat,'sender':'+60 11-2345 6789','pushName':'Sample Customer'}


class CommandWorker(FakeWorker):
    calls = []

    def request(self, action, **fields):
        self.calls.append(action)
        if action == 'send':
            store = ChatStore(self.folder.parent / 'chats.sqlite3')
            result = {'message_id':'test-id','status':'sent'}
            store.finish_send(fields['token'],'sent',result)
            return result
        return {}


def test_send_idempotency_logout_and_reconnect(tmp_path):
    now = [1000]
    service = PairingService(tmp_path,CommandWorker,lambda:now[0])
    try:
        service.connect()
        service.accept_event(service._epoch,{'kind':'connected'})
        service.chats.activate('111@s.whatsapp.net','Test')
        service.chats.contact('222@s.whatsapp.net','Recipient')
        first = service.send_text('test-request-12345','222@s.whatsapp.net','hello')
        assert service.send_text('test-request-12345','222@s.whatsapp.net','hello') == first
        assert service._worker.calls.count('send') == 1
        with pytest.raises(ValueError):
            service.send_text('test-request-12345','222@s.whatsapp.net','different')
        with pytest.raises(ValueError):
            service.send_text('another-request-12345','999@s.whatsapp.net','unknown contact')
        service.chats.reserve_send('uncertain-request','222@s.whatsapp.net','maybe sent')
        with pytest.raises(RuntimeError):
            service.send_text('uncertain-request','222@s.whatsapp.net','maybe sent')
        worker = service._worker
        service.accept_event(service._epoch,{'kind':'disconnected'})
        now[0] += 16
        service._maintain()
        assert worker.closed
        service.accept_event(service._epoch,{'kind':'connected'})
        assert service.logout()['status'] == 'idle'
        assert service.chats.account() == ''
        now[0] += 60
        service._maintain()
        assert service._worker is None
    finally:
        service.close()


def test_live_endpoints_require_authentication_and_csrf(app_client):
    client, service, _ = app_client
    assert client.get('/api/whatsapp/chats').status_code == 401
    headers = login(client)
    body = {'request_id':'request-test-12345','chat':'222@s.whatsapp.net','text':'hello'}
    assert client.post('/api/whatsapp/messages',json=body).status_code == 403
    assert client.post('/api/whatsapp/logout').status_code == 403
    assert client.post('/api/whatsapp/messages',headers=headers,json=body).status_code == 409
    assert client.post('/api/whatsapp/messages',headers=headers,json={**body,'chat':'untrusted'}).status_code == 422
    assert client.get('/api/whatsapp/chats').headers['cache-control'].startswith('no-store')


def test_visible_message_decoding_ignores_protocol_and_view_once():
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message
    from wabuddy.live_connector import message_text
    assert message_text(Message(conversation='wabuddy ping')) == 'wabuddy ping'
    assert message_text(Message()) == ''
    wrapped = Message()
    wrapped.viewOnceMessage.message.conversation = 'private'
    assert 'private' not in message_text(wrapped)


def test_native_send_uses_sdk_connection_properties(tmp_path):
    import queue
    import threading
    from types import SimpleNamespace
    from wabuddy.live_connector import install_live
    store = ChatStore(tmp_path / 'chats.sqlite3')
    store.activate('111@s.whatsapp.net','Test')
    store.contact('222@s.whatsapp.net','Recipient')
    store.reserve_send('native-test','222@s.whatsapp.net','hello')
    class Client:
        is_connected = True
        is_logged_in = True
        def event(self, event_type):
            return lambda handler: handler
        def send_message(self, jid, message):
            assert jid.User == '222'
            assert message.conversation == 'hello'
            return SimpleNamespace(ID='native-id',Timestamp=1_700_000_000_000)
    commands, responses, stop = queue.Queue(), queue.Queue(), threading.Event()
    try:
        install_live(Client(),tmp_path / 'whatsapp',commands,responses,stop,lambda *a,**kw:None)
        commands.put({'id':'command','action':'send','token':'native-test','chat':'222@s.whatsapp.net','text':'hello'})
        result = responses.get(timeout=3)
        assert result['ok']
        assert result['result']['status'] == 'sent'
        assert store.snapshot()['messages']['222@s.whatsapp.net'][0]['sentAt'] == 1_700_000_000_000
    finally:
        stop.set()


def test_native_message_actions_and_ownership(tmp_path):
    import queue
    import threading
    import time
    from types import SimpleNamespace
    from wabuddy.live_connector import install_live
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message
    store=ChatStore(tmp_path / 'chats.sqlite3')
    me,chat='111@s.whatsapp.net','222@s.whatsapp.net'
    store.activate(me,'Me')
    store.message(chat,'incoming','ping',False,time.time(),chat)
    store.message(chat,'mine','hello',True,time.time(),me)
    calls=[]
    class Client:
        is_connected=True
        is_logged_in=True
        def event(self,event_type): return lambda handler:handler
        def send_message(self,jid,message):
            calls.append(('send',message))
            return SimpleNamespace(ID='reply',Timestamp=time.time())
        def build_reaction(self,jid,sender,id,reaction):
            assert sender.User=='222'
            calls.append(('react',id,reaction))
            return Message()
        def edit_message(self,jid,id,message): calls.append(('edit',id,message.conversation))
        def revoke_message(self,jid,sender,id):
            assert sender.User=='111'
            calls.append(('revoke',id))
        def mark_read(self,*ids,**kwargs): calls.append(('read',ids))
    commands,responses,stop=queue.Queue(),queue.Queue(),threading.Event()
    try:
        install_live(Client(),tmp_path/'whatsapp',commands,responses,stop,lambda *a,**kw:None)
        def execute(action,**fields):
            commands.put({'id':'cmd','action':action,'chat':chat,**fields})
            return responses.get(timeout=3)
        assert execute('send',token='quoted',text='reply',reply_to='incoming')['ok']
        payload=calls[-1][1]
        assert payload.extendedTextMessage.contextInfo.stanzaID=='incoming'
        assert payload.extendedTextMessage.contextInfo.participant==chat
        assert execute('message_action',message_id='incoming',operation='react',text='👍')['ok']
        assert execute('message_action',message_id='incoming',operation='read',text='')['ok']
        assert store.get_message(chat,'incoming')['status']=='read'
        assert execute('message_action',message_id='mine',operation='edit',text='edited')['ok']
        assert store.get_message(chat,'mine')['text']=='edited'
        before=len(calls)
        assert not execute('message_action',message_id='incoming',operation='revoke',text='')['ok']
        assert len(calls)==before
        assert execute('message_action',message_id='mine',operation='revoke',text='')['ok']
        assert json.loads(store.get_message(chat,'mine')['extra'])['deleted']
    finally:
        stop.set()

def test_receipt_times_and_linked_device_read_are_distinct(tmp_path):
    store = ChatStore(tmp_path / 'chats.sqlite3')
    store.activate('111@s.whatsapp.net', 'Me')
    chat = '222@s.whatsapp.net'
    store.message(chat, 'out', 'hello', True, 1700000000)
    store.message(chat, 'in', 'ping', False, 1700000001)
    store.receipt(chat, ['out'], 'read', 1700000005)
    store.receipt(chat, ['out'], 'delivered', 1700000002000)
    store.receipt(chat, ['in', 'out'], 'read', own_read=True)
    messages = {m['id']:m for m in store.snapshot()['messages'][chat]}
    assert messages['out']['status'] == 'read'
    assert messages['out']['readAt'] == 1700000005000
    assert messages['out']['deliveredAt'] == 1700000002000
    assert messages['in']['status'] == 'read'
    assert 'readAt' not in messages['in']

def test_edit_receipts_follow_original_message_in_both_event_orders(tmp_path):
    store = ChatStore(tmp_path / 'chats.sqlite3')
    store.activate('111@s.whatsapp.net', 'Me')
    chat = '222@s.whatsapp.net'
    store.message(chat, 'original', 'text', True, 1700000000)
    store.link_message_event(chat, 'edit-event', 'original')
    store.receipt(chat, ['edit-event'], 'read', 1700000005)
    assert store.get_message(chat, 'original')['status'] == 'read'
    assert store.snapshot()['chats'][0]['lastStatus'] == 'read'
    store.message(chat, 'second', 'next', True, 1700000010)
    store.receipt(chat, ['early-edit-event'], 'read', 1700000015)
    store.link_message_event(chat, 'early-edit-event', 'second')
    assert store.get_message(chat, 'second')['status'] == 'read'
    store.activate('333@s.whatsapp.net', 'Other account')
    store.message(chat, 'original', 'different', True, 1700000000)
    store.receipt(chat, ['edit-event'], 'read', 1700000005)
    assert store.get_message(chat, 'original')['status'] == 'sent'

def test_new_edit_starts_receipt_cycle_once_without_reusing_old_read_time(tmp_path):
    store = ChatStore(tmp_path / 'chats.sqlite3')
    store.activate('111@s.whatsapp.net', 'Me')
    chat = '222@s.whatsapp.net'
    store.message(chat, 'original', 'text', True, 1700000000)
    store.receipt(chat, ['original'], 'read', 1700000005)
    store.link_message_event(chat, 'edit', 'original')
    message = store.snapshot()['messages'][chat][0]
    assert message['status'] == 'sent'
    assert 'readAt' not in message
    store.receipt(chat, ['edit'], 'delivered', 1700000010)
    store.link_message_event(chat, 'edit', 'original')
    assert store.get_message(chat, 'original')['status'] == 'delivered'
