import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layout } from '../src/core/layout.js';
import type { Field, PdfRenderer } from '../src/schema/types.js';
// Deliberately asymmetric ascent/descent and widths make origin/alignment mistakes observable.
const renderer: PdfRenderer = {
  measure: (_font, text, size) => ({
    width: (text.length * size) / 2,
    ascent: size * 0.75,
    descent: -size * 0.25,
  }),
  render: async () => new Uint8Array(),
};
const field: Field = {
  id: 'test',
  page: 1,
  rect: { x: 20, y: 30, width: 100, height: 20 },
  binding: '/value',
  format: { type: 'text' },
};
for (const [align, x] of [
  ['left', 21],
  ['center', 62],
  ['right', 103],
] as const)
  test(`horizontal ${align}`, () => {
    const r = layout(
      { ...field, style: { align, fontSize: 8 } },
      { kind: 'text', text: '1234' },
      undefined,
      renderer,
    );
    assert.equal(r.instruction!.runs[0].x, x);
  });
for (const [verticalAlign, y] of [
  ['bottom', 33],
  ['middle', 38],
  ['top', 43],
] as const)
  test(`vertical ${verticalAlign} includes descent`, () => {
    const r = layout(
      { ...field, style: { verticalAlign, fontSize: 8 } },
      { kind: 'text', text: 'g' },
      undefined,
      renderer,
    );
    assert.equal(r.instruction!.runs[0].baseline, y);
  });
test('shrinks for height as well as width and reports the selected size', () => {
  const r = layout(
    { ...field, rect: { ...field.rect, height: 10.5 } },
    { kind: 'text', text: '1234' },
    undefined,
    renderer,
  );
  assert.equal(r.instruction!.runs[0].fontSize, 8.5);
  assert.equal(r.diagnostics[0].code, 'W_SHRUNK');
});
test('minimum is tested even if not on the half-point grid', () => {
  const r = layout(
    { ...field, rect: { ...field.rect, height: 10.1 }, style: { fontSize: 9.2 } },
    { kind: 'text', text: 'x' },
    undefined,
    renderer,
  );
  assert.equal(r.instruction!.runs[0].fontSize, 8);
});
test('overflow errors rather than truncating', () => {
  assert.equal(
    layout(
      { ...field, rect: { ...field.rect, width: 9 } },
      { kind: 'text', text: '1234' },
      undefined,
      renderer,
    ).diagnostics[0].code,
    'E_OVERFLOW',
  );
  assert.equal(
    layout(
      { ...field, style: { overflow: 'error' }, rect: { ...field.rect, height: 10.5 } },
      { kind: 'text', text: 'x' },
      undefined,
      renderer,
    ).diagnostics[0].code,
    'E_OVERFLOW',
  );
});
test('each comb cell must fit', () => {
  const f: Field = {
    ...field,
    format: {
      type: 'comb',
      cellCount: 2,
      cells: [
        { offset: 0, width: 10 },
        { offset: 10, width: 90 },
      ],
    },
  };
  const r = layout(f, { kind: 'comb', chars: ['1', '2'] }, undefined, renderer);
  assert.equal(r.instruction!.runs[0].x, 22.75);
  assert.equal(r.instruction!.runs[1].x, 72.75);
  assert.equal(
    layout(
      {
        ...f,
        format: {
          type: 'comb',
          cellCount: 2,
          cells: [
            { offset: 0, width: 3 },
            { offset: 3, width: 97 },
          ],
        },
      },
      { kind: 'comb', chars: ['1', '2'] },
      undefined,
      renderer,
    ).diagnostics[0].code,
    'E_OVERFLOW',
  );
});
test('unsupported glyph exceptions become safe diagnostics', () => {
  const r = layout(field, { kind: 'text', text: '你好' }, undefined, {
    ...renderer,
    measure: () => {
      throw new Error('secret');
    },
  });
  assert.equal(r.diagnostics[0].code, 'E_GLYPH');
  assert.ok(!JSON.stringify(r).includes('secret'));
});
