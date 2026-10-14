# Authoring and calibration

The checked-in 2025 Form 1040 was downloaded from the [IRS archive](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf). The template records the exact hash and the printed footer's `Created 9/5/25` revision. Its pages are 612×792 points, with zero-origin MediaBoxes and matching CropBoxes.

## Reproduce the supplied mapping

```bash
npm run inspect
npm run calibrate
npm run demo
```

`inspect` lists 199 widgets with **full field names**, widget indices, page numbers, rectangles, and the PDF fingerprint. `calibrate` requires the original fingerprint and matches the complete name/index/page tuple for each of the 36 fields. It fails before writing if any mapping is missing or ambiguous. It recalibrates all four dependent slots, including unused ones. It does not invent labels, discover data bindings, or change form revision metadata.

Do not assume a short suffix means the same box across years. The supplied notes mapped `f1_14`'s intended name box to `f1_04`, which is a different header entry in this PDF. Shared checkbox suffixes also occur under distinct parent names.

## Annotate a new form

1. Obtain an official final PDF and keep an unchanged copy. Record its URL, revision, SHA-256, page count, and actual box geometry.
2. Run `npm run inspect -- path/to/form.pdf`. Check whether the file contains widgets and whether it satisfies the supported page geometry. Inspection does not authorize ignoring unsupported geometry.
3. Open the original PDF alongside `output/inspection.json`. Match the printed label and line number to the widget's page and rectangle. Do not infer meaning from its internal field name alone.
4. Author a template using unique business-facing field IDs, the complete provenance tuple, a JSON Pointer binding, and an explicit format. Templates work without provenance at runtime; the supplied calibration utility requires it for every field.
5. If no widgets exist, measure rectangles in bottom-left points and author them directly. Use a debug overlay and visual inspection; the widget-calibration script is not an OCR tool.
6. Inspect nonuniform SSN group dividers and digit grids. Use explicit comb cell offsets/widths where an equal subdivision would cross printed boundaries.
7. Use fixed slots matching the actual artwork. **2025 Form 1040 has four horizontal dependent columns**, not four stacked dependent rows. Each column has independent first-name, last-name, SSN, relationship, and checkbox rectangles.
8. Validate the template and render fictional data. Inspect both clean and debug PDFs at readable magnification. Check box borders, baseline placement, descenders, names, losses, zeroes, and individual digit cells.
9. Add independent extraction tests and a mismatch/failure fixture. Keep the calibrated template and blank PDF together.

For a new form/year, create a new template identity and mapping. Review the artwork before adopting a new hash. Re-saving the same-looking PDF changes its hash and requires deliberate review; calibration refuses that change automatically.

The supplied SSN offsets were checked against printed separators. Calibration verifies the enclosing widget rectangle, not the semantic meaning of a label or interior digit-cell dividers. Those still need visual review.
