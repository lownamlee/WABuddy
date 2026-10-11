/** shadcn chart-bar-label-custom + Magic UI NumberTicker/BlurFade + ElevenLabs Matrix. */
import { useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, BookOpen, CheckCheck, Clock3, FileCheck2, MessageCircle, Sparkles } from 'lucide-react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { BlurFade } from './components/ui/blur-fade';
import { NumberTicker } from './components/ui/number-ticker';
import { Matrix, pulse } from './components/ui/matrix';
import { ShineBorder } from './components/ui/shine-border';
import { periods, periodSummary } from './dashboard-data';
import type { WorkspaceState } from './workflow-state';
import './workspace-insights.css';
import type { LiveContext } from './live-data';

export function WorkspaceInsights({state,go,live}:{state:WorkspaceState;go:(page:string)=>void;live?:LiveContext}){
 const reduced=useReducedMotion(), root=useRef<HTMLDivElement>(null), visible=useInView(root,{once:true,amount:.2});
 const done=state.runs.filter(r=>r.status==='Done').length;
 const known=state.knowledge.filter(k=>k.status==='Published').length;
 const mix=[{label:'Needs you',value:state.threads.filter(t=>!t.resolved&&t.category!=='Suspicious').length,fill:'#d8b578'},{label:'Resolved',value:state.threads.filter(t=>t.resolved).length,fill:'#69a48c'},{label:'Flagged',value:state.threads.filter(t=>!t.resolved&&t.category==='Suspicious').length,fill:'#ad9bc4'}];
 const summary=periodSummary('week');
 const today=new Date();
 const week=Array.from({length:7},(_,i)=>{const date=new Date(today.getTime()-(6-i)*86400000);return {day:live?date.toLocaleDateString(undefined,{weekday:'short'}):periods.week.labels[i],handled:live?live.runs.filter(r=>r.status==='completed'&&new Date((r.completed||r.created)*1000).toDateString()===date.toDateString()).length:periods.week.ai[i]};});
 return <div ref={root} className="cw-insights-grid">
  <BlurFade inView className="cw-reveal" delay={.05}><Card className="cw-insight cw-buddy-snapshot"><header><span className="cw-insight-icon"><Sparkles size={17}/></span><h2>Your workspace</h2><span className="cw-insight-caption">{live?'Live':'Sample'}</span></header><div className="cw-buddy-snapshot-body"><div><span className="cw-insight-caption">Jobs completed</span><strong><NumberTicker value={done}/><small>with Buddy</small></strong></div><div className="cw-insight-matrix"><Matrix rows={7} cols={7} frames={pulse} fps={6} size={5} gap={3} autoplay={visible&&!reduced} palette={{on:'#58a681',off:'#deeadc'}} ariaLabel="Buddy preview animation"/></div></div><div className="cw-insight-facts"><span><BookOpen size={15}/><b>{known}</b> saved answers</span><span><FileCheck2 size={15}/><b>{state.reports.length}</b> {state.reports.length===1?'file':'files'} ready</span></div><Button className="cw-buddy-action" onClick={()=>go('Chat')}><ShineBorder className="buddy-shine" borderWidth={2} duration={4} shineColor={['#7de3c1','#a69bff','#ffd79b']}/><Sparkles size={15}/>Ask Buddy<ArrowUpRight size={15}/></Button></Card></BlurFade>
  <BlurFade inView className="cw-reveal" delay={.1}><Card className="cw-insight"><header><span className="cw-insight-icon amber"><MessageCircle size={17}/></span><h2>Inbox health</h2><Button variant="ghost" size="icon-sm" aria-label="Open inbox" onClick={()=>go('Smart inbox')}><ArrowUpRight size={16}/></Button></header><div className="cw-insight-stat"><NumberTicker value={state.threads.length}/><span>{live?'items in your review queue':'conversations in your sample inbox'}</span></div><div className="cw-inbox-mix">{visible&&<ResponsiveContainer width="100%" height="100%"><BarChart data={mix} layout="vertical" margin={{left:0,right:24,top:0,bottom:0}} accessibilityLayer><XAxis type="number" hide domain={[0,Math.max(1,...mix.map(m=>m.value))]}/><YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={74} tick={{fill:'#738377',fontSize:11}}/><Tooltip cursor={false} contentStyle={{borderRadius:10,fontSize:12,borderColor:'#e0e8dc'}}/><Bar dataKey="value" name="Conversations" radius={5} barSize={23} background={{fill:'#f2f5ef',radius:5}} isAnimationActive={!reduced} animationDuration={1000}>{mix.map(m=><Cell key={m.label} fill={m.fill}/>)}<LabelList dataKey="value" position="right" fontSize={11} fill="#627767"/></Bar></BarChart></ResponsiveContainer>}</div><footer><CheckCheck size={14}/>Review flagged messages before replying</footer></Card></BlurFade>
  <BlurFade inView className="cw-reveal" delay={.15}><Card className="cw-insight cw-weekly-insight"><header><span className="cw-insight-icon lilac"><Clock3 size={17}/></span><h2>{live?'Completed tasks':'Time back'}</h2><span className="cw-insight-caption">{live?'Last 7 days':'Demo · 7 days'}</span></header><div className="cw-insight-stat"><NumberTicker value={live?week.reduce((sum,row)=>sum+row.handled,0):Number(summary.hoursSaved)} decimalPlaces={live?0:1}/><span>{live?'completed by your agents':<>hours estimated<br/>at 1 minute per handled chat</>}</span></div><div className="cw-weekly-bars">{visible&&<ResponsiveContainer width="100%" height="100%"><BarChart data={week} margin={{left:0,right:0,top:8,bottom:0}} accessibilityLayer><XAxis dataKey="day" tickFormatter={v=>v.slice(0,1)} tickLine={false} axisLine={false} fontSize={10} stroke="#91a08d"/><Tooltip cursor={{fill:'#f1edf7'}} contentStyle={{borderRadius:10,fontSize:12,borderColor:'#e0d9eb'}}/><Bar dataKey="handled" name={live?'Completed tasks':'Handled chats'} radius={[5,5,3,3]} maxBarSize={23} isAnimationActive={!reduced} animationDuration={1200}>{week.map((d,i)=><Cell key={d.day} fill={i===5?'#8a77a7':'#d7cde3'}/>)}</Bar></BarChart></ResponsiveContainer>}</div><footer>{live?'Recorded task completions':'Fictional analytics · 5–11 Oct'}</footer></Card></BlurFade>
 </div>;
}
