# Patient Records Row View and Print Audit

## Scope

Doctor login → Patient Records → Open Record → direct/repeat medicine row → View and Print.

## Steps

1. **Open patient record — healthy after fix**
   - Screenshot: `01-row-actions.jpg`
   - Clinical visits and medicine pickups now expose the same visible View and Print actions.
   - Direct medicine remains clearly labelled and is not presented as a consultation.

2. **View medicine collection — healthy after fix**
   - Screenshot: `02-medicine-preview.jpg`
   - The preview shows bill number, event time, medicine names, item amounts, payment summary, delivery mode, and branch.
   - The modal exposes English/Hindi switching, Print, and Close controls.

## Root cause

The row action gate only accepted records with both `has_prescription` and `consultation_id`. Standalone direct/repeat medicine records deliberately have no consultation id, so the UI rendered only a status badge even though the shared prescription timeline already had printable medicine-collection data.

## Accessibility check

- View and Print are real buttons with visible text and icons.
- Keyboard users can reach both actions independently from the expandable row.
- Screenshot inspection cannot prove screen-reader announcement order or native print-dialog accessibility.

## Result

The missing row-level View and Print path is fixed and live-verified for Vijay Laxmi bill `BILL130920260070`.
