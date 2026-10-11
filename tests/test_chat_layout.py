import queue
import threading

from wabuddy.chat_store import ChatStore
from wabuddy.live_connector import install_live, message_text


def test_history_does_not_become_false_unread_and_archived_empty_chat_is_visible(tmp_path):
    store=ChatStore(tmp_path/'chats.sqlite3')
    store.activate('111@s.whatsapp.net','Test')
    store.message('222@s.whatsapp.net','history','Old imported message',False,100)
    store.chat_metadata('333@s.whatsapp.net',archived=True)
    snapshot=store.snapshot()
    chat=next(c for c in snapshot['chats'] if c['id']=='222@s.whatsapp.net')
    assert chat['unread']==0 and not chat['unreadKnown']
    assert next(c for c in snapshot['chats'] if c['id']=='333@s.whatsapp.net')['archived']
    store.chat_metadata('222@s.whatsapp.net',unread=2,pinned=True,community='Community',parentGroup='123@g.us')
    chat=store.snapshot()['chats'][0]
    assert chat['unread']==2 and chat['unreadKnown'] and chat['pinned']


def test_history_import_preserves_edited_quote_and_chat_metadata(tmp_path):
    from neonize.events import HistorySyncEv
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message
    store=ChatStore(tmp_path/'chats.sqlite3')
    store.activate('111@s.whatsapp.net','Test')
    handlers={}
    class Client:
        def event(self, kind):
            def register(handler): handlers[kind]=handler;return handler
            return register
    stop=threading.Event();errors=[]
    install_live(Client(),tmp_path/'whatsapp',queue.Queue(),queue.Queue(),stop,lambda *args,**kwargs:errors.append(args))
    try:
        event=HistorySyncEv()
        chat=event.Data.conversations.add(ID='222@s.whatsapp.net',unreadCount=0,pinned=2,archived=True)
        item=chat.messages.add().message
        item.key.ID='edited';item.key.fromMe=False;item.messageTimestamp=100
        payload=item.message.editedMessage.message.protocolMessage.editedMessage
        payload.extendedTextMessage.text='Edited reply'
        payload.extendedTextMessage.contextInfo.stanzaID='quoted'
        payload.extendedTextMessage.contextInfo.participant='111@s.whatsapp.net'
        payload.extendedTextMessage.contextInfo.quotedMessage.conversation='Original quote'
        handlers[HistorySyncEv](None,event)
        assert ('sync_error',) not in errors
        view=store.snapshot()
        message=view['messages']['222@s.whatsapp.net'][0]
        assert message['text']=='Edited reply' and message['edited']
        assert message['reply']['sender']=='You'
        assert message['reply']['text']=='Original quote'
        assert view['chats'][0]['pinOrder']==2 and view['chats'][0]['archived']
        assert message_text(Message())==''
    finally: stop.set()


def test_privacy_id_is_never_formatted_as_phone_number(tmp_path):
    store=ChatStore(tmp_path/'chats.sqlite3');store.activate('111@s.whatsapp.net','Test')
    store.message('123@g.us','message','Hello',False,100,'99999999999@lid')
    assert store.snapshot()['messages']['123@g.us'][0]['sender']=='Participant'


def test_community_parents_survive_contact_limit(tmp_path):
    store=ChatStore(tmp_path/'chats.sqlite3');store.activate('111@s.whatsapp.net','Test')
    with store.db() as db:
        db.executemany('INSERT INTO chats(account,jid,name) VALUES(?,?,?)',
                       [('111@s.whatsapp.net',str(n)+'@s.whatsapp.net','A contact') for n in range(600)])
    store.contact('123@g.us','Z community')
    store.chat_metadata('123@g.us',isCommunity=True)
    assert any(c['id']=='123@g.us' for c in store.snapshot()['contacts'])
