import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyContext, displayRun, workspaceView, activitySeries} from '../src/live-data.ts';
import {accountRequest} from '../src/account-session.ts';

test('live presentation never seeds sample orders or reports',()=>{
 const view=workspaceView(emptyContext());
 for(const key of ['orders','threads','knowledge','automations','runs','reports'])assert.deepEqual(view[key],[]);
});
test('graph preserves working, queued, rejected and cancelled states without completing dependencies',()=>{
 const run={id:'r',prompt:'Export',status:'running',created:1,nodes:['queued','working','done','rejected','cancelled','failed'].map((status,i)=>({id:String(i),title:status,role:'Agent',kind:'agent',status,depends:i?[String(i-1)]:[]}))};
 const view=displayRun(run);
 assert.deepEqual(view.steps.map(s=>s.actualStatus),['Waiting','Working','Complete','Rejected','Cancelled','Failed']);
 assert.equal(view.steps.filter(s=>s.status==='Complete').length,1);
 assert.deepEqual(view.steps[3].depends,['2']);
});
test('live activity uses synchronized incoming/outgoing counts, fills missing days and excludes out-of-period data',()=>{
 const context={...emptyContext(),activity:[{date:'2026-10-10',incoming:3,outgoing:2},{date:'2026-09-01',incoming:99,outgoing:0}]};
 const series=activitySeries(context,7,new Date('2026-10-11T12:00:00Z'));
 assert.equal(series.rows.length,7);assert.equal(series.total,5);assert.equal(series.percent,40);assert.equal(series.rows.at(-1).received,0);
 assert.equal(activitySeries(emptyContext(),7).percent,0);
});
test('provider settings use PUT, CSRF and account binding; failed requests are not automatically repeated',async()=>{
 globalThis.document={documentElement:{dataset:{account:'a'}}};
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(path,options)=>{calls.push({path,options});return path==='/api/bootstrap?account=a'?{ok:true,json:async()=>({account_id:'a',mode:'standard',csrf_token:'test-csrf'})}:{ok:false,json:async()=>({detail:'Rejected'})};};
 try{await assert.rejects(accountRequest('/api/agent/providers',{enabled:false},'PUT'),/Rejected/);assert.equal(calls.length,2);assert.equal(calls[1].options.method,'PUT');assert.equal(calls[1].options.headers['X-WABuddy-Account'],'a');assert.equal(calls[1].options.headers['X-CSRF-Token'],'test-csrf');}finally{globalThis.fetch=original;delete globalThis.document;}
});
