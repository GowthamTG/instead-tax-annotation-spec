import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PDFDocument, PDFName, PDFNumber } from '@cantoo/pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import type { Template } from '../src/schema/types.js';
import { renderTaxForm } from '../src/core/pipeline.js';
const basePdfBytes = await readFile('examples/f1040-2025.pdf');
const template: Template = JSON.parse(await readFile('examples/f1040-2025.template.json', 'utf8'));
const payload = JSON.parse(await readFile('examples/f1040-2025-payload.json', 'utf8'));
const render = (t = template, p = payload, bytes: Uint8Array = basePdfBytes) =>
  renderTaxForm({ basePdfBytes: bytes, template: t, payload: p });
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
test('PDF.js independently recovers every populated run and verifies font-metric containment on both pages', async () => {
  const result = await render();
  assert.equal(result.success, true);
  assert.equal(result.instructions.length, 23);
  assert.ok(result.pdfBytes);
  const doc = await getDocument({ data: result.pdfBytes!.slice(), useSystemFonts: true }).promise;
  let checked = 0;
  try {
    for (let n = 1; n <= 2; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      const items = content.items.filter((i): i is TextItem => 'str' in i && !!i.str.trim());
      const instructions = result.instructions.filter((i) => i.page === n);
      for (const inst of instructions)
        for (const run of inst.runs) {
          const item = items.find(
            (i) =>
              i.str === run.text &&
              Math.abs(i.transform[4] - run.x) < 0.01 &&
              Math.abs(i.transform[5] - run.baseline) < 0.01,
          );
          assert.ok(item, `Independent PDF text missing at field ${inst.fieldId}`);
          const size = Math.hypot(item.transform[2], item.transform[3]);
          const font = content.styles[item.fontName];
          const x = item.transform[4],
            y = item.transform[5];
          assert.ok(size >= 8);
          assert.ok(Math.abs(item.width - run.width) < 0.01);
          assert.ok(
            x >= inst.rect.x - 0.01 && x + item.width <= inst.rect.x + inst.rect.width + 0.01,
          );
          assert.ok(y + (font.descent ?? -0.207) * size >= inst.rect.y - 0.01);
          assert.ok(y + (font.ascent ?? 0.718) * size <= inst.rect.y + inst.rect.height + 0.01);
          checked++;
        }
    }
    assert.equal(checked, 55); // 23 regions, four 9-character combs replacing four single runs.
  } finally {
    await doc.destroy();
  }
  assert.ok(result.instructions.some((i) => i.fieldId === 'wages' && i.runs[0].text === '184,651'));
  assert.ok(
    result.instructions.some((i) => i.fieldId === 'taxable_income' && i.runs[0].text === '-0-'),
  );
  assert.ok(result.instructions.some((i) => i.fieldId === 'digital_no'));
  assert.ok(
    !result.instructions.some(
      (i) =>
        i.fieldId === 'household_wages' ||
        i.fieldId === 'digital_yes' ||
        i.fieldId === 'dep3_first',
    ),
  );
});
test('wrong fingerprint blocks PDF output', async () => {
  const r = await render({ ...template, basePdf: { ...template.basePdf, sha256: '0'.repeat(64) } });
  assert.equal(r.success, false);
  assert.equal(r.pdfBytes, undefined);
  assert.equal(r.diagnostics[0].code, 'E_PDF_HASH');
});
test('combined failure collects field errors, emits no PDF, and omits all raw payload values from diagnostics', async () => {
  const p = structuredClone(payload);
  delete p.taxpayer.primary.name.last;
  p.taxpayer.primary.identifiers.ssn = '900-12-9999999';
  p.income.w2Summary.totalWages = '999999999999999999.99';
  const r = await render(template, p);
  assert.equal(r.pdfBytes, undefined);
  for (const code of ['E_REQUIRED', 'E_COMB', 'E_OVERFLOW'])
    assert.ok(r.diagnostics.some((d) => d.code === code));
  for (const secret of [
    p.taxpayer.primary.identifiers.ssn,
    p.income.w2Summary.totalWages,
    'Jordan',
  ])
    assert.ok(!JSON.stringify(r.diagnostics).includes(secret));
});
test('more dependents than slots cannot silently disappear', async () => {
  const p = structuredClone(payload);
  p.household.dependents = Array(5).fill(p.household.dependents[0]);
  const r = await render(template, p);
  assert.equal(r.pdfBytes, undefined);
  assert.ok(r.diagnostics.some((d) => d.code === 'E_REPEAT_OVERFLOW'));
});
test('exclusive checkbox conflicts and required empty strings fail', async () => {
  const t = structuredClone(template);
  const f = structuredClone(t.fields.find((f) => f.id === 'filing_single')!);
  f.id = 'conflicting';
  t.fields.push(f);
  const r = await render(t);
  assert.ok(r.diagnostics.some((d) => d.code === 'E_CHECKBOX_GROUP'));
  assert.equal(r.pdfBytes, undefined);
  const p = structuredClone(payload);
  p.taxpayer.primary.name.last = '';
  assert.ok((await render(template, p)).diagnostics.some((d) => d.code === 'E_REQUIRED'));
});
for (const [name, change] of [
  ['rotation', (d: PDFDocument) => d.getPage(0).node.set(PDFName.of('Rotate'), PDFNumber.of(90))],
  ['userunit', (d: PDFDocument) => d.getPage(0).node.set(PDFName.of('UserUnit'), PDFNumber.of(2))],
  ['cropbox', (d: PDFDocument) => d.getPage(0).setCropBox(5, 5, 600, 780)],
  ['media origin', (d: PDFDocument) => d.getPage(0).setMediaBox(5, 0, 612, 792)],
] as const)
  test(`reject unsupported ${name} even with matching hash`, async () => {
    const d = await PDFDocument.load(basePdfBytes, { preserveXFA: true });
    change(d);
    const bytes = await d.save();
    const t = structuredClone(template);
    t.basePdf.sha256 = hash(bytes);
    const r = await render(t, payload, bytes);
    assert.equal(r.pdfBytes, undefined);
    assert.ok(r.diagnostics.some((d) => d.code === 'E_PDF_GEOMETRY'));
  });
