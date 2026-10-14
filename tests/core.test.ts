import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveBinding, resolvePointer } from '../src/core/resolver.js';
import { formatMoney, formatValue } from '../src/core/formatter.js';
import type { Field, Format } from '../src/schema/types.js';
const field = (format: Format): Field => ({
  id: 'test',
  page: 1,
  rect: { x: 0, y: 0, width: 100, height: 20 },
  binding: '/value',
  format,
});
const data = {
  deep: { nested: { items: [{ value: 0 }, { value: false }] } },
  'a/b': { '~1': 'literal', '': 'empty-key' },
  nil: null,
  empty: '',
  array: ['one'],
};
for (const [pointer, result] of [
  ['/deep/nested/items/0/value', { status: 'value', value: 0 }],
  ['/deep/nested/items/1/value', { status: 'value', value: false }],
  ['/a~1b/~01', { status: 'value', value: 'literal' }],
  ['/a~1b/', { status: 'value', value: 'empty-key' }],
  ['/nil', { status: 'null' }],
  ['/empty', { status: 'empty' }],
  ['/absent', { status: 'missing' }],
  ['/array/4', { status: 'missing' }],
  ['/array/01', { status: 'invalid' }],
  ['/array/-', { status: 'invalid' }],
  ['/array/0/child', { status: 'invalid' }],
  ['/bad~2', { status: 'invalid' }],
  ['deep.nested', { status: 'invalid' }],
  ['/deep', { status: 'invalid' }],
] as const)
  test(`pointer ${pointer}`, () => assert.deepEqual(resolvePointer(data, pointer), result));
test('empty pointer selects scalar root; relative pointer uses supplied context', () => {
  assert.deepEqual(resolvePointer(0, ''), { status: 'value', value: 0 });
  assert.deepEqual(resolvePointer(data, './name', { name: 'Maya' }), {
    status: 'value',
    value: 'Maya',
  });
});
test('inherited properties are not resolved', () =>
  assert.deepEqual(resolvePointer(Object.create({ secret: 'bad' }), '/secret'), {
    status: 'missing',
  }));
test('concat skips absent parts but preserves false and zero', () => {
  assert.deepEqual(
    resolveBinding(
      { a: 'Jordan', b: null, c: 0, d: false },
      { kind: 'concat', parts: ['/a', '/b', '/c', '/d'] },
    ),
    { status: 'value', value: 'Jordan 0 false' },
  );
  assert.deepEqual(resolveBinding({ a: {} }, { kind: 'concat', parts: ['/a'] }), {
    status: 'invalid',
  });
});
for (const [raw, format, want] of [
  ['184650.49', {}, '184,650'],
  ['184650.50', {}, '184,651'],
  ['-14200.50', {}, '(14,201)'],
  ['-0.49', { zero: 'dash' }, '-0-'],
  ['0', { zero: 'blank' }, ''],
  ['0', { rounding: 'cents' }, '0.00'],
  ['1.999', { rounding: 'cents' }, '2.00'],
  ['0.005', { rounding: 'cents' }, '0.01'],
  ['999999999999999999999.50', {}, '1,000,000,000,000,000,000,000'],
  ['-12.9', { negative: 'minus', thousandsSeparator: false }, '-13'],
  [0, {}, '0'],
] as const)
  test(`exact decimal ${raw} -> ${want}`, () =>
    assert.equal(formatMoney(raw, { type: 'money', ...format }), want));
for (const value of [
  1.2,
  Number.MAX_SAFE_INTEGER + 1,
  NaN,
  Infinity,
  true,
  '$12',
  '1e4',
  ' 12',
  '-',
])
  test(`reject invalid money ${value}`, () =>
    assert.throws(() => formatMoney(value, { type: 'money' })));
for (const [date, valid] of [
  ['2024-02-29', true],
  ['2000-02-29', true],
  ['1900-02-29', false],
  ['2025-02-29', false],
  ['2025-04-31', false],
  ['2025-13-01', false],
  ['2025-04-15', true],
] as const)
  test(`calendar validity ${date}`, () => {
    const fn = () => formatValue(date, field({ type: 'date', pattern: 'MM/DD/YYYY' }));
    if (valid) assert.equal(fn().kind, 'text');
    else assert.throws(fn);
  });
test('SSN and EIN format and validate syntax rather than stripping arbitrary characters', () => {
  assert.deepEqual(formatValue('900123456', field({ type: 'tin', subtype: 'ssn' })), {
    kind: 'text',
    text: '900-12-3456',
  });
  assert.deepEqual(formatValue('900123456', field({ type: 'tin', subtype: 'ein' })), {
    kind: 'text',
    text: '90-0123456',
  });
  assert.throws(() => formatValue('abc900123456', field({ type: 'tin', subtype: 'ssn' })));
  assert.throws(() => formatValue('90012345', field({ type: 'tin', subtype: 'ssn' })));
});
test('false is an explicit checkbox selection, and comb identifiers preserve leading zeroes', () => {
  assert.deepEqual(
    formatValue(false, field({ type: 'checkbox', checkedWhen: { equals: false } })),
    { kind: 'checkbox', checked: true },
  );
  assert.deepEqual(
    formatValue('000-00-0000', field({ type: 'comb', cellCount: 9, exactLength: 9 })),
    { kind: 'comb', chars: Array(9).fill('0') },
  );
  assert.throws(() => formatValue('123', field({ type: 'comb', cellCount: 9, exactLength: 9 })));
  assert.throws(() => formatValue('1234567890', field({ type: 'comb', cellCount: 9 })));
  assert.throws(() => formatValue('123abc', field({ type: 'comb', cellCount: 9 })));
});
