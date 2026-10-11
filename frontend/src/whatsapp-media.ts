/** Account-bound media composer and native attachment rendering. */
export const mediaStyles = `
.message.media-sticker{background:transparent!important;box-shadow:none!important;padding:4px 8px 22px}.message.media-sticker:before{display:none}.media-sticker .message-info{background:#fff9;border-radius:10px;padding:2px 5px}.wa-sticker{width:180px;height:180px;object-fit:contain}.wa-media-image{display:block;max-width:100%;max-height:360px;border-radius:7px;object-fit:contain}.wa-media-video{width:320px;max-width:100%;max-height:360px;border-radius:7px}.wa-media-audio{width:280px;max-width:100%;height:48px}.wa-media-content{margin-bottom:7px}.wa-media-content a{color:inherit}.wa-media-card{padding:14px;background:#00000005;border-radius:8px;min-width:220px}.wa-media-card strong,.wa-media-card small{display:block;margin:5px 0}.wa-media-card small{color:#667781}.wa-poll-option{padding:10px 4px;border-bottom:1px solid #0001}.wa-media-dialog{width:min(640px,calc(100vw - 24px));max-height:95vh;overflow:auto}.wa-media-preview{height:300px;display:flex;align-items:center;justify-content:center;background:#f0f2f5;border-radius:8px;margin:12px 0;overflow:hidden}.wa-media-preview img,.wa-media-preview video{max-width:100%;max-height:100%;object-fit:contain}.wa-media-preview audio{width:90%}.wa-media-dialog .field{display:flex;flex-direction:column;gap:7px;margin:14px 0}.wa-media-dialog input,.wa-media-dialog textarea{border:1px solid #d3d9d6;border-radius:7px;padding:12px;width:100%;font:inherit}.wa-media-dialog input[type=checkbox]{width:auto}.wa-media-error{color:#b42318;font-size:13px;white-space:pre-wrap}.wa-media-status{color:#667781;font-size:13px}.wa-media-tools{display:flex;gap:10px}.wa-media-tools button{padding:9px 15px;border:1px solid #ddd;border-radius:20px}.wa-picker-tabs{display:flex;gap:8px;padding:10px;border-bottom:1px solid #ddd}.wa-picker-tabs button{flex:1;padding:8px;border-radius:18px}.wa-picker-tabs button[aria-selected=true]{background:#d9fdd3;color:#075e54}.wa-sticker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:280px;overflow:auto;padding:12px}.wa-sticker-grid img{width:90px;height:90px;object-fit:contain}.wa-sticker-grid button:hover{background:#eee;border-radius:8px}.wa-picker-note{padding:18px;color:#667781;font-size:13px}.emoji-panel{width:min(420px,calc(100% - 30px));max-height:420px;overflow:auto}.wa-group-members{padding:12px 24px}.wa-group-members p{padding:12px 0;border-bottom:1px solid #eee}.message-sender{color:#9a4d85}.wa-group-avatar{width:24px;height:24px;position:absolute;left:-32px;top:0}.wa-group-avatar .avatar{width:24px;height:24px}
`;

