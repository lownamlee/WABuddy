import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Clock3, RotateCcw, Square, Check, ChevronRight, FileSpreadsheet, FileText, MessageCircle, Network, Pause, Play, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { accountRequest, accountStorage } from './account-session';
import { initialWorkspace, planGoal, runPreview, uid, money, total, testKnowledge, canPublish, type WorkspaceState, type Order, type Thread, type Knowledge, type Run, type Report } from './workflow-state';
import { WorkspaceActivity } from './workspace-activity';
import { WorkspaceInsights } from './workspace-insights';
import { WorkspaceDesk } from './workspace-desk';
import { ShineBorder } from './components/ui/shine-border';
import { BlurFade } from './components/ui/blur-fade';
import { BaseEdge, getSmoothStepPath, type EdgeProps, Panel, Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, useNodesState, type Node, type NodeProps, type Edge } from '@xyflow/react';
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from './components/ui/base-node';
import '@xyflow/react/dist/style.css';
import './core-workspace.css';
import { ReplyLab } from './reply-lab';
import { BorderBeam } from './components/ui/border-beam';
import { useReducedMotion } from 'motion/react';
import { replayFrame, replayLength } from './agent-playback';
import './workspace-polish.css';
import { BuddyAssistant, type BuddyDraft } from './buddy-assistant';
import './buddy-compact.css';
import { LiveAgentWorkspace } from './live-agent-workspace';

type Change = (fn: (state: WorkspaceState) => WorkspaceState) => void;
type Go = (page: string) => void;
type Notice = (text: string) => void;
const clone = (state: WorkspaceState) => structuredClone(state);
function useWorkspace() {
  const [state,setState]=useState<WorkspaceState>(initialWorkspace);
  const [storage,setStorage]=useState('Loading workspace…');
  const [ready,setReady]=useState(false);
  const revision=useRef(0), latest=useRef(state), saved=useRef(state), saving=useRef(false), blocked=useRef(false);
  latest.current=state;
  useEffect(()=>{
    let active=true;
    accountRequest('/api/workspace').then(result=>{
      if(!active)return;
      const value=result.state || initialWorkspace();
      revision.current=result.revision;latest.current=value;saved.current=result.state ? value : initialWorkspace();
      setState(value);setStorage('Saved');setReady(true);
    }).catch(()=>{
      if(!active)return;
      try{const cached=JSON.parse(localStorage.getItem(accountStorage('wabuddy-workspace-v1'))||'null');if(cached?.version===1){setState(cached);latest.current=cached;}}catch{/* Recover with sample data. */}
      blocked.current=true;setStorage('Browser only · backend unavailable');setReady(true);
    });
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem(accountStorage('wabuddy-workspace-v1'),JSON.stringify(state));}catch{setStorage('Storage full · changes are session-only');}
    const timer=setTimeout(async()=>{
      if(saving.current||blocked.current||saved.current===latest.current)return;
      saving.current=true;
      try{
        while(saved.current!==latest.current){
          const value=latest.current;
          const result=await accountRequest('/api/workspace',{expected_revision:revision.current,state:value});
          revision.current=result.revision;saved.current=value;setStorage('Saved');
        }
      }catch(error){blocked.current=true;setStorage(`${error instanceof Error?error.message:'Save failed'} · local copy retained; reload to sync`);}
      finally{saving.current=false;}
    },300);
    return()=>clearTimeout(timer);
  },[state,ready]);
  useEffect(()=>{
    if(!ready)return;
    const timer=setInterval(async()=>{
      if(saving.current||blocked.current||saved.current!==latest.current)return;
      try{const result=await accountRequest('/api/workspace');if(result.state&&result.revision!==revision.current&&!saving.current&&saved.current===latest.current){revision.current=result.revision;latest.current=result.state;saved.current=result.state;setState(result.state);setStorage('Saved');}}catch{/* Keep the last confirmed state during a temporary outage. */}
    },5000);
    return()=>clearInterval(timer);
  },[ready]);
  return {state,change:setState as Change,storage,ready};
}
function Tag({children,tone='green'}:{children:ReactNode;tone?:string}) {return <Badge variant="secondary" className={`cw-tag ${tone}`}>{children}</Badge>;}
function Header({title,detail,actions}:{title:string;detail?:string;actions?:ReactNode}){return <div className="cw-heading"><div><h1>{title}</h1>{detail&&<p>{detail}</p>}</div><div className="cw-actions">{actions}</div></div>;}
function Modal({title,detail,children,close}:{title:string;detail?:string;children:ReactNode;close:()=>void}){
 const [open,setOpen]=useState(true), reduced=useReducedMotion();
 const closeRef=useRef(close);closeRef.current=close;
 const opener=useRef(document.activeElement as HTMLElement | null);
 // Keep the parent mounted while Radix runs its documented data-state exit animation.
 useEffect(()=>{if(open)return;const timer=setTimeout(()=>closeRef.current(),reduced?0:240);return()=>clearTimeout(timer);},[open,reduced]);
 return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="cw-dialog" onCloseAutoFocus={event=>{event.preventDefault();if(opener.current?.isConnected)opener.current.focus();}}><DialogHeader><span className="cw-dialog-emblem"><Sparkles size={21}/></span><DialogTitle>{title}</DialogTitle><DialogDescription>{detail||'Fictional workspace · changes do not affect WhatsApp.'}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}
