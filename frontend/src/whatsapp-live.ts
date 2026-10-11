/** Adapt the recorded renderer to the authenticated Python API, without demo data. */
export function liveSource(source: string): string {
  const start = source.indexOf('let saved;');
  const end = source.indexOf('const state =');
  if (start < 0 || end < start) throw new Error('WhatsApp renderer initialization changed.');
  return (source.slice(0, start) + `const data = {version:3,chats:[],messages:{},profile:{name:'',about:''},prefs:{theme:'light',sounds:false,previews:true},calls:[],trash:[]};\n` + source.slice(end))
    .replace(/function save\(\) \{[^\n]*\}/, 'function save() {}')
    .replace('const metadata=`', "const metadata=`${message.edited?'<span>Edited</span>':''}")
    .replace("chat.outgoing||chat.id==='studio'?icon('read',chat.id==='studio'?'read':''):''", "chat.outgoing?`<span title=\"${escapeHTML(chat.lastStatus||'sent')}\" aria-label=\"${escapeHTML(chat.lastStatus||'sent')}\">${icon(chat.lastStatus==='sent'?'check':'read',chat.lastStatus==='read'?'live-read':'live-sent')}</span>`:''")
    .replace("message.outgoing?icon('read','receipt-icon'):''", "message.outgoing?`<span title=\"${escapeHTML(message.status||'sent')}\" aria-label=\"${escapeHTML(message.status||'sent')}\">${icon(message.status==='sent'?'check':'read',message.status==='read'?'receipt-icon live-read':'receipt-icon live-sent')}</span>`:''");
}

export const liveStyles = `.live-read{color:#53bdeb!important}.live-sent{color:#8696a0!important}.live-connection{font-size:12px;color:var(--muted);padding:10px 20px}.chat-header-actions [data-action="voice-call"],.chat-header-actions [data-action="video-call"]{opacity:.35}.welcome-card h1{font-size:26px}`;

