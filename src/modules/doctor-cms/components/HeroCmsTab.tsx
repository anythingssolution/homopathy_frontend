import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  getDoctorHeroCms, 
  createDoctorHeroCms, 
  updateDoctorHeroCms, 
  deleteDoctorHeroCms 
} from '../api';
import { CmsHeroItem } from '../types';
import { Edit2, Trash2, Plus, X, Check, XCircle } from 'lucide-react';

export default function HeroCmsTab() {
  const { token } = useAuth();
  const [items, setItems] = useState<CmsHeroItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    cta_text: '',
    cta_link: '',
    image_url: '',
    sort_order: 0,
    is_active: 1
  });
  
  const [formError, setFormError] = useState('');

  const fetchItems = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await getDoctorHeroCms(token);
      if (res.success) {
        setItems(res.data);
      } else {
        setError(res.message || 'Failed to fetch items');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token]);

  const handleEdit = (item: CmsHeroItem) => {
    setForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      cta_text: item.cta_text || '',
      cta_link: item.cta_link || '',
      image_url: item.image_url,
      sort_order: item.sort_order,
      is_active: item.is_active
    });
    setEditingId(item.id);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleAddNew = () => {
    setForm({
      title: '',
      subtitle: '',
      cta_text: '',
      cta_link: '',
      image_url: '',
      sort_order: items.length + 1,
      is_active: 1
    });
    setEditingId(null);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleDelete = async (id: number) => {
    if (!token || !window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await deleteDoctorHeroCms(token, id);
      if (res.success) {
        fetchItems();
      } else {
        alert(res.message || 'Failed to delete');
      }
    } catch (err) {
      alert('An error occurred while deleting');
    }
  };

  const validateForm = () => {
    if (!form.image_url.trim()) {
      setFormError('Image URL is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !validateForm()) return;
    
    setFormError('');
    try {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order),
        is_active: form.is_active ? 1 : 0
      };

      const res = editingId 
        ? await updateDoctorHeroCms(token, editingId, payload)
        : await createDoctorHeroCms(token, payload);
        
      if (res.success) {
        setIsFormOpen(false);
        fetchItems();
      } else {
        setFormError(res.message || 'Failed to save');
      }
    } catch (err) {
      setFormError('An error occurred while saving');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Hero Slides</h2>
        {!isFormOpen && (
          <button 
            onClick={handleAddNew}
            className="bg-[#549E9E] hover:bg-[#438787] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Add Slide
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{editingId ? 'Edit Slide' : 'Add New Slide'}</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <XCircle size={16} /> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Subtitle</label>
                <input 
                  type="text" 
                  value={form.subtitle} 
                  onChange={e => setForm({...form, subtitle: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Image URL *</label>
                <input 
                  type="text" 
                  value={form.image_url} 
                  onChange={e => setForm({...form, image_url: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                  required
                />
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="mt-2 h-20 object-cover rounded border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">CTA Text</label>
                <input 
                  type="text" 
                  value={form.cta_text} 
                  onChange={e => setForm({...form, cta_text: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">CTA Link</label>
                <input 
                  type="text" 
                  value={form.cta_link} 
                  onChange={e => setForm({...form, cta_link: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Sort Order</label>
                <input 
                  type="number" 
                  value={form.sort_order} 
                  onChange={e => setForm({...form, sort_order: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                />
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={!!form.is_active} 
                    onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})}
                    className="w-4 h-4 text-[#549E9E] rounded border-gray-300 focus:ring-[#549E9E]"
                  />
                  <span className="text-sm font-bold text-gray-700">Is Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-gray-600 font-bold text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-white font-bold text-sm bg-[#549E9E] rounded-lg hover:bg-[#438787]"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Image</th>
                <th className="p-4">Title</th>
                <th className="p-4">Order</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No slides found.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <img src={item.image_url} alt="Slide" className="w-16 h-10 object-cover rounded border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x40?text=No+Image' }} />
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-800">{item.title || '-'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{item.subtitle}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{item.sort_order}</td>
                    <td className="p-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold">
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-400 hover:text-[#549E9E] hover:bg-[#549E9E]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
