import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '../../Pagination';
import useListPagination from './useListPagination';
import { dailyBreakdown, moneyExact } from './lib';
import { parseIsoDate } from '../reports-next/lib';

export default function DayWisePanel({ bills, payments }: { bills: any[]; payments: any[] }) {
  const { t, i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  const label = (en: string, hindi: string) => hi ? hindi : en;
  const rows = useMemo(() => dailyBreakdown(bills, payments), [bills, payments]);
  const [view, setView] = useState<'collections' | 'billing'>('collections');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const visibleRows = selectedDate ? rows.filter(row => row.date === selectedDate) : rows;
  const pagination = useListPagination(visibleRows, `${view}:${selectedDate || ''}`);
  const formatDate = (date: string) => parseIsoDate(date)?.toLocaleDateString(hi ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || date;
  const changeView = (next: 'collections' | 'billing') => { setView(next); setSelectedDate(null); };
  const billingColumns = [
    ['consults', t('bills_next.col_consults')],
    ['consultation', t('bills_next.consult')],
    ['medicine', t('bills_next.medicine')],
    ['tests', t('bills_next.tests')],
    ['courier', t('bills_next.courier')],
    ['gross', label('Gross billed', 'कुल बिल')],
    ['discount', label('Discount', 'छूट')],
    ['billed', label('Net billed', 'छूट के बाद बिल')],
    ['paid', label('Paid on these bills', 'इन बिलों पर भुगतान')],
    ['pending', t('bills_next.pending')],
  ];
  const collectionColumns = [
    ['received', label('Total received', 'कुल प्राप्त')],
    ['cash', t('bills_next.cash')],
    ['online', t('bills_next.online')],
    ['recovered', label('Old dues recovered', 'पुरानी बकाया वसूली')],
  ];
  const total = (key: string) => visibleRows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const highlighted = (key: string) => ['received', 'gross', 'billed'].includes(key);
  const columnColor = (key: string) => ({
    consults: 'text-slate-700',
    consultation: 'text-slate-700',
    medicine: 'text-violet-600',
    tests: 'text-amber-700',
    courier: 'text-sky-600',
    gross: 'text-[#2d8789]',
    discount: 'text-amber-700',
    billed: 'text-[#2d8789]',
    paid: 'text-emerald-600',
    pending: 'text-amber-700',
    received: 'text-emerald-600',
    cash: 'text-emerald-600',
    online: 'text-blue-600',
    recovered: 'text-[#2d8789]',
  }[key] || 'text-slate-700');
  const table = (columns: string[][]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left whitespace-nowrap">
        <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <th className="px-4 py-3">{label('Date', 'दिनांक')}</th>
          {columns.map(([key, title]) => <th key={key} className={`px-4 py-3 text-right ${columnColor(key)}`}>{title}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-50">
          {pagination.rows.map(row => <tr key={row.date} className="hover:bg-slate-50/50">
            <td className="px-4 py-3 text-sm font-black text-slate-800">{view === 'collections' ? (
              <button type="button" onClick={() => { setSelectedDate(row.date); setView('billing'); }} aria-label={label(`View billing breakdown for ${formatDate(row.date)}`, `${formatDate(row.date)} का बिल विवरण देखें`)} className="inline-flex items-center gap-2 rounded-lg py-1 text-[#2d8789] hover:text-[#1c6668] hover:underline focus-visible:outline-2 focus-visible:outline-[#549E9E] cursor-pointer">
                {formatDate(row.date)}<ChevronRight size={14} />
              </button>
            ) : formatDate(row.date)}</td>
            {columns.map(([key]) => <td key={key} className={`px-4 py-3 text-right text-sm font-bold ${columnColor(key)} ${highlighted(key) ? 'font-black bg-[#549E9E]/5' : ''}`}>
              {key === 'consults' ? row[key] : moneyExact(row[key])}
            </td>)}
          </tr>)}
        </tbody>
        <tfoot><tr className="border-t border-gray-100 bg-[#549E9E]/5 text-sm font-black text-[#2d8789]">
          <td className="px-4 py-3">{selectedDate ? label('Selected day total', 'चुने दिन का कुल') : label('Selected range total', 'चुनी अवधि का कुल')}</td>
          {columns.map(([key]) => <td key={key} className={`px-4 py-4 text-right ${highlighted(key) ? 'bg-[#2d8789] text-white text-base border-t-2 border-[#236b6d]' : columnColor(key)}`}>{key === 'consults' ? total(key) : moneyExact(total(key))}</td>)}
        </tr></tfoot>
      </table>
    </div>
  );
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-gray-100 bg-white p-1" role="group" aria-label={label('Day-wise view', 'दिनवार सूची')}>
        {(['collections', 'billing'] as const).map(option => <button key={option} type="button" aria-pressed={view === option} onClick={() => changeView(option)} className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-black transition-colors ${view === option ? 'bg-[#549E9E] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-[#2d8789]'}`}>
          {option === 'collections' ? label('Day-wise collections', 'दिनवार प्राप्त भुगतान') : label('Day-wise billing breakdown', 'दिनवार बिल का विवरण')}
        </button>)}
      </div>
      {selectedDate && <button type="button" onClick={() => changeView('collections')} className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-xs font-black text-[#2d8789] hover:bg-slate-50 cursor-pointer"><ArrowLeft size={14} />{label('Back to collections', 'भुगतान सूची पर वापस')}</button>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {(view === 'collections' ? collectionColumns : billingColumns.filter(([key]) => ['gross', 'discount', 'billed', 'pending'].includes(key))).map(([key, title]) => <div key={key} className="rounded-xl border border-gray-100 bg-white px-3 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <p className="mt-1 text-base font-black text-slate-800">{moneyExact(total(key))}</p>
      </div>)}
    </div>
    {rows.length === 0 ? <p className="py-10 text-center text-sm font-semibold text-slate-400">{label('No bills or payments in this date range.', 'इस अवधि में कोई बिल या भुगतान नहीं है।')}</p> : <>
      {view === 'collections' ? <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-black text-slate-800">{label('Day-wise collections', 'दिनवार प्राप्त भुगतान')}</h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{label('Based on payment received date. Old dues recovered are included in total received, not added again.', 'भुगतान मिलने की तारीख के अनुसार। पुरानी बकाया वसूली कुल प्राप्त में शामिल है, अलग से जोड़नी नहीं है।')}</p>
          <p className="mt-1 text-[11px] font-bold text-[#2d8789]">{label('Click a date to view its billing breakdown.', 'किसी दिन का बिल विवरण देखने के लिए तारीख पर क्लिक करें।')}</p>
        </div>
        {table(collectionColumns)}
      </section> : <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-black text-slate-800">{label('Day-wise billing breakdown', 'दिनवार बिल का विवरण')}{selectedDate ? ` · ${formatDate(selectedDate)}` : ''}</h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{label('Based on visit date; direct/repeat medicine uses bill date. Category amounts are after discount. Paid/pending show the current balance on those bills.', 'विज़िट की तारीख के अनुसार; डायरेक्ट/रिपीट दवा में बिल की तारीख। श्रेणी की राशि छूट के बाद है। भुगतान/बकाया इन बिलों की वर्तमान स्थिति है।')}</p>
        </div>
        {table(billingColumns)}
      </section>}
      {!selectedDate && <Pagination {...pagination.controls} />}
    </>}
  </div>;
}
