"""Manual browser integration fixture: real HTTP/queue/storage; no network connector or model.
Run with python tests/ui_fixture_server.py. Uses a disposable OS temp directory and port 8788.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import time
import uvicorn
from wabuddy.app import create_app
from wabuddy.pairing import PairingService
from test_pairing import FakeWorker


def create_fixture(root):
    service=PairingService(root,FakeWorker)
    service.chats.activate('10000000001@s.whatsapp.net','Integration fixture')
    service._transition('connected')
    chat='10000000002@s.whatsapp.net'
    service.chats.message(chat,'fixture-order','Confirmed: two boxes at MYR 10 each. Pickup today.',False,time.time())
    service.chats.message(chat,'fixture-question','What time can I collect?',False,time.time())
    app=create_app(service,Path(__file__).resolve().parents[1]/'frontend'/'dist')
    runtime=app.state.agent_runtime
    run=runtime.submit('default','Export the fixture order','fixture-export-0001')
    job=runtime.claim('default')
    runtime.complete('default',job['id'],job['lease'],{'action':'export_orders','explanation':'Export the fixture order.'})
    job=runtime.claim('default')
    runtime.complete('default',job['id'],job['lease'],{'orders':[{'anchor':'fixture-order','item':'Boxes','quantity':2,'unit_price':10,'currency':'MYR','status':'confirmed','payment':'unknown','delivery':'Pickup today','evidence':[{'message_id':'fixture-order','quote':'Confirmed: two boxes at MYR 10 each. Pickup today.'}]}],'findings':[]})
    job=runtime.claim('default')
    runtime.complete('default',job['id'],job['lease'],{'approved':True,'reason':'Fixture evidence checked.'})
    _,ns=runtime.identity('default')
    runtime.store.put(ns,'attention','fixture-question',{'id':'fixture-question','chat':chat,'message_id':'fixture-question','kind':'question','reason':'Owner opening hours needed.','evidence':{'message_id':'fixture-question','quote':'What time can I collect?'},'status':'open','filtered':False,'created':time.time()})
    runtime.store.put(ns,'policy','fixture-daily',{'id':'fixture-daily','goal':'Prepare a daily fixture report','trigger':'daily','enabled':False,'schedule':{'time':'22:00','timezone':'Asia/Singapore'},'next_run':time.time()+86400,'created':time.time()})
    return app

if __name__=='__main__':
    with TemporaryDirectory(prefix='wabuddy-ui-test-') as folder:
        app=create_fixture(Path(folder))
        server=uvicorn.Server(uvicorn.Config(app,host='127.0.0.1',port=8788,log_level='warning',access_log=False))
        app.state.request_shutdown=lambda:setattr(server,'should_exit',True)
        server.run()
