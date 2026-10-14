# Walkthrough speech script

The six paragraphs below are the spoken script. Headings and cue times are not spoken. Use your normal voice; pause during screen changes.

## 0:00–0:30 — Show the result

Hi, I'm Gowtham T G. This is my submission for the Instead tax form annotation assessment. I'll start with the result: a fictional dataset printed onto the official 2025 Form 1040. Names, identifiers, checkboxes, dependent columns, and amounts land in their intended boxes. Page two also demonstrates a zero taxable-income value and the routing-number grid. This is a rendering example, not a calculated tax return.

## 0:30–1:20 — Explain the contract

The main deliverable is the specification, rather than this particular PDF implementation. There are three separate inputs: the unchanged blank PDF, a JSON annotation template, and the application's nested data. Each field names its page, bounding rectangle, data binding, and format. Here, the wages field points into the income summary and uses right-aligned money formatting. JSON Schema rejects malformed templates, and TypeScript types make the reference code easier to use. Another developer can implement the same documented contract in another language. A PDF fingerprint also prevents this year's coordinates being applied to a different revision.

## 1:20–2:10 — Follow a value

Bindings use JSON Pointer to navigate deeply nested objects and arrays. They support escaped property names without evaluating code. A small concatenation binding joins first name and middle initial; relative bindings resolve within each dependent's slot. Missing data, null, and empty strings stay distinct from zero and false. For example, false selects the Digital Assets No checkbox instead of disappearing. Money is supplied as decimal strings or safe integers. Exact arithmetic rounds this wage amount to 184,651, formats a loss in parentheses, and applies the field's zero-display rule after rounding. The application remains responsible for calculating the supplied totals.

## 2:10–3:00 — Explain placement

The debug output shows the declared rectangles and baselines. Coordinates use bottom-left PDF points and one-based pages. I calibrated the full widget identities against the actual form artwork, including all four dependent columns. I avoided assuming that repeated values always run down rows. Layout measures both width and height, accounts for descenders, and can shrink to eight points. If a value still cannot fit, it produces an error instead of truncating digits. The current adapter explicitly rejects unsupported page transforms and characters, so these limitations are visible rather than hidden assumptions.

## 3:00–3:45 — Show verification and failure

The tests cover the contract, nested resolution, formatting, layout, and actual PDF output. I also pinned Prettier and check formatting in CI, so the source stays consistent. PDF.js independently reads every populated text run and checks its content, position, and font-metric bounds. That caught a real difference between kerning estimates and the library's emitted character advances, which I corrected. Visual inspection then confirms the rectangles match the printed artwork. In the failure demo, missing required data, an invalid identifier, and an oversized amount produce structured errors. No PDF is emitted, and the diagnostic messages contain no raw taxpayer values.

## 3:45–4:30 — Close with decisions

I kept the PDF library behind an adapter and documented defaults, errors, authoring steps, and test vectors. The scope is intentionally focused: predictable bindings, explicit geometry, and verifiable output. Future improvements would include custom fonts for more names, continuation pages for excess dependents, a visual annotation editor, and reviewed yearly template migration. Until those exist, unsupported cases fail clearly. The repository includes reproducible commands and both clean and debug examples. Thank you for reviewing my submission.
