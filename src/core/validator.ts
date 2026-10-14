import { readFileSync } from 'node:fs';
import Ajv2020Module from 'ajv/dist/2020.js';
import type { Diagnostic, Field, Template } from '../schema/types.js';
import { error } from './diagnostics.js';
const Ajv2020 = Ajv2020Module.default;
const schema = JSON.parse(
  readFileSync(new URL('../schema/tax-annotation.schema.json', import.meta.url), 'utf8'),
);
const validate = new Ajv2020({ strict: true, allErrors: true }).compile<Template>(schema);
export function validateSchema(value: unknown): Diagnostic[] {
  return validate(value)
    ? []
    : (validate.errors ?? []).map((e) => ({
        code: 'E_SCHEMA',
        severity: 'error' as const,
        stage: 'schema' as const,
        message: 'Template does not satisfy the annotation schema.',
        instancePath: e.instancePath,
      }));
}
export const allFields = (t: Template): Field[] => [
  ...t.fields,
  ...(t.repeatingGroups ?? []).flatMap((g) => g.slots.flatMap((s) => s.fields)),
];
export function validateSemantics(t: Template): Diagnostic[] {
  const diagnostics: Diagnostic[] = [],
    ids = new Set<string>(),
    pages = new Map<number, { width: number; height: number }>();
  for (const p of t.pages) {
    if (pages.has(p.pageNumber))
      diagnostics.push(error('E_PAGE', 'semantic', 'Page numbers must be unique.'));
    pages.set(p.pageNumber, p);
  }
  if (t.pages.length !== t.basePdf.pageCount || t.pages.some((_, i) => !pages.has(i + 1)))
    diagnostics.push(error('E_PAGE', 'semantic', 'Pages must cover exactly 1 through pageCount.'));
  const groupIds = new Set<string>();
  for (const g of t.repeatingGroups ?? []) {
    if (groupIds.has(g.id))
      diagnostics.push(error('E_ID', 'semantic', 'Repeating group IDs must be unique.'));
    groupIds.add(g.id);
  }
  if (!allFields(t).length)
    diagnostics.push(error('E_TEMPLATE', 'semantic', 'At least one field is required.'));
  const grouped = new Set(
    (t.repeatingGroups ?? []).flatMap((g) => g.slots.flatMap((s) => s.fields)),
  );
  for (const f of allFields(t)) {
    if (ids.has(f.id))
      diagnostics.push(error('E_ID', 'semantic', 'Field IDs must be globally unique.', f));
    ids.add(f.id);
    const paths = typeof f.binding === 'string' ? [f.binding] : f.binding.parts;
    if (!grouped.has(f) && paths.some((p) => p.startsWith('./')))
      diagnostics.push(
        error('E_BINDING_CONTEXT', 'semantic', 'Relative bindings require a repeating slot.', f),
      );
    const page = pages.get(f.page),
      r = f.rect;
    if (!page) diagnostics.push(error('E_PAGE', 'semantic', 'Field page is not declared.', f));
    else if (r.x + r.width > page.width || r.y + r.height > page.height)
      diagnostics.push(error('E_BOUNDS', 'semantic', 'Field rectangle exceeds page bounds.', f));
    const s = { fontSize: 9, minFontSize: 8, padding: 1, ...t.defaults, ...f.style };
    if (s.minFontSize > s.fontSize || 2 * s.padding >= Math.min(r.width, r.height))
      diagnostics.push(
        error('E_STYLE', 'semantic', 'Style has an invalid font range or leaves no inner box.', f),
      );
    if (f.format.type === 'comb') {
      const cells = f.format.cells;
      if (
        (f.format.exactLength ?? 0) > f.format.cellCount ||
        (cells &&
          (cells.length !== f.format.cellCount ||
            cells.some(
              (c, i) =>
                c.offset + c.width > r.width + 1e-6 ||
                (i > 0 && c.offset + 1e-6 < cells[i - 1].offset + cells[i - 1].width),
            )))
      )
        diagnostics.push(
          error(
            'E_CELLS',
            'semantic',
            'Comb cells must be ordered, nonoverlapping, and inside the field.',
            f,
          ),
        );
    }
  }
  return diagnostics;
}
