/** React renderer for jeremy-prt/bloub's unmodified SVG animation engine (MIT).
 * Rendering order/masks follow BloubBot.vue; only the body palette is WABuddy green. */
import { useEffect, useId, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { BotEngine, type BotFrame } from './vendor/bloub/engine';
import { mixHex } from './vendor/bloub/skins';
import type { StateId } from './vendor/bloub/states';

export function BuddyAvatar({state='idle',size=52,label='Buddy'}:{state?:StateId;size?:number;label?:string}){
 const engine=useRef(new BotEngine(100,state)), clock=useRef(0), svg=useRef<SVGSVGElement>(null);
 const reduced=useReducedMotion(),visible=useInView(svg),id=useId().replaceAll(':','');
 const [frame,setFrame]=useState<BotFrame>(()=>engine.current.sample(0));
 useEffect(()=>{engine.current.setState(state,clock.current);if(reduced)setFrame({...engine.current.sample(clock.current+2)});},[state,reduced]);
 useEffect(()=>{
  if(reduced||!visible)return;
  let raf=0,last=performance.now(),paint=0;
  const tick=(now:number)=>{const delta=Math.min((now-last)/1000,.1);last=now;if(!document.hidden){clock.current+=delta;if(now-paint>32){setFrame({...engine.current.sample(clock.current)});paint=now;}}raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[reduced,visible]);
 const ink='#258263',paper='#fbfdf8';
 const dots=frame.dots.map((dot,i)=>{const fill=dot.color??(dot.depth===undefined?ink:mixHex(paper,ink,dot.depth));return dot.d?<path key={i} d={dot.d} fill={fill} opacity={dot.opacity} transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot??0}) scale(100)`}/>:<circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill={fill} opacity={dot.opacity}/>;});
 return <svg ref={svg} className="buddy-avatar" width={size} height={size} viewBox="-158 -158 316 316" role="img" aria-label={label} data-state={state}>
 <defs><mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="-158" y="-158" width="316" height="316"><path d={frame.bodyPath} fill="white"/>{frame.eyes.map((eye,i)=><path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="black"/>)}{frame.notch&&<circle {...{cx:frame.notch.x,cy:frame.notch.y,r:frame.notch.r}} fill="black"/>}</mask>{frame.arcs.map(arc=><linearGradient key={arc.id} id={`${id}-${arc.id}`} gradientUnits="userSpaceOnUse" x1={arc.grad.x1} y1={arc.grad.y1} x2={arc.grad.x2} y2={arc.grad.y2}>{arc.grad.stops.map((c,i)=><stop key={i} offset={i/(arc.grad.stops.length-1)} stopColor={c}/>)}</linearGradient>)}</defs>
 <g fill="none" strokeLinecap="round">{frame.arcs.map(arc=><path key={arc.id} d={arc.back} stroke={`url(#${id}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g>
 {frame.dotsBehind&&<g>{dots}</g>}<g opacity={frame.bodyAlpha}><path d={frame.bodyPath} fill={paper}/><g mask={`url(#${id}-mask)`}><rect x="-158" y="-158" width="316" height="316" fill={ink}/></g></g>{!frame.dotsBehind&&<g>{dots}</g>}
 {frame.notif&&<circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill="#a69cde"/>}<g fill="none" strokeLinecap="round">{frame.arcs.map(arc=><path key={arc.id} d={arc.front} stroke={`url(#${id}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity}/>)}</g></svg>;
}
