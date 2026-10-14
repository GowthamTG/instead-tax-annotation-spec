import type {
  Diagnostic,
  DrawInstruction,
  DrawText,
  Field,
  PdfRenderer,
  Style,
} from '../schema/types.js';
import type { Formatted } from './formatter.js';
import { error } from './diagnostics.js';
export const DEFAULT_STYLE = {
  fontFamily: 'Helvetica',
  fontSize: 9,
  minFontSize: 8,
  padding: 1,
  align: 'left',
  verticalAlign: 'middle',
  overflow: 'shrink',
} as const;
export function layout(
  field: Field,
  value: Formatted,
  defaults: Style | undefined,
  renderer: PdfRenderer,
): { instruction?: DrawInstruction; diagnostics: Diagnostic[] } {
  const s = { ...DEFAULT_STYLE, ...defaults, ...field.style };
  const r = field.rect,
    p = s.padding;
  if ((value.kind === 'checkbox' && !value.checked) || (value.kind === 'text' && !value.text))
    return { diagnostics: [] };
  const strings =
    value.kind === 'comb' ? value.chars : [value.kind === 'checkbox' ? 'X' : value.text];
  const font = value.kind === 'checkbox' ? 'Helvetica-Bold' : s.fontFamily;
  const boxes = strings.map((_, i) => {
    if (value.kind !== 'comb' || field.format.type !== 'comb') return r;
    const c = field.format.cells?.[i] ?? {
      offset: (i * r.width) / field.format.cellCount,
      width: r.width / field.format.cellCount,
    };
    return { ...r, x: r.x + c.offset, width: c.width };
  });
  const candidates = [s.fontSize];
  if (s.overflow === 'shrink') {
    for (let z = s.fontSize - 0.5; z > s.minFontSize; z -= 0.5) candidates.push(z);
    if (s.fontSize > s.minFontSize) candidates.push(s.minFontSize);
  }
  let runs: DrawText[] | undefined,
    chosen = s.fontSize;
  try {
    for (const size of candidates) {
      const metrics = strings.map((text) => renderer.measure(font, text, size));
      if (
        metrics.some(
          (m, i) =>
            m.width > boxes[i].width - 2 * p || m.ascent - m.descent > boxes[i].height - 2 * p,
        )
      )
        continue;
      chosen = size;
      runs = strings.map((text, i) => {
        const b = boxes[i],
          m = metrics[i],
          w = b.width - 2 * p,
          h = b.height - 2 * p;
        const align = value.kind === 'text' ? s.align : 'center';
        const x =
          b.x + p + (align === 'right' ? w - m.width : align === 'center' ? (w - m.width) / 2 : 0);
        const baseline =
          b.y +
          p -
          m.descent +
          (s.verticalAlign === 'top'
            ? h - (m.ascent - m.descent)
            : s.verticalAlign === 'middle'
              ? (h - (m.ascent - m.descent)) / 2
              : 0);
        return {
          text,
          x,
          baseline,
          width: m.width,
          ascent: m.ascent,
          descent: m.descent,
          fontFamily: font,
          fontSize: size,
        };
      });
      break;
    }
  } catch {
    return {
      diagnostics: [
        error('E_GLYPH', 'layout', 'Selected font cannot encode the field content.', field),
      ],
    };
  }
  if (!runs)
    return {
      diagnostics: [
        error(
          'E_OVERFLOW',
          'layout',
          'Content cannot fit horizontally and vertically at the permitted sizes.',
          field,
        ),
      ],
    };
  const diagnostics: Diagnostic[] =
    chosen < s.fontSize
      ? [
          {
            code: 'W_SHRUNK',
            severity: 'warning',
            stage: 'layout',
            message: 'Font size was reduced to fit the field.',
            fieldId: field.id,
            page: field.page,
          },
        ]
      : [];
  return { instruction: { fieldId: field.id, page: field.page, rect: r, runs }, diagnostics };
}
