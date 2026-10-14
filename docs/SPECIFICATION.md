# Tax form annotation specification v1.0.0

This document is normative. **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express conformance requirements. The JSON Schema defines structural validity; this document defines cross-property rules and behavior. The TypeScript engine is one reference implementation, not the definition of the interchange format.

## 1. Inputs and output

A conforming renderer accepts three independent inputs: an annotation template, a blank PDF byte sequence, and a JSON payload. Templates specify geometry and value references, never taxpayer values. Payloads supply facts and computed values, never PDF coordinates. The renderer MUST NOT mutate any input.

A successful render returns PDF bytes and diagnostics. A failed render MUST return no PDF bytes. An independent renderer can use any programming language or PDF library, provided it implements the following contract.

Reference API:

```ts
renderTaxForm({
  basePdfBytes: Uint8Array,
  template: unknown,
  payload: unknown,
  debugOverlay?: boolean // default false
}): Promise<RenderResult>
```

`RenderResult` contains `success: boolean`, optional `pdfBytes: Uint8Array`, `diagnostics: Diagnostic[]`, and reference-engine `instructions: DrawInstruction[]`. Instructions contain formatted values and can be sensitive; applications MUST treat them like the original payload. The CLI logs diagnostics and counts, not instructions.

## 2. Complete minimal example

This template describes a hypothetical one-page form. Replace its placeholder hash with the actual SHA-256 of that blank PDF before rendering; the placeholder is not a wildcard.

```json
{
  "specVersion": "1.0.0",
  "templateId": "example-income",
  "form": { "number": "EXAMPLE", "revision": "1" },
  "basePdf": {
    "fileName": "blank.pdf",
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "pageCount": 1
  },
  "pages": [{ "pageNumber": 1, "width": 612, "height": 792 }],
  "fields": [
    {
      "id": "wages",
      "page": 1,
      "rect": { "x": 400, "y": 600, "width": 100, "height": 20 },
      "binding": "/return/income/wages",
      "required": true,
      "format": { "type": "money", "rounding": "wholeDollarHalfUp" },
      "style": { "align": "right" }
    }
  ]
}
```

Payload `{"return":{"income":{"wages":"1250.50"}}}` displays `1,251`. The text is right-aligned inside the box, with inherited typography and padding. An independent implementer can parse JSON, validate, resolve the pointer, format the value, measure it, calculate placement, then draw it on the original PDF.

## 3. Entity reference

All properties not explicitly documented or permitted as extensions MUST be rejected. Only Template, Field, and RepeatingGroup permit `x-` prefixed metadata keys; renderers ignore their values. Other objects are closed. Adding unsupported formatting or binding behavior through metadata is not permitted.

| Entity         | Required properties                                               | Optional properties / defaults                                                          |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Template       | `specVersion`, `templateId`, `form`, `basePdf`, `pages`, `fields` | `defaults` inherits the style table; `repeatingGroups` defaults to `[]`; `x-*` metadata |
| Form           | `number`, `revision` strings                                      | `taxYear` integer 1900–2100; `title` string; omitted metadata has no inferred value     |
| BasePdf        | `fileName`, `sha256`, `pageCount`                                 | `sourceUrl` string; metadata only, never fetched by the renderer                        |
| Page           | `pageNumber`, `width`, `height`                                   | None                                                                                    |
| Rect           | `x`, `y`, `width`, `height`                                       | None                                                                                    |
| Field          | `id`, `page`, `rect`, `binding`, `format`                         | `required: false`, `sensitive: false`, `style`, `description`, `provenance`, `x-*`      |
| Provenance     | `widgetName`, `widgetIndex`, `label`                              | None; calibration-only authoring metadata                                               |
| RepeatingGroup | `id`, `arraySource`, `slots`                                      | `x-*` metadata                                                                          |
| Slot           | nonempty `fields`                                                 | None                                                                                    |

`specVersion` MUST equal `1.0.0`. No forward-version behavior is inferred. `templateId` MUST match `^[a-z][a-z0-9-]*$`; field/group IDs MUST match `^[a-z][a-z0-9_.-]*$`. Field IDs MUST be globally unique, including all slots. Group IDs MUST be unique among groups. IDs are author-controlled labels, not source values.

`sha256` MUST contain 64 lowercase hexadecimal characters. `pageCount` is a positive integer. Pages MUST appear exactly once for each number from 1 to pageCount; array order does not determine page identity. Width/height are positive numbers; x/y are nonnegative numbers. Every rectangle MUST lie within its declared page. At least one field MUST exist across root fields and slots; root fields MAY be empty for a repeating-only form. These constraints apply even to unpopulated slots.

