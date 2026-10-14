import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument } from '@cantoo/pdf-lib';
export async function inspect(path = 'examples/f1040-2025.pdf') {
  const bytes = await readFile(path),
    doc = await PDFDocument.load(bytes, { updateMetadata: false, preserveXFA: true });
  const pages = doc.getPages();
  const widgets = doc
    .getForm()
    .getFields()
    .flatMap((field) =>
      field.acroField.getWidgets().map((widget, index) => {
        const pageRef = widget.P();
        const pageIndex = pages.findIndex(
          (p) =>
            pageRef?.toString() === p.ref.toString() ||
            p.node
              .Annots()
              ?.asArray()
              .some((ref) => doc.context.lookup(ref) === widget.dict),
        );
        if (pageIndex < 0) throw new Error('Widget page could not be determined.');
        return {
          widgetName: field.getName(),
          widgetIndex: index,
          page: pageIndex + 1,
          rect: widget.getRectangle(),
        };
      }),
    );
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    pages: pages.map((p, i) => ({ pageNumber: i + 1, ...p.getSize() })),
    widgets,
  };
}
if (process.argv[1]?.endsWith('inspect.ts')) {
  const report = await inspect(process.argv[2]);
  await mkdir('output', { recursive: true });
  await writeFile('output/inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(
    `Inspected ${report.pages.length} pages, ${report.widgets.length} widgets. See output/inspection.json.`,
  );
}
