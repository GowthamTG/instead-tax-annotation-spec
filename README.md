# Tax form annotation specification

**Instead Engineer technical assessment — Gowtham T G**

A portable JSON contract maps values from a deeply nested dataset into boxes on a PDF tax form. This repository includes JSON Schema, TypeScript types, an independently implementable specification, and a working reference renderer.

The 2025 Form 1040 example is deliberately a **fictional rendering demonstration**, not a calculated or filing-ready return. The renderer formats supplied values; the caller owns tax calculations and validation of tax facts.

## Start here

1. Read [the specification](docs/SPECIFICATION.md), including its small complete example.
2. Open [the clean Form 1040](output/f1040-2025-filled.pdf) and [the debug overlay](output/f1040-2025-debug.pdf).
3. Compare [the annotation template](examples/f1040-2025.template.json) with [the fictional payload](examples/f1040-2025-payload.json).
4. Follow [the calibration guide](docs/CALIBRATION.md) to annotate another form.

**Walkthrough:** the live narrated recording is pending. The [script and recording guide](docs/RECORDING.md) are prepared; a verified video link will be added after recording.

## Run locally

Requires Node.js **22.13 or newer** and npm. Tested locally with Node 24.21.0. No service accounts or environment variables are required.

```bash
npm ci
npm run typecheck
npm test
npm run demo
npm run demo:fail
```

The blank IRS PDF and calibrated template are included, so normal reproduction needs no download or calibration step. Optional authoring commands:

```bash
npm run inspect     # Writes output/inspection.json: pages, widgets, hash
npm run calibrate   # Checks all 36 mappings before updating template rectangles
npm run package    # Creates a source ZIP with PDFs, excluding dependencies and recordings
```

The failure demo intentionally supplies a missing name, invalid identifier, and oversized amount. It reports errors and emits no PDF; its command exits successfully when the expected failure is observed. Real CLI render failures exit nonzero.

## What is demonstrated

- One-based pages and bottom-left rectangles in PDF points, with explicit inner padding and font-metric placement.
- JSON Pointer traversal of nested objects and arrays, escaped keys, and declarative concatenation.
- Exact-decimal money formatting, losses, rounded zero, dates, SSN/EIN syntax, explicit checkbox selections, and digit combs.
- The 2025 form's four dependent **columns**, using independent fixed slot rectangles rather than assumed row spacing.
- Blank PDF fingerprint and geometry validation; rejection of incompatible or unreadable PDFs.
- Complete diagnostics, no silent truncation, no silently omitted excess dependents, and no raw taxpayer values in diagnostic messages.
- An isolated PDF adapter. The schema and templates contain no PDF-library objects or executable callbacks.

## Evidence and limits

The automated suite currently has **86 passing tests**. PDF.js independently recovers all **55 populated text runs in 23 regions** across the two-page happy-path output. Tests compare content, positions, advance widths, and font-metric bounds with the declared rectangles. This is font-metric containment, not a guarantee about every visible ink pixel or every tax form. Rasterized inspection complements these checks by verifying mappings against the official artwork.

Calibration verifies **36/36 field mappings**, including unpopulated dependent slots. It uses full widget names plus widget index and page, and fails on missing/ambiguous mappings or a changed PDF hash. Widget names are authoring provenance, not runtime bindings.

The blank PDF comes from the [IRS 2025 archive](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf); its exact SHA-256 is recorded in the template. Its artwork remains unchanged. Output is noninteractive and carries a `PrintScaling: None` preference; the printer/viewer can still override scaling.

The reference renderer deliberately supports only zero-origin, unrotated pages with matching MediaBox/CropBox and `UserUnit: 1`. Standard fonts have limited character coverage. Unsupported glyphs fail explicitly. General PDF transforms, custom fonts, continuation pages, tax calculations, and filing are outside v1.

## Design and assessment coverage

| Assignment requirement                           | Evidence                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| New annotation structure                         | JSON Schema and TypeScript types in `src/schema`                  |
| Written specification for independent developers | [SPECIFICATION.md](docs/SPECIFICATION.md)                         |
| Positioning and formatting                       | Rectangles, typography, format unions, layout tests, and PDFs     |
| Deeply nested value references                   | RFC 6901 bindings, concat, relative slot bindings, resolver tests |
| Design decisions and future enhancements         | [DECISIONS.md](docs/DECISIONS.md)                                 |
| Video at most five minutes                       | [Recording guide](docs/RECORDING.md); final recording pending     |

See [research and source notes](docs/RESEARCH.md) and [verification details](docs/VERIFICATION.md). No browser application or tax engine is required to use the contract.

## Formatting

Prettier 3.9.10 is pinned in the lockfile. The project-local configuration uses two-space indentation, semicolons, single quotes in JavaScript/TypeScript, trailing commas, LF endings, and a 100-column target. EditorConfig and Cursor/VS Code extension recommendations keep editor behavior consistent.

```bash
npm run format       # Format all supported source and documentation files
npm run format:check # Non-mutating check; also runs in CI
```

Generated outputs, recordings, dependencies, and PDFs are excluded. Prettier does not format the Python packaging utility.
