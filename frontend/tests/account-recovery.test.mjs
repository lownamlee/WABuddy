import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountRequest} from '../src/account-session.ts';

test('temporary GET outage recovers and bootstrap remains bound to the browser account',async()=>{
 const original=globalThis.fetch;let reads=0;
 globalThis.document={documentElement:{dataset:{account:'personal'}}};
 globalThis.fetch=async(path)=>{
  if(path==='/api/bootstrap?account=personal')return {ok:true,json:async()=>({account_id:'personal',mode:'standard',csrf_token:'csrf'})};
  if(++reads===1)throw new TypeError('Failed to fetch');
  return {ok:true,status:200,json:async()=>({recovered:true})};
 };
 try{assert.deepEqual(await accountRequest('/api/agent/context'),{recovered:true});assert.equal(reads,2);}
 finally{globalThis.fetch=original;delete globalThis.document;}
});

test('uncertain outgoing request is never replayed automatically',async()=>{
 const original=globalThis.fetch;let writes=0;
 globalThis.document={documentElement:{dataset:{account:'personal'}}};
 globalThis.fetch=async(path)=>{
  if(path.startsWith('/api/bootstrap'))return {ok:true,json:async()=>({account_id:'personal',mode:'standard',csrf_token:'csrf'})};
  writes++;throw new TypeError('Failed to fetch');
 };
 try{await assert.rejects(accountRequest('/api/whatsapp/messages',{text:'hello'}),/result is unknown/);assert.equal(writes,1);}
 finally{globalThis.fetch=original;delete globalThis.document;}
});
