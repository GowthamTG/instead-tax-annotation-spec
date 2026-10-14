import type { Field } from '../schema/types.js';
export type Formatted =
  | { kind: 'text'; text: string }
  | { kind: 'comb'; chars: string[] }
  | { kind: 'checkbox'; checked: boolean };
export class FormatError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
function fail(code = 'E_FORMAT'): never {
  throw new FormatError(code);
}
const commas = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function formatMoney(
  raw: unknown,
  format: Extract<Field['format'], { type: 'money' }>,
): string {
  if (typeof raw === 'number' && !Number.isSafeInteger(raw)) fail();
  if (typeof raw !== 'string' && typeof raw !== 'number') fail();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(raw));
  if (!match) fail();
  const [, sign, whole, fraction = ''] = match;
  const places = format.rounding === 'cents' ? 2 : 0;
  const kept = fraction.slice(0, places).padEnd(places, '0');
  let magnitude = BigInt(whole) * 10n ** BigInt(places) + BigInt(kept || '0');
  if (Number(fraction[places] ?? '0') >= 5) magnitude += 1n;
  // Apply zero policy after rounding, avoiding negative zero and '(0)'.
  if (magnitude === 0n) {
    if (format.zero === 'blank') return '';
    if (format.zero === 'dash') return '-0-';
  }
  const digits = magnitude.toString().padStart(places + 1, '0');
  const int = places ? digits.slice(0, -places) : digits;
  const text =
    (format.thousandsSeparator === false ? int : commas(int)) +
    (places ? '.' + digits.slice(-places) : '');
  return sign && magnitude !== 0n
    ? format.negative === 'minus'
      ? '-' + text
      : '(' + text + ')'
    : text;
}
export function formatValue(raw: string | number | boolean, field: Field): Formatted {
  const f = field.format;
  switch (f.type) {
    case 'text': {
      if (typeof raw !== 'string' && typeof raw !== 'number') fail();
      let text = String(raw);
      if (/[\r\n\t]/.test(text)) fail();
      if (f.case === 'upper') text = text.toUpperCase();
      if (f.case === 'lower') text = text.toLowerCase();
      return { kind: 'text', text };
    }
    case 'money':
      return { kind: 'text', text: formatMoney(raw, f) };
    case 'date': {
      if (typeof raw !== 'string') fail('E_DATE');
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!m) fail('E_DATE');
      const [, yyyy, mm, dd] = m;
      const y = Number(yyyy),
        month = Number(mm),
        d = Number(dd);
      const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
      const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (y < 1 || month < 1 || month > 12 || d < 1 || d > days[month - 1]) fail('E_DATE');
      return { kind: 'text', text: f.pattern === 'MM/DD/YYYY' ? `${mm}/${dd}/${yyyy}` : raw };
    }
    case 'tin': {
      if (typeof raw !== 'string') fail('E_TIN');
      const pattern =
        f.subtype === 'ein' ? /^(?:\d{9}|\d{2}-\d{7})$/ : /^(?:\d{9}|\d{3}-\d{2}-\d{4})$/;
      if (!pattern.test(raw)) fail('E_TIN');
      const d = raw.replace(/-/g, '');
      return {
        kind: 'text',
        text:
          f.mask === 'digitsOnly'
            ? d
            : f.subtype === 'ein'
              ? `${d.slice(0, 2)}-${d.slice(2)}`
              : `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`,
      };
    }
    case 'checkbox':
      return { kind: 'checkbox', checked: raw === f.checkedWhen.equals };
    case 'comb': {
      if (typeof raw !== 'string') fail('E_COMB');
      const chars = raw.replace(/[ -]/g, '');
      if (!(f.characters === 'alphanumeric' ? /^[A-Za-z0-9]+$/ : /^\d+$/).test(chars))
        fail('E_COMB');
      if (
        chars.length > f.cellCount ||
        (f.exactLength !== undefined && chars.length !== f.exactLength)
      )
        fail('E_COMB');
      return { kind: 'comb', chars: [...chars] };
    }
  }
}
