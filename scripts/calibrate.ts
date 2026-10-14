import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import type { Template } from '../src/schema/types.js';
import { allFields, validateSchema, validateSemantics } from '../src/core/validator.js';
import { inspect } from './inspect.js';
export async function calibrate(
  template: Template,
  report: Awaited<ReturnType<typeof inspect>>,
): Promise<Template> {
  if (template.basePdf.sha256 !== report.sha256)
    throw new Error('PDF fingerprint differs. Review the form revision before changing its hash.');
  const calibrated = structuredClone(template);
  let mapped = 0;
  for (const field of allFields(calibrated)) {
    const p = field.provenance;
    if (!p) throw new Error(`Missing provenance for ${field.id}.`);
    const found = report.widgets.filter(
      (w) =>
        w.widgetName === p.widgetName && w.widgetIndex === p.widgetIndex && w.page === field.page,
    );
    if (found.length !== 1) throw new Error(`Missing or ambiguous widget mapping for ${field.id}.`);
    const r = found[0].rect;
    const round = (n: number) => Number(n.toFixed(3));
    field.rect = { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
    mapped++;
  }
  calibrated.pages = report.pages;
  const errors = [...validateSchema(calibrated), ...validateSemantics(calibrated)];
  if (errors.length) throw new Error('Calibrated template is invalid.');
  console.log(
    `Calibration coverage: ${mapped}/${allFields(calibrated).length} mapped fields, including all four dependent columns.`,
  );
  return calibrated;
}
if (process.argv[1]?.endsWith('calibrate.ts')) {
  const path = 'examples/f1040-2025.template.json';
  const template = JSON.parse(await readFile(path, 'utf8')) as Template;
  const calibrated = await calibrate(template, await inspect());
  const options = await resolveConfig(path);
  await writeFile(path, await format(JSON.stringify(calibrated), { ...options, filepath: path }));
}
