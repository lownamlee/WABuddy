import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrDeadline, regenerationDisabled, RevisionGate } from '../src/state.ts';

test('QR expiry uses server lifetime and monotonic client time, subtracting network delay', () => {
  const state = { status: 'qr', server_time: 1000, expires_at: 1020 };
  assert.equal(qrDeadline(state, 500, 2000), 18500);
  assert.equal(qrDeadline({ ...state, expires_at: 999 }, 500), 500);
  assert.equal(qrDeadline({ ...state, status: 'connected' }, 500), 0);
});

test('regeneration remains disabled while waiting for WhatsApp, even after POST has completed', () => {
  for (const status of ['connecting', 'refreshing', 'paired', 'connected']) {
    assert.equal(regenerationDisabled(false, {status, can_regenerate:true}), true);
  }
  assert.equal(regenerationDisabled(false, {status:'qr', can_regenerate:false}), true);
  assert.equal(regenerationDisabled(false, {status:'qr', can_regenerate:true}), false);
  assert.equal(regenerationDisabled(true, {status:'qr', can_regenerate:true}), true);
  assert.equal(regenerationDisabled(false, {status:'error', can_regenerate:true}), false);
});

test('regeneration and newer state suppress stale polling and image results', () => {
  const gate = new RevisionGate();
  const old = gate.current();
  assert.equal(gate.accept(old, 2), true);
  const regenerated = gate.invalidate();
  assert.equal(gate.accept(old, 99), false);
  assert.equal(gate.accept(regenerated, 4), true);
  // A QR image started at revision 3 arrives after the connected state at 4.
  assert.equal(gate.accept(regenerated, 3), false);
  assert.equal(gate.accept(regenerated, 4), true);
});
