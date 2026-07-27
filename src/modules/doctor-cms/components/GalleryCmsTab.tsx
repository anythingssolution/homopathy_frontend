import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  getDoctorGalleryCms, 
  createDoctorGalleryCms, 
  updateDoctorGalleryCms, 
  deleteDoctorGalleryCms 
} from '../api';
import { CmsGalleryItem } from '../types';
import { Edit2, Trash2, Plus, X, Check, XCircle, Image as ImageIcon, Video, Eye } from 'lucide-react';
import Pagination from '../../../components/Pagination';

const CATEGORIES = ['TREATMENT', 'MEDIA', 'AWARDS', 'VIDEO'];
const FILTER_TABS = ['ALL', ...CATEGORIES];
const ITEMS_PER_PAGE = 10;

const getYoutubeVideoId = (url?: string | null) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const shortsId = parsed.pathname.match(/^\/shorts\/([^/?#]+)/)?.[1];
      if (shortsId) return shortsId;
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }
  } catch (_) {
    return null;
  }
  return null;
};

export default function GalleryCmsTab() {
  const { token } = useAuth();
  const [items, setItems] = useState<CmsGalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewItem, setPreviewItem] = useState<CmsGalleryItem | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    category: 'TREATMENT',
    media_type: 'IMAGE' as 'IMAGE' | 'VIDEO',
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    display_date: '',
    sort_order: 0,
    is_active: 1
  });
  
  const [formError, setFormError] = useState('');

  const fetchItems = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await getDoctorGalleryCms(token);
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

  const handleEdit = (item: CmsGalleryItem) => {
    setForm({
      category: item.category,
      media_type: item.media_type,
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || '',
      video_url: item.video_url || '',
      display_date: item.display_date || '',
      sort_order: item.sort_order,
      is_active: item.is_active
    });
    setEditingId(item.id);
    setIsFormOpen(true);
    setFormError('');
  };

  const handleAddNew = () => {
    setForm({
      category: 'TREATMENT',
      media_type: 'IMAGE',
      title: '',
      description: '',
      image_url: '',
      video_url: '',
      display_date: new Date().toISOString().split('T')[0],
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
      const res = await deleteDoctorGalleryCms(token, id);
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
    if (!form.title.trim()) {
      setFormError('Title is required');
      return false;
    }
    if (form.media_type === 'IMAGE' && !form.image_url.trim()) {
      setFormError('Image URL is required for IMAGE media type');
      return false;
    }
    if (form.media_type === 'VIDEO' && !form.video_url.trim()) {
      setFormError('Video URL is required for VIDEO media type');
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
        category: form.category,
        media_type: form.media_type,
        title: form.title,
        description: form.description || null,
        image_url: form.media_type === 'IMAGE' ? form.image_url : null,
        video_url: form.media_type === 'VIDEO' ? form.video_url : null,
        display_date: form.display_date || null,
        sort_order: Number(form.sort_order),
        is_active: form.is_active ? 1 : 0
      };

      const res = editingId 
        ? await updateDoctorGalleryCms(token, editingId, payload)
        : await createDoctorGalleryCms(token, payload);
        
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

  const getFilterCount = (filter: string) => (
    filter === 'ALL' ? items.length : items.filter(item => item.category === filter).length
  );

  const filteredItems = activeFilter === 'ALL'
    ? items
    : items.filter(item => item.category === activeFilter);
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const getPreviewImage = (item: CmsGalleryItem) => (
    item.poster_url || item.thumb_url || item.image_url || ''
  );

  const previewVideoId = previewItem?.media_type === 'VIDEO'
    ? previewItem.video_key || getYoutubeVideoId(previewItem.video_url)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Gallery</h2>
        {!isFormOpen && (
          <button 
            onClick={handleAddNew}
            className="bg-[#549E9E] hover:bg-[#438787] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Add Media
          </button>
        )}
      </div>

      {!isFormOpen && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-2">
          {FILTER_TABS.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === filter
                  ? 'bg-[#549E9E] text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:bg-[#549E9E]/10 hover:text-[#549E9E]'
              }`}
            >
              {filter}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                activeFilter === filter ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {getFilterCount(filter)}
              </span>
            </button>
          ))}
        </div>
      )}

      {isFormOpen ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{editingId ? 'Edit Media' : 'Add New Media'}</h3>
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
                <label className="block text-xs font-bold text-gray-600 mb-1">Category *</label>
                <select 
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Media Type *</label>
                <select 
                  value={form.media_type} 
                  onChange={e => setForm({...form, media_type: e.target.value as 'IMAGE' | 'VIDEO'})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Title *</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                  required
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E] min-h-[60px]"
                />
              </div>

              {form.media_type === 'IMAGE' ? (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Image URL *</label>
                  <input 
                    type="text" 
                    value={form.image_url} 
                    onChange={e => setForm({...form, image_url: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                    required={form.media_type === 'IMAGE'}
                  />
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="mt-2 h-20 object-cover rounded border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Video URL (e.g. YouTube URL) *</label>
                  <input 
                    type="text" 
                    value={form.video_url} 
                    onChange={e => setForm({...form, video_url: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-[#549E9E] focus:ring-1 focus:ring-[#549E9E]"
                    required={form.media_type === 'VIDEO'}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Display Date</label>
                <input 
                  type="date" 
                  value={form.display_date} 
                  onChange={e => setForm({...form, display_date: e.target.value})}
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
                <th className="p-4">Media</th>
                <th className="p-4">Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No media found.</td>
                </tr>
              ) : (
                paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      {item.media_type === 'IMAGE' ? (
                        <img src={getPreviewImage(item)} alt="Media" className="w-16 h-12 object-cover rounded border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x48?text=No+Img' }} />
                      ) : (
                        <div className="relative w-16 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden">
                          {getPreviewImage(item) ? (
                            <img src={getPreviewImage(item)} alt="Video poster" className="w-full h-full object-cover" />
                          ) : (
                            <Video size={20} />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        {item.media_type === 'IMAGE' ? <ImageIcon size={14} className="text-blue-500"/> : <Video size={14} className="text-red-500" />}
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </td>
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
                          onClick={() => setPreviewItem(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
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
          {filteredItems.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {previewItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-gray-500 shadow-lg hover:text-red-500"
            >
              <X size={20} />
            </button>
            <div className="mb-3">
              <h3 className="text-sm font-black text-gray-800">{previewItem.title}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {previewItem.category} • {previewItem.media_type}
              </p>
            </div>
            {previewItem.media_type === 'VIDEO' ? (
              previewVideoId ? (
                <div className="mx-auto aspect-[9/16] max-h-[75vh] max-w-sm overflow-hidden rounded-xl bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1&playsinline=1`}
                    className="h-full w-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={previewItem.video_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-60 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white"
                >
                  Open Video
                </a>
              )
            ) : (
              <img
                src={getPreviewImage(previewItem)}
                alt={previewItem.title}
                className="max-h-[75vh] w-full rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
