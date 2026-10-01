# Consultation Token Badge Design QA

## Source

- User screenshot: `codex-clipboard-68f42842-fb39-4823-afc4-dc040da41bd4.png`
- Live route checked: `/consult/5822`
- Checked state: Vijay Laxmi follow-up consultation, token `E-12`, queue position `1`

## Comparison

- The token now sits on an opaque warm-white surface, so the teal consultation header no longer tints the number.
- Dark slate token text gives clear contrast against the token surface.
- The rose ticket icon remains visually connected to the existing queue-list token style without sitting behind the text.
- The position badge remains yellow and directly above the token, preserving the queue hierarchy.
- The token block stays aligned with the patient name and does not overlap the visit, age, mobile, or branch pills.
- Existing list, billing, and drawer token badges keep their previous presentation because the new treatment is scoped to the consultation-header variant.

## Result

No P0, P1, or P2 visual issues remain in the inspected desktop consultation header.

final result: passed

---

# Reports Next Test Register Design QA

## Source

- Reference: the user's photographed day-wise laboratory register
- Live route checked: `/reports-next/test-register?window=1_month`
- Checked state: Lily Chowk Branch with real consultation tests across the selected month

## Comparison

- The page reuses the Reports Next sidebar, date controls, metric cards, teal active state, spacing, borders, and typography.
- Dates are separated as register sections. The latest day appears first, while rows inside each day follow the consultation token sequence.
- Token, patient, age/gender, recommended tests, result state, amount, and record actions remain readable at the standard desktop width.
- Doctor and visit details appear on wide screens and in print; medium desktop widths keep the two primary actions visible without horizontal clipping.
- The actions use visible `Record` and `Consult` labels with supporting icons and tooltips, so their destinations do not depend on recognizing an icon.
- `Record` was verified against a live row and opened that patient's registry record. Browser Back returned to the same filtered Test Register.
- `Consult` was verified against the same row and opened the exact appointment consultation. Its Back action returned to the same filtered Test Register.
- Direct consultation navigation initially exposed a React hook-order blank screen. The consultation loading guard now runs after hook registration, and the live route renders normally.
- Status and test filters were exercised against live data. Removed tests retain their reason and do not contribute to the displayed active-test amount.
- The print layout contains all filtered rows, including rows outside the current screen page, and removes interactive controls.

## Result

No P0, P1, or P2 visual issues remain in the inspected desktop Test Register.

final result: passed
