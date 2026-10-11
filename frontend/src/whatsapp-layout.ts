/** Current Personal / Business layouts, compared with both live Web clients. */
export const layoutStyles = `
.personal-mode .wordmark{color:#21a366}.personal-mode .icon-button.primary{background:#21a366}.personal-mode .filter-chip.active{background:#d9fdd3;color:#164b32;border-color:#b6d0ad}
.rail-profile .avatar{width:28px;height:28px}.rail-profile{padding:6px}.rail .nav-dot{display:none}
.chat-row .avatar{flex-shrink:0}.community-avatar{width:48px;height:48px;position:relative;flex-shrink:0}.community-avatar>.avatar{width:35px;height:35px;position:absolute;top:0;left:0;border-radius:11px;border:1px solid #eee}.community-avatar>.avatar-badge{position:absolute;width:29px;height:29px;bottom:0;right:0;display:grid;place-items:center;border:2px solid white;border-radius:50%;background:#f8d6df;color:#bd3163}.community-avatar>.avatar-badge svg{width:19px;height:19px}
.chat-row.community-row{min-height:88px!important}.community-label{font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.community-meta{display:flex;justify-content:space-between;gap:5px;margin-bottom:4px}.community-meta .chat-time{flex-shrink:0}.chat-preview .icon{width:17px;height:17px;margin-right:4px}.chat-preview svg{display:inline-block;vertical-align:middle}.chat-preview .preview-you{color:#2898da;margin-right:4px}.chat-badges svg{color:#666;width:16px;height:16px}.chat-time{font-size:11px}.chat-content{overflow:hidden}
.archived-entry{display:flex;width:100%;height:55px;align-items:center;gap:28px;padding:0 28px;text-align:left;color:#606568;font-size:14px}.archived-entry svg{width:21px;height:21px}.archived-entry span{flex:1}.archived-entry small{font-size:12px}.archived-entry:hover{background:var(--hover)}
.wa-account-title{font-size:22px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wa-you-photo{height:255px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}.wa-you-photo .avatar{height:120px;width:120px;font-size:40px}.wa-about-bubble{min-width:145px;max-width:80%;padding:12px 24px;margin-bottom:10px;background:white;box-shadow:0 4px 22px #0001;border-radius:30px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wa-settings-row{display:flex;align-items:center;width:100%;text-align:left;gap:24px;padding:19px 30px;font-size:16px;min-height:74px}.wa-settings-row:hover{background:var(--hover)}.wa-settings-row>svg{color:#666;width:22px;height:22px}.wa-settings-row small{display:block;color:#777;font-size:14px;line-height:20px;margin-top:4px}.wa-settings-row.danger{color:#c6313d}.wa-profile-field{padding:20px 30px}.wa-profile-field>small{display:block;color:#666;margin-bottom:20px;font-size:14px}.wa-profile-field>div{display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:16px}.wa-profile-field button{color:#555}.wa-settings-note{margin:20px 26px;padding:14px;border-radius:10px;background:#f5f4f1;font-size:13px;line-height:20px;color:#63716b}.wa-settings-note a{display:block;margin-top:8px}.wa-setting-search{margin-bottom:4px}.wa-community-title{padding:16px 24px;color:#667781;font-size:13px}.wa-community-card{padding:16px 24px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:16px}.wa-community-card strong{font-size:16px;font-weight:400}.wa-community-card .avatar{width:48px;height:48px}.welcome .quick-actions{max-width:100%;flex-wrap:wrap}.welcome .welcome-card{max-width:440px}.welcome .welcome-card h1{font-size:24px}.welcome .quick-action[aria-disabled=true]{cursor:default}.wa-no-history{padding:12px;color:#758078;text-align:center;font-size:12px}
`;

