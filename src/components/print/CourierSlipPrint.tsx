import React from 'react';
import { createPortal } from 'react-dom';
import { Facebook, Instagram, MessageCircle, Printer, Twitter, X, Youtube } from 'lucide-react';
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
const splitAddressLines = (value: unknown) =>
  String(value || '')
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

const hasMobileLine = (lines: string[]) => lines.some((line) => /(mob|mobile|phone|contact|मोबाइल|फोन)/i.test(line));
const labelValueFromAddress = (lines: string[], labels: string[]) => {
  const match = lines.find((line) => labels.some((labelText) => new RegExp(`^\\s*${labelText}\\s*[-:]`, 'i').test(line)));
  return match?.replace(/^[^:-]+[:-]\s*/, '').trim() || '';
};

export default function CourierSlipPrint({ data, onClose }: { data: CourierSlipData; onClose: () => void }) {
  const { i18n } = useTranslation();
  const hi = i18n.language?.startsWith('hi');
  const label = (en: string, hindi: string) => hi ? hindi : en;
  const addressLines = splitAddressLines(data.courierAddress);
  const addressText = addressLines
    .filter((line) => !/^\s*(mob no|mobile no|mob|mobile|phone|contact)\s*[-:]/i.test(line))
    .join(', ');
  const recipientLines = [
    { label: 'Name', value: valueOrDash(data.patientName) },
    { label: 'Address', value: valueOrDash(addressText) },
    { label: 'Mob No', value: valueOrDash(labelValueFromAddress(addressLines, ['mob no', 'mobile no', 'mob', 'mobile', 'phone', 'contact']) || (!hasMobileLine(addressLines) ? data.patientMobileNo : '')) },
  ];

  return createPortal(
    <div className="courier-slip-overlay">
      <div className="courier-slip-document">
        <style>{`
          .courier-slip-overlay{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;padding:18px;background:#172b38cc;backdrop-filter:blur(4px)}
          .courier-slip-document{width:min(1040px,100%);max-height:94vh;overflow:auto;color:#172b38;font:13px/1.45 Arial,sans-serif}
          .courier-slip-actions{display:flex;justify-content:flex-end;gap:10px;margin:0 0 14px}
          .courier-slip-actions button{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer}
          .courier-slip-actions .print{background:#549e9e;color:#fff}.courier-slip-actions .close{background:#eef2f4;color:#536670}
          .courier-slip-paper{position:relative;width:min(980px,calc(100vw - 36px));min-height:570px;margin:0 auto;background:#fffdf8;border-radius:4px;padding:28px 52px 34px;box-shadow:0 24px 70px #0f172a45;overflow:hidden}
          .courier-slip-paper:before{content:"";position:absolute;inset:10px;border:1px solid #f1eee7;pointer-events:none}
          .courier-slip-title{text-align:center;margin:0;color:#1b2f49;font:800 31px/1.15 Arial,Helvetica,sans-serif;letter-spacing:.01em}
          .courier-slip-to-label{margin:24px 0 4px 48%;color:#1b2f49;font:800 23px/1.2 Arial,Helvetica,sans-serif}
          .courier-slip-address{width:48%;margin-left:48%;color:#1b2f49;font:700 21px/1.5 Arial,Helvetica,sans-serif;letter-spacing:0;overflow-wrap:anywhere}
          .courier-slip-address p{margin:0}
          .courier-slip-address-row{display:grid;grid-template-columns:104px minmax(0,1fr);gap:8px;align-items:start}
          .courier-slip-address-label{font-weight:800;color:#31445f}
          .courier-slip-address-label:after{content:" -"}
          .courier-slip-address-value{min-width:0}
          .courier-slip-address-row.plain{display:block}
          .courier-slip-from{position:absolute;left:52px;bottom:50px;width:390px;color:#1b2f49}
          .courier-slip-from-title{margin:0 0 6px;font:800 20px/1.1 Arial,Helvetica,sans-serif;letter-spacing:.08em}
          .courier-slip-stamp{border:2px solid #216f78;background:#dff1ee;padding:7px 9px;color:#185f67;box-shadow:inset 0 0 0 1px #9dcac6}
          .courier-slip-stamp-head{display:flex;align-items:flex-start;gap:7px;margin-bottom:3px}
          .courier-slip-stamp img{width:50px;height:auto;object-fit:contain;flex:0 0 auto}
          .courier-slip-doctor{margin-left:auto;font-weight:900;font-size:14px;line-height:1.12;text-align:right}
          .courier-slip-doctor small{display:block;font-size:11px}
          .courier-slip-clinic{margin:2px 0 4px!important;font-weight:900!important;font-size:18px!important;line-height:1.15!important;color:#216f78}
          .courier-slip-stamp p{margin:2px 0;font-weight:800;font-size:13px;line-height:1.25;overflow-wrap:anywhere}
          .courier-slip-stamp-note{border-top:1px solid #216f78;margin-top:5px!important;padding-top:4px;text-align:center;font-size:9px!important;line-height:1.25!important}
          .courier-slip-socials{display:grid;grid-template-columns:1fr;gap:3px;color:#185f67}
          .courier-slip-social-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:4px}
          .courier-slip-social-row.two{grid-template-columns:1fr 1fr}
          .courier-slip-social-item{display:inline-flex;align-items:center;justify-content:center;gap:2px;min-width:0;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .courier-slip-social-icon{width:11px;height:11px;stroke-width:3;flex:0 0 auto}
          .courier-slip-social-icon.facebook{color:#2563eb}.courier-slip-social-icon.instagram{color:#db2777}.courier-slip-social-icon.twitter{color:#0284c7}.courier-slip-social-icon.youtube{color:#dc2626}.courier-slip-social-icon.whatsapp{color:#16a34a}
          .courier-slip-tagline{display:block;margin-top:3px;font-weight:900;color:#216f78}
          @page courier-slip{size:A5 landscape;margin:8mm}
          @media print{
            body:has(.courier-slip-document)>*:not(.courier-slip-overlay){display:none!important}
            .courier-slip-overlay{position:static!important;display:block!important;padding:0!important;background:none!important;backdrop-filter:none!important}
            .courier-slip-document{page:courier-slip;width:auto!important;max-height:none!important;overflow:visible!important}
            .courier-slip-actions{display:none!important}
            .courier-slip-paper{width:auto!important;min-height:128mm!important;margin:0!important;padding:8mm 11mm!important;box-shadow:none!important;border-radius:0!important}
            .courier-slip-title{font-size:30px!important}
            .courier-slip-to-label{margin-top:16mm!important;margin-left:48%!important}
            .courier-slip-address{font-size:20px!important}
            .courier-slip-from{left:11mm!important;bottom:16mm!important;width:96mm!important}
          }
          @media(max-width:720px){
            .courier-slip-paper{min-height:620px;padding:24px 24px 30px}
            .courier-slip-to-label,.courier-slip-address{margin-left:34%;width:64%}
            .courier-slip-address{font-size:20px}
            .courier-slip-from{left:24px;width:min(390px,calc(100% - 48px))}
          }
        `}</style>
        <div className="courier-slip-actions no-print">
          <button type="button" className="print" onClick={() => window.print()}><Printer size={15} />{label('Print slip', 'पर्ची प्रिंट करें')}</button>
          <button type="button" className="close" onClick={onClose}><X size={15} />{label('Close', 'बंद करें')}</button>
        </div>
        <article className="courier-slip-paper" aria-label={label('Courier address slip', 'कूरियर पता पर्ची')}>
          <h1 className="courier-slip-title">Homeopathy Medicine</h1>
          <p className="courier-slip-to-label">To,</p>
          <div className="courier-slip-address">
            {recipientLines.map((line, index) => (
              <p key={`${line.label}-${line.value}-${index}`} className={`courier-slip-address-row ${line.label ? '' : 'plain'}`}>
                {line.label && <span className="courier-slip-address-label">{line.label}</span>}
                <span className="courier-slip-address-value">{line.value}</span>
              </p>
            ))}
          </div>
          <section className="courier-slip-from">
            <p className="courier-slip-from-title">FROM</p>
            <div className="courier-slip-stamp">
              <div className="courier-slip-stamp-head">
                <img src="/logo.png.png" alt="" />
                <div className="courier-slip-doctor">डॉ. उत्कर्ष त्रिवेदी<small>मोब.: 84620 30001</small></div>
              </div>
              <p className="courier-slip-clinic">डॉ. त्रिवेदी होम्योपैथिक क्लिनिक</p>
              <p>लिल्ली चौक, बरई मंदिर रोड, पुरानी बस्ती, रायपुर (छ.ग.) 492001 /</p>
              <p>सेक्टर 5, मंडी गेट के पास, देवेंद्र नगर, रायपुर (छ.ग.) 492001</p>
              <div className="courier-slip-stamp-note">
                <div className="courier-slip-socials">
                  <div className="courier-slip-social-row">
                    <span className="courier-slip-social-item"><Facebook className="courier-slip-social-icon facebook" />dr.trivedishomeopathy</span>
                    <span className="courier-slip-social-item"><Instagram className="courier-slip-social-icon instagram" />drtrivedishomeopathy</span>
                    <span className="courier-slip-social-item"><Twitter className="courier-slip-social-icon twitter" />drtrivedishomeo</span>
                  </div>
                  <div className="courier-slip-social-row two">
                    <span className="courier-slip-social-item"><Youtube className="courier-slip-social-icon youtube" />drtrivedishomeopathy</span>
                    <span className="courier-slip-social-item"><MessageCircle className="courier-slip-social-icon whatsapp" />+91 84620 30001</span>
                  </div>
                </div>
                <span className="courier-slip-tagline">Visit us online for clinic updates and homeopathy care.</span>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>,
    document.body,
  );
}
