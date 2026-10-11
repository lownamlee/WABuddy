import { Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import type { WorkspaceState } from './workflow-state';
export type ReplyCase = {id:string;message:string;language:string;expected:string;sourceId:string;sourceRevision:number;decision:'Reply'|'Handoff';status:'Not run'|'Source checked'|'Needs source'};
/** Saved evidence is secondary; owners ask Buddy to prepare checks in conversation. */
export function ReplyLab({state,onAsk}:{state:WorkspaceState;onAsk:()=>void}){
 return <div className="cw-panel"><div className="cw-panel-head"><h2>Saved reply examples</h2><Button variant="outline" size="sm" onClick={onAsk}><Sparkles size={14}/>Ask Buddy to review</Button></div>{(state.replyTests||[]).map(example=><div className="cw-list-row" key={example.id}><span><strong>{example.message}</strong><p>{example.expected}</p><small>{example.status==='Source checked'?'Source version checked':'Awaiting review'} · AI reply not tested</small></span></div>)}{!state.replyTests?.length&&<p>No saved examples yet.</p>}</div>;
}
