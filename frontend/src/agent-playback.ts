import type { Run } from './workflow-state';

/** Dependency-aware, display-only replay. Never changes the stored run or its result. */
function levels(run: Run) {
 const ranks = new Map<string, number>();
 for (let pass=0; pass<run.steps.length; pass++) for (const step of run.steps) {
  if (step.depends.every(id=>ranks.has(id))) ranks.set(step.id, step.depends.length ? 1+Math.max(...step.depends.map(id=>ranks.get(id)!)) : 0);
 }
 return ranks;
}
export function replayLength(run: Run) { return Math.max(0,...levels(run).values())+1; }
export function replayFrame(run: Run, tick: number): Run {
 const ranks=levels(run), finished=tick>=replayLength(run);
 const checking=run.steps.some(step=>ranks.get(step.id)===tick&&step.role==='Verifier');
 return {...run, status:finished?'Done':checking?'Validating':'Working', steps:run.steps.map(step=>({...step,status:(ranks.get(step.id)??Infinity)<tick?'Complete':'Queued'}))};
}
