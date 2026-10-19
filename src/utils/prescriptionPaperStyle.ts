import type { CSSProperties } from 'react';

// Soft printed-paper tones from the clinic reference; keep clinical text high contrast.
export const prescriptionPaperStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #ffffff 35%, #f5faf7 65%, #e7f0ea 85%, #d8e5dc 100%)',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

export const prescriptionFooterStyle: CSSProperties = {
  breakInside: 'avoid',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};
