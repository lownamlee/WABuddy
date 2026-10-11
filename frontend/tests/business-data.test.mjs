import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newBusinessData, hoursError, formatHours, productError } from '../src/business-data.ts';

test('business hours drafts are isolated and closed days ignore unused intervals', () => {
  const first = newBusinessData();
  const second = newBusinessData();
  const draft = structuredClone(first.profile);
  draft.hoursMode = 'specific';
  draft.hours[0].enabled = false;
  draft.hours[0].intervals = [];
  assert.equal(formatHours(draft, 0), 'Closed');
  assert.equal(hoursError(draft.hoursMode, draft.hours), '');
  assert.equal(first.profile.hours[0].enabled, true);
  assert.equal(second.profile.hours[0].enabled, true);
  draft.hours[1].intervals.push({ open: '17:00', close: '20:00' });
  assert.match(hoursError('specific', draft.hours), /Monday has overlapping/);
  draft.hours[1].intervals[1] = { open: '19:00', close: '21:00' };
  assert.equal(hoursError('specific', draft.hours), '');
  draft.hours[1].intervals[1].close = '18:00';
  assert.match(hoursError('specific', draft.hours), /closing time after/);
  assert.equal(hoursError('appointment', draft.hours), '');
});

test('catalog validates required fields, currency amounts, sale price and link protocol', () => {
  const product = { id: 'sample', name: 'Sample', images: ['data:image/png;base64,AA=='], price: '10', sale: '8', country: 'Malaysia', description: '', link: '', code: '', hidden: false };
  assert.equal(productError(product), '');
  assert.match(productError({ ...product, name: ' ' }), /name/);
  assert.match(productError({ ...product, images: [] }), /image/);
  assert.match(productError({ ...product, country: '' }), /country/);
  assert.match(productError({ ...product, price: '-1' }), /valid positive/);
  assert.match(productError({ ...product, sale: '11' }), /less than/);
  assert.match(productError({ ...product, link: 'javascript:alert(1)' }), /https/);
});
