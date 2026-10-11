from types import SimpleNamespace
import threading

import pytest

from wabuddy.chat_store import ChatStore
from wabuddy.whatsapp_control import ExecuteControl, operate
from test_app import app_client, login


def test_native_mutations_are_identity_bound_and_idempotent(tmp_path):
    chats=ChatStore(tmp_path/'chats.sqlite3');chats.activate('111@s.whatsapp.net','Owner')
    calls=[]
    def request(action,**kwargs):
        calls.append(kwargs)
        return {'status':'accepted','verified':True}
    service=SimpleNamespace(chats=chats,_operation=threading.Lock(),_status='connected',_worker=SimpleNamespace(request=request))
    command=ExecuteControl(request_id='request-00000001',expected_account='111@s.whatsapp.net',change={'operation':'profile','field':'about','value':'Bakery and coffee'})
    assert operate(service,command)==operate(service,command)
    assert len(calls)==1
    with pytest.raises(ValueError,match='different operation'):
        operate(service,command.model_copy(update={'change':command.change.model_copy(update={'value':'Other'})}))
    chats.activate('222@s.whatsapp.net','Other')
    with pytest.raises(ValueError,match='identity changed'): operate(service,command)
    assert len(calls)==1


def test_unknown_native_outcome_cannot_replay(tmp_path):
    chats=ChatStore(tmp_path/'chats.sqlite3');chats.activate('111@s.whatsapp.net','Owner')
    calls=[]
    def request(*args,**kwargs):
        calls.append(1);raise RuntimeError('timeout')
    service=SimpleNamespace(chats=chats,_operation=threading.Lock(),_status='connected',_worker=SimpleNamespace(request=request))
    command=ExecuteControl(request_id='request-00000001',expected_account='111@s.whatsapp.net',change={'operation':'profile','field':'about','value':'Bakery'})
    with pytest.raises(RuntimeError,match='timeout'): operate(service,command)
    with pytest.raises(RuntimeError,match='unconfirmed'): operate(service,command)
    assert len(calls)==1


def test_control_schema_rejects_fabricated_business_and_account_leaks(app_client):
    client,service,_=app_client
    headers=login(client)
    command={'request_id':'request-00000001','expected_account':'111@s.whatsapp.net','change':{'operation':'profile','field':'business_name','value':'Bakery'}}
    assert client.post('/api/whatsapp/control/execute',headers=headers,json=command).status_code==422
    command['change']['field']='about'
    assert client.post('/api/whatsapp/control/execute',json=command).status_code==403
    service.chats.activate('111@s.whatsapp.net','Owner')
    service.chats.message('222@s.whatsapp.net','a','private first',False,100)
    service.chats.activate('333@s.whatsapp.net','Other')
    service.chats.message('444@s.whatsapp.net','b','second',False,101)
    data=client.get('/api/whatsapp/history?query=private').json()
    assert data['messages']==[]
    assert client.get('/api/whatsapp/history?limit=100000').status_code==422


def test_native_group_serializer_uses_installed_proto_fields():
    from neonize.proto.Neonize_pb2 import GroupInfo
    from wabuddy.native_control import group
    result=group(GroupInfo())
    assert result['locked'] is False and result['announcements'] is False
