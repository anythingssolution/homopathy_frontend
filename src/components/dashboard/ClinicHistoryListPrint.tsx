import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export default function ClinicHistoryListPrint({ rows, filters, onClose }: {
  rows: any[]; filters: string; onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    window.addEventListener('afterprint', onClose);
    let next = 0;
    const frame = requestAnimationFrame(() => { next = requestAnimationFrame(() => window.print()); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(next); window.removeEventListener('afterprint', onClose); };
  }, [onClose]);
  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const date = (value: any) => value ? new Date(value).toLocaleString(locale) : '';
  const money = (value: any) => Number(value || 0).toLocaleString(locale, { style: 'currency', currency: 'INR' });
  return createPortal(<div className="print-only clinic-history-print">
    <style>{`@media print {
      @page { size: A4 landscape; margin: 12mm; }
      .clinic-history-print { font: 10px/1.4 Arial,sans-serif; color: #17202a; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .clinic-history-print h1 { font-size: 20px; margin-bottom: 8px; }
      .clinic-history-print table { width:100%; table-layout:fixed; border-collapse:collapse; margin-top:14px; }
      .clinic-history-print th,.clinic-history-print td { border:1px solid #ccd2d8; padding:7px; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
      .clinic-history-print th { background:#edf1f4; font-size:9px; }
      .clinic-history-print thead { display:table-header-group; }
      .clinic-history-print tr { break-inside:avoid; }
      .clinic-history-print small { display:block; margin-top:4px; color:#555; }
      .clinic-history-print .badge { display:inline-block; border:1px solid #ccc; border-radius:3px; padding:2px 4px; font-size:9px; font-weight:bold; }
      .clinic-history-print .pos { background:#fde047; }
      .clinic-history-print .payment { background:#eff6ff; }
      .clinic-history-print .repeat { background:#f5f3ff; }
    }`}</style>
    <h1>{t('clinic_history.title', 'Clinic History')}</h1>
    <p>{filters} · {rows.length} {t('clinic_history.print_records', 'records')}</p>
    <table><colgroup>{[4,12,15,18,14,27,10].map((width,i)=><col key={i} style={{width:`${width}%`}} />)}</colgroup>
      <thead><tr>
        <th>{t('bills_next.print_serial','S.No.')}</th><th>{t('bills_next.extra.pos_token','POS / Token')}</th>
        <th>{t('clinic_history.print_date','Date / time')}</th><th>{t('bills_next.col_patient','Patient')}</th>
        <th>{t('clinic_history.print_branch','Branch')}</th><th>{t('bills_next.invoice.description','Description')}</th>
        <th>{t('clinic_history.filters.status','Status')}</th>
      </tr></thead>
      <tbody>{rows.map((item,index)=>{
        const payment = item.record_type === 'PENDING_PAYMENT' ? item.payment : null;
        const repeat = ['REPEAT_MEDICINE', 'DIRECT_MEDICINE'].includes(item.record_type) ? item.bill : null;
        const a = item.appointment || {};
        const record = payment || repeat || a;
        return <tr key={`${item.record_type || 'appointment'}-${record.payment_id || record.bill_id || a.appointment_id}`} className={payment ? 'payment' : repeat ? 'repeat' : ''}>
          <td>{index+1}</td>
          <td>{payment ? <span className="badge">{t('clinic_history.pending_payment')}</span> : repeat ? <span className="badge">{t(repeat.is_direct_medicine ? 'clinic_history.direct_medicine' : 'clinic_history.repeat_medicine')}</span> : <>
            {a.history_queue_position != null && <span className="badge pos">Pos #{a.history_queue_position}</span>}
            <small>{a.display_token_display || a.token_number || ''}</small>
          </>}</td>
          <td>{payment || repeat ? date(payment?.collected_at || repeat?.created_at) : a.appointment_date ? new Date(a.appointment_date).toLocaleDateString(locale) : ''}</td>
          <td><strong>{record.patient_full_name}</strong><small>{record.patient_mobile_no}</small></td>
          <td>{record.branch_name}</td>
          <td>{payment ? <>
            {t('bills_next.collected')}: <strong>{money(payment.amount)}</strong> · {payment.payment_mode}
            <small>{t('clinic_history.original_bill')}: {payment.bill_number} · {new Date(payment.original_bill_date).toLocaleDateString(locale)}</small>
            {payment.pending_after != null && <small>{t('clinic_history.bill_balance')}: {money(payment.pending_after)}</small>}
          </> : repeat ? <>
            {repeat.bill_number} · {t('bills_next.invoice.total')}: {money(repeat.total_amount)}
            <small>{t('bills_next.collected')}: {money(repeat.paid_amount)} · {t('bills_next.pending')}: {money(repeat.pending_amount)}</small>
          </> : <>{a.treatment_name}<small>{a.auid} · {a.slot_name}</small></>}</td>
          <td>{payment ? t('clinic_history.print_received','Received') : repeat ? (repeat.payment_status === 'PARTIAL' ? t('bills_next.pending') : repeat.payment_status) : t(`clinic_history.filters.${String(a.status).toLowerCase()}`,a.status)}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>,document.body);
}