export const liveBridge = String.raw`
let liveCsrf='',liveAccount=null,liveConnection='connecting',liveSending=false,liveStopped=false,liveTimer,liveFingerprint='';
let liveSlot=typeof parent!=='undefined'?parent.document.documentElement.dataset.account||'':'';
const liveRequests=new Map();
async function liveApi(path,body,retry=true){
  if(!liveCsrf){const response=await fetch('/api/bootstrap',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Cannot reach WABuddy.');const session=await response.json();if(liveSlot&&session.account_id&&liveSlot!==session.account_id)throw new Error('The active account changed. Reload WABuddy before continuing.');liveSlot=liveSlot||session.account_id||'default';liveCsrf=session.csrf_token;}
  const response=await fetch('/api/whatsapp/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'X-WABuddy-Account':liveSlot,...(body?{'Content-Type':'application/json','X-CSRF-Token':liveCsrf}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(path==='rich-messages'?190000:body?40000:10000)});
  if((response.status===401||response.status===403)&&retry){liveCsrf='';return liveApi(path,body,false);}
  const value=await response.json();if(!response.ok)throw new Error(typeof value.detail==='string'?value.detail:'WhatsApp could not complete this action.');return value;
}
const liveAvatar=avatar;
avatar=function(chat,extra=''){return chat.photoVersion?'<span class="avatar '+escapeHTML(extra)+'"><img src="/api/whatsapp/avatar?chat='+encodeURIComponent(chat.id)+'&account='+encodeURIComponent(liveSlot)+'&v='+chat.photoVersion+'" alt="'+escapeHTML(chat.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></span>':liveAvatar(chat,extra);};
renderWelcome=function(){
  $('#main').innerHTML='<section class="welcome"><div class="welcome-card"><img class="welcome-art" src="assets/welcome.svg" alt=""><h1>WhatsApp</h1><p>'+escapeHTML(liveAccount?'Select a conversation to start messaging.':'Waiting for your linked account…')+'</p></div></section>';
};
const liveRenderSidebar=renderSidebar;
renderSidebar=function(remember=true){liveRenderSidebar(remember);const header=$('#sidebar .sidebar-header')||$('#sidebar header');if(header)header.insertAdjacentHTML('afterend','<div class="live-connection" data-connected="'+(liveConnection==='connected')+'" role="status">'+escapeHTML(liveConnection==='connected'?'Connected · '+(liveAccount?.name||'WhatsApp'):liveConnection==='offline'?'Server unavailable · reconnecting…':'WhatsApp '+liveConnection+'…')+'</div>');};
const liveNavigate=navigate;
navigate=function(view){if(!['chats','profile'].includes(view)){toast('This feature is not connected yet.');return;}liveNavigate(view);};
const liveConversation=renderConversation;
renderConversation=function(){liveConversation();const heading=$('.chat-heading-text p');if(heading)heading.textContent=liveConnection==='connected'?'Connected to WhatsApp':'Reconnecting…';if(liveSending){const send=$('#composer button[type="submit"]');if(send)send.disabled=true;}};
renderDetail=function(){const c=getChat();if(!c)return;$('#contact-detail')?.remove();$('#main').insertAdjacentHTML('beforeend','<aside id="contact-detail" class="detail-panel" aria-label="Contact info"><header class="view-header">'+iconButton('close','Close contact info','close-detail')+'<h2>Contact info</h2></header><div class="profile-cover">'+avatar(c)+'<h2>'+escapeHTML(c.name)+'</h2><p>'+escapeHTML(!c.savedContact&&c.pushName?'~'+c.pushName:c.id.endsWith('@s.whatsapp.net')?'+'+c.phone:'WhatsApp contact')+'</p></div><div class="profile-block"><p class="label">About</p><p>'+escapeHTML(c.about||'Not available')+'</p></div></aside>');};
renderProfileSidebar=function(){$('#sidebar').innerHTML=backHeader('Profile','go-chats')+'<div class="sidebar-scroll"><div class="profile-cover">'+avatar({name:data.profile.name})+'</div><div class="profile-block"><p class="label">Your name</p><p>'+escapeHTML(data.profile.name)+'</p></div><div class="profile-block"><p class="label">Phone</p><p>'+escapeHTML(liveAccount?.formattedPhone||(liveAccount?.id?'+'+liveAccount.id.split('@')[0]:''))+'</p></div></div>';};
messageInfo=function(id){const m=getMessage(id);if(!m)return;openModal('Message info','<div class="message-info-preview">'+escapeHTML(m.text)+'</div><p>'+escapeHTML(m.outgoing?'Status: '+m.status:'Received')+'</p><p>'+escapeHTML(new Date(m.sentAt).toLocaleString())+'</p>');};
showMessageMenu=function(anchor,message){if(!message)return;const entries=[['Message info','info','message-info'],['Copy','copy','copy-message']];if(!message.deleted){entries.push(['Reply','back','reply-message'],['React','smile','react-more']);if(message.outgoing){if(Date.now()-message.sentAt<900000)entries.push(['Edit','edit','live-edit']);entries.push(['Delete for everyone','trash','live-revoke']);}}showMenu(anchor,entries.map(([label,img,action])=>({label,icon:img,action,attrs:'data-message="'+escapeHTML(message.id)+'"'})),true);};
const liveActionRequests=new Map();
const liveOpenChat=openChat;
openChat=function(id){liveOpenChat(id);void markChatRead(id);};
async function markChatRead(chat){for(const m of data.messages[chat]||[])if(!m.outgoing&&m.status==='received'){if(!await liveMessageAction('read',m.id,'',chat))break;}}
async function liveMessageAction(operation,id,text='',chat=state.selected){
  const key=JSON.stringify([chat,id,operation,text]);let requestId=liveActionRequests.get(key);if(!requestId){requestId=crypto.randomUUID();liveActionRequests.set(key,requestId);}
  try{await liveApi('message-action',{request_id:requestId,chat,message_id:id,operation,text});liveActionRequests.delete(key);if(operation!=='read')closeModal();await refreshLive();if(operation!=='read')toast('Updated in WhatsApp');return true;}
  catch(error){toast(error.message);return false;}
}
sendMessage=async function(){
  const input=$('#message-input'),text=input?.value.trim(),chat=state.selected;
  if(!text||!chat||liveSending)return;
  if(liveConnection!=='connected'){toast('Wait for WhatsApp to reconnect before sending.');return;}
  const replyTo=state.replyTo?.id||'';
  const key=chat+'\n'+text+'\n'+replyTo;let requestId=liveRequests.get(key);if(!requestId){requestId=crypto.randomUUID();liveRequests.set(key,requestId);}
  liveSending=true;input.readOnly=true;toast('Sending…');
  try{await liveApi('messages',{request_id:requestId,chat,text,reply_to:replyTo});liveRequests.delete(key);state.drafts[chat]='';if(state.selected===chat){state.replyTo=null;renderReplyPreview();input.value='';updateComposer();}toast('Sent to WhatsApp');await refreshLive();}
  catch(error){toast(error.name==='TimeoutError'?'Send not confirmed. Check the chat before trying again.':error.message);}
  finally{liveSending=false;input.readOnly=false;input.focus();}
};
const liveAllowed=new Set(['open-chat','mobile-back','new-chat','sidebar-back','filter','clear-search','filter-menu','conversation-search','close-conversation-search','emoji','insert-emoji','chat-info','close-detail','message-menu','message-info','copy-message','close-modal','go-chats','nav','profile','reply-message','cancel-reply','jump-message','react-more']);
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action.startsWith('business-'))return;
  if(action==='react-message'){event.stopImmediatePropagation();const m=getMessage(button.dataset.message);if(m)void liveMessageAction('react',m.id,m.reaction===button.dataset.emoji?'':button.dataset.emoji);return;}
  if(action==='live-edit'){event.stopImmediatePropagation();hideMenu();const m=getMessage(button.dataset.message);if(m)openModal('Edit message','<label class="field">Message<textarea id="live-edit-text" maxlength="10000">'+escapeHTML(m.text)+'</textarea></label>','<button class="secondary-button" data-action="close-modal">Cancel</button><button class="solid-button" data-action="live-save-edit" data-message="'+escapeHTML(m.id)+'">Save</button>');return;}
  if(action==='live-save-edit'){event.stopImmediatePropagation();const text=$('#live-edit-text')?.value.trim();if(text){button.disabled=true;void liveMessageAction('edit',button.dataset.message,text).then(()=>button.disabled=false);}return;}
  if(action==='live-revoke'){event.stopImmediatePropagation();hideMenu();openModal('Delete for everyone?','<p>This asks WhatsApp to remove your message for everyone in this conversation.</p>','<button class="secondary-button" data-action="close-modal">Cancel</button><button class="solid-button danger" data-action="live-confirm-revoke" data-message="'+escapeHTML(button.dataset.message)+'">Delete for everyone</button>');return;}
  if(action==='live-confirm-revoke'){event.stopImmediatePropagation();button.disabled=true;void liveMessageAction('revoke',button.dataset.message).then(()=>button.disabled=false);return;}
  if(action==='main-menu'){event.stopImmediatePropagation();showMenu(button,[{label:'Profile',icon:'user',action:'profile'},{label:'Log out',icon:'arrow',action:'live-logout'}]);return;}
  if(action==='live-logout'){event.stopImmediatePropagation();parent.postMessage({type:'wabuddy-logout-request'},parent.location.origin);return;}
  if(action==='chat-menu'){event.stopImmediatePropagation();showMenu(button,[{label:'Contact info',icon:'user',action:'chat-info'},{label:'Mark as read',icon:'read',action:'live-read-chat'},{label:'Close chat',icon:'close',action:'mobile-back'}]);return;}
  if(action==='live-read-chat'){event.stopImmediatePropagation();void (async()=>{const chat=state.selected;for(const m of data.messages[chat]||[])if(!m.outgoing&&m.status==='received')await liveMessageAction('read',m.id,'',chat);toast('Chat marked as read');})();return;}
  if(action==='encryption'){event.stopImmediatePropagation();openModal('WhatsApp connection','<p>Messages use your linked WhatsApp account. WABuddy keeps the synchronized chat cache privately on this computer.</p>');return;}
  if(action==='attach'&&typeof businessAction==='function')return;
  if(!liveAllowed.has(action)){event.stopImmediatePropagation();event.preventDefault();toast('This feature is not connected yet.');}
},true);
async function refreshLive(){
  if(liveStopped)return;
  try{
    const snapshot=await liveApi('chats');
    const fingerprint=JSON.stringify(snapshot);if(fingerprint===liveFingerprint)return;
    liveFingerprint=fingerprint;const previousAccount=liveAccount?.id,previousConnection=liveConnection;
    liveAccount=snapshot.account;liveConnection=snapshot.connection;
    if(previousAccount&&previousAccount!==liveAccount?.id){state.selected=null;state.drafts={};}
    data.chats=snapshot.chats;data.contacts=snapshot.contacts||snapshot.chats;data.messages=snapshot.messages;data.profile={name:liveAccount?.name||'WhatsApp',about:'Linked account'};
    if(state.selected&&!getChat(state.selected))state.selected=null;
    if(state.panel||previousConnection!==liveConnection||!$('#chat-list'))renderSidebar();else renderChatList();
    if(state.selected){const log=$('#messages');const bottom=!log||log.scrollHeight-log.scrollTop-log.clientHeight<100;renderMessages(bottom);}else if(state.view!=='profile')renderWelcome();
    renderRail();
    parent.postMessage({type:'wabuddy-live-account',account:liveAccount,contacts:data.chats.map(c=>({id:c.id,name:c.name,initial:c.initial}))},parent.location.origin);
  }catch{if(liveConnection!=='offline'){liveConnection='offline';renderSidebar();}}
}
async function pollLive(){await refreshLive();if(!liveStopped)liveTimer=setTimeout(pollLive,1500);}
window.addEventListener('pagehide',()=>{liveStopped=true;clearTimeout(liveTimer);});
render();void pollLive();
`;
