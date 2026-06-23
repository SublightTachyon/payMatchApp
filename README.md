# PayMatch Pivot Prototype

This folder is the new pivot idea from the notes: a paystub vs timesheet checker.

Open `index.html` in a browser. The prototype can:

- Upload a timesheet PDF and paystub PDF.
- Extract selectable PDF text with PDF.js.
- Guess common payroll fields from the text.
- Let you correct the parsed fields manually.
- Compare regular hours, overtime hours, overtime rate, and gross pay.
- Generate a calm payroll message based only on detected mismatches.

Scanned PDFs still need OCR later. The math is deterministic JavaScript; the "AI" layer should improve document parsing and wording, not replace the payroll calculations.

## Product Positioning

Upload your timecard and paystub. Get a plain-English explanation of possible pay errors before you contact payroll.

The app should say "possible mismatch found," not accuse an employer of wrongdoing. It should give the worker a calm, specific report and a message they can bring to HR or payroll.

## Current Architecture

```text
ai pivot/
  index.html
  style.css
  app.js
  src/
    extractPdfText.js
    parsePaystub.js
    parseTimesheet.js
    calculateExpectedPay.js
    detectIssues.js
    renderReport.js
  tests/
    payrollMath.test.js
  vendor/
    pdf.min.js
    pdf.worker.min.js
```

## Layers

1. Document reader: `src/extractPdfText.js` extracts selectable text with PDF.js.
2. Payroll parser: `src/parsePaystub.js` and `src/parseTimesheet.js` turn messy text into structured data.
3. Calculation engine: `src/calculateExpectedPay.js` calculates expected regular, overtime, and gross pay.
4. Discrepancy detector: `src/detectIssues.js` flags mismatches.
5. Explanation layer: `src/renderReport.js` writes the report and payroll message from detected issues only.

## Public Beta Hardening Already Added

- PDF file size limit: 10 MB.
- PDF page limit: 5 pages.
- Local vendored PDF.js instead of runtime CDN execution.
- Basic Content Security Policy in `index.html`.
- Report rendering uses DOM APIs and `textContent`, not `innerHTML`/`outerHTML`.
- Private testing notice near the upload area.
- Review-parsed-fields warning near the Run Check button.
- In-app feedback form with trust, clarity, math, and privacy questions. It opens an email draft to the address set in `FEEDBACK_EMAIL` in `app.js`.
- Clear all button to wipe form fields, extracted text, JSON, and report state.
- Better messages for oversized, too-many-page, password-protected, broken, scanned, or unsupported PDFs.

## MVP Checks

- Pay period dates
- Regular hours
- Overtime hours
- Total hours
- Hourly rate
- Overtime rate
- Gross pay before taxes

Taxes, garnishments, insurance, 401(k), bonuses, complex shift differentials, state-specific rules, and union rules are intentionally out of scope for the first version.

## AI Plan

Do not put an AI API key in browser JavaScript. Later AI support should go through a small backend or serverless function:

```text
server/
  analyzeDocuments.js
  callAiParser.js
  validateAiJson.js
```

AI should return structured JSON. The app should validate that JSON, run its own calculations, detect mismatches, then ask AI to explain only the issues the app found.

## Test

Run the deterministic payroll math test:

```bash
node "ai pivot/tests/payrollMath.test.js"
```
