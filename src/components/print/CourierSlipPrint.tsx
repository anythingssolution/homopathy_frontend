import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export type CourierSlipData = {
  billNumber?: string | null;
  bookedAt?: string | null;
  branchId?: number | string | null;
  branchName?: string | null;
  branchAddress?: string | null;
  branchContactNo?: string | null;
  patientName?: string | null;
  patientMobileNo?: string | null;
  patientId?: string | null;
  courierAddress?: string | null;
  courierPartner?: string | null;
  trackingNo?: string | null;
  medicineCount?: number | string | null;
  medicineNames?: string | null;
  deliveryRemark?: string | null;
};

const valueOrDash = (value: unknown) => String(value || '').trim() || '—';

export default function CourierSlipPrint({ data, onClose }: { data: CourierSlipData; onClose: () => void }) {
  const { branchScope } = useAuth();
  const { i18n } = useTranslation();
  const hi = i18n.language?.startsWith('hi');
  const label = (en: string, hindi: string) => hi ? hindi : en;
  const savedBranch = branchScope?.available_branches?.find((branch) => Number(branch.id) === Number(data.branchId));
  const branchName = data.branchName || savedBranch?.branch_name;
  const branchAddress = data.branchAddress || savedBranch?.address;
  const branchContact = data.branchContactNo || savedBranch?.contact_no;

  return createPortal(
    <div className="courier-slip-overlay">
      <div className="courier-slip-document">
        <style>{`
          .courier-slip-overlay{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;padding:18px;background:#172b3899;backdrop-filter:blur(4px)}
          .courier-slip-document{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:24px;color:#172b38;font:13px/1.45 Arial,sans-serif;box-shadow:0 24px 70px #0f172a40}
          .courier-slip-actions{display:flex;justify-content:flex-end;gap:10px;margin-bottom:18px}
          .courier-slip-actions button{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer}
          .courier-slip-actions .print{background:#549e9e;color:#fff}.courier-slip-actions .close{background:#eef2f4;color:#536670}
          .courier-slip-heading{text-align:center;border-bottom:2px solid #2d8789;padding-bottom:12px;margin-bottom:16px}
          .courier-slip-heading h1{font-size:22px;margin:0}.courier-slip-heading p{margin:3px 0;color:#536670}
          .courier-slip-route{display:grid;grid-template-columns:1fr 1fr;gap:14px}
          .courier-slip-box{border:1.5px solid #b8c9cc;border-radius:10px;padding:14px;min-height:150px}
          .courier-slip-box h2{font-size:11px;letter-spacing:.14em;color:#2d8789;margin:0 0 10px}.courier-slip-box p{margin:4px 0;overflow-wrap:anywhere}
          .courier-slip-meta{margin-top:14px;border:1px solid #d7dfe2;border-radius:10px;padding:13px;display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
          .courier-slip-meta p{margin:0;overflow-wrap:anywhere}.courier-slip-wide{grid-column:1/-1}
          .courier-slip-footer{display:flex;justify-content:space-between;gap:20px;border-top:1px solid #d7dfe2;margin-top:20px;padding-top:12px;color:#536670;font-size:11px}
          @page courier-slip{size:A5 landscape;margin:9mm}
          @media print{
            body:has(.courier-slip-document)>*:not(.courier-slip-overlay){display:none!important}
            .courier-slip-overlay{position:static!important;display:block!important;padding:0!important;background:none!important;backdrop-filter:none!important}
            .courier-slip-document{page:courier-slip;width:auto!important;max-height:none!important;overflow:visible!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
            .courier-slip-actions{display:none!important}
          }
          @media(max-width:640px){.courier-slip-route,.courier-slip-meta{grid-template-columns:1fr}.courier-slip-wide{grid-column:auto}}
        `}</style>
        <div className="courier-slip-actions no-print">
          <button type="button" className="print" onClick={() => window.print()}><Printer size={15} />{label('Print slip', 'पर्ची प्रिंट करें')}</button>
          <button type="button" className="close" onClick={onClose}><X size={15} />{label('Close', 'बंद करें')}</button>
        </div>
        <header className="courier-slip-heading">
          <h1>{label('COURIER DELIVERY SLIP', 'कूरियर डिलीवरी पर्ची')}</h1>
          <p>{valueOrDash(data.billNumber)}</p>
        </header>
        <div className="courier-slip-route">
          <section className="courier-slip-box">
            <h2>{label('FROM / प्रेषक', 'FROM / प्रेषक')}</h2>
            <p><b>Dr. Trivedi Homeopathic Clinic</b></p>
            <p>{valueOrDash(branchName)}</p>
            <p>{valueOrDash(branchAddress)}</p>
            <p><b>{label('Phone', 'फोन')}:</b> {valueOrDash(branchContact)}</p>
          </section>
          <section className="courier-slip-box">
            <h2>{label('TO / प्राप्तकर्ता', 'TO / प्राप्तकर्ता')}</h2>
            <p><b>{valueOrDash(data.patientName)}</b></p>
            <p>{valueOrDash(data.courierAddress)}</p>
            <p><b>{label('Mobile', 'मोबाइल')}:</b> {valueOrDash(data.patientMobileNo)}</p>
          </section>
        </div>
        <section className="courier-slip-meta">
          <p><b>{label('Bill', 'बिल')}:</b> {valueOrDash(data.billNumber)}</p>
          <p><b>{label('Courier company', 'कूरियर कंपनी')}:</b> {valueOrDash(data.courierPartner)}</p>
          <p><b>{label('Tracking / AWB', 'ट्रैकिंग / AWB')}:</b> {valueOrDash(data.trackingNo)}</p>
          {data.deliveryRemark && <p className="courier-slip-wide"><b>{label('Delivery note', 'डिलीवरी टिप्पणी')}:</b> {data.deliveryRemark}</p>}
        </section>
        <footer className="courier-slip-footer"><span>{label('Medical counter copy', 'मेडिकल काउंटर प्रति')}</span><span>{label('Packed by / signature', 'पैक करने वाले के हस्ताक्षर')}</span></footer>
      </div>
    </div>,
    document.body,
  );
}
