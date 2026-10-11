import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWorkspace, planGoal, runPreview, total, validateOrder, testKnowledge, canPublish } from '../src/workflow-state.ts';

test('goals select different dependency graphs and unknown intent requests clarification',()=>{
  const orders=planGoal('Export orders to Excel','2026-10-11');
  const inbox=planGoal('Find unanswered customers','2026-10-11');
  assert.equal(orders.kind,'orders');assert.equal(inbox.kind,'inbox');
  assert.ok(orders.steps.some(s=>s.title.includes('report')));
  assert.ok(!inbox.steps.some(s=>s.title.includes('report')));
  assert.equal(planGoal('Review my menu','All sample dates').kind,'knowledge');
  assert.equal(planGoal('Every day prepare orders','2026-10-11').kind,'automation');
  let state=initialWorkspace();state.runs=[planGoal('Something unrelated','2026-10-11')];
  state=runPreview(state,state.runs[0].id);assert.equal(state.runs[0].status,'Needs you');
});
test('preview respects dependencies, pause, immutable report snapshot and idempotent completion',()=>{
  let state=initialWorkspace();state.runs=[planGoal('Export orders to Excel','2026-10-11')];const id=state.runs[0].id;
  state.runs[0].status='Paused';assert.equal(runPreview(state,id),state);
  state.runs[0].status='Working';state=runPreview(state,id);
  assert.equal(state.runs[0].steps[0].status,'Complete');assert.equal(state.runs[0].steps[1].status,'Queued');
  for(let i=0;i<6;i++)state=runPreview(state,id);
  assert.equal(state.runs[0].status,'Done');assert.equal(state.reports.length,1);
  assert.equal(state.reports[0].date,'2026-10-11');
  const snapshot=state.reports[0].orders[0].quantity;state.orders[0].quantity=50;
  assert.equal(state.reports[0].orders[0].quantity,snapshot);
  assert.equal(runPreview(state,id).reports.length,1);
});
test('date coverage and confirmed sales do not include inquiries',()=>{
  let state=initialWorkspace();
  assert.equal(state.orders.filter(o=>o.status==='Confirmed').reduce((n,o)=>n+total(o),0),164);
  state.runs=[planGoal('Export orders','2026-10-12')];for(let i=0;i<8;i++)state=runPreview(state,state.runs[0].id);
  assert.equal(state.reports[0].orders.length,0);
  assert.match(state.reports[0].coverage,/No live WhatsApp history/);
});
test('invalid orders stop verification; approved knowledge edits invalidate publication',()=>{
  let state=initialWorkspace();state.orders[0].quantity=-1;
  assert.ok(validateOrder(state.orders[0]).length);
  assert.ok(validateOrder({...state.orders[0],quantity:1,unitPrice:1.234}).length);
  state.runs=[planGoal('Export orders','2026-10-11')];for(let i=0;i<8;i++)state=runPreview(state,state.runs[0].id);
  assert.equal(state.runs[0].status,'Needs you');assert.equal(state.reports.length,0);
  let k={...state.knowledge[0],status:'Approved'};k=testKnowledge(k);assert.equal(canPublish(k),true);
  assert.equal(canPublish({...k,revision:k.revision+1}),false);
  assert.equal(canPublish(testKnowledge({...k,scope:'Customer only',customer:''})),false);
});
