export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type FontName = 'Helvetica' | 'Helvetica-Bold' | 'Courier';
export interface Style {
  fontFamily?: FontName;
  fontSize?: number;
  minFontSize?: number;
  padding?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'bottom' | 'middle' | 'top';
  overflow?: 'shrink' | 'error';
}
export type Binding = string | { kind: 'concat'; parts: string[]; separator?: string };
export type Format =
  | { type: 'text'; case?: 'asIs' | 'upper' | 'lower' }
  | {
      type: 'money';
      rounding?: 'wholeDollarHalfUp' | 'cents';
      negative?: 'parentheses' | 'minus';
      zero?: 'zero' | 'dash' | 'blank';
      thousandsSeparator?: boolean;
    }
  | { type: 'date'; pattern: 'MM/DD/YYYY' | 'YYYY-MM-DD' }
  | { type: 'tin'; subtype: 'ssn' | 'ein'; mask?: 'formatted' | 'digitsOnly' }
  | { type: 'checkbox'; checkedWhen: { equals: string | boolean | number }; group?: string }
  | {
      type: 'comb';
      cellCount: number;
      characters?: 'digits' | 'alphanumeric';
      exactLength?: number;
      cells?: { offset: number; width: number }[];
    };
export interface Field {
  id: string;
  page: number;
  rect: Rect;
  binding: Binding;
  format: Format;
  required?: boolean;
  sensitive?: boolean;
  style?: Style;
  description?: string;
  provenance?: { widgetName: string; widgetIndex: number; label: string };
  [extension: `x-${string}`]: unknown;
}
export interface RepeatingGroup {
  id: string;
  arraySource: string;
  slots: { fields: Field[] }[];
  [extension: `x-${string}`]: unknown;
}
export interface Template {
  specVersion: '1.0.0';
  templateId: string;
  form: { number: string; taxYear?: number; revision: string; title?: string };
  basePdf: { fileName: string; sha256: string; sourceUrl?: string; pageCount: number };
  pages: { pageNumber: number; width: number; height: number }[];
  defaults?: Style;
  fields: Field[];
  repeatingGroups?: RepeatingGroup[];
  [extension: `x-${string}`]: unknown;
}
export type Stage =
  'schema' | 'semantic' | 'pdf' | 'resolution' | 'formatting' | 'layout' | 'render';
export interface Diagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  stage: Stage;
  message: string;
  fieldId?: string;
  page?: number;
  sourcePath?: string;
  instancePath?: string;
}
export interface DrawText {
  text: string;
  x: number;
  baseline: number;
  width: number;
  ascent: number;
  descent: number;
  fontFamily: FontName;
  fontSize: number;
}
export interface DrawInstruction {
  fieldId: string;
  page: number;
  rect: Rect;
  runs: DrawText[];
}
export interface RenderResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  diagnostics: Diagnostic[];
  instructions: DrawInstruction[];
}
export interface FontMetrics {
  width: number;
  ascent: number;
  descent: number;
}
export interface PdfRenderer {
  measure(font: FontName, text: string, size: number): FontMetrics;
  render(instructions: DrawInstruction[], debugOverlay: boolean): Promise<Uint8Array>;
}
