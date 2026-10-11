import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {liveBridge} from '../src/whatsapp-live.ts';
import {accountStorage, bindAccount, skipIntro, SKIP_INTRO_KEY} from '../src/account-session.ts';

test('account preferences are isolated and stale pages cannot rebind to another account', () => {
  globalThis.document = {documentElement: {dataset: {}}};
  const stored = new Map();
  globalThis.localStorage = {getItem: key => stored.get(key) ?? null};
  bindAccount({account_id:'first',mode:'business'});
  assert.equal(accountStorage('drafts'), 'drafts:first');
  assert.throws(() => bindAccount({account_id:'second',mode:'standard'}), /active account changed/);
  assert.equal(document.documentElement.dataset.account, 'first');
  assert.equal(skipIntro(), false);
  stored.set(SKIP_INTRO_KEY, 'true');
  assert.equal(skipIntro(), true);
  delete globalThis.document;
  delete globalThis.localStorage;
});

test('an old WhatsApp frame rejects a changed account before sending a message', async () => {
  let sends=0;
  const context=vm.createContext({AbortSignal,
    parent:{document:{documentElement:{dataset:{account:'original'}}}},
    fetch:async path => {
      if(path==='/api/bootstrap')return {ok:true,json:async()=>({csrf_token:'fresh',account_id:'personal'})};
      sends++;return {ok:true,json:async()=>({})};
    }});
  vm.runInContext(liveBridge.slice(0,liveBridge.indexOf('const liveAvatar=')),context);
  await assert.rejects(vm.runInContext("liveApi('messages',{request_id:'test-request',text:'must not send'})",context), /active account changed/);
  assert.equal(sends,0);
});
