/** react-dropzone file interaction + Magic UI spring items + Google's Noto Lottie artwork. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FileText, Image as ImageIcon, X } from 'lucide-react';
import sparkleUrl from './assets/animations/sparkles.json?url';

type Attachment={id:string;name:string;size:number;preview?:string;image:boolean};
export function useBuddyAttachments(){
 const [items,setItems]=useState<Attachment[]>([]),[error,setError]=useState('');
 const itemsRef=useRef(items);itemsRef.current=items;
 useEffect(()=>()=>itemsRef.current.forEach(item=>{if(item.preview)URL.revokeObjectURL(item.preview);}),[]);
 const add=useCallback((accepted:File[])=>{
  setError('');const next=[...itemsRef.current];for(const file of accepted){const id=`${file.name}-${file.size}-${file.lastModified}`;if(next.some(f=>f.id===id))continue;if(next.length>=10){setError('Up to 10 attachments.');break;}const image=/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type);next.push({id,name:file.name,size:file.size,image,preview:image?URL.createObjectURL(file):undefined});}itemsRef.current=next;setItems(next);
 },[]);
 const dropzone=useDropzone({onDropAccepted:add,onDropRejected:()=>setError('Use files smaller than 20 MB, up to 10 at a time.'),noClick:true,noKeyboard:true,maxFiles:10,maxSize:20*1024*1024});
 const clear=()=>{itemsRef.current.forEach(item=>{if(item.preview)URL.revokeObjectURL(item.preview);});itemsRef.current=[];setItems([]);setError('');};
 const remove=(id:string)=>{const next=itemsRef.current.filter(item=>{if(item.id!==id)return true;if(item.preview)URL.revokeObjectURL(item.preview);return false;});itemsRef.current=next;setItems(next);};
 return {...dropzone,items,error,clear,remove,names:items.map(item=>item.name)};
}
export function UploadSparkles(){
 const ref=useRef<HTMLDivElement>(null),reduced=useReducedMotion();
 useEffect(()=>{if(reduced)return;let cancelled=false,dispose:(()=>void)|undefined;void import('lottie-web').then(({default:lottie})=>{if(cancelled||!ref.current)return;const animation=lottie.loadAnimation({container:ref.current,renderer:'svg',loop:true,autoplay:true,path:sparkleUrl});dispose=()=>animation.destroy();});return()=>{cancelled=true;dispose?.();};},[reduced]);
 return <div ref={ref} className="buddy-upload-sparkles" aria-hidden="true"/>;
}
export function AttachmentPreview({items,remove}:{items:Attachment[];remove:(id:string)=>void}){
 const reduced=useReducedMotion();
 return <div className="buddy-attachment-previews"><AnimatePresence initial={false}>{items.map(item=><motion.div layout={!reduced} key={item.id} initial={reduced?false:{scale:.85,opacity:0,y:10}} animate={{scale:1,opacity:1,y:0}} exit={reduced?{opacity:0}:{scale:.85,opacity:0}} transition={{type:'spring',stiffness:350,damping:40}} className={`buddy-attachment ${item.image?'image':''}`}>{item.preview?<img src={item.preview} alt={item.name}/>:<span className="buddy-attachment-icon"><FileText size={21}/></span>}<span><strong>{item.name}</strong><small>{Math.max(1,Math.round(item.size/1024))} KB · Local preview</small></span><button type="button" aria-label={`Remove ${item.name}`} onClick={()=>remove(item.id)}><X size={13}/></button></motion.div>)}</AnimatePresence></div>;
}
export function DropOverlay(){const reduced=useReducedMotion();return <motion.div className="buddy-drop-overlay" initial={reduced?false:{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} exit={reduced?{opacity:0}:{opacity:0,scale:.98}} transition={reduced?{duration:0}:undefined}><div className="buddy-drop-art"><FileText size={35}/><UploadSparkles/><ImageIcon size={35}/></div><strong>Drop it here</strong><small>Images, menus, documents</small></motion.div>;}
