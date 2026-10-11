/** Conversation composition references: Prompt Kit and assistant-ui.
 * Composer/shimmer and SVG/voice components are reused from their upstream registries.
 * Planning here is a labelled local UI preview, not an LLM response. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, ArrowRight, Check, Mic, Paperclip, ShieldCheck, Square } from 'lucide-react';
import { Button } from './components/ui/button';
import { PromptInput, PromptInputActions, PromptInputTextarea } from './components/ui/prompt-input';
import { TextShimmer } from './components/ui/text-shimmer';
import { BuddyAvatar } from './buddy-avatar';
import { AttachmentPreview, DropOverlay, useBuddyAttachments } from './buddy-attachments';
import { AnimatePresence } from 'motion/react';
import { VoiceButton } from './components/ui/voice-button';
import { planGoal } from './workflow-state';
import { ShineBorder } from './components/ui/shine-border';
import './buddy-assistant.css';

export type BuddyDraft = {goal:string;scope:string;files:string[]};
type Mode='goal'|'knowledge'|'automation';
type SpeechSession={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;stop:()=>void;abort:()=>void;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null};
type SpeechConstructor=new()=>SpeechSession;
const suggestions:Record<Mode,string[]>={goal:['Find orders and export Excel','Find unanswered customers','Filter suspicious messages'],knowledge:['Remember my answer','Update opening hours','Check customer replies'],automation:['Keep my order sheet updated','Prepare a report every evening','Ask me when unsure']};
const examples:Record<string,string>={
 'Find orders and export Excel':'Read the conversations, find customer orders, and export them to Excel.',
 'Find unanswered customers':'Find customers who are still waiting for a reply.',
 'Filter suspicious messages':'Detect suspicious messages and flag them for my review.',
 'Remember my answer':'If you cannot answer a customer, ask me first and remember my approved answer.',
 'Update opening hours':'Our opening hours are Monday to Saturday, 9 am to 6 pm.',
 'Check customer replies':'Check whether you can answer customer questions using our approved knowledge.',
 'Keep my order sheet updated':'Whenever a new order arrives, update my order spreadsheet.',
 'Prepare a report every evening':'Every evening at 10 pm, prepare an Excel summary of today’s orders.',
 'Ask me when unsure':'If you are unsure how to answer a customer, let me handle it and remember my approved reply.',
};
export function BuddyAssistant({mode='goal',seed='',onApprove,compact=false,audience='All customers',live}:{mode?:Mode;seed?:string;audience?:string;onApprove?:(draft:BuddyDraft)=>string|void;compact?:boolean;live?:{submit:(prompt:string)=>Promise<void>;history?:ReactNode;busy:boolean;working:boolean;error:string}}){
 const [input,setInput]=useState(seed),[goal,setGoal]=useState(''),[stage,setStage]=useState<'idle'|'thinking'|'clarify'|'plan'|'done'>('idle');
 const [scope,setScope]=useState(''),[done,setDone]=useState('');
 const attachments=useBuddyAttachments(),files=attachments.names;
 const [listening,setListening]=useState(false),[voiceError,setVoiceError]=useState('');
 const speech=useRef<SpeechSession|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{setInput(seed);setGoal('');setStage('idle');attachments.clear();if(timer.current)clearTimeout(timer.current);if(seed){root.current?.scrollIntoView({block:'center',behavior:'smooth'});root.current?.querySelector('textarea')?.focus();}},[seed]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);const current=speech.current;if(current){current.onend=null;current.onerror=null;current.onresult=null;current.abort();}},[]);
 const submit=()=>{if(!input.trim()||stage==='thinking'||live?.busy)return;if(input.length>4000){setVoiceError('Keep your request under 4,000 characters.');return;}speech.current?.stop();if(live&&files.length){setVoiceError('Attachments are local previews. Remove them to continue; Buddy reads images from synchronized WhatsApp conversations.');return;}setVoiceError('');const request=input.trim();setInput('');setScope('');setStage('thinking');if(live){void live.submit(request).then(()=>{setGoal('');setStage('idle');}).catch(()=>{setInput(request);setStage('idle');});}else{setGoal(request);timer.current=setTimeout(()=>setStage('clarify'),650);}};
 const dictate=()=>{
  if(listening){speech.current?.stop();return;}
  const host=window as unknown as {SpeechRecognition?:SpeechConstructor;webkitSpeechRecognition?:SpeechConstructor};const Engine=host.SpeechRecognition||host.webkitSpeechRecognition;
  if(!Engine){setVoiceError('Voice input is unavailable here. You can type instead.');return;}
  setVoiceError('');const recognition=new Engine();speech.current=recognition;recognition.lang=navigator.language||'en-US';recognition.continuous=false;recognition.interimResults=true;const prefix=input.trim();
  recognition.onstart=()=>setListening(true);recognition.onend=()=>setListening(false);recognition.onerror=event=>{setListening(false);setVoiceError(event.error==='not-allowed'?'Microphone access was not granted. You can type instead.':'Voice input stopped. Please try again or type.');};
  recognition.onresult=event=>setInput([prefix,Array.from(event.results).map(result=>result[0].transcript).join(' ')].filter(Boolean).join(' '));
  try{recognition.start();}catch{setVoiceError('Voice input could not start. You can type instead.');}
 };
 const isPolicy=/if you|if a customer|whenever|every |check whether|unsure|cannot answer/i.test(goal);
 const question=mode==='knowledge'&&!isPolicy?'Who should Buddy remember this for?':mode==='automation'||isPolicy?'How much should Buddy do?':'Which conversations should Buddy use?';
 const choices=mode==='knowledge'&&!isPolicy?[audience,'Save as a draft']:mode==='automation'||isPolicy?['Prepare results for me','Draft replies for review']:['Today','All available conversations'];
 const previewPlan=mode==='knowledge'&&!isPolicy?['Keep your exact answer with its source','Keep the selected audience','Save the approved version']:mode==='automation'||isPolicy?['Confirm the trigger and scope','Prepare the task and its checks','Show the result before enabling it']:planGoal(goal,'2026-10-11').steps.map(step=>step.title);
 return <section ref={root} className={`buddy-chat ${goal||live?.history?'has-conversation':'is-empty'} ${compact?'compact':''}`} aria-label="Chat with Buddy">
 <div {...attachments.getRootProps({role:'presentation'})} className="buddy-drop-surface">
  <header className="buddy-chat-header"><div className="buddy-identity"><BuddyAvatar size={goal?45:56} state={listening?'wide':stage==='thinking'||live?.working||live?.busy?'orbit':stage==='done'?'wink':stage==='plan'?'notify':input?'thinking':'idle'} label={listening?'Buddy listening':stage==='thinking'?'Buddy thinking':'Buddy'}/><strong>Buddy</strong></div><span className="buddy-preview-label">{live?'WhatsApp workspace':'UI preview'}</span></header>
  {live?.history}
  {live&&goal&&stage==='plan'&&<div className="buddy-thread"><div className="buddy-plan"><div className="buddy-plan-title"><ShieldCheck size={18}/><strong>Review request</strong></div><blockquote>{goal}</blockquote><p>Use synchronized WhatsApp conversations. Replies stay as drafts.</p><div className="buddy-plan-actions"><Button disabled={live.busy} onClick={()=>void live.submit(goal).then(()=>{setGoal('');setStage('idle');}).catch(()=>{})}><Check size={15}/>{live.busy?'Starting…':'Confirm & start'}</Button><Button variant="ghost" disabled={live.busy} onClick={()=>{setInput(goal);setGoal('');setStage('idle');}}>Change request</Button></div></div></div>}
  {!live&&goal&&<div className="buddy-thread" aria-live="polite">
    <div className="buddy-message-user">{goal}</div>
    <div className="buddy-response-avatar"><BuddyAvatar size={38} state={stage==='thinking'?'orbit':stage==='done'?'wink':'idle'}/><span>Buddy</span></div>
    {stage==='thinking'?<div className="buddy-thinking"><TextShimmer duration={1.6}>Preparing your preview…</TextShimmer><Button variant="ghost" size="sm" onClick={()=>{if(timer.current)clearTimeout(timer.current);setInput(goal);setGoal('');setStage('idle');}}>Cancel</Button></div>:null}
    {stage==='clarify'&&<div className="buddy-response"><p>{question}</p><div className="buddy-choices">{choices.map(choice=><Button key={choice} variant="outline" onClick={()=>{setScope(choice);setStage('plan');}}>{choice}<ArrowRight size={13}/></Button>)}</div></div>}
    {stage==='plan'&&<div className="buddy-plan"><div className="buddy-plan-title"><ShieldCheck size={18}/><strong>Review the plan</strong><span>Preview</span></div><p className="buddy-plan-scope">{scope}</p>{mode==='knowledge'&&!isPolicy&&<blockquote>{goal}</blockquote>}<ol>{previewPlan.slice(0,5).map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol><div className="buddy-plan-actions"><Button onClick={()=>{const result=onApprove?.({goal,scope,files});setDone(result||'Preview started.');setStage('done');}}><Check size={15}/>{mode==='knowledge'&&!isPolicy?'Approve & remember':'Approve & preview'}</Button><Button variant="ghost" onClick={()=>{setInput(goal);setStage('idle');setGoal('');}}>Change request</Button></div></div>}
    {stage==='done'&&<div className="buddy-result"><Check size={18}/><div><strong>{done}</strong><p>You can ask for another change below.</p></div></div>}
  </div>}
  <div className="buddy-compose-wrap">
   {attachments.items.length>0&&<AttachmentPreview items={attachments.items} remove={attachments.remove}/>}
   <PromptInput className="buddy-composer" value={input} onValueChange={setInput} onSubmit={submit} disabled={stage==='thinking'} maxHeight={150}>
    <ShineBorder className="buddy-shine" shineColor={['#b1d4a1','#3b9f72','#b9d8ce']} duration={12}/><PromptInputTextarea aria-label="Message Buddy" placeholder={listening?'Speak now…':mode==='knowledge'?'What should Buddy remember?':mode==='automation'?'Ask Buddy to schedule something…':'Ask Buddy…'} maxLength={4000}/>
    <PromptInputActions className="buddy-composer-actions"><input {...attachments.getInputProps()} aria-label="Attach files or images"/><Button type="button" variant="ghost" size="icon" aria-label="Attach business material" onClick={e=>{e.stopPropagation();attachments.open();}}><Paperclip size={17}/></Button><span className="buddy-composer-context">{attachments.items.length?'Local preview':mode==='knowledge'?'Knowledge':mode==='automation'?'Schedule':'Files & images'}</span><VoiceButton size="icon" variant="ghost" icon={listening?<Square size={14}/>:<Mic size={17}/>} state={listening?'recording':'idle'} onPress={dictate} aria-label={listening?'Stop dictation':'Dictate a message'} title="Voice dictation uses your browser’s speech service"/><Button type="button" size="icon" className="buddy-send" aria-label="Send to Buddy" disabled={!input.trim()||stage==='thinking'||listening} onClick={submit}><ArrowUp size={19}/></Button></PromptInputActions>
   </PromptInput>
   <small className="account-note">{input.length.toLocaleString()} / 4,000 characters · AI usage limits apply</small>
   {voiceError&&<p role="status" className="buddy-voice-error">{voiceError}</p>}
   {live?.error&&<p role="alert" className="buddy-voice-error">{live.error}</p>}
   {attachments.error&&<p role="alert" className="buddy-voice-error">{attachments.error}</p>}
  </div>
  {!goal&&!live?.history&&<div className="buddy-suggestions">{(live?(mode==='goal'?['Orders','Learn','Phishing']:mode==='automation'?['Orders','Stop']:['Learn','Phishing']):suggestions[mode]).map(label=><button key={label} onClick={()=>{setInput(live?label.toLowerCase():examples[label]);root.current?.querySelector('textarea')?.focus();}}>{label}<ArrowRight size={12}/></button>)}</div>}
  <AnimatePresence>{attachments.isDragActive&&<DropOverlay/>}</AnimatePresence>
 </div>
 </section>;
}
