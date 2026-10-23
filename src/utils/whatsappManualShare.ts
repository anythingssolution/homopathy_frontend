type ShareDocument = {
  kind: string; language?: string; filename: string; bill_number: string; date: string;
  patient_name: string; patient_uuid: string;
  lines: { name: string; quantity?: number | string; mode?: string; amount: number | string }[];
  totals: [string, number | string][];
};

export function normalizeManualWhatsAppPhone(value: string): string {
  let digits = String(value || '').replace(/[\s()+-]/g, '');
  if (/^\d{10}$/.test(digits)) digits = `91${digits}`;
  if (!/^[1-9]\d{10,14}$/.test(digits)) throw new Error('Valid patient WhatsApp number enter karein (10 digits ya country code ke saath).');
  return digits;
}

export function buildManualWhatsAppText(document: ShareDocument): string {
  const hi = document.language === 'hi';
  const isReceipt = document.kind === 'RECEIPT';
  const currency = (amount: number | string) => `₹ ${Number(amount || 0).toFixed(2)}`;
  const heading = [
    "*Dr. Trivedi's Homeopathy Clinic*",
    `${hi ? 'मरीज' : 'Patient'}: ${document.patient_name}`,
    `${hi ? 'रजिस्ट्रेशन नंबर' : 'Reg. No.'}: ${document.patient_uuid}`,
    `${hi ? 'बिल' : 'Bill'}: ${document.bill_number}`,
    `${hi ? 'दिनांक' : 'Date'}: ${document.date}`,
    '',
    hi ? (isReceipt ? '*भुगतान रसीद*' : '*दवा / जाँच की अनुमानित राशि*') : (isReceipt ? '*Payment receipt*' : '*Medicine / Test — Approx. amount*'),
  ];
  // Keep chat links usable for large bills. The PDF always includes every item.
  const lines: string[] = [];
  let length = heading.join('\n').length;
  for (const item of document.lines) {
    const detail = document.kind === 'RECEIPT' ? item.mode : item.quantity;
    const line = `${item.name}${detail ? ` (${detail})` : ''}: ${currency(item.amount)}`;
    if (length + line.length > 2000) break;
    lines.push(line); length += line.length + 1;
  }
  if (lines.length < document.lines.length) lines.push(hi ? 'बाकी विवरण PDF में देखें।' : 'Remaining items are included in the PDF.');
  const totals = document.totals.map(([label, amount]) => {
    const displayLabel = !isReceipt && ['Net bill', 'शुद्ध बिल'].includes(label)
      ? (hi ? 'अनुमानित कुल राशि' : 'Approx. total amount') : label;
    return `${displayLabel}: ${currency(amount)}`;
  });
  return [...heading, ...lines, '', ...totals, '',
    ...(!isReceipt ? [hi ? 'यह अनुमानित राशि का सारांश है। बिल और भुगतान का दर्ज विवरण PDF में देखें।' : 'This is an approximate amount summary. Refer to the PDF for recorded bill and payment details.', ''] : []),
    `PDF: ${document.filename}`,
  ].join('\n');
}

export function buildManualWhatsAppLink(phone: string, message: string): string {
  if (!message.trim()) throw new Error('WhatsApp message khali nahi hona chahiye.');
  return `https://wa.me/${normalizeManualWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
}
