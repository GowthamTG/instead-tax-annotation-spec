# Research and source notes

Checked October 14, 2026. Company descriptions are first-party claims; implications below are engineering judgments, not inside knowledge of Instead.

## Assignment interpretation

The provided assessment asks for a new annotation structure, written documentation, positioning, formatting, deep-data references, and a walkthrough of at most five minutes. Its stated evaluation dimensions are scope considered, deliverable cleanliness, and walkthrough quality. It allows choice of representation and programming language. It does not mandate a web application, tax engine, database, or specific PDF library.

The recruiter PDF and pasted research packages are local inputs, not included in this public repository. The final submission recipient/subject are kept in the local submission materials.

## Instead product context

[Instead's homepage](https://www.instead.com/) describes AI-assisted tax research, planning, preparation, filing, and resolution for tax professionals and taxpayers. [Its detailed 1040 workflow](https://www.instead.com/resources/blog/the-1040-filing-workflow-in-instead-intake-to-e-file) describes document intake, mapped workpapers, source-document/page references, calculated returns, structured review findings, and signer approval.

**Implication:** the annotation engine should transparently connect supplied values to correctly located output fields, provide useful diagnostics, and preserve the separation between facts/calculations and their printed representation. This assessment maps values onto output forms; it is not itself a document-extraction or evidence-review application.

The [official Bangalore engineering vacancy](https://job-boards.greenhouse.io/instead/jobs/7761473003) lists Vue, Nuxt, TypeScript, Tailwind, Go, Docker/AWS ECS/Fargate, and PostgreSQL/AWS RDS. TypeScript is therefore a reasonable reference-implementation choice; the employer's stack does not impose a language requirement on the portable specification.

Public materials describe different availability stages across features. Do not claim universal live filing availability, named customers, government approval of tax calculations, or internal production architecture from these materials.

## Technical primary sources

- [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901): pointer tokens, array indices, and ordered escape decoding. Our `./` slot prefix is explicitly a local extension.
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12): machine-readable structural constraints. Defaults are annotations; runtime behavior applies them explicitly.
- [Ajv strict mode](https://ajv.js.org/strict-mode.html): schema compilation guards. Scalar alternatives use `anyOf`, avoiding unsupported non-null type unions under strictTypes.
- [PDF 1.7 specification](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf): page boxes, rotation, user units, and coordinate conventions. The reference adapter deliberately restricts supported geometry.
- [Archived 2025 Form 1040](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf): actual two-page artwork, horizontal dependent columns, line 15's `-0-` instruction, and routing grid. Geometry and widget identity were also inspected locally from its binary.
- [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), “Rounding Off to Whole Dollars”: drop amounts under 50 cents, round 50–99 cents up, and sum before rounding line totals. Arithmetic remains upstream.
- [2025 Publication 1167](https://www.irs.gov/pub/irs-prior/p1167--2025.pdf), sections 3.3.2–3.3.3: taxpayer entries no smaller than 8 points and Helvetica preferred for substitute forms. These provisions inform defaults; this demo is not an IRS approval/compliance certification.
- [Cantoo PDF library source](https://github.com/cantoo-scribe/pdf-lib): MIT-licensed PDF modification and Standard-font measurement/drawing. Local independent tests identified kerning-versus-emission width differences; the adapter measures emitted character advances.
- [PDF.js project](https://github.com/mozilla/pdf.js): independent PDF parsing and positioned text extraction for integration verification.
- [Apple screen-recording guide](https://support.apple.com/en-in/102618): built-in screen capture and microphone selection.

## Corrections to the supplied implementation notes

The notes were useful architectural input, but they contained unverified implementation claims: old/wrong widget suffixes, downward stepping for a horizontal dependent layout, text below the cited 8-point floor, silent excess-array truncation, advertised features not fully implemented, and tests described as independent glyph verification when they only checked horizontal instructions.

This repository replaces those assumptions with checked full widget identities, explicit slot geometry, strict validation, exact-decimal formatting, actual PDF.js extraction, and complementary raster inspection. It also shortens the narrated script: the supplied 669-word script leaves almost no time for screen actions at a five-minute ceiling.
