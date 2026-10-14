# Walkthrough speech script

Read naturally at about 160 words per minute. Follow the teleprompter's silent file cues. Pause while switching windows; the headings are not spoken.

## Show the result

Hi, I'm Gowtham T G. Here's my solution to the assignment, and the thinking behind it. I'll start with the result: data printed into the boxes on the official 2025 Form 1040. The names, checkboxes, dependent details, and amounts come from a fictional dataset. On page two, you can see the zero taxable-income value and the routing-number grid. This example demonstrates placement and formatting; it isn't a calculated tax return.

## Explain one field

My approach was to keep the data, the annotation rules, and the PDF rendering separate. This JSON template is the annotation specification. Each field defines a page, a bounding rectangle, a data reference, and a format. Take the wages field: its binding selects the income value, its format rounds the amount, and its style aligns it to the right. The PDF fingerprint ties these coordinates to the correct form revision. JSON Schema validates the template, and the written specification defines the defaults and error behavior. Another developer can implement this contract with their own PDF library.

## Follow the data

The values come from this separate payload. JSON Pointer reaches nested objects and arrays without executing code. Concatenation combines first name and middle initial; relative bindings handle each dependent. Zero and false are valid values. Here, false selects the Digital Assets No checkbox. Money uses decimal strings or safe integers, so rounding doesn't depend on binary fractions. These wages become 184,651, the loss uses parentheses, and the taxable-income field prints zero as -0-. Tax calculations stay in the application.

## Show placement and overflow

This debug PDF shows the field rectangles and text baselines. Coordinates are bottom-left PDF points, with one-based page numbers. I checked the mappings against the actual form, including its four dependent columns. Each slot has explicit geometry. Here is the fit check. It measures width and height, includes descenders, and shrinks text only as far as eight points. A value that still doesn't fit produces an error. Excess dependents and unsupported PDF geometry also fail clearly.

## Prove it works

The project has 86 passing tests. PDF.js independently reads the generated output and checks all 55 populated text runs across both pages: their values, positions, and font-metric bounds. I also inspected the rendered PDFs against the artwork. Now the failure demo: a missing required name, invalid identifier, and oversized amount produce structured errors. No PDF is emitted, and the diagnostics don't expose raw taxpayer values.

## Explain the choices

I kept the contract independent of the renderer, used predictable bindings, and made failures explicit. The documentation explains how to annotate another form and implement the specification. Next, I'd add custom fonts, continuation pages, and a visual calibration tool. The repository includes the specification, implementation, tests, and both PDF examples.