export const layoutBridge = String.raw`
const waBusiness=typeof businessAction==='function';
document.body.classList.add(waBusiness?'business-mode':'personal-mode');
const waLiveAvatar=avatar;
avatar=function(chat,extra=''){
 if(chat.photoVersion)return waLiveAvatar(chat,extra);
 const group=['group','community'].includes(chat.type)||chat.id?.endsWith('@g.us');
 return '<span class="avatar '+escapeHTML(extra)+'" style="background:'+(group?'#e9e2ff':chat.savedContact?'#fbdfeb':'#d9efeb')+';color:'+(group?'#6b43cb':chat.savedContact?'#c34476':'#00897b')+'">'+(group?icon('group'):chat.savedContact?escapeHTML(String(chat.initial||chat.name||'').slice(0,1)):icon('user'))+'</span>';
};
function waSelf(){return {id:liveAccount?.id,name:liveAccount?.name||'You',photoVersion:liveAccount?.photoVersion||0,type:'self'};}
unreadCount=function(){return data.chats.filter(c=>!c.archived&&c.unreadKnown&&c.unread>0).length;};
renderRail=function(){
 const entries=[['chats','Chats','chats'],['calls','Calls','call'],['status','Status','status'],['channels','Channels','channels'],['communities','Communities','group']];
 $('#rail').innerHTML=entries.map(([view,label,img])=>'<button class="rail-button '+(state.view===view?'active':'')+'" data-action="nav" data-view="'+view+'" aria-label="'+label+'" title="'+label+'" aria-pressed="'+(state.view===view)+'">'+icon(img)+(view==='chats'&&unreadCount()?'<span class="nav-badge">'+unreadCount()+'</span>':'')+'</button>').join('')+'<div class="rail-divider"></div><button class="rail-button" data-action="unsupported" title="Meta AI" aria-label="Meta AI">'+icon('meta')+'</button><div class="rail-spacer"></div><button class="rail-button" data-action="nav" data-view="media" title="Media" aria-label="Media">'+icon('media')+'</button><button class="rail-button rail-profile '+(state.view==='profile'?'active':'')+'" data-action="nav" data-view="profile" aria-label="You" title="You" aria-pressed="'+(state.view==='profile')+'">'+avatar(waSelf())+'</button>';
};
filteredChats=function(){const q=state.query.trim().toLowerCase(),digits=q.replace(/\D/g,'');return data.chats.filter(c=>!c.isCommunity&&Boolean(c.archived)===(state.panel==='archived')&&(state.filter!=='unread'||c.unread>0)&&(state.filter!=='favorites'||c.favorite)&&(state.filter!=='groups'||c.type==='group')&&(!q||(c.name+' '+(c.preview||'')).toLowerCase().includes(q)||(digits.length>3&&c.phone.includes(digits)))).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(b.pinOrder||0)-(a.pinOrder||0)||b.lastMessageAt-a.lastMessageAt);};
chatRow=function(chat){
 const community=!!chat.community;const parent=(data.contacts||[]).find(c=>c.id===chat.parentGroup);
 const photo=community?'<span class="community-avatar">'+avatar(parent||{type:'group',name:chat.community})+'<span class="avatar-badge">'+icon('group')+'</span></span>':avatar(chat);
 const time='<span class="chat-time '+(chat.unread?'unread':'')+'">'+escapeHTML(formatChatTime(chat.lastMessageAt))+'</span>';
 let preview=escapeHTML(chat.preview||'');const mediaIcons={Photo:'image',Video:'video',Sticker:'sticker',Document:'document','Voice message':'mic',Contact:'user',Poll:'check',Event:'call'};
 preview=preview.replace(/\[(Photo|Video|Sticker|Document|Voice message|Contact|Poll|Event)\]/g,(_,label)=>icon(mediaIcons[label])+label); const ticks=chat.outgoing?icon(chat.lastStatus==='sent'?'check':'read',chat.lastStatus==='read'?'live-read':'live-sent'):'';
 return '<button class="chat-row '+(community?'community-row ':'')+(state.selected===chat.id?'selected':'')+'" data-action="open-chat" data-id="'+escapeHTML(chat.id)+'" aria-label="'+escapeHTML(chat.name)+(chat.unread?', '+chat.unread+' unread messages':'')+'" aria-current="'+(state.selected===chat.id)+'">'+photo+'<span class="chat-content">'+(community?'<span class="community-meta"><span class="community-label">'+escapeHTML(chat.community)+'</span>'+time+'</span>':'')+'<span class="chat-top"><span class="chat-name">'+escapeHTML(chat.name)+'</span>'+(community?'':time)+'</span><span class="chat-bottom"><span class="chat-preview">'+ticks+'<span>'+preview+'</span></span><span class="chat-badges">'+(chat.unread?'<span class="unread-badge">'+chat.unread+'</span>':'')+(chat.muted?icon('bell'):'')+(chat.pinned?icon('pin'):'')+'</span></span></span></button>';
};
function waCommunities(){const groups=data.contacts.filter(c=>c.isCommunity);$('#sidebar').innerHTML=backHeader('Communities','go-chats')+'<div class="sidebar-scroll">'+groups.map(c=>'<div class="wa-community-card">'+avatar(c)+'<strong>'+escapeHTML(c.name)+'</strong></div>').join('')+data.chats.filter(c=>c.community).map(chatRow).join('')+(groups.length?'':'<p class="wa-no-history">No communities have synchronized yet.</p>')+'</div>';}
const waSidebar=renderSidebar;
renderSidebar=function(remember=true){
 if(state.view==='communities'){waCommunities();return;}
 if(state.panel==='archived'){$('#sidebar').innerHTML=backHeader('Archived')+'<div class="sidebar-scroll"><div id="chat-list" aria-label="Archived chats"></div></div>';renderChatList();return;}
 waSidebar(remember);
 if(!state.panel&&state.view==='chats'&&!state.query){const count=data.chats.filter(c=>c.archived&&!c.isCommunity).length;if(count)$('#chat-list')?.insertAdjacentHTML('beforebegin','<button class="archived-entry" data-action="wa-archived">'+icon('chats')+'<span>Archived</span><small>'+count+'</small></button>');}
};
const waWelcome=renderWelcome;
renderWelcome=function(){if(!liveAccount){waWelcome();return;}$('#main').innerHTML='<section class="welcome"><div class="welcome-card"><img class="welcome-art" src="assets/welcome.svg" alt=""><h1>Voice and video calling</h1><p>Calls are not connected in WABuddy yet.</p><button class="pill-button" data-action="unsupported" aria-disabled="true">Go to Calls</button></div><div class="quick-actions">'+[['document','Send document'],['addContact','Add contact'],['video','New call'],['meta','Ask Meta AI']].map(([img,label])=>'<button class="quick-action" data-action="unsupported" aria-disabled="true"><span class="quick-icon">'+icon(img)+'</span><span>'+label+'</span></button>').join('')+'</div></section>';};
const waSections=[['user','Profile','Name, profile picture, username','profile'],['lock','Account','Security notifications, account info','account'],['lock','Privacy','Blocked contacts, disappearing messages','privacy'],['chats','Chats','Theme, wallpaper, chat settings','chats'],['bell','Notifications','Messages, groups, sounds','notifications'],['document','Keyboard shortcuts','Quick actions','keyboard'],['info','Help and feedback','Help center, contact us, privacy policy','help']];
let waAccountSection='';
function waYou(query=''){
 waAccountSection='';
 $('#sidebar').innerHTML='<header class="sidebar-header"><h1 class="wa-account-title">'+escapeHTML(liveAccount?.name||'You')+'</h1></header><div class="search-wrap wa-setting-search">'+icon('search')+'<input id="wa-settings-search" placeholder="Search" aria-label="Search settings" value="'+escapeHTML(query)+'"></div><div class="sidebar-scroll"><div class="wa-you-photo">'+(liveAccount?.about?'<button class="wa-about-bubble" data-action="wa-account-page" data-page="profile">'+escapeHTML(liveAccount.about)+'</button>':'')+'<button data-action="wa-account-page" data-page="profile" aria-label="View profile">'+avatar(waSelf())+'</button></div><div id="wa-settings-list">'+waSections.map(([img,title,desc,page])=>'<button class="wa-settings-row" data-action="wa-account-page" data-page="'+page+'">'+icon(img)+'<span>'+title+'<small>'+desc+'</small></span></button>').join('')+'<button class="wa-settings-row danger" data-action="live-logout">'+icon('arrow')+'<span>Log out</span></button></div></div>';
}
function waAccountPage(page){
 waAccountSection=page;
 const title=page==='profile'?'Edit profile':waSections.find(item=>item[3]===page)?.[1]||'Settings';
 $('#sidebar').innerHTML=backHeader(title,'wa-you')+'<div class="sidebar-scroll">'+(page==='profile'?'<div class="wa-you-photo" style="height:215px">'+avatar(waSelf())+'</div>'+[['About',liveAccount?.about||'Not available'],['Name',liveAccount?.name||'Not available'],['Phone',liveAccount?.formattedPhone||'']].map(([label,value])=>'<div class="wa-profile-field"><small>'+label+'</small><div><span>'+escapeHTML(value)+'</span>'+iconButton(label==='Phone'?'copy':'edit',label==='Phone'?'Copy phone':'Edit '+label,label==='Phone'?'wa-copy-phone':'unsupported')+'</div></div>').join(''):'')+'<p class="wa-settings-note">'+(page==='profile'?'Profile changes':'These account settings')+' are not connected in WABuddy yet.<a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">Open WhatsApp to manage them</a></p></div>';
}
if(!waBusiness){renderProfileSidebar=function(){waAccountSection?waAccountPage(waAccountSection):waYou();};renderSettingsSidebar=function(){waAccountSection?waAccountPage(waAccountSection):waYou();};}
const waMain=renderMain;
renderMain=function(){if(state.view==='profile'&&!waBusiness)renderWelcome();else waMain();};
const waNavigate=navigate;
navigate=function(view){waAccountSection='';if(view==='communities'){
 state.view=view;state.panel=null;state.selected=null;renderRail();
 const groups=data.contacts.filter(c=>c.isCommunity);$('#sidebar').innerHTML=backHeader('Communities','go-chats')+'<div class="sidebar-scroll">'+groups.map(c=>'<div class="wa-community-card">'+avatar(c)+'<strong>'+escapeHTML(c.name)+'</strong></div>').join('')+data.chats.filter(c=>c.community).map(chatRow).join('')+(groups.length?'':'<p class="wa-no-history">No communities have synchronized yet.</p>')+'</div>';renderWelcome();return;
 }waNavigate(view);};
const waChatConversation=renderConversation;
renderConversation=function(){waChatConversation();if(!waBusiness){const subtitle=$('.chat-heading-text p');if(subtitle)subtitle.textContent='';}const c=getChat();if(c?.type==='group'){const sub=$('.chat-heading-text p');if(sub)sub.textContent=c.community||'Group info';}};
window.addEventListener('input',event=>{if(event.target.id==='wa-settings-search'){const q=event.target.value.toLowerCase();document.querySelectorAll('#wa-settings-list .wa-settings-row').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));}},true);
window.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
 if(action==='wa-archived'){event.stopImmediatePropagation();state.panel='archived';state.filter='all';state.query='';renderSidebar();}
 else if(action==='wa-account-page'){event.stopImmediatePropagation();waAccountPage(button.dataset.page);}
 else if(action==='wa-you'){event.stopImmediatePropagation();waYou();}
 else if(action==='wa-copy-phone'){event.stopImmediatePropagation();void navigator.clipboard.writeText(liveAccount?.formattedPhone||'').then(()=>toast('Phone number copied'));}
},true);
render();
`;
