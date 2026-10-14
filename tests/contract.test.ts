import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import type { Template } from '../src/schema/types.js';
import { allFields, validateSchema, validateSemantics } from '../src/core/validator.js';
import { inspect } from '../scripts/inspect.js';
import { calibrate } from '../scripts/calibrate.js';
const template: Template = JSON.parse(await readFile('examples/f1040-2025.template.json', 'utf8'));
test('strict schema and semantics accept the calibrated 36-field template', () => {
  assert.equal(allFields(template).length, 36);
  assert.deepEqual(validateSchema(template), []);
  assert.deepEqual(validateSemantics(template), []);
});
for (const [name, mutate] of [
  [
    'unknown root',
    (t: any) => {
      t.typo = true;
    },
  ],
  [
    'unknown field',
    (t: any) => {
      t.fields[0].typo = true;
    },
  ],
  [
    'malformed pointer',
    (t: any) => {
      t.fields[0].binding = '/bad~2';
    },
  ],
  [
    'unsupported format',
    (t: any) => {
      t.fields[0].format.type = 'eval';
    },
  ],
  [
    'font under eight',
    (t: any) => {
      t.defaults.minFontSize = 7;
    },
  ],
  [
    'mixed format',
    (t: any) => {
      t.fields[0].format.checkedWhen = { equals: true };
    },
  ],
] as const)
  test(`schema rejects ${name}`, () => {
    const t = structuredClone(template);
    mutate(t);
    assert.ok(validateSchema(t).length);
  });
test('only documented extension locations accept x- metadata', () => {
  const t = structuredClone(template);
  t['x-author'] = 'test';
  t.fields[0]['x-team'] = 'test';
  assert.deepEqual(validateSchema(t), []);
});
for (const [name, code, mutate] of [
  [
    'duplicate field',
    'E_ID',
    (t: Template) => {
      t.fields[1].id = t.fields[0].id;
    },
  ],
  [
    'duplicate page',
    'E_PAGE',
    (t: Template) => {
      t.pages[1].pageNumber = 1;
    },
  ],
  [
    'unknown page',
    'E_PAGE',
    (t: Template) => {
      t.fields[0].page = 9;
    },
  ],
  [
    'bounds',
    'E_BOUNDS',
    (t: Template) => {
      t.fields[0].rect.x = 600;
    },
  ],
  [
    'font range',
    'E_STYLE',
    (t: Template) => {
      t.fields[0].style = { fontSize: 8, minFontSize: 9 };
    },
  ],
  [
    'zero inner area',
    'E_STYLE',
    (t: Template) => {
      t.fields[0].style = { padding: 100 };
    },
  ],
  [
    'relative top level',
    'E_BINDING_CONTEXT',
    (t: Template) => {
      t.fields[0].binding = './name';
    },
  ],
  [
    'bad comb cells',
    'E_CELLS',
    (t: Template) => {
      const f = t.fields[2].format;
      if (f.type === 'comb') f.cells = [{ offset: 0, width: 200 }];
    },
  ],
] as const)
  test(`semantics rejects ${name}`, () => {
    const t = structuredClone(template);
    mutate(t);
    assert.ok(validateSemantics(t).some((d) => d.code === code));
  });
test('calibration fails on missing, ambiguous, wrong-page, or wrong-PDF mappings without mutating input', async () => {
  const report = await inspect();
  const before = JSON.stringify(template);
  const missing = structuredClone(template);
  missing.fields[0].provenance!.widgetName = 'not-found';
  await assert.rejects(calibrate(missing, report));
  const ambiguous = structuredClone(report);
  ambiguous.widgets.push(
    ambiguous.widgets.find((w) => w.widgetName === template.fields[0].provenance!.widgetName)!,
  );
  await assert.rejects(calibrate(template, ambiguous));
  const wrongPage = structuredClone(template);
  wrongPage.fields[0].page = 2;
  await assert.rejects(calibrate(wrongPage, report));
  await assert.rejects(calibrate(template, { ...report, sha256: '0'.repeat(64) }));
  assert.equal(JSON.stringify(template), before);
  const next = await calibrate(template, report);
  assert.deepEqual(next, template);
});
