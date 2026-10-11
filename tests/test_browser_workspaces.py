"""HTTP tenancy/capacity tests use fake connectors, never 101 live WhatsApp sessions."""
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from wabuddy.app import create_app
from wabuddy.browser_sessions import BrowserSessions
from wabuddy.usage_limits import UsageBudget, UsageLimit
from test_app import app_client, login
import pytest


def public_browser(app):
    return TestClient(app, base_url='https://wabuddy.my')


def test_public_browsers_cannot_access_owner_or_each_other(app_client):
    local, original, _ = app_client
    original.chats.activate('111@s.whatsapp.net','Owner')
    original.chats.message('222@s.whatsapp.net','secret','Private owner data',False,100)
    a, b = public_browser(local.app), public_browser(local.app)
    first = a.get('/api/bootstrap')
    assert first.status_code == 200
    assert 'Secure' in first.headers['set-cookie'] and 'HttpOnly' in first.headers['set-cookie']
    sa, sb = first.json(), b.get('/api/bootstrap').json()
    assert sa['account_id'] != sb['account_id'] != 'default'
    ha={'X-CSRF-Token':sa['csrf_token'],'X-WABuddy-Account':sa['account_id']}
    assert [x['id'] for x in a.get('/api/accounts').json()['accounts']] == [sa['account_id']]
    assert a.get('/api/whatsapp/chats',headers=ha).status_code == 200
    assert 'Private owner data' not in a.get('/api/whatsapp/chats',headers=ha).text
    for slot in ('default',sb['account_id']):
        assert a.post('/api/accounts/select',json={'account_id':slot},headers=ha).status_code == 404
        assert a.get('/api/whatsapp/chats',headers={'X-WABuddy-Account':slot}).status_code == 409
    for path,body in [('/api/shutdown',{}),('/api/agent/execution',{'engine':'codex','enabled':False}),('/api/agent/jobs/claim',{})]:
        assert a.post(path,json=body,headers=ha).status_code == 403
    assert public_browser(local.app).get('/api/bootstrap?account=default').status_code == 403
    cookie=a.cookies.get('wabuddy_session')
    restored=BrowserSessions(original.data_dir)
    assert restored.get(cookie)[2] == sa['account_id']
    assert cookie.encode() not in restored.path.read_bytes()
    # The server restart uses the same database; no raw token or account list is exposed.
    clone=create_app(original)
    resumed=public_browser(clone); resumed.cookies.update(a.cookies)
    assert resumed.get('/api/bootstrap').json()['account_id']==sa['account_id']
    assert resumed.get('/api/accounts').json()['accounts'][0]['id']==sa['account_id']


def test_101_browsers_admitted_but_only_100_ai_workspaces(app_client):
    local, _, _ = app_client
    def bootstrap(_):
        browser=public_browser(local.app)
        result=browser.get('/api/bootstrap')
        assert result.status_code == 200
        return browser,result.json()
    with ThreadPoolExecutor(max_workers=20) as pool:
        visitors=list(pool.map(bootstrap,range(101)))
    slots={session['account_id'] for _,session in visitors}
    assert len(slots)==101
    budget=local.app.state.agent_runtime.budget
    for slot in list(slots)[:100]:
        assert budget.capacity(slot,acquire=True)['available']
    extra=next(slot for slot in slots if not budget.capacity(slot)['available'])
    assert not budget.capacity(extra,acquire=True)['available']
    browser,session=next(pair for pair in visitors if pair[1]['account_id']==extra)
    headers={'X-WABuddy-Account':extra,'X-CSRF-Token':session['csrf_token']}
    assert browser.get('/api/whatsapp/state',headers=headers).status_code == 200
    # Valid pairing still comes from the connector even when the AI tier is full.
    assert browser.post('/api/whatsapp/connect',headers=headers).status_code == 200
    assert browser.get('/api/whatsapp/chats',headers=headers).status_code == 200
    local.app.state.accounts.get(extra).chats.activate('123456789@s.whatsapp.net','Capacity visitor')
    blocked=browser.post('/api/agent/goals',json={'prompt':'Export orders','request_id':'over-capacity-goal-001'},headers=headers)
    assert blocked.status_code == 429
    assert 'WhatsApp chat remains available' in blocked.json()['detail']
    assert browser.get('/api/whatsapp/chats',headers=headers).status_code == 200


def test_budgets_survive_restart_and_parallel_reservations(tmp_path):
    budget=UsageBudget(tmp_path)
    def reserve(index):
        try: budget.reserve('goal',str(index),'same-browser'); return True
        except UsageLimit: return False
    with ThreadPoolExecutor(max_workers=12) as pool:
        assert sum(pool.map(reserve,range(24))) == 20
    with pytest.raises(UsageLimit):
        UsageBudget(tmp_path).reserve('goal','after-restart','same-browser')
    budget.reserve('goal','other-visitor','another-browser')
    for index in range(16): budget.model_call({'run':'bounded','payload':{}},'a')
    with pytest.raises(UsageLimit,match='16 AI-call'):
        budget.model_call({'run':'bounded','payload':{}},'a')
    with pytest.raises(UsageLimit,match='context limit'):
        budget.model_call({'run':'large','payload':{'text':'x'*80001}},'a')
