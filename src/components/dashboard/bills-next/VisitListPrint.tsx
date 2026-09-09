import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { billCategory, moneyExact, type VisitRow } from './lib';

export default function VisitListPrint({ rows, branch, from, to, category, search, onClose }: {
  rows: VisitRow[]; branch: string; from: string; to: string; category: string; search: string; onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    window.addEventListener('afterprint', onClose);
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      window.removeEventListener('afterprint', onClose);
    };
  }, [onClose]);
  const date = (value?: string) => value ? new Date(value.includes('T') ? value : `${value}T00:00:00`).toLocaleDateString(i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB') : '—';
  const sum = (key: keyof VisitRow) => moneyExact(rows.reduce((total, row) => total + Number(row[key] || 0), 0));
  return createPortal(<div className="print-only visit-list-print">
    <style>{`
      @media print {
        @page { size: A4 landscape; margin: 12mm; }
        .visit-list-print { font: 10px/1.4 Arial, sans-serif; color: #17202a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .visit-list-print h1 { font-size: 20px; margin: 0 0 6px; }
        .visit-list-print p { margin: 4px 0; }
        .visit-list-print table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 14px; }
        .visit-list-print th, .visit-list-print td { border: 1px solid #d4d9df; padding: 8px 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        .visit-list-print th { background: #edf1f4; border-bottom: 2px solid #74808b; vertical-align: middle; font-size: 9px; line-height: 1.35; }
        .visit-list-print thead { display: table-header-group; }
        .visit-list-print tr { break-inside: avoid; }
        .visit-list-print .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .visit-list-print td.amount { white-space: nowrap; font-size: 9px; overflow-wrap: normal; }
        .visit-list-print th.amount { white-space: normal; overflow-wrap: normal; }
        .visit-list-print .token { text-align: center; overflow-wrap: normal; }
        .visit-list-print .badge { display: inline-block; border: 1px solid; border-radius: 3px; padding: 2px 3px; font-size: 8px; font-weight: bold; line-height: 1.3; margin-bottom: 3px; }
        .visit-list-print .pos-badge { background: #fde047; border-color: #eab308; color: #333; }
        .visit-list-print .repeat-badge { background: #f3e8ff; border-color: #c4b5fd; color: #5b21b6; }
        .visit-list-print .direct-badge { background: #e0f2fe; border-color: #7dd3fc; color: #075985; }
        .visit-list-print .token-badge { background: #fee2e2; border-color: #fca5a5; color: #7f1d1d; }
        .visit-list-print tbody tr:nth-child(even) { background: #f8fafb; }
        .visit-list-print td:nth-child(9), .visit-list-print th:nth-child(9) { border-left: 2px solid #74808b; }
        .visit-list-print small { display: block; color: #555; margin-top: 3px; }
        .visit-list-print .totals td { font-weight: bold; border-top: 2px solid #333; background: #edf1f4; padding-top: 10px; padding-bottom: 10px; }
      }
    `}</style>
    <h1>{t('bills_next.tab_visits')} · {branch}</h1>
    <p>{date(from)} – {date(to)} · {category} · {t('bills_next.print_count', { count: rows.length })}</p>
    {search.trim() && <p>{t('bills_next.print_search')}: {search}</p>}
    <table>
      <colgroup>
        {[3, 5, 15, 17, 6.5, 8, 6, 6, 8.5, 8.5, 8, 8.5].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
      </colgroup>
      <thead><tr>
        <th className="token">{t('bills_next.print_serial', 'S.No.')}</th>
        <th className="token">{t('bills_next.extra.pos_token')}</th><th>{t('bills_next.col_patient')}</th>
        <th>{t('bills_next.invoice.description')}</th><th className="amount">{t('bills_next.consult')}</th>
        <th className="amount">{t('bills_next.medicine')}</th><th className="amount">{t('bills_next.tests')}</th>
        <th className="amount">{t('bills_next.courier')}</th><th className="amount">{t('bills_next.invoice.total')}</th>
        <th className="amount">{t('bills_next.collected')}</th><th className="amount">{t('bills_next.old_dues')}</th>
        <th className="amount">{t('bills_next.pending')}</th>
      </tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.group_key}>
        <td className="token">{index + 1}</td>
        <td className="token">
          {row.previous_payment && <span className="badge direct-badge">{t('bills_next.extra.previous_pending')}</span>}
          {row.queue_position != null && <span className="badge pos-badge">Pos #{row.queue_position}</span>}
          {row.appointment_id && (row.display_token_display || row.token_number) && !['-', '—', '–'].includes(String(row.display_token_display || row.token_number).trim()) && <div><span className="badge token-badge">{row.display_token_display || row.token_number}</span></div>}
          {Array.from(new Set(row.bills.map((bill) => billCategory({ ...bill, delivery_mode: null }))))
            .filter((kind) => kind === 'repeat' || kind === 'medical_only')
            .map((kind) => <span key={kind} className={`badge ${kind === 'repeat' ? 'repeat-badge' : 'direct-badge'}`}>
              {t(kind === 'repeat' ? 'bills_next.extra.repeat' : 'bills_next.extra.direct_medicine')}
            </span>)}
        </td>
        <td><strong>{row.patient_full_name}</strong><small>{row.patient_mobile_no}</small><small>{date(row.appointment_date)}</small></td>
        <td>{row.previous_payment ? <>{t('bills_next.extra.previous_pending')}<small>{row.previous_payment.bill_number} · {row.previous_payment.payment_mode}</small><small>{t('bills_next.pending')}: {moneyExact(row.previous_payment.pending_after)}</small></> : row.treatment_name}<small>{Array.from(new Set(row.bills.map((bill) => billCategory({ ...bill, delivery_mode: null })))).map((kind) => t(`bills_next.extra.${kind}`)).join(' · ')}</small><small>{row.bills.map((bill) => bill.bill_number).filter(Boolean).join(', ')}</small></td>
        <td className="amount">{moneyExact(row.consult_total)}</td><td className="amount">{moneyExact(row.medicine_total)}</td>
        <td className="amount">{moneyExact(row.test_total)}</td><td className="amount">{moneyExact(row.courier_total)}</td>
        <td className="amount">{moneyExact(row.grand_total)}</td><td className="amount">{moneyExact(row.grand_paid)}</td>
        <td className="amount">{moneyExact(row.paid_towards_previous_pending)}</td>
        <td className="amount">{row.grand_pending > 0 && moneyExact(row.grand_pending)}{!row.previous_payment && <small>{row.overall_payment_status === 'PARTIAL' ? t('bills_next.pending', 'Pending') : row.overall_payment_status}</small>}</td>
      </tr>)}
      <tr className="totals"><td colSpan={4}>{t('bills_next.invoice.total')}</td>
        {(['consult_total', 'medicine_total', 'test_total', 'courier_total', 'grand_total', 'grand_paid', 'paid_towards_previous_pending', 'grand_pending'] as const).map((key) => <td key={key} className="amount">{sum(key)}</td>)}
      </tr></tbody>
    </table>
  </div>, document.body);
}
