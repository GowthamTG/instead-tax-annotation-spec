import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { renderTaxForm } from '../core/pipeline.js';
const basePdfBytes = await readFile('examples/f1040-2025.pdf');
const template = JSON.parse(await readFile('examples/f1040-2025.template.json', 'utf8'));
const payload = JSON.parse(await readFile('examples/f1040-2025-payload.json', 'utf8'));
await mkdir('output', { recursive: true });
if (process.argv.includes('--fail')) {
  delete payload.taxpayer.primary.name.last;
  payload.taxpayer.primary.identifiers.ssn = '900-12-9999999';
  payload.income.w2Summary.totalWages = '999999999999999999.99';
  const result = await renderTaxForm({ basePdfBytes, template, payload });
  console.log(
    JSON.stringify(
      { success: result.success, pdfEmitted: !!result.pdfBytes, diagnostics: result.diagnostics },
      null,
      2,
    ),
  );
  if (result.success || result.pdfBytes) process.exitCode = 1;
} else {
  for (const debugOverlay of [false, true]) {
    const result = await renderTaxForm({ basePdfBytes, template, payload, debugOverlay });
    if (!result.success || !result.pdfBytes) {
      console.error(JSON.stringify(result.diagnostics, null, 2));
      process.exit(1);
    }
    const path = `output/f1040-2025-${debugOverlay ? 'debug' : 'filled'}.pdf`;
    await writeFile(path, result.pdfBytes);
    console.log(
      `${path}: ${result.instructions.length} populated regions; ${result.diagnostics.filter((d) => d.severity === 'warning').length} warnings.`,
    );
    if (!debugOverlay)
      await writeFile(
        'output/verification.json',
        JSON.stringify(
          { instructions: result.instructions, diagnostics: result.diagnostics },
          null,
          2,
        ) + '\n',
      );
  }
  console.log('Fictional rendering example. Not a calculated tax return.');
}
