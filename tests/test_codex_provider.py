import json
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

from wabuddy import codex_provider
from wabuddy.agent_provider import Providers
from test_app import app_client, login


def test_codex_process_is_bounded_and_does_not_inherit_api_key(tmp_path,monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','do-not-forward')
    monkeypatch.setattr(codex_provider,'executable',lambda:'codex.exe')
    def run(args,**kwargs):
        assert args[args.index('--model')+1]=='gpt-6-luna'
        assert 'model_reasoning_effort="xhigh"' in args
        assert 'service_tier="fast"' in args
        assert '--ignore-user-config' in args and '--ephemeral' in args
        assert args[args.index('--sandbox')+1]=='read-only'
        assert 'shell_tool' in args and 'browser_use' in args
        assert 'OPENAI_API_KEY' not in kwargs['env']
        assert kwargs['timeout']<300
        Path(args[args.index('--output-last-message')+1]).write_text(json.dumps({'result_json':'{"approved":true}'}),encoding='utf-8')
        return SimpleNamespace(returncode=0,stdout='',stderr='')
    monkeypatch.setattr(subprocess,'run',run)
    assert codex_provider.generate('Check evidence',{'text':'untrusted'}, {})=={'approved':True}


def test_failures_never_expose_raw_customer_output(monkeypatch):
    monkeypatch.setattr(codex_provider,'executable',lambda:'codex.exe')
    monkeypatch.setattr(subprocess,'run',lambda *a,**k:SimpleNamespace(returncode=1,stdout='private customer data',stderr='quota exceeded secret'))
    with pytest.raises(ValueError,match='usage limit') as error:
        codex_provider.generate('',{},{})
    assert 'secret' not in str(error.value) and 'private' not in str(error.value)


def test_codex_engine_preserves_provider_credentials_and_checks_login(tmp_path,monkeypatch):
    providers=Providers(tmp_path)
    providers.save({'enabled':False,'text':{'base_url':'https://example.com/v1','model':'existing','api_key':'private'}})
    monkeypatch.setattr(codex_provider,'login_status',lambda:{'chatgpt_login':False})
    with pytest.raises(ValueError,match='Sign in'):
        providers.save({'engine':'codex','enabled':True})
    assert not providers.read()['enabled']
    monkeypatch.setattr(codex_provider,'login_status',lambda:{'chatgpt_login':True})
    view=providers.save({'engine':'codex','enabled':True})
    assert view['engine']=='codex' and view['enabled']
    assert providers.read()['text']['api_key']=='private'
    assert 'private' not in json.dumps(view)
    monkeypatch.setattr(codex_provider,'infer',lambda *a:{'executed':'codex'})
    from wabuddy.usage_limits import UsageBudget
    runtime=SimpleNamespace(budget=UsageBudget(tmp_path),identity=lambda slot:(None,slot))
    assert providers.infer(runtime,'slot',{'run':'codex-route-test','payload':{}})=={'executed':'codex'}


def test_execution_configuration_requires_session_csrf(app_client,monkeypatch):
    client,_,_=app_client
    assert client.get('/api/agent/execution').status_code==401
    headers=login(client)
    body={'engine':'codex','enabled':True}
    assert client.post('/api/agent/execution',json=body).status_code==403
    monkeypatch.setattr(codex_provider,'login_status',lambda:{'chatgpt_login':True})
    result=client.post('/api/agent/execution',headers=headers,json=body)
    assert result.status_code==200 and result.json()['engine']=='codex'


def test_worker_repairs_evidence_once_without_weakening_validation():
    from wabuddy.agent_provider import APIWorkers
    attempts=[];completed=[]
    def infer(runtime,slot,job):
        attempts.append(job)
        return {'attempt':len(attempts)}
    def complete(slot,job_id,lease,value):
        completed.append(value)
        if len(completed)==1: raise ValueError('Evidence must quote supplied text or an attributed image observation.')
    runtime=SimpleNamespace(complete=complete,fail=lambda *a:pytest.fail('Unexpected failure'))
    worker=APIWorkers(runtime,SimpleNamespace(infer=infer))
    try:
        worker._execute('a',{'id':'job','lease':'lease','instructions':'role','payload':{'messages':[]}})
        assert len(attempts)==2 and len(completed)==2
        assert 'validation_feedback' in attempts[1]['payload']
        assert attempts[0]['lease']==attempts[1]['lease']
    finally:
        worker.close()
