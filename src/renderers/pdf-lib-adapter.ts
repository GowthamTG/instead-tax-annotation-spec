import { createHash } from 'node:crypto';
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFArray,
  PDFDict,
  PrintScaling,
  StandardFonts,
  rgb,
  type PDFFont,
} from '@cantoo/pdf-lib';
import type {
  Diagnostic,
  DrawInstruction,
  FontName,
  PdfRenderer,
  Template,
} from '../schema/types.js';
import { error } from '../core/diagnostics.js';
export class PdfLibRenderer implements PdfRenderer {
  private fonts = new Map<FontName, PDFFont>();
  private constructor(private doc: PDFDocument) {}
  static async load(
    bytes: Uint8Array,
    template: Template,
  ): Promise<{ renderer?: PdfLibRenderer; diagnostics: Diagnostic[] }> {
    const diagnostics: Diagnostic[] = [];
    if (createHash('sha256').update(bytes).digest('hex') !== template.basePdf.sha256)
      return {
        diagnostics: [
          error('E_PDF_HASH', 'pdf', 'Blank PDF fingerprint does not match the template.'),
        ],
      };
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false, preserveXFA: true });
    } catch {
      return { diagnostics: [error('E_PDF_LOAD', 'pdf', 'PDF is unreadable or encrypted.')] };
    }
    if (doc.isEncrypted)
      return { diagnostics: [error('E_PDF_LOAD', 'pdf', 'Encrypted PDFs are unsupported.')] };
    if (doc.getPageCount() !== template.basePdf.pageCount)
      diagnostics.push(error('E_PDF_PAGES', 'pdf', 'PDF page count differs from the template.'));
    for (const [i, page] of doc.getPages().entries()) {
      const media = page.getMediaBox(),
        crop = page.getCropBox(),
        expected = template.pages.find((p) => p.pageNumber === i + 1);
      const unit = page.node.lookup(PDFName.of('UserUnit'));
      if (
        page.getRotation().angle !== 0 ||
        media.x !== 0 ||
        media.y !== 0 ||
        crop.x !== media.x ||
        crop.y !== media.y ||
        crop.width !== media.width ||
        crop.height !== media.height ||
        (unit && (!(unit instanceof PDFNumber) || unit.asNumber() !== 1))
      )
        diagnostics.push({
          ...error(
            'E_PDF_GEOMETRY',
            'pdf',
            'PDF requires unsupported rotation, box offsets, cropping, or user units.',
          ),
          page: i + 1,
        });
      if (
        !expected ||
        Math.abs(media.width - expected.width) > 0.01 ||
        Math.abs(media.height - expected.height) > 0.01
      )
        diagnostics.push({
          ...error('E_PDF_SIZE', 'pdf', 'PDF dimensions differ from the template.'),
          page: i + 1,
        });
    }
    if (diagnostics.length) return { diagnostics };
    // Only remove Widget annotations. Other annotations and all artwork stay intact.
    for (const page of doc.getPages()) {
      const annots = page.node.lookup(PDFName.of('Annots'));
      if (annots instanceof PDFArray)
        for (let i = annots.size() - 1; i >= 0; i--) {
          const annotation = doc.context.lookup(annots.get(i));
          if (
            annotation instanceof PDFDict &&
            annotation.get(PDFName.of('Subtype'))?.toString() === '/Widget'
          )
            annots.remove(i);
        }
    }
    doc.catalog.delete(PDFName.of('AcroForm')); // XFA belongs to the removed form dictionary.
    doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
    const renderer = new PdfLibRenderer(doc);
    renderer.fonts.set('Helvetica', await doc.embedFont(StandardFonts.Helvetica));
    renderer.fonts.set('Helvetica-Bold', await doc.embedFont(StandardFonts.HelveticaBold));
    renderer.fonts.set('Courier', await doc.embedFont(StandardFonts.Courier));
    return { renderer, diagnostics };
  }
  measure(name: FontName, text: string, size: number) {
    const font = this.fonts.get(name)!;
    const ascent = font.heightAtSize(size, { descender: false });
    const descent = ascent - font.heightAtSize(size, { descender: true });
    return {
      width: [...text].reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0),
      ascent,
      descent,
    };
  }
  async render(instructions: DrawInstruction[], debug: boolean) {
    for (const inst of instructions) {
      const page = this.doc.getPage(inst.page - 1);
      if (debug) {
        page.drawRectangle({ ...inst.rect, borderColor: rgb(0.85, 0.1, 0.5), borderWidth: 0.4 });
        page.drawText(inst.fieldId, {
          x: inst.rect.x,
          y: inst.rect.y + inst.rect.height + 0.5,
          size: 3,
          font: this.fonts.get('Helvetica')!,
          color: rgb(0.85, 0.1, 0.5),
        });
      }
      for (const run of inst.runs) {
        page.drawText(run.text, {
          x: run.x,
          y: run.baseline,
          size: run.fontSize,
          font: this.fonts.get(run.fontFamily)!,
          color: rgb(0, 0, 0),
        });
        if (debug)
          page.drawLine({
            start: { x: run.x, y: run.baseline },
            end: { x: run.x + run.width, y: run.baseline },
            thickness: 0.25,
            color: rgb(0, 0.65, 0.75),
          });
      }
    }
    return this.doc.save();
  }
}
