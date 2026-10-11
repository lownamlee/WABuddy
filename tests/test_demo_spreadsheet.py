"""Queue/merge/publication invariants. Model outputs in these tests are explicit fixtures."""
import pytest
from test_agent_runtime import runtime, seed, analysis, finish
from wabuddy.agent_runtime import AgentRuntime
from wabuddy.demo_commands import command_plan
from wabuddy.usage_limits import UsageBudget, UsageLimit, MODEL_HOURLY_LIMIT, MODEL_DAILY_LIMIT


def test_short_commands_are_owner_only_exact_routes():
    available=[{'chat':'601123456789@s.whatsapp.net','name':'Sample Customer'}]
    for prompt in ['orders','DEMO Orders!','/spreadsheet','orders for +60 11-2345 6789','orders for Sample Customer']:
        assert command_plan(prompt,available)['action']=='watch_orders'
    assert command_plan('do not stop monitoring',available) is None
    assert command_plan('orders and send all my contacts a message',available) is None
    assert command_plan('stop for Sample Customer',available) is None
    assert command_plan('orders for Unknown',available)['action']=='clarify'
    many=available+[{'chat':str(n)+'@s.whatsapp.net','name':str(n)} for n in range(6)]
    assert command_plan('orders',many)['action']=='clarify'
    assert command_plan('orders for Sample Customer',many)['conversation_ids']==['601123456789@s.whatsapp.net']
    assert command_plan('demo orders',many,demo_scope=['601123456789@s.whatsapp.net'])['conversation_ids']==['601123456789@s.whatsapp.net']
    assert command_plan('demo orders',available,demo_scope=['missing'])['action']=='clarify'


def test_orders_shortcut_publishes_live_sheet_and_watches_without_planner(runtime):
    chats=seed(runtime)
    run=runtime.submit('a','orders','short-orders-request')
    assert run['routing']=='command'
    assert run['nodes'][0]['kind']=='tool'
    assert all(n['role']!='Coordinator' for n in run['nodes'])
    result=finish(runtime)
    first=runtime.sheet('a')
    assert first['revision']==1 and first['rows'][0]['total']=='68.00'
    assert runtime.sheet('b')['rows']==[]
    assert runtime.submit('a','orders','short-orders-request')['id']==run['id']
    assert runtime.sheet('a')['revision']==1
    runtime=AgentRuntime(runtime.registry)
    chats.update_message('60111111111@s.whatsapp.net','order-1',text='Confirm 3 boxes at RM34 each.')
    runtime.tick('a')
    assert runtime.sheet('a')['rows'][0]['quantity']==2  # No unverified partial publication.
    finish(runtime,quantity=3)
    updated=runtime.sheet('a')
    assert updated['id']==first['id'] and updated['rows'][0]['id']==first['rows'][0]['id']
    assert updated['revision']==2 and updated['totals']=={'MYR':'102.00'}
    assert runtime.sheet('a',query='boxes')['matched']==1
    assert runtime.sheet('a',status='cancelled')['matched']==0
    stop=runtime.submit('a','stop','short-stop-request')
    assert stop['status']=='completed'
    assert not any(p['enabled'] for p in runtime.context('a')['schedules'])
    assert runtime.sheet('a')['revision']==2


def test_parallel_specialists_merge_once_before_independent_verification(runtime):
    chats=seed(runtime)
    chats.message('60111111111@s.whatsapp.net','image-order','Fixture image order: 2 cookie packs at RM8.',False,101)
    chats.update_message('60111111111@s.whatsapp.net','image-order',media={'kind':'image','id':'fixture-media'})
    run=runtime.submit('a','orders','parallel-specialists-test')
    text=runtime.claim('a');image=runtime.claim('a')
    assert [text['payload']['branch'],image['payload']['branch']]==['text','image']
    assert text['payload']['depends']==image['payload']['depends']==[run['id']+'-router']
    bad=analysis(text);bad['orders'][0]['anchor']='image-order'
    with pytest.raises(ValueError,match='partition'):
        runtime.complete('a',text['id'],text['lease'],bad)
    runtime.complete('a',text['id'],text['lease'],analysis(text))
    assert runtime.claim('a') is None  # The verifier waits for both branches.
    assert runtime.sheet('a')['revision']==0
    data={'orders':[{'anchor':'image-order','item':'Cookie packs','quantity':2,'unit_price':8,'currency':'MYR',
        'status':'confirmed','payment':'unknown','evidence':[{'message_id':'image-order','quote':'2 cookie packs at RM8.'}]}]}
    data['image_observations']={'image-order':'2 cookie packs at RM8.'}
    _,ns=runtime.identity('a')
    runtime.store.put(ns,'image_access',image['id'],['image-order'])
    runtime.complete('a',image['id'],image['lease'],data)
    verifier=runtime.claim('a')
    assert set(verifier['payload']['depends'])=={text['id'],image['id']}
    assert len(verifier['payload']['candidate']['orders'])==2
    assert not any('Attachment not interpreted: image-order' in s for s in verifier['payload']['candidate']['limitations'])
    assert runtime.sheet('a')['revision']==0
    runtime.store.put(ns,'image_access',verifier['id'],['image-order'])
    runtime.complete('a',verifier['id'],verifier['lease'],{'approved':True,'reason':'Fixture evidence checked.'})
    sheet=runtime.sheet('a')
    assert sheet['records']==2 and sheet['totals']=={'MYR':'84.00'}
    assert runtime.run('a',run['id'])['status']=='completed'
    assert runtime.sheet('a',offset=1,limit=1)['rows'][0]['item']=='Cookie packs'


def test_higher_model_limit_is_durable_and_still_bounded(tmp_path):
    assert (MODEL_HOURLY_LIMIT,MODEL_DAILY_LIMIT)==(200,1000)
    budget=UsageBudget(tmp_path)
    for n in range(MODEL_HOURLY_LIMIT): budget.reserve('model',str(n))
    with pytest.raises(UsageLimit,match='200 AI calls'):
        UsageBudget(tmp_path).reserve('model','over-hourly')


def test_demo_scope_is_durable_account_bound_and_validated(runtime):
    chats=seed(runtime)
    chat='60111111111@s.whatsapp.net'
    for n in range(6): chats.message(f'6022222222{n}@s.whatsapp.net',f'other-{n}','Hello',False,102+n)
    runtime.set_demo_scope('a',[chat])
    with pytest.raises(ValueError): runtime.set_demo_scope('a',[chat,chat])
    with pytest.raises(ValueError): runtime.set_demo_scope('b',[chat])
    runtime=AgentRuntime(runtime.registry)
    run=runtime.submit('a','demo orders','scoped-demo-request-1')
    assert run['conversation_ids']==[chat]
    assert {n.get('chat') for n in run['nodes'] if n.get('chat')}=={chat}
    assert runtime.submit('b','demo orders','scoped-demo-request-1')['status']=='needs_input'
    with pytest.raises(ValueError): runtime.sheet('a',query='x'*201)
    with pytest.raises(ValueError): runtime.sheet('a',limit=101)
