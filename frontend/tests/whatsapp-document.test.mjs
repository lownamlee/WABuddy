import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { whatsappDocument } from '../src/whatsapp-document.ts';

test('the WhatsApp reference bundles every asset and uses separate demo storage', () => {
  const base = new URL('../src/whatsapp-ui/', import.meta.url);
  const template = readFileSync(new URL('index.html', base), 'utf8');
  const css = readFileSync(new URL('styles.css', base), 'utf8');
  const script = readFileSync(new URL('app.js', base), 'utf8');
  const assets = Object.fromEntries(readdirSync(new URL('assets/', base)).map(name => [`assets/${name}`, `/bundled/${name}`]));
  const document = whatsappDocument(template, css, script, assets);
  assert.ok(document.includes('/bundled/whatsapp-wallpaper.svg'));
  assert.ok(document.includes('/bundled/roboto-variable.woff2'));
  assert.ok(document.includes('wabuddy-whatsapp-preview-v1'));
  assert.ok(!document.includes('whatsapp-ui-demo-v1'));
  assert.ok(!document.includes('src="app.js"'));
  assert.ok(!document.includes('href="styles.css"'));
  assert.ok(!/assets\/[\w.-]+/.test(document));
});
