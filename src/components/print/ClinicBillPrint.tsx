import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { buildInvoiceModel, invoiceMoney, invoiceDate, amountInWords } from '../../utils/invoicePrint';

export function ClinicBillHeader({ branch }: { branch?: any }) {
  const { branchScope } = useAuth();
  const saved = branchScope?.available_branches.find(b => Number(b.id) === Number(branch?.branch_id));
  const name = branch?.branch_name || saved?.branch_name;
  const address = branch?.branch_address || saved?.address;
  const phone = branch?.branch_contact_no || saved?.contact_no;
  return <header className="clinic-bill-header">
    <style>{`.clinic-bill-header {border-bottom:2px solid #2d8789;padding-bottom:10px;margin-bottom:14px;text-align:center;color:#172b38;font:12px Arial,sans-serif}.clinic-bill-header > div {display:flex;justify-content:center;align-items:center;gap:12px}.clinic-bill-header img {width:65px;max-height:48px;object-fit:contain}.clinic-bill-header h1 {font-size:21px;margin:0 0 4px;font-weight:700}.clinic-bill-header p {margin:2px 0}`}</style>
    <div><img src="/logo.png.png" alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
      <h1>Dr. Trivedi Homeopathic Clinic</h1></div>
    {name && <strong>{name}</strong>}
    {address && <p>{address}</p>}
    {phone && <p>Phone: {phone}</p>}
  </header>;
}

