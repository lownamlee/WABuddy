import template from './whatsapp-ui/index.html?raw';
import css from './whatsapp-ui/styles.css?raw';
import script from './whatsapp-ui/app.js?raw';
import { whatsappDocument } from './whatsapp-document';
import { useEffect, useRef } from 'react';
import { BusinessPage } from './whatsapp-business';
import { liveSource, liveBridge, liveStyles } from './whatsapp-live';
import { parityBridge, parityStyles } from './whatsapp-parity';
import { layoutBridge, layoutStyles } from './whatsapp-layout';
import { mediaBridge, mediaStyles } from './whatsapp-media';

const bundledAssets = import.meta.glob<string>('./whatsapp-ui/assets/*', {
  eager: true, query: '?url&no-inline', import: 'default',
});
const assets = Object.fromEntries(Object.entries(bundledAssets).map(([path, url]) => [path.replace('./whatsapp-ui/', ''), url]));
const standardDocument = whatsappDocument(template, css + liveStyles + parityStyles + layoutStyles + mediaStyles, liveSource(script) + liveBridge + parityBridge + layoutBridge + mediaBridge, assets);
const businessBridge = `
const hostOrigin = parent.location.origin;
const businessAction = (action) => parent.postMessage({type:'wabuddy-business-action',action,chat:state.selected},hostOrigin);
const originalConversation = renderConversation;
renderConversation = function(){originalConversation();const actions=document.querySelector('.chat-header-actions');if(actions)actions.insertAdjacentHTML('afterbegin',iconButton('group','Add to list','business-lists'));};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  const item=(label,key,img='document')=>({label,icon:img,action:'business-'+key});
  if(action.startsWith('business-')){event.stopImmediatePropagation();hideMenu();businessAction(action.slice(9));return;}
  if(action==='main-menu'){event.stopImmediatePropagation();showMenu(button,[item('Business tools','tools','settings'),item('Business profile','profile','user'),item('Catalog','catalog'),item('Orders','orders'),item('Quick replies','replies'),item('Lists','lists','group'),item('Business broadcast','broadcast'),item('Advertise','advertise'),'separator',{label:'Starred messages',icon:'star',action:'starred'},item('Settings','settings','settings')]);}
  if(action==='attach'){event.stopImmediatePropagation();showMenu(button,[{label:'Photos & videos',icon:'image',action:'attach-image'},{label:'Document',icon:'document',action:'attach-document'},{label:'Contact',icon:'addContact',action:'share-contact'},'separator',item('Catalog','share-catalog'),item('Quick replies','use-reply'),item('Order','orders')],true);}
  if(action==='settings'||action==='edit-name'||action==='edit-about'){event.stopImmediatePropagation();businessAction(action==='settings'?'settings':'profile');}
},true);
window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==hostOrigin||event.data?.type!=='wabuddy-business-command')return;
  if(['chats','calls','status','channels','media'].includes(event.data.view))navigate(event.data.view);
  if(typeof event.data.draft==='string' && state.selected){state.drafts[state.selected]=event.data.draft;const input=document.querySelector('#message-input');if(input){input.value=event.data.draft;updateComposer();input.focus();}}
});
render();
`;
const businessDocument = whatsappDocument(template, css + liveStyles + parityStyles + layoutStyles + mediaStyles + '\n#rail{display:none!important}.app{grid-template-columns:var(--sidebar) minmax(0,1fr)}.quick-action:last-child{display:none}@media(max-width:700px){.app{grid-template-columns:minmax(0,1fr)}}', liveSource(script) + businessBridge + liveBridge + parityBridge + layoutBridge + mediaBridge, assets);

export function WhatsAppFrame({ business = false, view = 'chats', draft, onAction, onAccount }: { business?: boolean; view?: string; draft?: { text: string; nonce: number }; onAction?: (action: string, chat: string | null) => void; onAccount?: (account: {id:string;name:string;formattedPhone?:string} | null, contacts: {id:string;name:string;initial:string}[]) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const sendView = () => frame.current?.contentWindow?.postMessage({ type: 'wabuddy-business-command', view }, location.origin);
  useEffect(sendView, [view]);
  useEffect(() => { if (draft) frame.current?.contentWindow?.postMessage({ type: 'wabuddy-business-command', draft: draft.text }, location.origin); }, [draft]);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === 'wabuddy-business-action' && typeof event.data.action === 'string') onAction?.(event.data.action, typeof event.data.chat === 'string' ? event.data.chat : null);
      if (event.data?.type === 'wabuddy-logout-request') window.dispatchEvent(new Event('wabuddy-logout-request'));
      if (event.data?.type === 'wabuddy-live-account') onAccount?.(event.data.account, event.data.contacts || []);
    };
    window.addEventListener('message', handle); return () => window.removeEventListener('message', handle);
  }, [onAction, onAccount]);
  return <iframe ref={frame} onLoad={sendView} className="whatsapp-frame" title={business ? 'WhatsApp Business conversations' : 'WhatsApp conversations'} srcDoc={business ? businessDocument : standardDocument}/>;
}

export function WhatsAppPage({ business = false }: { business?: boolean }) {
  if (business) return <BusinessPage/>;
  return <section className="whatsapp-page" aria-label="WhatsApp preview">
    <WhatsAppFrame/>
  </section>;
}