### Style inheritance

Field style overrides template defaults, which override these base values. JSON Schema `default` annotations do not perform mutation; the renderer applies defaults explicitly.

| Property        | Allowed values                     | Base default |
| --------------- | ---------------------------------- | ------------ |
| `fontFamily`    | Helvetica, Helvetica-Bold, Courier | Helvetica    |
| `fontSize`      | number >= 8                        | 9            |
| `minFontSize`   | number >= 8, <= resolved fontSize  | 8            |
| `padding`       | nonnegative point number           | 1            |
| `align`         | left, center, right                | left         |
| `verticalAlign` | bottom, middle, top                | middle       |
| `overflow`      | shrink, error                      | shrink       |

The padded box MUST have positive width and height. Font sizes are in points. Output text is black. Checkboxes use Helvetica-Bold and horizontal centering regardless of fontFamily/align; vertical alignment, padding, and size still apply. Combs center each character horizontally in its own cell. For 8×8-point checkboxes in the example, the field explicitly uses 8-point text and zero padding.

## 4. Data bindings and missing values

A field binding is either a JSON Pointer string or `{ "kind": "concat", "parts": [pointer, ...], "separator": " " }`. Parts MUST be nonempty; separator defaults to one ASCII space. There are no fallback paths, expressions, scripts, searches, or JSONPath queries in v1.

### JSON Pointer

Implement RFC 6901: an empty pointer selects the root; `/` separates tokens; tokens MAY be empty; decode `~1` to `/` before decoding `~0` to `~`. Other tilde escapes are invalid. A token `~01` therefore selects a property literally named `~1`.

Object lookup MUST use own properties. Array indices MUST match `0|[1-9][0-9]*`; leading-zero indices, negative indices, and `-` are invalid. An absent object key or out-of-range array index is missing. Traversal through a primitive is invalid. Traversal through null/undefined is missing. Scalar bindings MUST resolve to a string, finite number, or boolean; object/array leaves are invalid.

Inside a slot only, `./name` means JSON Pointer `/name` evaluated against that slot's array item. This prefix is an explicit extension to JSON Pointer, not the IETF Relative JSON Pointer syntax. Absolute pointers still resolve against the full payload. Top-level relative bindings MUST be rejected. Root-relative `.` alone is not supported.

### State table

| Source state                           | Optional field                   | Required field              |
| -------------------------------------- | -------------------------------- | --------------------------- |
| Missing / null / exactly empty string  | Blank; I_BLANK records the state | E_REQUIRED                  |
| Numeric zero                           | Resolve and format normally      | Resolve and format normally |
| Boolean false                          | Resolve and format normally      | Resolve and format normally |
| Object/array leaf or invalid traversal | E_BINDING                        | E_BINDING                   |

A whitespace-only string is not the empty string; text format preserves it. Format handlers MAY reject an incompatible scalar type. A required checkbox requires a source value; it does not require the checkbox to be checked.

Concat resolves each part in order, drops missing/null/empty parts, and joins resolved scalar values with the separator. Zero and false become `"0"` and `"false"`. An invalid part invalidates the binding. If no part resolves, the binding is missing. `required` applies to the combined field, not to each part; annotate mandatory individual data separately if necessary. Concat does not add punctuation or trim values.

### Fixed repeating slots

`arraySource` MUST be an absolute JSON Pointer resolving to an array. A missing, null, or non-array source produces E_ARRAY. An empty array produces no slot output. Item `i` uses `slots[i]`; unfilled slots stay blank. Each slot declares its own fields and absolute PDF rectangles. This supports horizontal, vertical, and irregular arrangements without assumed offsets.

If the array has more items than slots, rendering MUST fail with E_REPEAT_OVERFLOW. Continuation pages and silent clipping are not supported. Slot item types are validated by their field bindings.

## 5. Formatting

All formats use the discriminant `type` and reject unrelated properties.

