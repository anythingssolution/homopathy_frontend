import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getDoctorTestimonialCms,
  createDoctorTestimonialCms,
  updateDoctorTestimonialCms,
  deleteDoctorTestimonialCms,
  normalizeTestimonial,
  uploadDoctorCmsImage,
} from '../api';
import { CmsTestimonialItem } from '../types';
import CustomDatePicker from '../../../components/CustomDatePicker';
import { resolvePublicImage } from '../../../utils/publicImages';
import { Edit2, Trash2, Plus, X, Check, XCircle, Search, Upload } from 'lucide-react';

export default function TestimonialsCmsTab() {
  const { token } = useAuth();
  const [items, setItems] = useState<CmsTestimonialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    person_name: '',
    person_title: '',
    testimonial_text: '',
    image_url: '',
    image_key: '',
    tagsText: '',
    display_date: '',
    sort_order: 0,
    is_active: 1,
  });
  const [formError, setFormError] = useState('');

  const fetchItems = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await getDoctorTestimonialCms(token);
      if (res.success) {
        setItems((res.data || []).map(normalizeTestimonial));
      } else {
        setError(res.message || 'Failed to fetch items');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token]);

  const handleEdit = (item: CmsTestimonialItem) => {
    setForm({
      person_name: item.person_name,
      person_title: item.person_title || '',
      testimonial_text: item.testimonial_text,
      image_url: item.image_url || '',
      image_key: item.image_key || '',
      tagsText: item.tags?.join(', ') || '',
      display_date: item.display_date ? String(item.display_date).slice(0, 10) : '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleAddNew = () => {
    setForm({
      person_name: '',
      person_title: '',
      testimonial_text: '',
      image_url: '',
      image_key: '',
      tagsText: '',
      display_date: new Date().toISOString().split('T')[0],
      sort_order: 0,
      is_active: 1,
    });
    setEditingId(null);
    setIsFormOpen(true);
    setFormError('');
  };

  const handlePhoto = async (file?: File) => {
    if (!token || !file) return;
    setUploading(true);
    setFormError('');
    try {
      const res = await uploadDoctorCmsImage(token, file, 'testimonials');
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

  const handleDelete = async (id: number) => {
    if (!token || !window.confirm('Delete this testimonial from the website?')) return;
    const res = await deleteDoctorTestimonialCms(token, id);
    if (res.success) fetchItems();
    else alert(res.message || 'Failed to delete');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.person_name.trim() || !form.testimonial_text.trim()) {
      setFormError('Patient name and testimonial text are required');
      return;
    }
    setFormError('');
    const payload = {
      person_name: form.person_name.trim(),
      person_title: form.person_title.trim() || null,
      testimonial_text: form.testimonial_text.trim(),
      image_url: form.image_url || null,
      image_key: form.image_key || null,
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
      display_date: form.display_date || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      const res = editingId
        ? await updateDoctorTestimonialCms(token, editingId, payload)
        : await createDoctorTestimonialCms(token, payload);
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const visibleItems = items.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [item.person_name, item.person_title, item.testimonial_text, ...(item.tags || [])]
      .some((value) => String(value || '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Testimonials</h2>
          <p className="text-xs text-gray-500 font-medium max-w-xl">
            This list is the public homepage Testimonials section. Add, edit, hide, or replace photos here and they show on the website immediately.
          </p>
        </div>
        {!isFormOpen && (
          <button onClick={handleAddNew} className="bg-[#549E9E] hover:bg-[#438787] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> Add Testimonial
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{editingId ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
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
                <label className="block text-xs font-bold text-gray-600 mb-1">Patient name *</label>
                <input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Title / condition</label>
                <input value={form.person_title} onChange={(e) => setForm({ ...form, person_title: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]" placeholder="e.g. Hair Fall Case" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Testimonial text *</label>
                <textarea value={form.testimonial_text} onChange={(e) => setForm({ ...form, testimonial_text: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E] min-h-[100px]" required />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Photo from computer</label>
                <label className="flex items-center gap-3 w-full border border-dashed border-gray-300 rounded-lg p-3 text-sm cursor-pointer hover:border-[#549E9E]">
                  <Upload size={16} className="text-[#549E9E]" />
                  <span>{uploading ? 'Uploading…' : 'Choose a photo from your folder'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                </label>
                {form.image_url && <img src={resolvePublicImage(form.image_url)} alt="" className="mt-2 h-24 object-cover rounded border border-gray-200" />}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tags (comma separated)</label>
                <input value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} placeholder="e.g. Skin, Hair, Recovery" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Display date</label>
                <CustomDatePicker
                  label=""
                  value={form.display_date}
                  onChange={(date) => setForm({ ...form, display_date: date === 'all' ? '' : date })}
                  placeholder="Pick a date"
                  allowClear
                  className="!w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Sort order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]" />
                <p className="mt-1 text-[11px] text-gray-400">0 appears first on the homepage.</p>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="w-4 h-4 text-[#549E9E] rounded border-gray-300 focus:ring-[#549E9E]" />
                  <span className="text-sm font-bold text-gray-700">Active on website</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-600 font-bold text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 text-white font-bold text-sm bg-[#549E9E] rounded-lg hover:bg-[#438787]">Save testimonial</button>
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
              placeholder="Search testimonials…"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Patient</th>
                  <th className="p-4">Testimonial</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No testimonials yet. Add one to publish it on the homepage.</td></tr>
                ) : visibleItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={resolvePublicImage(item.image_url)} alt="" className="w-12 h-12 object-cover rounded border" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100" />
                        )}
                        <div>
                          <div className="text-sm font-bold text-gray-800">{item.person_name}</div>
                          <div className="text-xs text-gray-400">{item.person_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600 truncate max-w-xs">{item.testimonial_text}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{item.display_date ? String(item.display_date).slice(0, 10) : ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-[#549E9E]/10 text-[#549E9E] rounded text-[10px] font-bold">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold"><Check size={12} /> Active</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">Inactive</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
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
