import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  createDoctorTreatmentsCms,
  deleteDoctorTreatmentsCms,
  getDoctorTreatmentsCms,
  updateDoctorTreatmentsCms,
  uploadDoctorCmsImage,
} from '../api';
import { CmsTreatmentItem } from '../types';
import { slugifyTreatment } from '../../../data/treatmentsData';
import { Check, Edit2, ExternalLink, Plus, Search, Trash2, Upload, X, XCircle } from 'lucide-react';
import CmsSelect from './CmsSelect';

const CATEGORIES = ['Vital', 'Pain', 'Orthopedic', 'Respiratory', 'Skin', 'Mental', 'Neurological', 'Digestive', 'Pediatric', 'Immune', 'Chronic', 'Specialty'];

const emptyForm = {
  title_en: '',
  title_hi: '',
  category: 'Specialty',
  slug: '',
  seo_title: '',
  seo_description: '',
  description: '',
  image_url: '',
  image_key: '',
  remedies: '',
  sort_order: 0,
  is_active: 1,
};

export default function TreatmentsCmsTab() {
  const { token } = useAuth();
  const [items, setItems] = useState<CmsTreatmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchItems = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await getDoctorTreatmentsCms(token);
      if (res.success) setItems(res.data || []);
      else setError(res.message || 'Failed to fetch treatments');
    } catch {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token]);

  const publicUrl = `/treatments/${form.slug || 'your-seo-url'}`;

  const handleAddNew = () => {
    setForm({ ...emptyForm, sort_order: 0 });
    setSlugTouched(false);
    setEditingId(null);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleEdit = (item: CmsTreatmentItem) => {
    setForm({
      title_en: item.title_en,
      title_hi: item.title_hi || '',
      category: item.category || 'Specialty',
      slug: item.slug,
      seo_title: item.seo_title || '',
      seo_description: item.seo_description || '',
      description: item.description,
      image_url: item.image_url || '',
      image_key: item.image_key || '',
      remedies: (item.remedies || []).join(', '),
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setSlugTouched(true);
    setEditingId(item.id);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleTitleChange = (title_en: string) => {
    const next = { ...form, title_en };
    if (!slugTouched) next.slug = slugifyTreatment(title_en);
    if (!form.seo_title || form.seo_title.startsWith(form.title_en)) {
      next.seo_title = title_en ? `${title_en} Treatment in Raipur | Dr. Trivedi's Homeopathy` : '';
    }
    setForm(next);
  };

  const handlePhoto = async (file?: File) => {
    if (!token || !file) return;
    setUploading(true);
    setFormError('');
    try {
      const res = await uploadDoctorCmsImage(token, file, 'treatments');
      if (res.success && res.data?.cms_fields?.image_url) {
        setForm((current) => ({
          ...current,
          image_url: res.data.cms_fields.image_url,
          image_key: res.data.cms_fields.image_key || '',
        }));
      } else {
        setFormError(res.message || 'Photo upload failed');
      }
    } catch {
      setFormError('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.title_en.trim() || !form.description.trim() || !form.slug.trim()) {
      setFormError('Title, SEO URL, and description are required');
      return;
    }
    setFormError('');
    const payload = {
      title_en: form.title_en.trim(),
      title_hi: form.title_hi.trim() || null,
      category: form.category,
      slug: form.slug.trim(),
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      description: form.description.trim(),
      image_url: form.image_url || null,
      image_key: form.image_key || null,
      remedies: form.remedies.split(',').map((item) => item.trim()).filter(Boolean),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      const res = editingId
        ? await updateDoctorTreatmentsCms(token, editingId, payload)
        : await createDoctorTreatmentsCms(token, payload);
      if (res.success) {
        setIsFormOpen(false);
        fetchItems();
      } else {
        setFormError(res.message || 'Failed to save');
      }
    } catch {
      setFormError('An error occurred while saving');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !window.confirm('Delete this treatment page?')) return;
    const res = await deleteDoctorTreatmentsCms(token, id);
    if (res.success) fetchItems();
    else alert(res.message || 'Failed to delete');
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Treatments</h2>
          <p className="text-xs text-gray-500 font-medium max-w-xl">
            This list is the public Holistic Care / Specialized Treatments in Raipur section. Add, edit, hide, or replace photos here and they show on the website immediately.
          </p>
        </div>
        {!isFormOpen && (
          <button onClick={handleAddNew} className="bg-[#549E9E] hover:bg-[#438787] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> Add Treatment
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{editingId ? 'Edit Treatment' : 'Add Treatment'}</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <XCircle size={16} /> {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">English title *</label>
                <input value={form.title_en} onChange={(e) => handleTitleChange(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Hindi title</label>
                <input value={form.title_hi} onChange={(e) => setForm({ ...form, title_hi: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                <CmsSelect
                  value={form.category}
                  options={CATEGORIES.map((category) => ({ id: category, label: category }))}
                  onChange={(category) => setForm({ ...form, category })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">SEO URL slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: slugifyTreatment(e.target.value) });
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono"
                  placeholder="diabetes-treatment"
                  required
                />
                <p className="mt-1 text-[11px] text-[#549E9E] font-bold break-all">Public URL: {publicUrl}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">SEO title</label>
                <input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Diabetes Treatment in Raipur | Dr. Trivedi's Homeopathy" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">SEO description</label>
                <textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm min-h-[60px]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Page description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm min-h-[90px]" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Photo from computer</label>
                <label className="flex items-center gap-3 w-full border border-dashed border-gray-300 rounded-lg p-3 text-sm cursor-pointer hover:border-[#549E9E]">
                  <Upload size={16} className="text-[#549E9E]" />
                  <span>{uploading ? 'Uploading…' : 'Choose a photo'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                </label>
                {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 object-cover rounded border" />}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Remedies (comma separated)</label>
                <input value={form.remedies} onChange={(e) => setForm({ ...form, remedies: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Berberis Vulgaris, Lycopodium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Sort order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                <p className="mt-1 text-[11px] text-gray-400">0 appears first on Holistic Care and the Treatments page.</p>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="w-4 h-4" />
                  <span className="text-sm font-bold text-gray-700">Active on website</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-600 font-bold text-sm bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-white font-bold text-sm bg-[#549E9E] rounded-lg">Save treatment</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search treatments…"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Treatment</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">SEO URL</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No treatments yet. Add one to publish it on the public Treatments page.</td></tr>
                ) : items.filter((item) => {
                  const q = searchTerm.trim().toLowerCase();
                  if (!q) return true;
                  return [item.title_en, item.title_hi, item.category, item.slug].some((value) => String(value || '').toLowerCase().includes(q));
                }).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded border" /> : <div className="w-12 h-12 rounded bg-gray-100" />}
                        <div>
                          <div className="text-sm font-bold text-gray-800">{item.title_en}</div>
                          <div className="text-xs text-gray-400">{item.title_hi}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{item.category}</td>
                    <td className="p-4 font-mono text-xs text-[#549E9E]">{item.public_path || `/treatments/${item.slug}`}</td>
                    <td className="p-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold"><Check size={12} /> Active</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Inactive</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={item.public_path || `/treatments/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-gray-400 hover:text-[#549E9E] rounded-lg"
                          title="View on website"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-[#549E9E] rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
