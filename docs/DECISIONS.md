# Design decisions and future work

| Decision                                                | Reason                                                                                     | Cost / alternative                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| JSON + closed JSON Schema + TypeScript types            | Portable interchange plus authoring checks                                                 | Types/schema are maintained together and checked with fixtures; no external code generator  |
| Flat fields plus explicit fixed slots                   | Easy review and accurate horizontal/irregular forms                                        | Some geometry repetition, preferable to incorrect assumed row offsets                       |
| JSON Pointer plus concat                                | Deterministic deep references without executable expressions                               | Caller must preselect/filter arrays; JSONPath deferred                                      |
| Bottom-left points, one-based pages                     | Matches native PDF rectangles; explicit dimensions enable fit checks                       | Current adapter rejects transformed pages; authoring tools may later convert other origins  |
| Decimal strings / safe integer money                    | Deterministic arithmetic without accepting binary fractional inputs                        | Producers must serialize money correctly                                                    |
| Font-metric fit in both dimensions                      | Preserves digits and descenders; errors are visible                                        | Some long values cannot fit; no clipping/wrapping escape hatch                              |
| Strict errors prevent PDF output                        | A partially filled PDF could hide a material failure                                       | Debug overlays require valid data; a future preview must visibly distinguish invalid fields |
| SHA-256 binding                                         | Prevents accidentally applying geometry to a different PDF                                 | Even a harmless re-save needs reviewed migration                                            |
| Standard-font adapter with unkerned advance measurement | Matches actual library emission; independent PDF.js tests exposed pair-kerning differences | Limited glyph coverage; custom fonts need explicit registration                             |
| Widget removal preserves other annotations              | Removes interactive overlays without losing links/comments                                 | Not a general existing-filled-form migration tool                                           |
| Source diagnostics never contain raw values             | Safe logs regardless of sensitivity metadata                                               | PDFs and in-memory instructions still require ordinary sensitive-data handling              |

## Priority enhancements

1. **Custom-font registry and Unicode names.** Embed licensed fonts and expose stable font IDs with measured metrics and glyph coverage. This resolves a real limitation in Standard fonts.
2. **Continuation pages and overflow statements.** Introduce explicit attachment templates, capacity policies, and cross-page test vectors. Until then, excess array items fail rather than disappearing.
3. **Visual authoring tool.** Let analysts define rectangles on flat PDFs and export the same portable JSON. Coordinate conversion belongs in the authoring tool, not hidden inside the contract.
4. **Reviewed annual migration.** Compare official PDFs/widgets between revisions, propose a mapping diff, and require artwork checks before accepting new fingerprints.
5. **Additional page transforms and interactive-output adapter.** Define crop/rotation/user-unit transforms and support editable AcroForm filling as a distinct output profile.

No tax computation, OCR, e-filing, arbitrary expression interpreter, multi-tenant server, or database was built. Those are separate product responsibilities and do not strengthen the core annotation contract in this assessment.
