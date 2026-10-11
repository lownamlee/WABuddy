import type { WorkspaceState, Run } from './workflow-state';
export type LiveNode={id:string;title:string;role:string;kind:string;status:string;depends:string[];detail?:string;error?:string;started?:number;finished?:number};
export type Artifact={id:string;name:string;revision:number;records:number;coverage:string;updated:number;verified:boolean;totals:Record<string,number>;run:string};
export type LiveRun={id:string;prompt:string;status:string;message?:string;nodes:LiveNode[];artifact?:Artifact;created:number;completed?:number;action?:string};
export type Schedule={id:string;goal:string;enabled:boolean;trigger:string;next_run?:number;schedule?:{time:string;timezone:string}};
export type Attention={id:string;chat:string;customer:string;kind:string;status:string;reason:string;evidence:{quote:string;message_id:string};answer?:string;owner_answer?:string;knowledge_ids?:string[];filtered:boolean};
export type Memory={id:string;chat:string;customer:string;question:string;answer:string;scope:string;updated:number};
export type LiveContext={ai_capacity?:{available:boolean;limit:number;active:number;workers:number;message:string};mode:string;account_id:string;connection:string;coverage:string;message_count:number;conversation_count:number;incoming_count:number;runs:LiveRun[];artifacts:Artifact[];schedules:Schedule[];attention:Attention[];knowledge:Memory[];activity?:{date:string;incoming:number;outgoing:number}[];order_preview?:{id:string;customer:string;item:string;quantity:number;unit_price:number|null;status:string;payment:string;delivery:string;artifact_id:string}[]};
export const emptyContext=():LiveContext=>({mode:'live',account_id:'',connection:'disconnected',coverage:'Synchronized WhatsApp history',message_count:0,conversation_count:0,incoming_count:0,runs:[],artifacts:[],schedules:[],attention:[],knowledge:[]});
export const runLabel=(status:string)=>({waiting_for_agent:'Waiting for agent',running:'Working',needs_input:'Needs you',failed:'Failed',cancelled:'Cancelled',completed:'Complete'}[status]||status);
export const nodeLabel=(status:string)=>({queued:'Waiting',working:'Working',done:'Complete',rejected:'Rejected',failed:'Failed',cancelled:'Cancelled'}[status]||status);
export function displayRun(run:LiveRun):Run {
 return {id:run.id,goal:run.prompt,liveStatus:runLabel(run.status),kind:'orders',range:new Date(run.created*1000).toLocaleString(),attachments:[],status:run.status==='completed'?'Done':run.status==='running'?'Working':run.status==='waiting_for_agent'?'Planning':'Needs you',created:new Date(run.created*1000).toISOString(),steps:run.nodes.map(n=>({id:n.id,title:n.title,role:n.role,kind:n.kind==='tool'?'Tool':'Agent',depends:n.depends,status:n.status==='done'?'Complete':n.status==='failed'||n.status==='rejected'?'Failed':'Queued',actualStatus:nodeLabel(n.status),detail:n.error||n.detail||''})),events:run.nodes.filter(n=>n.detail||n.error).map(n=>`${n.role}: ${n.error||n.detail}`)};
}
/** Presentation adapter only. No sample defaults, mutations, or simulated completion. */
export function workspaceView(c:LiveContext):WorkspaceState {
 return {version:1,attachments:[],runs:c.runs.map(displayRun),orders:[],
 threads:c.attention.map(a=>({id:a.id,customer:a.customer||a.chat,message:a.evidence?.quote||a.reason,category:a.filtered?'Suspicious':'Needs attention',reason:a.reason,paused:false,resolved:a.status!=='open',draft:a.owner_answer||a.answer||'',note:'',followUp:''})),
 knowledge:c.knowledge.map(k=>({id:k.id,title:k.question,answer:k.answer,scope:k.scope==='business'?'Business':'Customer only',customer:k.customer,source:'Owner-approved answer',status:'Published',revision:1,testedRevision:1,testResults:[]})),
 automations:c.schedules.map(s=>({id:s.id,goal:s.goal,time:s.schedule?.time||'On change',timezone:s.schedule?.timezone||'WhatsApp',scope:s.trigger,mode:'Independent service',status:s.enabled?'Scheduled preview':'Paused',revision:1,testedRevision:1})),
 reports:c.artifacts.map(a=>({id:a.id,date:new Date(a.updated*1000).toLocaleDateString(),range:`Revision ${a.revision}`,created:new Date(a.updated*1000).toISOString(),coverage:a.coverage,attention:[],orders:(c.order_preview||[]).filter(o=>o.artifact_id===a.id).map(o=>({id:o.id,customer:o.customer,item:o.item,quantity:o.quantity,unitPrice:o.unit_price??0,status:o.status==='confirmed'?'Confirmed':o.status==='cancelled'?'Cancelled':o.status==='inquiry'?'Inquiry':'Draft',payment:'Unpaid',delivery:o.delivery,source:'',date:'',revision:1}))}))};
}
export function activitySeries(c:LiveContext,days:number,now=new Date()) {
 const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const rows=Array.from({length:days},(_,i)=>{const date=new Date(end.getTime()-(days-1-i)*86400000).toISOString().slice(0,10),row=c.activity?.find(a=>a.date===date);return {date,label:new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'}),received:row?.incoming||0,handled:row?.outgoing||0};});
 const incoming=rows.reduce((s,r)=>s+r.received,0),outgoing=rows.reduce((s,r)=>s+r.handled,0);
 return {rows,incoming,outgoing,total:incoming+outgoing,percent:incoming+outgoing?Math.round(outgoing/(incoming+outgoing)*100):0};
}