| Format   | Properties / defaults                                                                                                                  | Input and behavior                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| text     | `case: asIs` (asIs/upper/lower)                                                                                                        | string or finite number; case conversion; reject newline, tab, carriage return                     |
| money    | `rounding: wholeDollarHalfUp` (or cents), `negative: parentheses` (or minus), `zero: zero` (or dash/blank), `thousandsSeparator: true` | decimal string or safe integer number; exact decimal arithmetic                                    |
| date     | required `pattern` (MM/DD/YYYY or YYYY-MM-DD)                                                                                          | valid calendar date string YYYY-MM-DD; year 0001–9999; Gregorian leap-year rules                   |
| tin      | required `subtype` (ssn/ein), `mask: formatted` (or digitsOnly)                                                                        | string of nine digits or correctly hyphenated SSN/EIN; validate shape, not issuance or eligibility |
| checkbox | required `checkedWhen: {equals: scalar}`, optional `group`                                                                             | strict scalar equality; checked renders X, unchecked draws nothing                                 |
| comb     | required `cellCount` (1–32); `characters: digits` (or alphanumeric); optional `exactLength` (1–32), optional `cells`                   | string; strip only ASCII spaces/hyphens; validate remaining characters; preserve leading zeroes    |

### Money

Decimal strings MUST match `^-?\d+(\.\d+)?$`; no whitespace, separators, exponents, or currency signs. Numeric inputs MUST be safe integers. Fractional numbers, nonfinite numbers, booleans, and unsafe integers are invalid. Use decimal strings for fractional values and large integers.

Round the absolute magnitude half up to zero decimal places for whole dollars or two for cents, using the first discarded decimal digit. Retain arbitrary precision with integer/string arithmetic. Apply zero policy **after rounding**, suppressing negative zero. Group integer digits in threes with commas unless disabled. Apply sign last: parentheses by default, minus when selected. No currency symbol is added.

| Input / options                     | Output     |
| ----------------------------------- | ---------- |
| `"184650.49"`, whole dollars        | `184,650`  |
| `"184650.50"`, whole dollars        | `184,651`  |
| `"-14200.50"`, parentheses          | `(14,201)` |
| `"1.999"`, cents                    | `2.00`     |
| `"-0.49"`, whole dollars, zero=dash | `-0-`      |
| `"0"`, zero=blank                   | no drawing |

Summation and tax calculations belong to the caller. Form 1040 instructs rounding line totals after adding unrounded amounts; the renderer receives those totals. Zero display is field-specific, not a universal tax-form convention.

### Identifiers and combs

SSN accepted patterns are nine digits or `###-##-####`; EIN accepts nine digits or `##-#######`. Formatted output uses the corresponding hyphens. This is syntax validation only. PTIN and ITIN eligibility rules are not implemented.

Comb `exactLength`, if present, MUST be <= cellCount. Cleaned content longer than capacity or differing from exactLength produces E_COMB. Without exactLength, fewer characters fill leading cells and leave trailing cells blank. No zero padding is inferred. Digits accepts ASCII 0–9; alphanumeric accepts ASCII letters and digits.

Each optional cell is `{offset, width}` measured horizontally from rect.x. There MUST be exactly cellCount cells; each width is positive, offsets nonnegative, cells ordered/nonoverlapping, and all cells inside the rectangle. Semantic comparisons permit 0.000001-point arithmetic tolerance. Without cells, subdivide rect.width equally. The supplied SSN mappings account for preprinted group dividers; they do not assume nine uniformly printed cells.

Checkbox group labels identify global exclusive sets. More than one checked field sharing a label produces E_CHECKBOX_GROUP. No selection is allowed. Repeated rows should use distinct group names if their exclusivity is per item.

## 6. PDF coordinates and layout

Reference support: unrotated PDF pages, MediaBox origin (0,0), CropBox exactly equal to MediaBox, and UserUnit 1 or absent. Other geometry MUST fail clearly. Units are points (1/72 inch), x increases rightward, y upward. Rect x/y is its lower-left corner; pages are one-based. The original PDF's page count/hash MUST match; each dimension MUST be within 0.01 point of the declared value.

For rectangle (x,y,w,h) and padding p:

```
xi = x + p; yi = y + p
wi = w - 2p; hi = h - 2p
```

Measure rendered text advance width W, font ascent A, and negative descent D at size S. Use the font metrics corresponding to the actual drawing path. The reference Standard-font adapter sums character advances because its text emission does not apply pair kerning; whole-string kerning estimates would understate the emitted width.

Text fits only if `W <= wi` and `A - D <= hi`. Horizontal positions:

```
left:   X = xi
center: X = xi + (wi - W)/2
right:  X = xi + wi - W
```

Vertical baseline positions, including descenders:

```
bottom: Y = yi - D
top:    Y = yi + hi - A
middle: Y = yi + (hi - (A - D))/2 - D
```