test('unreadable bytes and wrong dimensions fail safely', async () => {
  const bytes = new TextEncoder().encode('not a PDF');
  const t = structuredClone(template);
  t.basePdf.sha256 = hash(bytes);
  assert.equal((await render(t, payload, bytes)).diagnostics[0].code, 'E_PDF_LOAD');
  const s = structuredClone(template);
  s.pages[0].width = 613;
  assert.ok((await render(s)).diagnostics.some((d) => d.code === 'E_PDF_SIZE'));
});
test('removes widgets/XFA but preserves an unrelated link annotation and print preferences', async () => {
  const d = await PDFDocument.load(basePdfBytes, { preserveXFA: true });
  const page = d.getPage(0);
  const annotation = d.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [20, 20, 30, 30],
    Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: 'https://example.com' },
  });
  page.node.addAnnot(d.context.register(annotation));
  const bytes = await d.save();
  const t = structuredClone(template);
  t.basePdf.sha256 = hash(bytes);
  const r = await render(t, payload, bytes);
  assert.ok(r.success);
  const out = await PDFDocument.load(r.pdfBytes!);
  assert.equal(out.catalog.get(PDFName.of('AcroForm')), undefined);
  assert.equal(out.getPage(0).node.Annots()!.size(), 1);
  assert.equal(out.catalog.getOrCreateViewerPreferences().getPrintScaling(), 'None');
});
test('render leaves template, payload, and original bytes unchanged; debug output remains readable', async () => {
  const snapshot = JSON.stringify({ template, payload }),
    before = hash(basePdfBytes);
  const r = await renderTaxForm({ basePdfBytes, template, payload, debugOverlay: true });
  assert.ok(r.success);
  assert.equal(hash(basePdfBytes), before);
  assert.equal(JSON.stringify({ template, payload }), snapshot);
  const d = await getDocument({ data: r.pdfBytes!.slice(), useSystemFonts: true }).promise;
  assert.equal(d.numPages, 2);
  await d.destroy();
});
