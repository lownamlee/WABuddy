import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LoginTransition, entryFrame, screenCoverDistance, ENTRY_DURATION,
  ENTRY_HOLD, ENTRY_ZOOM, SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_Z,
} from '../src/login-transition.ts';

test('a successful scan and later connected polls play the transition only once', () => {
  const completions = [];
  let reveals = 0;
  const flow = new LoginTransition({enter: done => completions.push(done), reveal: () => reveals++, reset: () => {}});
  assert.equal(flow.accept('qr'), false);
  assert.equal(flow.accept('paired'), true);
  flow.accept('paired');
  flow.accept('connected');
  assert.equal(completions.length, 1);
  assert.equal(reveals, 0, 'the second page must wait until the phone leaves view');
  completions[0]();
  flow.accept('connected');
  completions[0]();
  assert.equal(flow.phase, 'home');
  assert.equal(reveals, 1);
});

test('restored sessions enter directly; a failed pairing cancels late animation callbacks', () => {
  const completions = [];
  let reveals = 0, resets = 0;
  const flow = new LoginTransition({enter: done => completions.push(done), reveal: () => reveals++, reset: () => resets++});
  flow.accept('connected');
  assert.equal(flow.phase, 'entering');
  flow.accept('error');
  assert.equal(flow.phase, 'pairing');
  assert.equal(resets, 1);
  flow.accept('paired');
  completions[0]();
  assert.equal(reveals, 0);
  completions[1]();
  assert.equal(reveals, 1);
  flow.accept('disconnected');
  assert.equal(flow.phase, 'pairing');
});

test('manual dashboard entry needs no pairing status and repeated clicks only open once', () => {
  const completions = [];
  let reveals = 0;
  const flow = new LoginTransition({enter: done => completions.push(done), reveal: () => reveals++, reset: () => {}});
  flow.open();
  flow.open();
  assert.equal(flow.phase, 'entering');
  assert.equal(completions.length, 1);
  assert.equal(reveals, 0);
  completions[0]();
  flow.open();
  assert.equal(flow.phase, 'home');
  assert.equal(reveals, 1);
});

test('green screen details stay visible first, fade during zoom, and are absent at handoff', () => {
  assert.equal(entryFrame(0).zoom, 0);
  assert.equal(entryFrame(ENTRY_HOLD).detailsOpacity, 1);
  const middle = entryFrame(ENTRY_HOLD + ENTRY_ZOOM * .4);
  assert.ok(middle.zoom > 0 && middle.zoom < 1);
  assert.ok(middle.detailsOpacity > 0 && middle.detailsOpacity < 1);
  const final = entryFrame(ENTRY_DURATION);
  assert.equal(final.detailsOpacity, 0);
  assert.equal(final.wallpaperMix, 1);
  assert.equal(final.complete, true);
  assert.equal(entryFrame(0, true).complete, true, 'reduced motion skips the camera move');
});

test('final screen covers portrait, landscape and ultrawide viewports without casing edges', () => {
  for (const aspect of [.4, .5, 1, 16 / 9, 2.4, 3.5]) {
    const depth = screenCoverDistance(aspect, 34) - SCREEN_Z;
    const visibleHeight = 2 * depth * Math.tan(17 * Math.PI / 180);
    const visibleWidth = visibleHeight * aspect;
    assert.ok(visibleWidth < SCREEN_WIDTH * .83, `horizontal clearance at aspect ${aspect}`);
    assert.ok(visibleHeight < SCREEN_HEIGHT * .83, `vertical clearance at aspect ${aspect}`);
  }
});