function Empty({children}:{children:ReactNode}){return <div className="cw-empty"><FileText size={24}/><p>{children}</p></div>;}
function Filters({values,value,onChange}:{values:string[];value:string;onChange:(v:string)=>void}){return <div className="cw-filters" role="group" aria-label="Filter view">{values.map(v=><button key={v} aria-pressed={value===v} onClick={()=>onChange(v)}>{v}</button>)}</div>;}
function SearchBox({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}){return <div className="cw-search"><Search size={15}/><Input aria-label={label} placeholder={label} value={value} onChange={e=>onChange(e.target.value)}/></div>;}
function Person({name}:{name:string}){return <span className="cw-avatar">{name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>;}
function Evidence({title,text,close}:{title:string;text:string;close:()=>void}){return <Modal title={title} detail="Source evidence · fictional sample" close={close}><blockquote className="cw-quote">{text}</blockquote><Tag tone="neutral">Sample message · 11 Oct 2026 · Asia/Singapore</Tag></Modal>;}

export function Workspace({page,go}:{page:string;go:Go}){
  return <LiveAgentWorkspace page={page} go={go}/>;
}

export function PreviewWorkspace({page,go}:{page:string;go:Go}){
  const {state,change,storage,ready}=useWorkspace();
  const [notice,setNotice]=useState('');
  const [focus,setFocus]=useState('');
  useEffect(()=>{
    if(!ready)return;
    const waiting=state.threads.filter(t=>!t.resolved).length;
    const notifications=[
      ...(waiting?[{title:`${waiting} conversations need review`,detail:'Sample inbox',page:'Smart inbox'}]:[]),
      ...(state.reports.length?[{title:`${state.reports.length} sample reports ready`,detail:'Verified workbook snapshots',page:'Reports'}]:[]),
      ...(state.runs.length?[{title:state.runs[0].goal,detail:`Preview: ${state.runs[0].status}`,page:'Agent team'}]:[]),
    ];
    window.dispatchEvent(new CustomEvent('wabuddy-workspace-notifications',{detail:notifications}));
  },[state,ready]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
  const start=(goal:string,range:string,attachments:string[])=>{
    const run=planGoal(goal,range,attachments);
    run.status='Working'; // The conversation already presented the plan for approval.
    change(s=>({...s,runs:[run,...s.runs]}));setFocus(run.id);go('Agent team');
  };
  if(!ready)return <div className="cw-page"><Empty>Loading the workspace…</Empty></div>;
  return <div className="cw-page"><div className="cw-preview"><span><i/>Sample workspace</span><small>{storage}</small></div>
    {page==='Chat'?<ChatPage state={state} start={start} go={go}/>: 
    page==='Dashboard'?<Overview state={state} go={go}/>:
    page==='Agent team'?<RunBoard state={state} change={change} focus={focus} setFocus={setFocus} go={go} notice={setNotice}/>:
    page==='Smart inbox'?<Inbox state={state} change={change} notice={setNotice}/>:
    page==='Orders'?<Orders state={state} start={start} go={go}/>:
    page==='Customers'?<Customers state={state} start={start}/>:
    page==='Schedule'?<Automations state={state} change={change} notice={setNotice}/>:
    page==='Reports'?<Reports state={state} notice={setNotice} go={go}/>:
    <KnowledgePage state={state} change={change} start={start}/>}
    {notice&&<div className="cw-notice" role="status"><Check size={16}/>{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={15}/></button></div>}
  </div>;
}
/** Composition based on assistant-ui and shadcn-admin; upstream widgets retain licenses. */
function ChatPage({state,start,go}:{state:WorkspaceState;start:(g:string,r:string,a:string[])=>void;go:Go}){
 return <div className="cw-chat-page"><Header title="Chat" actions={<Button variant="ghost" onClick={()=>go('Agent team')}><Network size={15}/>Agent team</Button>}/><BuddyAssistant onApprove={draft=>start(draft.goal,draft.scope==='Today'?'2026-10-11':'All sample dates',draft.files)}/>{state.reports.length>0&&<button className="cw-chat-file" onClick={()=>go('Reports')}><span className="cw-file-icon"><FileSpreadsheet size={20}/></span><span><strong>Latest result</strong><small>Order summary.xlsx · {state.reports[0].orders.length} records</small></span><ArrowRight size={16}/></button>}</div>;
}
function Overview({state,go}:{state:WorkspaceState;go:Go}){
 const waiting=state.threads.filter(t=>!t.resolved);

 return <div className="cw-overview"><Header title="Dashboard" actions={<Button onClick={()=>go('Chat')}><Plus size={15}/>New chat</Button>}/>
 <div className="cw-dashboard-summary"><span><i/>{state.runs.filter(r=>r.status==='Done').length} completed</span><span>{waiting.length} need you</span><span>{state.reports.length} {state.reports.length===1?'file':'files'} ready</span></div>
 <BlurFade inView className="cw-reveal" blur="4px"><WorkspaceActivity/></BlurFade>
 <WorkspaceInsights state={state} go={go}/>
 <WorkspaceDesk state={state} go={go}/></div>;
}

type TaskNode = Node<{ title:string; role:string; status:string; icon:string; source:boolean; target:boolean }, 'task'>;
const taskTitles:Record<string,string> = {
  'Check conversation coverage':'Read conversations', 'Extract order changes':'Organise orders',
  'Find unresolved questions':'Find unanswered questions', 'Check prices and sources':'Check prices',
  'Validate totals and duplicates':'Verify orders', 'Prepare report and follow-ups':'Prepare report',
};
function taskTitle(title:string){return taskTitles[title]||title;}
// Official React Flow BaseNode registry component, with Langflow's dotted editor composition.
function WorkflowTask({data}:NodeProps<TaskNode>){
  const reduceMotion=useReducedMotion();
  const Icon=data.icon==='orders'?ShoppingBag:data.icon==='chat'?MessageCircle:data.icon==='knowledge'?BookOpen:data.icon==='check'?ShieldCheck:data.icon==='report'?FileSpreadsheet:Sparkles;
  return <BaseNode className={`cw-flow-node ${data.status.toLowerCase().replaceAll(' ','-')}`}>
    {data.target&&<Handle type="target" position={Position.Left}/>}
    <BaseNodeHeader><span className={`cw-node-icon ${data.icon}`}><Icon size={18}/></span><span className="cw-node-role">{data.role==='Coordinator'?'Buddy':data.role.replace(' agent','')}</span></BaseNodeHeader>
    {data.status==='Working'&&!reduceMotion&&<BorderBeam size={90} duration={3} borderWidth={2} colorFrom="#b2e79a" colorTo="#249578"/>}
    <BaseNodeContent><BaseNodeHeaderTitle>{data.title}</BaseNodeHeaderTitle><span className="cw-node-status">{data.status==='Complete'?<Check size={13}/>:data.status==='Paused'?<Pause size={12}/>:<i/>}{data.status}</span></BaseNodeContent>
    {data.source&&<Handle type="source" position={Position.Right}/>}
  </BaseNode>;
}
// Adapted from React Flow's official Animating Edges example (SVG animateMotion).
function HandoffEdge(props:EdgeProps){
 const [path]=getSmoothStepPath({...props,borderRadius:18});
 const reduceMotion=useReducedMotion();
 return <><BaseEdge id={props.id} path={path} style={props.style}/>{props.data?.active&&!reduceMotion?<g className="cw-handoff-packet"><circle r="9" fill="#70c596" opacity=".16"><animateMotion dur="1.8s" repeatCount="indefinite" path={path}/></circle><circle r="3.5" fill="#278e60"><animateMotion dur="1.8s" repeatCount="indefinite" path={path}/></circle></g>:null}</>;
}
const workflowEdgeTypes={handoff:HandoffEdge};
const workflowNodeTypes={task:WorkflowTask};
export function WorkflowCanvas({run,onSelect}:{run:Run;onSelect:(id:string)=>void}){
  const graph=useMemo(()=>{
    const ranks=new Map<string,number>();
    // Resolve dependency levels without relying on array order.
    for(let pass=0;pass<run.steps.length;pass++) for(const step of run.steps){
      if(step.depends.every(id=>ranks.has(id))) ranks.set(step.id,step.depends.length?1+Math.max(...step.depends.map(id=>ranks.get(id)!)):0);
    }
    const levels=new Map<number,string[]>();
    for(const step of run.steps){const rank=ranks.get(step.id)||0;levels.set(rank,[...(levels.get(rank)||[]),step.id]);}
    const nodes:TaskNode[]=run.steps.map(step=>{
      const rank=ranks.get(step.id)||0,peers=levels.get(rank)!;
      const ready=step.depends.every(id=>run.steps.find(s=>s.id===id)?.status==='Complete');
      const status=step.actualStatus||(step.status==='Complete'?'Complete':step.status==='Failed'?'Needs review':run.status==='Paused'?'Paused':ready&&['Working','Validating'].includes(run.status)?'Working':run.status==='Planning'?'Planned':'Waiting');
      return {id:step.id,type:'task',position:{x:rank*250,y:170+(peers.indexOf(step.id)-(peers.length-1)/2)*190},data:{title:taskTitle(step.title),role:step.role,status,icon:/excel|report|spreadsheet/i.test(step.title+' '+step.role)?'report':step.role==='Verifier'?'check':/order/i.test(step.role)?'orders':/conversation/i.test(step.role)?'chat':/knowledge/i.test(step.role)?'knowledge':'buddy',target:step.depends.length>0,source:run.steps.some(s=>s.depends.includes(step.id))}};
    });
    const edges:Edge[]=run.steps.flatMap(step=>step.depends.map(id=>{
      const sourceDone=run.steps.find(s=>s.id===id)?.status==='Complete';
      const active=step.actualStatus?sourceDone&&step.actualStatus==='Working':sourceDone&&step.status==='Queued'&&['Working','Validating'].includes(run.status);
      return {id:`${id}-${step.id}`,source:id,target:step.id,type:'handoff',data:{active},style:{stroke:active?'#60a782':step.status==='Complete'?'#a0c6af':'#d8e2dc',strokeWidth:active?2:1.5}};
    }));
    return {nodes,edges};
  },[run]);
  const [nodes,setNodes,onNodesChange]=useNodesState<TaskNode>(graph.nodes);
  useEffect(()=>setNodes(previous=>graph.nodes.map(node=>{const old=previous.find(n=>n.id===node.id);return old?{...node,position:old.position,selected:old.selected}:node;})),[graph.nodes,setNodes]);
  return <div className="cw-flow-canvas"><ReactFlow nodes={nodes} edges={graph.edges} nodeTypes={workflowNodeTypes} edgeTypes={workflowEdgeTypes} onNodesChange={onNodesChange} onNodeClick={(_,node)=>onSelect(node.id)} onNodeDoubleClick={(_,node)=>onSelect(node.id)} fitView fitViewOptions={{padding:0.12,maxZoom:1}} minZoom={0.25} maxZoom={1.5} nodesConnectable={false} deleteKeyCode={null} colorMode="light" aria-label="Agent workflow canvas">
    <Panel position="top-left"><div className="cw-canvas-label"><Network size={14}/>{run.steps.length} agents & tools<span>•</span>{run.liveStatus||(run.status==='Done'?'Completed':run.status==='Working'?'Passing work forward':run.status)}</div></Panel><Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d5dfd8" bgColor="#fcfdfc"/><Controls showInteractive={false}/>
  </ReactFlow></div>;
}
function RunBoard({state,change,focus,setFocus,go,notice}:{state:WorkspaceState;change:Change;focus:string;setFocus:(id:string)=>void;go:Go;notice:Notice}){
  const run=state.runs.find(r=>r.id===focus)||state.runs[0];
  const [details,setDetails]=useState(false),[selected,setSelected]=useState('');
  const [replay,setReplay]=useState<number|null>(null),[replayPaused,setReplayPaused]=useState(false);
  const displayRun=run&&replay!==null?replayFrame(run,replay):run;
  useEffect(()=>{setReplay(null);setReplayPaused(false);},[run?.id]);
  useEffect(()=>{if(!run||replay===null||replayPaused)return;const t=setTimeout(()=>setReplay(replay>=replayLength(run)?null:replay+1),2200);return()=>clearTimeout(t);},[run,replay,replayPaused]);
  useEffect(()=>{setSelected('');setDetails(false);},[run?.id]);
  useEffect(()=>{
    if(!run||!['Working','Validating'].includes(run.status))return;
    const timer=setTimeout(()=>change(s=>runPreview(s,run.id)),650);
    return()=>clearTimeout(timer);
  },[run,change]);
  function update(fn:(r:Run)=>void){change(s=>{const n=clone(s);fn(n.runs.find(r=>r.id===run.id)!);return n;});}
  const chosen=run?.steps.find(step=>step.id===selected);
  const stage=displayRun?.status==='Done'?3:displayRun?.status==='Planning'?0:displayRun?.status==='Validating'||displayRun?.status==='Needs you'?2:1;
  const completed=displayRun?.steps.filter(step=>step.status==='Complete').length||0;
  const activeStep=displayRun?.steps.find(step=>step.status==='Queued'&&step.depends.every(id=>displayRun.steps.find(s=>s.id===id)?.status==='Complete'));
  return <div className="cw-agent-page"><Header title="Agent team" actions={<Button variant="outline" onClick={()=>go('Chat')}><Plus size={15}/>New goal</Button>}/>
    {!run?<Empty>Start a goal to see your agent team.</Empty>:<>
      <div className="cw-toolbar"><select aria-label="Select goal run" value={run.id} onChange={e=>setFocus(e.target.value)}>{state.runs.map(r=><option key={r.id} value={r.id}>{r.goal}</option>)}</select><div className="cw-actions">{run.status==='Done'&&(replay===null?<Button variant="outline" onClick={()=>{setReplay(0);setReplayPaused(false);}}><RotateCcw size={14}/>Replay</Button>:<><Button variant="outline" onClick={()=>setReplayPaused(!replayPaused)}>{replayPaused?<Play size={14}/>:<Pause size={14}/>} {replayPaused?'Continue':'Pause replay'}</Button><Button variant="ghost" onClick={()=>setReplay(null)}><Square size={13}/>Stop</Button></>)}<Tag tone={replay!==null?'green':'neutral'}>{replay!==null?'Visual replay':'Simulated run'}</Tag></div></div>
      <section className="cw-flow-board" aria-label="Agent team board">
        <div className="cw-flow-heading"><div><h2>{run.goal}</h2><p>{run.range}{run.attachments.length>0&&` · ${run.attachments.length} files`}</p></div><ol className="cw-flow-stages" aria-label="Workflow progress">{['Plan','Work','Check','Result'].map((name,i)=><li key={name} className={i<stage?'complete':i===stage?'current':''} aria-current={i===stage?'step':undefined}><span>{i<stage?<Check size={12}/>:i+1}</span>{name}</li>)}</ol></div>
        <WorkflowCanvas key={run.id} run={replay!==null&&replayPaused?{...displayRun,status:'Paused'}:displayRun} onSelect={setSelected}/><div className="cw-run-progress" role="progressbar" aria-label="Steps completed" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={run.steps.length}><span style={{width:`${completed/Math.max(1,run.steps.length)*100}%`}}/></div>
        <div className="cw-flow-bottom"><span className="cw-flow-summary-icon">{displayRun.status==='Done'?<Check size={20}/>:<Sparkles size={20}/>}</span><div><strong>{replay!==null?(replayPaused?'Replay paused':activeStep?taskTitle(activeStep.title):'Replay complete'):run.status==='Done'?'Your result is ready':run.status==='Planning'?'Review your plan':run.status==='Paused'?'Run paused':run.status==='Needs you'?'Your input is needed':'Your team is working'}</strong><small>{replay!==null?'Visual replay · ':''}{completed} of {run.steps.length} steps complete</small></div><div className="cw-actions">
          {run.status==='Planning'&&<Button onClick={()=>update(r=>{r.status='Working';r.events.push('Preview started using fictional data.');})}><Play size={15}/>Approve & preview</Button>}
          {['Working','Validating'].includes(run.status)&&<Button variant="outline" onClick={()=>update(r=>{r.status='Paused';r.events.push('Preview paused by owner.');})}><Pause size={15}/>Pause</Button>}
          {run.status==='Paused'&&<Button onClick={()=>update(r=>{r.status='Working';r.events.push('Preview resumed.');})}><Play size={15}/>Resume</Button>}
          <Button variant="outline" onClick={()=>setDetails(!details)}><FileText size={15}/>{details?'Hide':'View'} activity</Button>
          {run.status==='Done'&&<Button onClick={()=>go(run.kind==='orders'?'Reports':'Smart inbox')}>Open result<ArrowRight size={15}/></Button>}
          {run.status==='Needs you'&&<><Button onClick={()=>go(run.kind==='knowledge'?'Knowledge':run.kind==='automation'?'Schedule':run.kind==='clarify'?'Chat':'Orders')}>Review<ArrowRight size={15}/></Button>{run.steps.some(s=>s.status==='Failed')&&<Button variant="outline" onClick={()=>update(r=>{r.steps.forEach(s=>{if(s.status==='Failed')s.status='Queued';});r.status='Working';})}>Retry step</Button>}</>}
        </div></div>
      </section>
      <p className="cw-canvas-hint">Select a step for details · Drag to explore</p>
      {chosen&&<Card className="cw-panel cw-step-inspector"><div className="cw-panel-head"><div><Tag tone={chosen.status==='Failed'?'red':'green'}>{chosen.role}</Tag><h2>{taskTitle(chosen.title)}</h2></div><Button variant="ghost" size="icon" aria-label="Close step details" onClick={()=>setSelected('')}><X size={17}/></Button></div><p>{chosen.detail||'Included in your plan. Waiting to start.'}</p>{chosen.depends.length>0&&<div className="cw-dependencies"><span>Receives from</span>{chosen.depends.map(id=><button key={id} onClick={()=>setSelected(id)}>{taskTitle(run.steps.find(s=>s.id===id)?.title||id)}<ChevronRight size={12}/></button>)}</div>}</Card>}
      {details&&<Card className="cw-panel cw-run-evidence"><div className="cw-panel-head"><h2>Run activity</h2><Tag tone="neutral">Sample data</Tag></div><ol className="cw-events">{run.events.map((event,i)=><li key={i}>{event}</li>)}</ol><Button variant="ghost" size="sm" onClick={()=>notice('This preview uses sample data. No live agents or customer messages.')}>About this preview</Button></Card>}
    </>}
  </div>;
}
function Inbox({state,change,notice}:{state:WorkspaceState;change:Change;notice:Notice}){
  const [filter,setFilter]=useState('Needs attention'),[query,setQuery]=useState(''),[selected,setSelected]=useState(state.threads[0]?.id||''),[source,setSource]=useState(false);
  const rows=state.threads.filter(t=>(filter==='All'||(filter==='Resolved'?t.resolved:filter==='AI handled'?t.category===filter:!t.resolved&&t.category===filter))&&`${t.customer} ${t.message}`.toLowerCase().includes(query.toLowerCase()));
  const thread=rows.find(t=>t.id===selected)||rows[0];
  const update=(patch:Partial<Thread>)=>change(s=>({...s,threads:s.threads.map(t=>t.id===thread?.id?{...t,...patch}:t)}));
  if(!thread)return <><Header title="Smart inbox"/><div className="cw-toolbar"><Filters values={['Needs attention','Orders','Suspicious','AI handled','Resolved','All']} value={filter} onChange={setFilter}/><SearchBox value={query} onChange={setQuery} label="Search inbox"/></div><Empty>No conversations in this view.</Empty></>;
  const teach=()=>{if(!thread.draft.trim())return;if(state.knowledge.some(k=>k.customer===thread.customer&&k.answer===thread.draft)){notice('This answer is already in Knowledge.');return;}change(s=>({...s,knowledge:[{id:uid(),title:`Answer for ${thread.customer}`,answer:thread.draft,source:`${thread.customer}: ${thread.message} · owner draft`,scope:'Customer only',customer:thread.customer,status:'Candidate',revision:1,testedRevision:0,testResults:[]},...s.knowledge]}));notice('Candidate saved in Knowledge. Review its scope before publication.');};
  return <><Header title="Smart inbox"/><div className="cw-toolbar"><Filters values={['Needs attention','Orders','Suspicious','AI handled','Resolved','All']} value={filter} onChange={setFilter}/><SearchBox value={query} onChange={setQuery} label="Search inbox"/></div>
    <div className="cw-inbox"><Card className="cw-thread-list">{rows.length?rows.map(t=><button className={t.id===selected?'selected':''} key={t.id} onClick={()=>{setSelected(t.id);setSource(false);}}><Person name={t.customer}/><span><strong>{t.customer}</strong><small>{t.message}</small><Tag tone={t.category==='Suspicious'?'red':'neutral'}>{t.resolved?'Resolved':t.category}</Tag></span></button>):<Empty>No conversations in this view.</Empty>}</Card>
    <Card className="cw-thread"><header><Person name={thread.customer}/><div><h2>{thread.customer}</h2><small>{thread.paused?'Owner handling · automation paused':'Eligible for automation · preview'}</small></div><Button variant="outline" size="sm" onClick={()=>update({paused:!thread.paused})}>{thread.paused?'Resume Buddy':'Take over'}</Button></header>
      <div className="cw-thread-body"><Tag tone="neutral">11 October · sample conversation</Tag><blockquote>{thread.message}</blockquote><div className="cw-coverage"><ShieldCheck size={17}/><p>{thread.reason}</p></div><Button variant="ghost" onClick={()=>setSource(true)}>View source<ChevronRight size={14}/></Button>{thread.resolved&&<Tag>Resolved</Tag>}</div>
      <div className="cw-draft"><textarea aria-label="Owner reply draft" placeholder="Write an owner reply…" value={thread.draft} onChange={e=>update({draft:e.target.value})} maxLength={5000}/><div className="cw-actions"><Button variant="outline" disabled={!thread.draft.trim()} onClick={teach}><BookOpen size={15}/>Teach Buddy</Button><Button onClick={()=>{update({resolved:!thread.resolved,paused:true});notice(thread.resolved?'Conversation reopened.':'Marked resolved. Reply stays as a draft.');}}>{thread.resolved?'Reopen':'Resolve'}</Button></div><small>Draft saved automatically. No WhatsApp message is sent.</small></div></Card></div>
    {source&&<Evidence title={`${thread.customer} · source`} text={thread.message} close={()=>setSource(false)}/>}</>;
}
function Orders({state,start,go}:{state:WorkspaceState;start:(g:string,r:string,a:string[])=>void;go:Go}){
 const [filter,setFilter]=useState('All'),[query,setQuery]=useState(''),[selected,setSelected]=useState<Order|null>(null);
 const rows=state.orders.filter(order=>(filter==='All'||order.status===filter)&&`${order.id} ${order.customer} ${order.item}`.toLowerCase().includes(query.toLowerCase()));
 return <><Header title="Orders" actions={<Button variant="outline" onClick={()=>go('Reports')}><FileSpreadsheet size={15}/>Files</Button>}/>
 <Card className="cw-panel"><div className="cw-toolbar"><Filters values={['All','Inquiry','Draft','Confirmed','Cancelled']} value={filter} onChange={setFilter}/><SearchBox value={query} onChange={setQuery} label="Search orders"/></div><Table><TableHeader><TableRow>{['Customer','Order','Status','Amount',''].map(title=><TableHead key={title}>{title}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(order=><TableRow key={order.id}><TableCell><strong>{order.customer}</strong><small>{order.id}</small></TableCell><TableCell>{order.quantity} × {order.item}<small>{order.delivery||'Needs confirmation'}</small></TableCell><TableCell><Tag tone={order.status==='Confirmed'?'green':'neutral'}>{order.status}</Tag></TableCell><TableCell>{money(total(order))}</TableCell><TableCell><Button variant="ghost" onClick={()=>setSelected(order)}>View<ChevronRight size={14}/></Button></TableCell></TableRow>)}</TableBody></Table></Card>
 {selected&&<Modal title={`${selected.id} · ${selected.customer}`} detail="Review the source or ask Buddy for a change." close={()=>setSelected(null)}><div className="cw-knowledge-review">{selected.quantity} × {selected.item} · {money(total(selected))}<p>{selected.delivery}</p></div><details><summary>Original message</summary><blockquote className="cw-quote">{selected.source}</blockquote></details><BuddyAssistant compact seed={`Review order ${selected.id} for ${selected.customer}. `} onApprove={draft=>start(draft.goal,'All sample dates',draft.files)}/></Modal>}</>;
}
function Customers({state,start}:{state:WorkspaceState;start:(g:string,r:string,a:string[])=>void}){
 const [query,setQuery]=useState(''),[id,setId]=useState('');const person=state.threads.find(thread=>thread.id===id);
 return <><Header title="Customers"/><Card className="cw-panel"><div className="cw-toolbar"><span>{state.threads.length} customers</span><SearchBox value={query} onChange={setQuery} label="Search customers"/></div>{state.threads.filter(thread=>thread.customer.toLowerCase().includes(query.toLowerCase())).map(thread=><button className="cw-list-row" key={thread.id} onClick={()=>setId(thread.id)}><Person name={thread.customer}/><span><strong>{thread.customer}</strong><small>{thread.note||thread.reason}</small></span><ChevronRight size={15}/></button>)}</Card>
 {person&&<Modal title={person.customer} detail="Customer context" close={()=>setId('')}><blockquote className="cw-quote">{person.message}</blockquote>{person.note&&<p>{person.note}</p>}{person.followUp&&<p>Follow up: {person.followUp.replace('T',' ')}</p>}<BuddyAssistant compact seed={`Help me follow up with ${person.customer}. `} onApprove={draft=>start(draft.goal,'All sample dates',draft.files)}/></Modal>}</>;
}
function KnowledgePage({state,change,start}:{state:WorkspaceState;change:Change;start:(g:string,r:string,a:string[])=>void}){
 const [selected,setSelected]=useState<Knowledge|null>(null),[seed,setSeed]=useState(''),[editingId,setEditingId]=useState('');
 const approve=(draft:BuddyDraft)=>{
  if(/if you|if a customer|whenever|every |check whether|unsure|cannot answer/i.test(draft.goal)){start(`Review knowledge: ${draft.goal}`,'All sample dates',draft.files);return;}
  const old=state.knowledge.find(item=>item.id===editingId);
  let item:Knowledge={id:old?.id||uid(),title:old?.title||draft.goal.slice(0,65),answer:draft.goal,scope:old?.scope||'Business',customer:old?.customer||'',source:'Owner conversation with Buddy · UI preview',status:draft.scope==='Save as a draft'?'Candidate':'Approved',revision:(old?.revision||0)+1,testedRevision:0,testResults:[]};
  if(item.status==='Approved'){item=testKnowledge(item);if(canPublish(item))item={...item,status:'Published'};}
  change(current=>({...current,knowledge:current.knowledge.some(existing=>existing.id===item.id)?current.knowledge.map(existing=>existing.id===item.id?item:existing):[item,...current.knowledge]}));
  setEditingId('');return item.status==='Published'?'Remembered in your preview library.':'Saved as a draft in your preview library.';
 };
 const edit=(item:Knowledge)=>{setEditingId(item.id);setSeed(item.answer||`The answer to “${item.title}” is `);setSelected(null);};
 return <><Header title="Knowledge"/><div className="cw-conversation-layout"><BuddyAssistant mode="knowledge" seed={seed} audience={state.knowledge.find(item=>item.id===editingId)?.scope==='Customer only'?`Only ${state.knowledge.find(item=>item.id===editingId)?.customer}`:'All customers'} onApprove={approve}/><aside className="cw-memory-rail"><header><h2>What Buddy knows</h2><span>{state.knowledge.filter(item=>item.status==='Published').length} saved</span></header>{state.knowledge.filter(item=>item.status!=='Rejected').map(item=><button className="cw-memory-row" key={item.id} onClick={()=>setSelected(item)}><BookOpen size={17}/><span><strong>{item.title}</strong><p>{item.answer||'Waiting for your answer'}</p><small>{item.status==='Published'?'Remembered':item.status==='Candidate'?'Needs your answer':'Ready for review'}{item.scope==='Customer only'?` · ${item.customer}`:''}</small></span><ChevronRight size={14}/></button>)}</aside></div>
 <details className="cw-reply-records"><summary><ShieldCheck size={15}/>Reply checks<small>{state.replyTests?.length||0} saved examples</small></summary><ReplyLab state={state} onAsk={()=>{setEditingId('');setSeed('Check whether you can answer customer questions using our approved knowledge.');}}/></details>
 {selected&&<Modal title={selected.title} detail="Saved business knowledge" close={()=>setSelected(null)}><div className="cw-knowledge-review">{selected.answer||'Buddy needs your answer to this question.'}</div><div className="cw-fact-meta"><span>{selected.scope==='Customer only'?selected.customer:'Business knowledge'}</span><span>{selected.status==='Published'?'Remembered':'Needs review'}</span></div><details><summary>Source</summary><p>{selected.source}</p></details><Button className="cw-buddy-action" onClick={()=>edit(selected)}><ShineBorder className="buddy-shine" duration={4} borderWidth={2} shineColor={['#7de3c1','#a69bff','#ffd79b']}/><Sparkles size={15}/>{selected.answer?'Ask Buddy to update':'Give Buddy the answer'}</Button></Modal>}</>;
}
function Automations({state,change,notice}:{state:WorkspaceState;change:Change;notice:Notice}){
 const [seed,setSeed]=useState(''),[preview,setPreview]=useState<BuddyDraft|null>(null);
 return <><Header title="Schedule"/><div className="cw-conversation-layout"><BuddyAssistant mode="automation" seed={seed} onApprove={draft=>{setPreview(draft);return 'Task plan approved in preview.';}}/><aside className="cw-memory-rail"><header><h2>On your schedule</h2><span>{state.automations.length} {state.automations.length===1?'task':'tasks'}</span></header>{preview&&<div className="cw-memory-row"><Check size={17}/><span><strong>{preview.goal}</strong><small>Plan approved · Preview only</small><p>{preview.scope}</p></span></div>}{state.automations.length?state.automations.map(task=><div key={task.id} className="cw-memory-row"><span className="cw-schedule-clock"><Clock3 size={16}/><b>{task.time}</b></span><span><strong>{task.goal}</strong><small>{task.timezone}</small><p>{task.status==='Paused'?'Paused':'Preview schedule'}</p><div className="cw-actions" style={{marginTop:12}}><Button variant="outline" size="sm" onClick={()=>setSeed(`Update this recurring task: ${task.goal}. `)}>Ask for a change</Button><Button variant="ghost" size="sm" aria-label={task.status==='Paused'?'Resume preview schedule':'Pause preview schedule'} onClick={()=>{change(current=>({...current,automations:current.automations.map(item=>item.id===task.id?{...item,status:item.status==='Paused'?'Scheduled preview':'Paused'}:item)}));notice('Preview schedule updated.');}}>{task.status==='Paused'?<Play size={13}/>:<Pause size={13}/>}</Button></div></span></div>):<Empty>Your recurring tasks will appear here.</Empty>}<p className="cw-muted">Preview only · no background tasks are running.</p></aside></div></>;
}
async function downloadReport(report:Report,notice:Notice){
  try{
    const result=await accountRequest('/api/workspace/report',{report});
    const bytes=Uint8Array.from(atob(result.content_base64),(c)=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const a=document.createElement('a');a.href=url;a.download=`wabuddy-sample-${report.date}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('Excel downloaded · Orders, Summary and Needs Attention.');
  }catch(error){notice(error instanceof Error?error.message:'Report download failed.');}
}
function Reports({state,notice,go}:{state:WorkspaceState;notice:Notice;go:Go}){
  const [report,setReport]=useState<Report|null>(null);
  return <><Header title="Files" actions={<Button variant="outline" onClick={()=>go('Chat')}><MessageCircle size={15}/>Back to Chat</Button>}/>{!state.reports.length?<Empty>Ask Buddy to create your first file.</Empty>:<Card className="cw-panel"><Table><TableHeader><TableRow><TableHead>File</TableHead><TableHead>Scope</TableHead><TableHead>Records</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{state.reports.map(r=><TableRow key={r.id}><TableCell><button className="cw-file-name" onClick={()=>setReport(r)}><span className="cw-file-icon"><FileSpreadsheet size={20}/></span><span><strong>Order summary.xlsx</strong><small>Excel workbook · Sample result</small></span></button></TableCell><TableCell>{r.range}</TableCell><TableCell>{r.orders.length}</TableCell><TableCell><div className="cw-actions"><Button variant="ghost" size="sm" onClick={()=>setReport(r)}>Preview</Button><Button variant="outline" size="sm" onClick={()=>void downloadReport(r,notice)}><ArrowDownToLine size={14}/>Download</Button></div></TableCell></TableRow>)}</TableBody></Table></Card>}

    {report&&<Modal title="Report preview" detail="Saved result · sample data" close={()=>setReport(null)}><p>{report.coverage}</p><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader><TableBody>{report.orders.map(o=><TableRow key={o.id}><TableCell>{o.id}<small>{o.customer}</small></TableCell><TableCell>{o.status}</TableCell><TableCell>{money(total(o))}</TableCell></TableRow>)}</TableBody></Table><h3>Needs attention</h3><ul>{report.attention.map((a,i)=><li key={i}>{a}</li>)}</ul><Button onClick={()=>void downloadReport(report,notice)}><ArrowDownToLine size={15}/>Download Excel</Button></Modal>}</>;
}

