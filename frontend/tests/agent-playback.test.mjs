import test from 'node:test';
import assert from 'node:assert/strict';
import { planGoal } from '../src/workflow-state.ts';
import { replayFrame, replayLength } from '../src/agent-playback.ts';

test('visual replay respects parallel dependencies without changing the saved result',()=>{
 const run=planGoal('Export orders to Excel','2026-10-11');
 run.status='Done';run.reportId='existing-file';run.steps.forEach(step=>{step.status='Complete';});
 const before=JSON.stringify(run);
 const first=replayFrame(run,0);assert.equal(first.status,'Working');assert.ok(first.steps.every(s=>s.status==='Queued'));
 const afterRead=replayFrame(run,1);assert.equal(afterRead.steps[0].status,'Complete');
 const ready=afterRead.steps.filter(s=>s.status==='Queued'&&s.depends.every(id=>afterRead.steps.find(p=>p.id===id)?.status==='Complete'));
 assert.ok(ready.length>=2,'parallel agents become ready together');
 for(let tick=0;tick<=replayLength(run);tick++){
  const frame=replayFrame(run,tick);
  frame.steps.filter(s=>s.status==='Complete').forEach(s=>s.depends.forEach(id=>assert.equal(frame.steps.find(p=>p.id===id)?.status,'Complete')));
 }
 assert.equal(replayFrame(run,replayLength(run)).status,'Done');assert.equal(JSON.stringify(run),before);
});
