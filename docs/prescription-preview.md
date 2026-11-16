# Shared prescription preview

Updated 16 November 2026.

Use `PrescriptionPreviewPaper` around **screen previews** of `PrescriptionPrint`,
`AllVisitsPrint` and the clinic-history prescription section. Patient, doctor,
consultation, reception, medical, patient-record and report previews share this viewer.

- The original A4 document defaults to Fit width without reflowing its contents.
- Two-finger touch gestures zoom between Fit width and 300%, keeping the point
  between the fingers anchored. One-finger horizontal/vertical scrolling stays native.
- Fit width and 100% controls reset scroll to the beginning of the document.
- A resize observer adjusts fit and document height after rotation, language changes
  or loading a longer history. Closing/unmounting removes gesture listeners.
- Modal action headers wrap on narrow screens; each caller keeps its existing
  language, print, close, loading and data-access behavior.

Keep each caller's separate `print-only` document **outside** this viewer. The
viewer is `no-print`; its transform and zoom state must never wrap a print copy.
No prescription content, API, eligibility, billing or backend changes are needed.

Validation uses mobile Chromium touch input, narrow/landscape/desktop viewports,
single and multi-visit content, language switching and print-media checks. Physical
Android/iPhone browser testing remains a deployment/device check.