`overflow=error` tries only fontSize. `shrink` tries fontSize, decrements by 0.5 point while above minFontSize, and also tries minFontSize exactly if it is not on that grid. Choose the largest fitting candidate. Emit W_SHRUNK when reduced; emit E_OVERFLOW if none fits. MUST NOT truncate, clip, or silently omit a failed value.

For combs, apply the same fit rules to every cell with padding on both sides. All characters in a comb share the largest size fitting every occupied cell. Checkboxes use the X glyph and the same vertical fit checks.

Font-metric bounds are conservative layout evidence, not a raster/ink guarantee. Unsupported characters produce E_GLYPH. The reference uses the listed Standard fonts; a future custom-font profile requires a documented registry and equivalent metrics.

The renderer removes AcroForm/XFA and only Widget annotations before overlaying values on preserved page artwork. It is a blank-form overlay renderer, not a filler that preserves preexisting interactive values. Non-Widget annotations remain. Output is noninteractive. Set ViewerPreferences PrintScaling to None; operators SHOULD still check Actual Size/100% in their print dialog.

Debug mode MAY draw rectangle outlines, baselines, and small field labels. Debug labels are not taxpayer entries. Debug PDFs are authoring artifacts and SHOULD NOT be used as final printed returns.

## 7. Validation and diagnostics

Validation order: schema -> semantic -> PDF identity/geometry -> resolution -> formatting -> layout -> render. Structural/semantic/PDF failures stop processing; later field failures are collected across fields and prevent final PDF emission. Valid warnings/info do not block output. No preview mode that bypasses errors exists in v1.

Diagnostic fields: required `code`, `severity` (error/warning/info), `stage`, `message`; optional `fieldId`, `page`, `sourcePath`, and `instancePath`. Stages use lowercase names shown above. Messages MUST NOT contain raw payload values or raw exception messages. `sensitive` is descriptive metadata; diagnostics are value-free for every field regardless of this flag. Paths/IDs originate in the template. The result's instructions and generated PDFs still contain supplied values.

| Code              | Meaning                                                      |
| ----------------- | ------------------------------------------------------------ |
| E_SCHEMA          | Invalid template structure; instancePath identifies location |
| E_TEMPLATE        | No field exists                                              |
| E_ID              | Duplicate field/group IDs                                    |
| E_PAGE            | Invalid/duplicate/missing page declarations or references    |
| E_BOUNDS          | Rectangle outside page                                       |
| E_STYLE           | Invalid font range or padded box                             |
| E_CELLS           | Invalid comb-cell geometry/count                             |
| E_BINDING_CONTEXT | Relative binding outside a slot                              |
| E_PDF_HASH        | Blank PDF fingerprint mismatch                               |
| E_PDF_LOAD        | Unreadable/encrypted PDF or preparation failure              |
| E_PDF_PAGES       | Wrong PDF page count                                         |
| E_PDF_GEOMETRY    | Unsupported rotation, box offsets/cropping, or UserUnit      |
| E_PDF_SIZE        | Declared and actual page sizes differ                        |
| E_ARRAY           | Group source does not resolve to an array                    |
| E_REPEAT_OVERFLOW | More items than slots                                        |
| E_BINDING         | Invalid pointer/traversal or nonscalar leaf                  |
| E_REQUIRED        | Required field is missing/null/empty                         |
| E_FORMAT          | Invalid scalar input for format                              |
| E_DATE            | Invalid date                                                 |
| E_TIN             | Invalid identifier syntax                                    |
| E_COMB            | Invalid characters, length, or capacity                      |
| E_CHECKBOX_GROUP  | Multiple checked values in exclusive set                     |
| E_GLYPH           | Font cannot encode content                                   |
| E_OVERFLOW        | Content cannot fit at permitted sizes                        |
| E_RENDER          | PDF output serialization failed                              |
| W_SHRUNK          | Smaller size selected to fit                                 |
| I_BLANK           | Optional value missing/null/empty                            |

## 8. Conformance, decisions, and roadmap

A conforming implementation MUST implement every declared v1 format/binding or reject unsupported templates explicitly. It MUST satisfy the numeric and missing-value test vectors, enforce all page/field invariants, and prevent output on errors. Identical PDF bytes across renderers are not required; display values and declared placement behavior are.

See [calibration](CALIBRATION.md), [verification](VERIFICATION.md), and [design decisions](DECISIONS.md). Future extensions include custom fonts, transformed pages, continuation layouts, analyst authoring tools, and year-to-year migration. Arbitrary executable template code, tax calculations, filing, and a tenant database are outside this specification.