export default function ClinicBillPrint({ bills, patient, visitDate, tokenLabel, onClose }: {
  bills: any[]; patient: any; visitDate?: string; tokenLabel?: string | null; onClose?: () => void;
}) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  const label = (en: string, hindi: string) => hi ? hindi : en;
  const model = buildInvoiceModel(bills);
  return createPortal(<div className={`${onClose ? "clinic-bill-preview" : "print-only"} clinic-bill-document`}>
    <style>{`
      @media screen {
        .clinic-bill-preview { position:fixed; inset:16px; z-index:10001; max-width:850px; margin:auto; padding:24px; overflow:auto; box-shadow:0 0 0 100vmax #172b3899; border-radius:8px; }
      }
      @page clinic-bill { size: A4; margin: 12mm 10mm; @bottom-right { content: counter(page) " / " counter(pages); font: 9px Arial,sans-serif; color:#536670; } }
      @media print {
        body:has(> .clinic-bill-document) > *:not(.clinic-bill-document) { display: none !important; }
        .clinic-bill-document { display: block !important; page: clinic-bill; position: static !important; width: auto !important; max-width:none !important; overflow: visible !important; inset:auto !important; margin:0 !important; padding:0 !important; box-shadow:none !important; border-radius:0 !important; }
        .clinic-bill-document * { visibility: visible !important; }
        .clinic-bill-document .no-print { display:none !important; }
      }
      .clinic-bill-document { color:#172b38; background:white; font:12px Arial,sans-serif; line-height:1.4; }
      .clinic-bill-header { border-bottom:2px solid #2d8789; padding-bottom:10px; margin-bottom:14px; text-align:center; }
      .clinic-bill-header > div { display:flex; justify-content:center; align-items:center; gap:12px; }
      .clinic-bill-header img { width:65px; max-height:48px; object-fit:contain; }
      .clinic-bill-header h1 { font-size:21px; margin:0 0 4px; font-weight:700; }
      .clinic-bill-header p { margin:2px 0; }
      .clinic-bill-meta { display:flex; justify-content:space-between; gap:20px; margin-bottom:16px; }
      .clinic-bill-meta p { margin:3px 0; }
      .clinic-bill-document h2 { font-size:18px; font-weight:700; margin:0; }
      .clinic-bill-document h3 { font-size:12px; font-weight:700; margin:14px 0 6px; break-after:avoid; }
      .clinic-bill-document table { width:100%; border-collapse:collapse; table-layout:fixed; }
      .clinic-bill-document th, .clinic-bill-document td { padding:7px 6px; border-bottom:1px solid #d7dfe2; vertical-align:top; overflow-wrap:anywhere; }
      .clinic-bill-document th { background:#edf5f4; text-align:left; font-weight:700; }
      .clinic-bill-document .num { text-align:right; white-space:nowrap; }
      .clinic-bill-document thead { display:table-header-group; }
      .clinic-bill-document tr { break-inside:avoid; }
      .clinic-bill-totals { width:280px; margin:16px 0 12px auto; break-inside:avoid; }
      .clinic-bill-totals p { display:flex; justify-content:space-between; gap:12px; margin:5px 0; }
      .clinic-bill-totals p:last-child { border-top:1px solid #172b38; padding-top:7px; font-weight:700; }
      .clinic-bill-footer { border-top:1px solid #d7dfe2; margin-top:22px; padding-top:10px; display:flex; justify-content:space-between; break-inside:avoid; }
      .clinic-bill-muted { color:#536670; font-size:11px; }
    `}</style>
    {onClose && <div className="no-print" style={{display:'flex',justifyContent:'flex-end',gap:10,marginBottom:16}}>
      <button onClick={() => window.print()} style={{background:'#168460',color:'white',padding:'9px 16px',borderRadius:6}}>{label('Print / Save PDF', 'प्रिंट / PDF सेव करें')}</button>
      <button onClick={onClose} style={{padding:'9px 16px'}}>{label('Close', 'बंद करें')}</button>
    </div>}
    <ClinicBillHeader branch={bills[0]} />
    <div className="clinic-bill-meta"><div>
      <strong>{label('Bill to', 'मरीज')}</strong>
      <p><b>{patient.patient_full_name || patient.full_name}</b></p>
      {(patient.patient_uuid || bills[0]?.patient_uuid) && <p>{label('Patient ID', 'मरीज आईडी')}: {patient.patient_uuid || bills[0]?.patient_uuid}</p>}
      {(patient.patient_mobile_no || patient.mobile_no) && <p>{patient.patient_mobile_no || patient.mobile_no}</p>}
      {patient.booked_for_type === 'FAMILY_MEMBER' && patient.primary_patient_full_name && <p>{label('Account holder', 'खाताधारक')}: {patient.primary_patient_full_name}</p>}
    </div><div style={{textAlign:'right'}}><h2>{label('INVOICE', 'बिल')}</h2>
      {visitDate && <p>{label('Visit date', 'विज़िट दिनांक')}: {invoiceDate(visitDate)}</p>}
      {tokenLabel && <p>{label('Token', 'टोकन')}: {tokenLabel}</p>}
      <p>{model.pending > 0 ? label('Pending', 'बकाया') : label('Paid', 'भुगतान पूर्ण')}</p>
    </div></div>
    {model.sections.map((section, i) => <section key={section.id || i}>
      <h3>{section.number} · {section.category} {section.date && `· ${label('Bill date', 'बिल दिनांक')}: ${invoiceDate(section.date)}`}</h3>
      <table><thead><tr><th style={{width:'6%'}}>#</th><th>{label('Description', 'विवरण')}</th><th className="num" style={{width:'10%'}}>{label('Qty', 'मात्रा')}</th><th className="num" style={{width:'16%'}}>{label('Rate', 'दर')}</th><th className="num" style={{width:'18%'}}>{label('Amount', 'राशि')}</th></tr></thead>
        <tbody>{section.items.map(item => <tr key={item.serial}><td>{item.serial}</td><td>{item.name}{item.kind && <div className="clinic-bill-muted">{item.kind}</div>}</td><td className="num">{item.quantity ?? ''}</td><td className="num">{item.rate == null ? '' : invoiceMoney(item.rate)}</td><td className="num">{invoiceMoney(item.amount)}</td></tr>)}</tbody></table>
      {model.sections.length > 1 && <p style={{textAlign:'right',marginTop:4}}>{label('Subtotal', 'उप-योग')}: <b>{invoiceMoney(section.total)}</b></p>}
      {section.delivery && <p className="clinic-bill-muted">{section.delivery}</p>}
    </section>)}
    <div className="clinic-bill-totals">
      <p><span>{label('Total billed', 'कुल बिल')}</span><b>{invoiceMoney(model.total)}</b></p>
      <p><span>{label('Received against these bills', 'इन बिलों पर प्राप्त')}</span><b>{invoiceMoney(model.paid)}</b></p>
      {model.modes && <div className="clinic-bill-muted" style={{textAlign:'right'}}>{model.modes}</div>}
      <p><span>{label('Balance due', 'शेष बकाया')}</span><b>{invoiceMoney(model.pending)}</b></p>
    </div>
    {model.recovered.length > 0 && <section><h3>{label('Old dues recovered separately — excluded from bill total', 'पुराने बकाये की अलग वसूली — बिल कुल में शामिल नहीं')}</h3>
      <table><thead><tr><th>{label('Original bill', 'पुराना बिल')}</th><th>{label('Received date', 'प्राप्त दिनांक')}</th><th className="num">{label('Amount', 'राशि')}</th></tr></thead><tbody>{model.recovered.map(p => <tr key={p.payment_id}><td>{p.bill_number}</td><td>{invoiceDate(p.collected_at)}</td><td className="num">{invoiceMoney(p.amount)}</td></tr>)}</tbody></table>
    </section>}
    <p className="clinic-bill-muted">{label("Bill amount in words", "बिल राशि शब्दों में")}: {amountInWords(model.total)}</p>
    <footer className="clinic-bill-footer"><span>{label('Patient copy', 'मरीज की प्रति')}</span><span>{label('Authorized signature', 'अधिकृत हस्ताक्षर')}</span></footer>
  </div>, document.body);
}
