# Verification record

## Automated evidence

Local environment: macOS, Node 24.21.0. Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run demo` to reproduce. The suite currently contains 86 tests with no skipped cases.

- Contract tests compile the schema under Ajv strict mode, accept the checked-in template, and reject schema/semantic counterexamples.
- Resolver/formatter tests exercise escaped keys, arrays, missing/null/empty/zero/false, exact-decimal rounding boundaries, negative zero, calendar dates, identifier syntax, and explicit checkbox rules.
- Layout tests use asymmetric font metrics to detect descent and alignment errors, and exercise horizontal/vertical overflow, shrinking, minimum-size stepping, and comb-cell fit.
- Integration tests parse the actual emitted PDF with **PDF.js**, recover all **55 expected text runs** in **23 populated regions**, and check text, positions, advance width, minimum size, and ascent/descent bounds against the mapped rectangles on both pages.
- Negative integration tests cover wrong hashes, unreadable PDFs, incompatible page boxes/rotation/user units, required missing values, invalid identifiers, huge amounts, group conflicts, and excess dependents.
- A PDF annotation fixture verifies that Widget/XFA removal preserves an unrelated link. Inputs remain unchanged. Output carries PrintScaling None.
- Calibration tests verify complete mappings and reject missing/ambiguous/wrong-page matches and changed PDFs.

## Visual evidence

The clean PDFs were rasterized with Poppler and inspected on both pages. Checkpoints include the actual header name/address boxes, SSN dividers, filing status and Digital Assets No boxes, dependent columns one/two, blank unused columns, right-aligned wages/losses, page-two taxable zero, and routing cells. The debug PDFs additionally show rectangle outlines and text baselines.

Visual checks establish that the mapped rectangles correspond to this form artwork. Font-metric extraction checks establish placement of the generated text runs. Neither alone proves universal print-device behavior or every visible glyph pixel. Test reports must not claim the IRS approved the renderer or validated the example's tax math.

## Reproduction and packaging gates

Before publication, the project is extracted into a separate clean directory and installed with `npm ci`; type checking, tests, and demos must pass there. Only explicit source, documentation, fixtures, workflow files, and the two output PDFs enter the source ZIP. Dependencies, personal attachments, local recordings, and credentials are excluded.

The narrated video, anonymous playback check, and final email send remain separate human submission gates. They cannot be marked complete by code tests.
