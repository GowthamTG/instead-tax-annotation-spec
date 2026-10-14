import type { Diagnostic, Field, RenderResult, Template } from '../schema/types.js';
import { validateSchema, validateSemantics } from './validator.js';
import { resolveArray, resolveBinding, resolutionDiagnostics } from './resolver.js';
import { formatValue, FormatError } from './formatter.js';
import { layout } from './layout.js';
import { error } from './diagnostics.js';
import { PdfLibRenderer } from '../renderers/pdf-lib-adapter.js';
export async function renderTaxForm(params: {
  basePdfBytes: Uint8Array;
  template: unknown;
  payload: unknown;
  debugOverlay?: boolean;
}): Promise<RenderResult> {
  const result: RenderResult = {
    success: false,
    diagnostics: validateSchema(params.template),
    instructions: [],
  };
  if (result.diagnostics.length) return result;
  const template = params.template as Template;
  result.diagnostics.push(...validateSemantics(template));
  if (result.diagnostics.some((d) => d.severity === 'error')) return result;
  let loaded: Awaited<ReturnType<typeof PdfLibRenderer.load>>;
  try {
    loaded = await PdfLibRenderer.load(params.basePdfBytes, template);
  } catch {
    result.diagnostics.push(error('E_PDF_LOAD', 'pdf', 'PDF preparation failed.'));
    return result;
  }
  result.diagnostics.push(...loaded.diagnostics);
  if (!loaded.renderer) return result;
  const fields: { field: Field; context?: unknown }[] = template.fields.map((field) => ({ field }));
  for (const group of template.repeatingGroups ?? []) {
    const items = resolveArray(params.payload, group.arraySource);
    if (!items) {
      result.diagnostics.push(error('E_ARRAY', 'resolution', 'Repeating group requires an array.'));
      continue;
    }
    if (items.length > group.slots.length) {
      result.diagnostics.push(
        error('E_REPEAT_OVERFLOW', 'resolution', 'Array contains more items than available slots.'),
      );
      continue;
    }
    items.forEach((context, i) =>
      group.slots[i].fields.forEach((field) => fields.push({ field, context })),
    );
  }
  const checkedGroups = new Set<string>();
  for (const { field, context } of fields) {
    const resolved = resolveBinding(params.payload, field.binding, context);
    result.diagnostics.push(...resolutionDiagnostics(resolved, field));
    if (resolved.status !== 'value') continue;
    try {
      const formatted = formatValue(resolved.value, field);
      if (
        formatted.kind === 'checkbox' &&
        formatted.checked &&
        field.format.type === 'checkbox' &&
        field.format.group
      ) {
        if (checkedGroups.has(field.format.group))
          result.diagnostics.push(
            error(
              'E_CHECKBOX_GROUP',
              'formatting',
              'Multiple selections in an exclusive checkbox group.',
              field,
            ),
          );
        checkedGroups.add(field.format.group);
      }
      const placed = layout(field, formatted, template.defaults, loaded.renderer);
      result.diagnostics.push(...placed.diagnostics);
      if (placed.instruction) result.instructions.push(placed.instruction);
    } catch (e) {
      result.diagnostics.push(
        error(
          e instanceof FormatError ? e.code : 'E_FORMAT',
          'formatting',
          'Value does not satisfy the field format.',
          field,
        ),
      );
    }
  }
  if (result.diagnostics.some((d) => d.severity === 'error')) return result;
  try {
    result.pdfBytes = await loaded.renderer.render(
      result.instructions,
      params.debugOverlay ?? false,
    );
    result.success = true;
  } catch {
    result.diagnostics.push(error('E_RENDER', 'render', 'PDF serialization failed.'));
  }
  return result;
}
