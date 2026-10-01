import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageSquareText, Pencil, Plus, RefreshCcw, Search, X, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Pagination from '../Pagination';

type RemarkType = 'universal' | 'medicine';

type RemarkRow = {
  id: number;
  remark_value: string;
  selection_value?: string | null;
  medicine_value?: string | null;
  variant_value?: string | null;
  is_active: boolean;
  updated_at?: string | null;
};

export default function DoctorRemarkMasterPage() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState<RemarkType>('universal');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<RemarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RemarkRow | null>(null);
  const [draft, setDraft] = useState('');
  const [draftActive, setDraftActive] = useState(true);
  const [draftMedicine, setDraftMedicine] = useState('');
  const [draftVariant, setDraftVariant] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const loadRemarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, page: String(page), page_size: '25' });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/v1/doctors/remark-master?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load remarks');
      setRows(result.data || []);
      setTotal(Number(result.meta?.total || 0));
      setTotalPages(Number(result.meta?.total_pages || 1));
      setActiveCount(Number(result.meta?.active || 0));
      setInactiveCount(Number(result.meta?.inactive || 0));
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to load remarks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, search, token, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRemarks(); }, search.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRemarks, search]);

  const startEdit = (row: RemarkRow) => {
    setEditing(row);
    setDraft(row.remark_value);
    setDraftActive(row.is_active);
    setDraftMedicine(row.medicine_value || '');
    setDraftVariant(row.variant_value || '');
  };

  const startAdd = () => {
    setEditing({ id: 0, remark_value: '', is_active: true });
    setDraft('');
    setDraftActive(true);
    setDraftMedicine('');
    setDraftVariant('');
  };

  const saveRemark = async () => {
    if (!editing || !draft.trim() || saving) return;
    setSaving(true);
    try {
      const isCreating = editing.id === 0;
      const response = await fetch(isCreating ? '/api/v1/doctors/remark-master' : `/api/v1/doctors/remark-master/${editing.id}`, {
        method: isCreating ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          remark_value: draft.trim(),
          is_active: draftActive,
          medicine_value: draftMedicine.trim(),
          variant_value: draftVariant.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to update remark');
      addToast(t(isCreating ? 'remark_master.created' : 'remark_master.updated', isCreating ? 'Remark created' : 'Remark updated'), 'success');
      setEditing(null);
      await loadRemarks();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update remark', 'error');
    } finally {
      setSaving(false);
    }
  };

  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB';
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-[#549E9E] p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">{t('remark_master.doctor_masters', 'Doctor Masters')}</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <MessageSquareText size={23} /> {t('remark_master.title', 'Remark Master')}
          </h2>
          <p className="mt-1 text-xs font-bold text-white/80">{t('remark_master.subtitle', 'Manage future consultation remark suggestions. Previous prescriptions stay unchanged.')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/doctor-portal')} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-white/25">
            <ArrowLeft size={14} /> {t('common.back', 'Back')}
          </button>
          <button type="button" onClick={() => void loadRemarks()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#549E9E] disabled:opacity-60">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {(['universal', 'medicine'] as RemarkType[]).map((tab) => (
              <button key={tab} type="button" onClick={() => { setType(tab); setPage(1); }} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${type === tab ? 'bg-white text-[#549E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'universal' ? t('remark_master.universal', 'Universal Remarks') : t('remark_master.medicine', 'Medicine-wise Remarks')}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{activeCount} {t('remark_master.active', 'Active')}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">{inactiveCount} {t('remark_master.inactive', 'Inactive')}</span>
            </div>
            <button type="button" onClick={startAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#549E9E] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">
              <Plus size={14} /> {t('remark_master.add', 'Add Remark')}
            </button>
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t('remark_master.search', 'Search remark, medicine or variant...')} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-xs font-bold outline-none focus:border-[#549E9E]" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && !rows.length ? (
          <div className="flex justify-center py-20"><RefreshCcw className="animate-spin text-[#549E9E]" size={30} /></div>
        ) : !rows.length ? (
          <div className="py-20 text-center">
            <MessageSquareText className="mx-auto text-gray-200" size={44} />
            <p className="mt-3 text-sm font-black uppercase tracking-widest text-gray-600">{t('remark_master.empty', 'No saved remarks found')}</p>
            <p className="mt-2 text-xs text-gray-400">{t('remark_master.empty_help', 'Remarks saved from the consultation form will appear here.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 transition-colors hover:bg-gray-50/60 ${row.is_active ? '' : 'bg-gray-50 opacity-70'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.is_active ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-gray-400" />}
                    <p className="text-sm font-bold text-gray-800">{row.remark_value}</p>
                  </div>
                  {type === 'medicine' && (
                    <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-[#549E9E]">
                      {row.medicine_value || row.selection_value || t('remark_master.unknown_medicine', 'Medicine not recorded')}
                      {row.variant_value ? ` · ${row.variant_value}` : ''}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    {t('remark_master.updated_on', 'Updated')} {row.updated_at ? new Date(row.updated_at).toLocaleString(locale) : '—'}
                  </p>
                </div>
                <button type="button" onClick={() => startEdit(row)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#549E9E]/20 bg-[#549E9E]/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E] hover:bg-[#549E9E] hover:text-white">
                  <Pencil size={13} /> {t('common.edit', 'Edit')}
                </button>
              </div>
            ))}
          </div>
        )}
        {total > 0 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={25} alwaysShow />}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="remark-master-edit-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="remark-master-edit-title" className="text-lg font-black text-gray-800">{editing.id === 0 ? t('remark_master.add_title', 'Add Remark') : t('remark_master.edit_title', 'Edit Saved Remark')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('remark_master.edit_help', 'This updates future suggestions only. Previous prescriptions will not change.')}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Close" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            {editing.id > 0 && editing.medicine_value && <p className="mt-4 rounded-xl bg-[#549E9E]/5 px-3 py-2 text-xs font-bold text-[#549E9E]">{editing.medicine_value}{editing.variant_value ? ` · ${editing.variant_value}` : ''}</p>}
            {editing.id === 0 && type === 'medicine' && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('remark_master.medicine_name', 'Medicine name')}<input value={draftMedicine} onChange={(event) => setDraftMedicine(event.target.value)} maxLength={255} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-[#549E9E]" /></label>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('remark_master.variant', 'Variant (optional)')}<input value={draftVariant} onChange={(event) => setDraftVariant(event.target.value)} maxLength={255} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm font-bold normal-case tracking-normal outline-none focus:border-[#549E9E]" /></label>
              </div>
            )}
            <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-gray-500">{t('remark_master.remark_text', 'Remark text')}</label>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={255} rows={4} className="mt-2 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm font-bold text-gray-800 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10" />
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs font-black text-gray-700">{t('remark_master.available_in_consult', 'Available in Consult Form')}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{t('remark_master.inactive_help', 'Turn off to hide this suggestion without deleting history.')}</p>
              </div>
              <button type="button" onClick={() => setDraftActive((value) => !value)} className={`relative h-7 w-12 rounded-full transition-colors ${draftActive ? 'bg-[#549E9E]' : 'bg-gray-300'}`} aria-pressed={draftActive}>
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${draftActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500">{t('common.cancel', 'Cancel')}</button>
              <button type="button" onClick={() => void saveRemark()} disabled={saving || !draft.trim() || (editing.id === 0 && type === 'medicine' && !draftMedicine.trim())} className="inline-flex items-center gap-2 rounded-xl bg-[#549E9E] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                {saving && <RefreshCcw size={13} className="animate-spin" />} {t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
