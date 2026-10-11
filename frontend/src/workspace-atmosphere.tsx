import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import DotGrid from './components/ui/dot-grid';
import './workspace-atmosphere.css';

export function WorkspaceAtmosphere(){
 const reduced=useReducedMotion();
 const [visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 return <div className="workspace-atmosphere" aria-hidden="true">{reduced?<div className="workspace-dot-field"/>:<DotGrid dotSize={2.5} gap={22} baseColor="#b4c7b7" activeColor="#288466" proximity={150} strength={1.5} bounce={.55} tension={.35} returnDuration={1.1} shockRadius={280} shockStrength={3} swell={1.3} glow={.3} opacity={.7} intro={false} paused={!visible} dpr={1.5}/>}</div>;
}
