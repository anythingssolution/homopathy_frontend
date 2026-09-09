import React, { useEffect, useState } from 'react';
import { Plus, Edit2, RefreshCcw, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Pagination from '../Pagination';

type TestRow = { id?: number; test_name: string; sample_call: string | null; amount: string | number; test_type: string; is_active: number };
const blank: TestRow = { test_name: '', sample_call: '', amount: '', test_type: '', is_active: 1 };

export default function TestMaster() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const [rows, setRows] = useState<TestRow[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TestRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ search, active, page: String(page) });
        const response = await fetch(`/api/v1/doctors/test-master?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load tests');
        setRows(result.data); setTotal(result.meta.total); setPages(result.meta.total_pages); setTypes(result.meta.types);
        if (page > result.meta.total_pages) setPage(result.meta.total_pages);
      } catch (err: any) {
        if (!controller.signal.aborted) setError(err.message || 'Unable to load tests');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [token, search, active, page, refresh]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/doctors/test-master${form.id ? `/${form.id}` : ''}`, {
        method: form.id ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save test');
      addToast('Test saved successfully', 'success'); setForm(null); setRefresh(value => value + 1);
    } catch (err: any) { addToast(err.message || 'Unable to save test', 'error'); }
    finally { setSaving(false); }
  };

  return <section className="space-y-4">
    <div className="border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-gray-800">Test Master</h2><p className="text-xs text-gray-500">Manage consultation tests, sample details and prices.</p></div>
        <button onClick={() => setForm({ ...blank })} className="flex items-center gap-2 rounded-lg bg-[#549E9E] px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Add Test</button>
      </div>
      <div className="flex flex-wrap gap-3">
        <input aria-label="Search tests" placeholder="Search test, category or sample..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="min-w-0 flex-1 border border-gray-200 rounded-lg p-2 text-sm" />
        <select aria-label="Test status" value={active} onChange={e => { setActive(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg p-2 text-sm"><option value="all">All Statuses</option><option value="1">Active</option><option value="0">Inactive</option></select>
        <button onClick={() => setRefresh(value => value + 1)} aria-label="Refresh tests" className="p-2 text-[#549E9E]"><RefreshCcw size={18} /></button>
      </div>
    </div>
    {error ? <p role="alert" className="p-4 text-red-600 bg-red-50">{error}</p> : <div className="overflow-x-auto border border-gray-200 bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{['#', 'Test', 'Category', 'Sample', 'Price', 'Status', 'Action'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center">Loading tests...</td></tr> : rows.length ? rows.map((row, index) => <tr key={row.id} className="border-t border-gray-100">
          <td className="p-3">{(page - 1) * 20 + index + 1}</td><td className="p-3 font-bold">{row.test_name}</td><td className="p-3">{row.test_type}</td><td className="p-3">{row.sample_call || ''}</td><td className="p-3 whitespace-nowrap">₹ {Number(row.amount || 0).toFixed(2)}</td>
          <td className="p-3"><span className={`rounded px-2 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{row.is_active ? 'Active' : 'Inactive'}</span></td>
          <td className="p-3"><button onClick={() => setForm({ ...row, amount: row.amount ?? '' })} className="flex gap-1 items-center text-[#549E9E] font-bold"><Edit2 size={14} /> Edit</button></td>
        </tr>) : <tr><td colSpan={7} className="p-8 text-center text-gray-500">No tests found</td></tr>}</tbody>
      </table><Pagination currentPage={page} totalPages={pages} onPageChange={setPage} totalItems={total} pageSize={20} alwaysShow />
    </div>}
    {form && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="test-master-title" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 space-y-4">
        <div className="flex justify-between items-center"><h3 id="test-master-title" className="font-black text-lg">{form.id ? 'Edit Test' : 'Add Test'}</h3><button type="button" disabled={saving} onClick={() => setForm(null)} aria-label="Close test form"><X size={20} /></button></div>
        <label className="block text-sm font-bold">Test Name<input autoFocus required maxLength={255} value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm font-bold">Category<input required list="test-categories" maxLength={150} value={form.test_type} onChange={e => setForm({ ...form, test_type: e.target.value })} className="mt-1 w-full rounded border p-2" /><datalist id="test-categories">{types.map(type => <option key={type} value={type} />)}</datalist></label>
        <label className="block text-sm font-bold">Sample<input maxLength={100} value={form.sample_call || ''} onChange={e => setForm({ ...form, sample_call: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm font-bold">Price (₹)<input required type="number" min="0" max="99999999.99" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm font-bold">Status<select value={form.is_active} onChange={e => setForm({ ...form, is_active: Number(e.target.value) })} className="mt-1 w-full rounded border p-2"><option value={1}>Active</option><option value={0}>Inactive</option></select></label>
        <p className="text-xs text-gray-500">Inactive tests are hidden from new consultation selections. Existing prescriptions and bills keep their saved details.</p>
        <button disabled={saving} className="w-full rounded-lg bg-[#549E9E] p-3 text-white font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Test'}</button>
      </form>
    </div>}
  </section>;
}
