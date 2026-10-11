import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {liveSource,liveBridge} from '../src/whatsapp-live.ts';
import {layoutBridge} from '../src/whatsapp-layout.ts';
import {parityBridge} from '../src/whatsapp-parity.ts';
import {mediaBridge} from '../src/whatsapp-media.ts';

test('chat previews use the same blue read state as message bubbles',()=>{
  const source=liveSource(readFileSync(new URL('../src/whatsapp-ui/app.js',import.meta.url),'utf8'));
  const context=vm.createContext({escapeHTML:String,icon:(name,cls)=>`<i class="${cls}">${name}</i>`});
  const expression=source.match(/chat\.outgoing\?`<span title=[\s\S]*?<\/span>`:''/)[0];
  for(const status of ['sent','delivered','read']){
    context.chat={outgoing:true,lastStatus:status};
    const result=vm.runInContext(expression,context);
    assert.equal(result.includes('live-read'),status==='read');
    assert.ok(result.includes(`aria-label="${status}"`));
  }
});

test('live renderer starts empty and never loads or saves demo conversation data',()=>{
  const source=liveSource(readFileSync(new URL('../src/whatsapp-ui/app.js',import.meta.url),'utf8'));
  assert.doesNotThrow(()=>new vm.Script(source+liveBridge+parityBridge+layoutBridge+mediaBridge));
  assert.ok(!source.includes('localStorage.getItem'));
  assert.ok(!source.includes('localStorage.setItem'));
  const initialization=source.slice(source.indexOf('const data ='),source.indexOf('const state ='));
  const context=vm.createContext({});
  vm.runInContext(initialization+'; result = {chats:data.chats,messages:data.messages};',context);
  assert.equal(JSON.stringify(context.result),'{"chats":[],"messages":{}}');
});

test('chat list separates archives, includes groups, and puts pinned chats first',()=>{
  const context=vm.createContext({state:{query:'',filter:'all',panel:null},data:{chats:[
    {id:'recent',name:'Recent',type:'person',phone:'1',lastMessageAt:300},
    {id:'pinned',name:'Pinned',type:'group',phone:'2',pinned:true,lastMessageAt:100},
    {id:'archived',name:'Archived',type:'person',phone:'3',archived:true,lastMessageAt:400},
    {id:'parent',name:'Community',phone:'4',isCommunity:true,lastMessageAt:500},
  ]}});
  vm.runInContext(layoutBridge.slice(layoutBridge.indexOf('filteredChats=function'),layoutBridge.indexOf('chatRow=function')),context);
  assert.equal(vm.runInContext('filteredChats().map(c=>c.id).join(",")',context),'pinned,recent');
  vm.runInContext("state.panel='archived'",context);
  assert.equal(vm.runInContext('filteredChats().map(c=>c.id).join(",")',context),'archived');
  vm.runInContext("state.panel=null;state.filter='groups'",context);
  assert.equal(vm.runInContext('filteredChats().map(c=>c.id).join(",")',context),'pinned');
});

test('media URLs are account-bound and rich text cannot inject markup',()=>{
  const context=vm.createContext({liveSlot:'personal-slot',escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),icon:()=>''});
  vm.runInContext(mediaBridge.slice(0,mediaBridge.indexOf('const mediaMarkup=')),context);
  context.media={id:'a'.repeat(48),kind:'image',name:'photo.png'};
  assert.equal(vm.runInContext('mediaUrl(media)',context),'/api/whatsapp/media/'+'a'.repeat(48)+'?account=personal-slot');
  assert.equal(vm.runInContext("mediaUrl({id:'../private'})",context),'');
  context.message={media:context.media,id:'msg',caption:'<script>alert(1)</script>'};
  const html=vm.runInContext('mediaContent(message)',context);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  context.message={media:{...context.media,kind:'sticker'}};
  assert.ok(vm.runInContext('mediaContent(message)',context).includes('class="wa-sticker"'));
});

test('a rejected stale token refreshes once and preserves the message request ID',async()=>{
  const requests=[];let attempts=0;
  const context=vm.createContext({AbortSignal,fetch:async(path,options)=>{
    requests.push({path,body:options.body});
    if(path==='/api/bootstrap')return {ok:true,status:200,json:async()=>({csrf_token:'fresh'})};
    attempts++;
    return attempts===1?{ok:false,status:403,json:async()=>({detail:'Invalid browser request token.'})}:{ok:true,status:200,json:async()=>({status:'sent'})};
  }});
  vm.runInContext(liveBridge.slice(0,liveBridge.indexOf('const liveAvatar=')),context);
  const result=await vm.runInContext("liveApi('messages',{request_id:'same-request-id',chat:'222@s.whatsapp.net',text:'hello'})",context);
  assert.equal(result.status,'sent');
  const sends=requests.filter(r=>r.path.endsWith('/messages'));
  assert.equal(sends.length,2);assert.equal(sends[0].body,sends[1].body);
});

test('a network error never automatically retries a potentially accepted send',async()=>{
  let sends=0;
  const context=vm.createContext({AbortSignal,fetch:async(path)=>{
    if(path==='/api/bootstrap')return {ok:true,status:200,json:async()=>({csrf_token:'fresh'})};
    sends++;throw new Error('network failed');
  }});
  vm.runInContext(liveBridge.slice(0,liveBridge.indexOf('const liveAvatar=')),context);
  await assert.rejects(vm.runInContext("liveApi('messages',{request_id:'same-request-id',chat:'222@s.whatsapp.net',text:'hello'})",context));
  assert.equal(sends,1);
});

test('reaction pills omit a single count and quote text remains escaped',()=>{
  const escapeHTML=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const context=vm.createContext({escapeHTML,icon:()=>'',getChat:()=>({name:'Contact'}),messageMarkup:()=>'<div class="message outgoing"><button class="quoted-message">old</button></div>'});
  const start=parityBridge.indexOf('function quoteLabel'),end=parityBridge.indexOf('renderReplyPreview=',start);
  vm.runInContext(parityBridge.slice(start,end),context);
  context.message={id:'m',reply:{id:'q',sender:'+60 11-2345 6789',pushName:'<Name>',text:'<original>'},reactions:[{emoji:'👍',mine:true}]};
  let markup=vm.runInContext('messageMarkup(message,0,[message])',context);
  assert.ok(markup.includes('View reactions'));assert.ok(!markup.includes('reaction-count'));
  assert.ok(markup.includes('~&lt;Name&gt;'));assert.ok(markup.includes('&lt;original&gt;'));
  context.message.reactions.push({emoji:'👍',mine:false});
  markup=vm.runInContext('messageMarkup(message,0,[message])',context);
  assert.ok(markup.includes('reaction-count">2'));
  assert.equal((markup.match(/<span>👍<\/span>/g)||[]).length,1);
});