export const mediaBridge = String.raw`
function mediaUrl(media,download=false){return media&&/^[a-f0-9]{32,64}$/.test(media.id)?'/api/whatsapp/media/'+media.id+'?account='+encodeURIComponent(liveSlot)+(download?'&download=true':''):'';}
function mediaContent(message){
 const m=message.media,url=mediaUrl(m);if(m&&url){const src=escapeHTML(url),name=escapeHTML(m.name||m.kind);
  if(m.kind==='sticker')return '<img class="wa-sticker" src="'+src+'" alt="Sticker" loading="lazy">';
  if(m.kind==='image')return '<button data-action="media-view" data-message="'+escapeHTML(message.id)+'" aria-label="Open picture"><img class="wa-media-image" src="'+src+'" alt="'+escapeHTML(message.caption||'Photo')+'" loading="lazy"></button>';
  if(m.kind==='video')return '<video class="wa-media-video" data-media-id="'+m.id+'" controls preload="none" src="'+src+'" aria-label="Video"></video>';
  if(m.kind==='audio')return '<audio class="wa-media-audio" data-media-id="'+m.id+'" controls preload="none" src="'+src+'" aria-label="'+(m.voice?'Voice message':'Audio')+'"></audio>';
  return '<a class="message-attachment" href="'+escapeHTML(mediaUrl(m,true))+'" download="'+name+'">'+icon('document')+'<div><strong>'+name+'</strong><small>'+(m.size/1024).toFixed(1)+' KB · '+escapeHTML(m.mime)+'</small></div>'+icon('download')+'</a>';
 }
 if(message.contactCard){const c=message.contactCard;return '<div class="wa-media-card">'+icon('user')+'<strong>'+escapeHTML(c.name)+'</strong><span>'+escapeHTML(c.phone)+'</span></div>';}
 if(message.poll)return '<div class="wa-media-card"><strong>'+escapeHTML(message.poll.question)+'</strong><small>Select '+(message.poll.multiple?'one or more options':'one option')+'</small>'+message.poll.options.map(o=>'<div class="wa-poll-option">◯ '+escapeHTML(o)+'</div>').join('')+'<small>Voting is not connected yet.</small></div>';
 if(message.eventCard){const e=message.eventCard;return '<div class="wa-media-card">'+icon('calendar')+'<strong>'+escapeHTML(e.name)+'</strong><p>'+escapeHTML(new Date(e.start*1000).toLocaleString())+'</p><p>'+escapeHTML(e.description)+'</p><small>'+escapeHTML(e.location)+'</small></div>';}
 return '';
}
const mediaMarkup=messageMarkup;
messageMarkup=function(message,index,all){
 const content=message.deleted?'':mediaContent(message),display=content?{...message,text:message.caption||''}:message;
 let html=mediaMarkup(display,index,all);
 if(content)html=html.replace('<div class="message-copy">','<div class="wa-media-content">'+content+'</div><div class="message-copy">');
 if(message.media?.kind==='sticker')html=html.replace('class="message ','class="message media-sticker ');
 // Consecutive group messages share a sender heading, as in WhatsApp.
 const sameSender=index&&all[index-1].sender===message.sender&&all[index-1].outgoing===message.outgoing&&dayKey(all[index-1].sentAt)===dayKey(message.sentAt);
 if(sameSender)html=html.replace(/<div class="message-sender">[\s\S]*?<\/div>/,'');
 else if(message.sender&&!message.outgoing&&getChat()?.type==='group')html=html.replace('<div class="message-sender">','<span class="wa-group-avatar">'+avatar(getChat(message.senderJid)||{name:message.sender})+'</span><div class="message-sender">');
 return html;
};
const mediaRenderMessages=renderMessages;
renderMessages=function(scroll=true){
 const log=$('#messages'),playing=log?[...log.querySelectorAll('audio,video')].filter(e=>!e.paused):[];
 mediaRenderMessages(scroll);
 if(log)log.dataset.followBottom=String(scroll);
 // Keep the actual playing element across receipt/history updates.
 for(const element of playing){const replacement=$('#messages')?.querySelector('[data-media-id="'+element.dataset.mediaId+'"]');if(replacement)replacement.replaceWith(element);else element.pause();}
};
function mediaParticipant(person){const contact=getChat(person.id);return person.id===liveAccount?.id?'You':contact?.savedContact?contact.name:person.name||contact?.name||'Participant';}
const mediaConversation=renderConversation;
renderConversation=function(){mediaConversation();const c=getChat();if(c?.type==='group'){const sub=$('.chat-heading-text p');if(sub)sub.textContent=(c.participants||[]).map(mediaParticipant).join(', ')||'click here for group info';$('.chat-heading')?.setAttribute('aria-label',c.name+' group info');}};
const mediaDetail=renderDetail;
renderDetail=function(){const c=getChat();if(c?.type!=='group'){mediaDetail();return;}$('#contact-detail')?.remove();$('#main').insertAdjacentHTML('beforeend','<aside id="contact-detail" class="detail-panel" aria-label="Group info"><header class="view-header">'+iconButton('close','Close group info','close-detail')+'<h2>Group info</h2></header><div class="sidebar-scroll"><div class="profile-cover"><div class="contact-photo">'+avatar(c)+'</div><h2>'+escapeHTML(c.name)+'</h2><p>Group · '+(c.participants?.length||0)+' members</p></div><div class="profile-block"><p>'+escapeHTML(c.description||'')+'</p></div><div class="wa-group-members"><h3>Members</h3>'+(c.participants||[]).map(p=>'<p>'+escapeHTML(mediaParticipant(p))+(p.admin?'<small style="float:right;color:#16855b">Group admin</small>':'')+'</p>').join('')+'</div></div></aside>');};
parityAttachments=function(button){showMenu(button,[['Document','document','document'],['Photos & videos','image','image'],['Camera','image','camera'],['Audio','mic','audio'],['Contact','addContact','contact'],['Poll','check','poll'],['Event','calendar','event'],['New sticker','sticker','sticker']].map(([label,img,kind])=>parityMenuItem(label,img,'media-'+kind)).concat(typeof businessAction==='function'?['separator',parityMenuItem('Catalog','document','business-share-catalog'),parityMenuItem('Quick replies','chats','business-use-reply'),parityMenuItem('Order','document','business-orders')]:[]),true);};
let mediaDraft=null,mediaStream=null,mediaRecorder=null,mediaTimer=null,mediaPreviewUrl='',mediaSending=false,pickerTab='emoji';
function mediaCleanup(){clearInterval(mediaTimer);mediaTimer=null;if(mediaRecorder&&mediaRecorder.state!=='inactive'){mediaRecorder.onstop=null;mediaRecorder.stop();}mediaRecorder=null;mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;if(mediaPreviewUrl)URL.revokeObjectURL(mediaPreviewUrl);mediaPreviewUrl='';mediaDraft=null;}
const mediaCloseModal=closeModal;
closeModal=function(){if(mediaSending)return;mediaCleanup();mediaCloseModal();};
function mediaError(error){const target=$('#media-error');if(target)target.textContent=error instanceof Error?error.message:String(error);else toast(String(error));}
function mediaFooter(){return '<p id="media-error" class="wa-media-error" role="alert"></p><p id="media-status" class="wa-media-status" role="status"></p><button class="secondary-button" data-action="close-modal">Cancel</button><button class="solid-button" data-action="media-send">Send</button>';}
function mediaBegin(kind){if(!state.selected)return false;hideMenu();mediaCleanup();mediaDraft={kind,chat:state.selected,reply_to:state.replyTo?.id||'',request_id:crypto.randomUUID()};return true;}
function mediaFile(kind){if(!state.selected)return;hideMenu();const input=document.createElement('input');input.type='file';input.accept=({image:'image/jpeg,image/png,image/webp,image/gif,video/*',sticker:'image/png,image/jpeg,image/webp,image/gif',audio:'audio/*,video/webm',document:''})[kind]||'';input.addEventListener('change',()=>{const file=input.files?.[0];if(file)mediaFilePreview(file,kind);});input.click();}
function mediaFilePreview(file,kind,voice=false){
 if(file.size>64*1024*1024){toast('Attachment exceeds 64 MB.');return;}if(!mediaBegin(kind))return;
 if(kind==='image'&&file.type.startsWith('video/'))kind='video';Object.assign(mediaDraft,{kind,file,voice});mediaPreviewUrl=URL.createObjectURL(file);
 const tag=kind==='audio'?'audio':kind==='video'?'video':'img';
 const preview=kind==='document'?'<div>'+icon('document')+'<p>'+escapeHTML(file.name)+'</p><small>'+(file.size/1024).toFixed(1)+' KB</small></div>':'<'+tag+' src="'+mediaPreviewUrl+'" '+(tag!=='img'?'controls':'alt="Attachment preview"')+'>'+(tag==='img'?'':'</'+tag+'>');
 openModal(kind==='sticker'?'New sticker':voice?'Voice message':'Send '+kind,'<p>To: '+escapeHTML(getChat(mediaDraft.chat)?.name||'')+'</p><div class="wa-media-preview">'+preview+'</div>'+(['image','video','document'].includes(kind)?'<label class="field">Caption<textarea id="media-caption" maxlength="1024" rows="2" placeholder="Add a caption"></textarea></label>':''),mediaFooter(),'wa-media-dialog');
}
async function mediaUpload(file,kind,retry=true){
 if(!liveCsrf)await liveApi('chats');
 const response=await fetch('/api/whatsapp/uploads?kind='+kind+'&name='+encodeURIComponent(file.name),{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':liveCsrf,'X-WABuddy-Account':liveSlot,'Content-Type':'application/octet-stream'},body:file,signal:AbortSignal.timeout(120000)});
 if((response.status===401||response.status===403)&&retry){liveCsrf='';return mediaUpload(file,kind,false);}const value=await response.json();if(!response.ok)throw new Error(value.detail||'Upload failed.');return value;
}
function mediaForm(kind){if(!mediaBegin(kind))return;let fields='';
 if(kind==='contact')fields='<label class="field">Name<input id="media-name" maxlength="255" required></label><label class="field">Phone number<input id="media-phone" type="tel" placeholder="+60…" required></label>';
 if(kind==='poll')fields='<label class="field">Question<input id="media-name" maxlength="255" required></label><label class="field">Options (one per line)<textarea id="media-options" rows="5" placeholder="Option 1&#10;Option 2" required></textarea></label><label><input id="media-multiple" type="checkbox" checked> Allow multiple answers</label>';
 if(kind==='event')fields='<label class="field">Event name<input id="media-name" maxlength="255" required></label><label class="field">Start time<input id="media-start" type="datetime-local" required></label><label class="field">End time (optional)<input id="media-end" type="datetime-local"></label><label class="field">Description<textarea id="media-description" maxlength="2048"></textarea></label><label class="field">Location<input id="media-location" maxlength="255"></label>';
 openModal(kind==='contact'?'Send contact':kind==='poll'?'Create poll':'Create event',fields,mediaFooter(),'wa-media-dialog');
}
async function mediaSend(){
 if(!mediaDraft||mediaSending)return;const draft=mediaDraft;
 try{
  const value=id=>$(id)?.value.trim()||'';let body=draft.body;
  if(!body){body={kind:draft.kind,chat:draft.chat,request_id:draft.request_id,reply_to:draft.reply_to,voice:!!draft.voice};
   if(draft.file||draft.media_id){body.caption=value('#media-caption');}
   else{body.name=value('#media-name');if(!body.name)throw new Error('Enter a name or question.');
    if(draft.kind==='contact'){body.phone=value('#media-phone').replace(/[\s()-]/g,'');if(!/^\+?\d{6,20}$/.test(body.phone))throw new Error('Enter a valid international phone number.');}
    if(draft.kind==='poll'){body.options=value('#media-options').split('\n').map(s=>s.trim()).filter(Boolean);body.multiple=$('#media-multiple').checked;if(body.options.length<2||body.options.length>12||new Set(body.options).size!==body.options.length)throw new Error('Enter 2–12 different options.');}
    if(draft.kind==='event'){body.start=Math.floor(new Date(value('#media-start')).getTime()/1000);body.end=value('#media-end')?Math.floor(new Date(value('#media-end')).getTime()/1000):0;body.description=value('#media-description');body.location=value('#media-location');if(!body.start||body.start<=Date.now()/1000||body.end&&body.end<=body.start)throw new Error('Choose a future start and a later end.');}
   }
  }
  mediaSending=true;$('#media-error').textContent='';$('#media-status').textContent='Preparing attachment…';$('#modal-root').querySelectorAll('button,input,textarea').forEach(e=>e.disabled=true);
  if(draft.file&&!draft.media_id){const uploaded=await mediaUpload(draft.file,draft.kind);draft.media_id=uploaded.id;}
  if(draft.media_id)body.media_id=draft.media_id;draft.body=body;
  $('#media-status').textContent='Sending to WhatsApp…';await liveApi('rich-messages',body);mediaSending=false;closeModal();if(state.selected===draft.chat){state.replyTo=null;renderReplyPreview();}await refreshLive();toast('Sent to WhatsApp');
 }catch(error){mediaSending=false;mediaError(error);if($('#media-status'))$('#media-status').textContent=draft.body?'The send was not confirmed. Check the conversation before trying again.':'';$('#modal-root')?.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=false);}
}
async function mediaCapture(camera=false){
 if(!mediaBegin(camera?'image':'audio'))return;
 openModal(camera?'Camera':'Voice message','<div class="wa-media-preview">'+(camera?'<video id="media-camera" autoplay muted playsinline></video>':'<p id="media-record-time">Requesting microphone…</p>')+'</div><p id="media-error" class="wa-media-error" role="alert"></p>','<button class="secondary-button" data-action="close-modal">Cancel</button><button id="media-capture" class="solid-button" data-action="'+(camera?'media-snapshot':'media-stop-record')+'" disabled>'+(camera?'Take photo':'Stop recording')+'</button>','wa-media-dialog');
 const draft=mediaDraft;try{const stream=await navigator.mediaDevices.getUserMedia(camera?{video:true}:{audio:true});if(mediaDraft!==draft){stream.getTracks().forEach(t=>t.stop());return;}mediaStream=stream;
 if(camera){$('#media-camera').srcObject=stream;await $('#media-camera').play();}
 else{const type=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));mediaRecorder=new MediaRecorder(stream,type?{mimeType:type}:{});const chunks=[];mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};mediaRecorder.onstop=()=>{const file=new File(chunks,'voice-message.'+(mediaRecorder.mimeType.includes('ogg')?'ogg':'webm'),{type:mediaRecorder.mimeType});mediaRecorder=null;mediaFilePreview(file,'audio',true);};mediaRecorder.start(1000);const started=Date.now();mediaTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);if($('#media-record-time'))$('#media-record-time').textContent='Recording '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');if(seconds>=300)mediaRecorder?.stop();},500);}
 $('#media-capture').disabled=false;
 }catch(error){mediaError(error);mediaStream?.getTracks().forEach(t=>t.stop());}
}
function mediaSnapshot(){const video=$('#media-camera');if(!video?.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);canvas.toBlob(blob=>{if(blob)mediaFilePreview(new File([blob],'camera.jpg',{type:'image/jpeg'}),'image');},'image/jpeg',.9);}
const mediaEmoji=renderEmoji;
renderEmoji=function(){mediaEmoji();const panel=$('#emoji-panel');if(!panel)return;panel.insertAdjacentHTML('afterbegin','<div class="wa-picker-tabs" role="tablist"><button role="tab" data-action="media-tab" data-tab="emoji" aria-selected="'+(pickerTab==='emoji')+'">Emojis</button><button role="tab" data-action="media-tab" data-tab="sticker" aria-selected="'+(pickerTab==='sticker')+'">Stickers</button></div>');if(pickerTab==='sticker'){
 panel.querySelector('h3')?.remove();panel.querySelector('.emoji-grid')?.remove();const stickers=[...new Map(Object.values(data.messages).flat().filter(m=>m.media?.kind==='sticker').sort((a,b)=>b.sentAt-a.sentAt).map(m=>[m.media.id,m.media])).values()];
 panel.insertAdjacentHTML('beforeend','<div class="wa-media-tools"><button data-action="media-sticker">+ Create</button></div><h3>Recent stickers</h3><div class="wa-sticker-grid">'+stickers.slice(0,90).map(m=>'<button data-action="media-use-sticker" data-media="'+m.id+'" aria-label="Preview sticker"><img src="'+escapeHTML(mediaUrl(m))+'" alt="Sticker" loading="lazy"></button>').join('')+'</div>'+(!stickers.length?'<p class="wa-picker-note">Stickers from synchronized conversations appear here. Create one from an image.</p>':''));}
};
window.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;if(action==='voice'){event.preventDefault();event.stopImmediatePropagation();void mediaCapture();return;}if(!action.startsWith('media-'))return;event.preventDefault();event.stopImmediatePropagation();
 const kind=action.slice(6);if(['image','document','audio','sticker'].includes(kind))mediaFile(kind);
 else if(['contact','poll','event'].includes(kind))mediaForm(kind);
 else if(kind==='camera')void mediaCapture(true);else if(kind==='snapshot')mediaSnapshot();else if(kind==='stop-record'){button.disabled=true;mediaRecorder?.stop();}else if(kind==='send')void mediaSend();
 else if(kind==='view'){const m=getMessage(button.dataset.message)?.media;if(m)openModal('Photo','<div class="wa-media-preview"><img src="'+escapeHTML(mediaUrl(m))+'" alt="Photo"></div>','<a class="solid-button" href="'+escapeHTML(mediaUrl(m,true))+'" download>Download</a>','wa-media-dialog');}
 else if(kind==='tab'){pickerTab=button.dataset.tab;renderEmoji();}
 else if(kind==='use-sticker'){if(!mediaBegin('sticker'))return;mediaDraft.media_id=button.dataset.media;openModal('Send sticker','<div class="wa-media-preview"><img src="'+escapeHTML(mediaUrl({id:button.dataset.media}))+'" alt="Sticker"></div>',mediaFooter(),'wa-media-dialog');}
},true);
window.addEventListener('paste',event=>{if(event.target.id!=='message-input')return;const file=[...(event.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(file){event.preventDefault();mediaFilePreview(file,'image');}},true);
window.addEventListener('dragover',event=>{if(state.selected&&event.dataTransfer?.types.includes('Files'))event.preventDefault();});
window.addEventListener('drop',event=>{if(!state.selected||!event.dataTransfer?.files.length)return;event.preventDefault();const file=event.dataTransfer.files[0];mediaFilePreview(file,file.type.startsWith('image/')||file.type.startsWith('video/')?'image':file.type.startsWith('audio/')?'audio':'document');});
window.addEventListener('pagehide',mediaCleanup);
document.addEventListener('scroll',event=>{const log=event.target;if(log.id==='messages')log.dataset.followBottom=String(log.scrollHeight-log.scrollTop-log.clientHeight<100);},true);
document.addEventListener('load',event=>{const log=event.target.closest?.('#messages');if(log?.dataset.followBottom==='true')log.scrollTop=log.scrollHeight;},true);
`;
