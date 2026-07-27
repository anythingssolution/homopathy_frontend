import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CheckCircle2, Edit2, Loader2, Plus, RefreshCcw, Search, Trash2, X, Boxes, GlassWater, Droplet, Droplets, Pill, Layers, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Pagination from '../Pagination';
import { motion, AnimatePresence } from 'motion/react';

type ProductRow = {
  id: number;
  medicine_value: string;
  source_type: string;
  product_name: string;
  product_type: string | null;
  category: string | null;
  packing: string | null;
  size_or_weight: string | null;
  mrp_rate: string | number | null;
  price_min: string | number | null;
  price_max: string | number | null;
  shipper_size_pcs: number | null;
  description: string | null;
  formula_composition: string | null;
  is_active: number;
};

type FormState = {
  id?: number;
  medicine_value: string;
  source_type: string;
  product_name: string;
  product_type: string;
  category: string;
  packing: string;
  size_or_weight: string;
  mrp_rate: string;
  price_min: string;
  price_max: string;
  shipper_size_pcs: string;
  description: string;
  formula_composition: string;
  is_active: string;
};

type SummaryCounts = {
  total: number;
  syrup: number;
  oil: number;
  drop: number;
  tab: number;
  other: number;
};

const emptyForm: FormState = {
  medicine_value: '',
  source_type: 'REGULAR_PRODUCT',
  product_name: '',
  product_type: '',
  category: '',
  packing: '',
  size_or_weight: '',
  mrp_rate: '',
  price_min: '',
  price_max: '',
  shipper_size_pcs: '',
  description: '',
  formula_composition: '',
  is_active: '1',
};

const sourceOptions = [
  { id: '', label: 'All Sources' },
  { id: 'REGULAR_PRODUCT', label: 'Regular Product' },
  { id: 'RADIENT_PHARMA', label: 'Radient Pharma' },
  { id: 'MEDICAL_PRODUCT_PRICE', label: 'Medical Product Price' },
];

const statusOptions = [
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All' },
  { id: 'inactive', label: 'Inactive' },
];

const compactPrice = (row: ProductRow) => {
  if (row.mrp_rate) return `Rs ${row.mrp_rate}`;
  if (row.price_min || row.price_max) return `Rs ${row.price_min || row.price_max} - ${row.price_max || row.price_min}`;
  return '-';
};

type SelectOption = {
  id: string;
  label: string;
};

function CustomSelect({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50/50 hover:bg-white hover:border-gray-200 border rounded-xl py-3 px-4 text-xs font-bold text-gray-700 flex items-center justify-between transition-all outline-none text-left select-none cursor-pointer ${
          isOpen ? 'border-[#549E9E] bg-white ring-2 ring-[#549E9E]/10' : 'border-gray-100'
        }`}
      >
        <span className="truncate">{selected?.label || 'Select option'}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 text-gray-400 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[#549E9E]' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-lenis-prevent
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl z-[110] max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-light"
          >
            {options.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-lg px-3.5 py-2.5 transition-all flex items-center justify-between text-xs font-bold ${
                    isSelected
                      ? 'bg-[#549E9E]/10 text-[#549E9E]'
                      : 'text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} className="text-[#549E9E] shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MedicalProductMaster() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deletingProductRow, setDeletingProductRow] = useState<ProductRow | null>(null);
  const [summary, setSummary] = useState<SummaryCounts>({
    total: 0,
    syrup: 0,
    oil: 0,
    drop: 0,
    tab: 0,
    other: 0,
  });

  const pageSize = 10;
  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const fetchProducts = async (overrideSearch?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        status,
      });
      const currentSearch = overrideSearch !== undefined ? overrideSearch : search;
      if (currentSearch.trim()) params.set('search', currentSearch.trim());
      if (sourceType) params.set('source_type', sourceType);

      const response = await fetch(`/api/v1/medical/master-medical-products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to fetch products');
      }

      setRows(payload.data || []);
      setTotalPages(payload.pagination?.total_pages || 1);
    } catch (error: any) {
      addToast(error.message || 'Unable to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/v1/medical/master-medical-products/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to fetch summary');
      }

      setSummary(payload.data);
    } catch (error: any) {
      addToast(error.message || 'Unable to fetch summary', 'error');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, sourceType, status]);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (showForm || deletingProductRow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, deletingProductRow]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const startEdit = (row: ProductRow) => {
    setForm({
      id: row.id,
      medicine_value: row.medicine_value || '',
      source_type: row.source_type || 'REGULAR_PRODUCT',
      product_name: row.product_name || '',
      product_type: row.product_type || '',
      category: row.category || '',
      packing: row.packing || '',
      size_or_weight: row.size_or_weight || '',
      mrp_rate: row.mrp_rate ? String(row.mrp_rate) : '',
      price_min: row.price_min ? String(row.price_min) : '',
      price_max: row.price_max ? String(row.price_max) : '',
      shipper_size_pcs: row.shipper_size_pcs ? String(row.shipper_size_pcs) : '',
      description: row.description || '',
      formula_composition: row.formula_composition || '',
      is_active: String(row.is_active ?? 1),
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/medical/master-medical-products${isEditing ? `/${form.id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to save product');
      }

      addToast(isEditing ? 'Product updated successfully' : 'Product created successfully', 'success');
      resetForm();
      fetchProducts();
      fetchSummary();
    } catch (error: any) {
      addToast(error.message || 'Unable to save product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (row: ProductRow) => {
    setDeletingProductRow(row);
  };

  const confirmDeleteProduct = async (row: ProductRow) => {
    try {
      const response = await fetch(`/api/v1/medical/master-medical-products/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to delete product');
      }

      addToast('Product deleted successfully', 'success');
      fetchProducts();
      fetchSummary();
    } catch (error: any) {
      addToast(error.message || 'Unable to delete product', 'error');
    }
  };

  const cardData = [
    { label: 'Total', value: summary.total, icon: Boxes, color: 'text-sky-600 bg-sky-50 border-sky-100/50' },
    { label: 'Syrup', value: summary.syrup, icon: GlassWater, color: 'text-teal-600 bg-teal-50 border-teal-100/50' },
    { label: 'Oil', value: summary.oil, icon: Droplet, color: 'text-amber-600 bg-amber-50 border-amber-100/50' },
    { label: 'Drop', value: summary.drop, icon: Droplets, color: 'text-indigo-600 bg-indigo-50 border-indigo-100/50' },
    { label: 'Tab', value: summary.tab, icon: Pill, color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50' },
    { label: 'Other', value: summary.other, icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100/50' },
  ];

  return (
    <div className="pb-12 space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
        <div>
          <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-1">Medical Product Master</p>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 uppercase tracking-tight">All Medicine Products</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Create, update and manage single source medical product master</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowForm(true); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#437f7f] hover:shadow-lg hover:shadow-teal-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cardData.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.label} 
              onClick={() => {
                const newSearch = card.label === 'Total' ? '' : card.label;
                setSearch(newSearch);
                setPage(1);
                fetchProducts(newSearch);
              }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[120px] group relative overflow-hidden cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#549E9E] transition-colors">{card.label}</span>
                <div className={`p-2.5 rounded-xl border ${card.color.split(' ').slice(1).join(' ')} transition-all duration-300 group-hover:scale-110`}>
                  <Icon size={16} className={card.color.split(' ')[0]} />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 mt-4 tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_220px_160px_auto] gap-4 items-end">
        <div className="relative w-full">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Search Products</label>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); fetchProducts(); } }}
              placeholder="Search medicine, product, category..."
              className="w-full bg-gray-50/50 border border-gray-100 hover:border-gray-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-gray-700 outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all"
            />
          </div>
        </div>

        <CustomSelect
          label="Source Type"
          options={sourceOptions}
          value={sourceType}
          onChange={(val) => { setPage(1); setSourceType(val); }}
          className="w-full"
        />

        <CustomSelect
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(val) => { setPage(1); setStatus(val); }}
          className="w-full"
        />

        <button onClick={() => { setPage(1); fetchProducts(); }} className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm">
          <RefreshCcw size={14} />
          Search
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <div data-lenis-prevent className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-5xl bg-white border border-gray-150 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">{isEditing ? 'Edit Product' : 'Create Product'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Provide medicine fields below. Fields with * are required.</p>
                </div>
                <button onClick={resetForm} className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto overscroll-contain space-y-6 max-h-[60vh] scrollbar-light">
                <div>
                  <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-3 pb-1 border-b border-teal-50">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Medicine Value *</label>
                      <input value={form.medicine_value} onChange={(e) => updateForm('medicine_value', e.target.value)} placeholder="e.g. ACONITE" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                    </div>
                    <CustomSelect
                      label="Source Type *"
                      options={sourceOptions.filter((option) => option.id)}
                      value={form.source_type}
                      onChange={(val) => updateForm('source_type', val)}
                      className="w-full"
                    />
                    <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Product Name *</label>
                    <input value={form.product_name} onChange={(e) => updateForm('product_name', e.target.value)} placeholder="e.g. ACONITE 30C" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Product Type</label>
                    <input value={form.product_type} onChange={(e) => updateForm('product_type', e.target.value)} placeholder="e.g. DILUTION" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Category</label>
                    <input value={form.category} onChange={(e) => updateForm('category', e.target.value)} placeholder="e.g. HOMEOPATHY" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Packing</label>
                    <input value={form.packing} onChange={(e) => updateForm('packing', e.target.value)} placeholder="e.g. BOTTLE" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Size / Weight</label>
                    <input value={form.size_or_weight} onChange={(e) => updateForm('size_or_weight', e.target.value)} placeholder="e.g. 30ml" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                  </div>
                  <CustomSelect
                    label="Status"
                    options={[
                      { id: '1', label: 'Active' },
                      { id: '0', label: 'Inactive' },
                    ]}
                    value={form.is_active}
                    onChange={(val) => updateForm('is_active', val)}
                    className="w-full"
                  />
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-3 pb-1 border-b border-teal-50">Pricing & Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">MRP Rate (₹)</label>
                      <input value={form.mrp_rate} onChange={(e) => updateForm('mrp_rate', e.target.value)} placeholder="0.00" type="number" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Price Min (₹)</label>
                      <input value={form.price_min} onChange={(e) => updateForm('price_min', e.target.value)} placeholder="0.00" type="number" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Price Max (₹)</label>
                      <input value={form.price_max} onChange={(e) => updateForm('price_max', e.target.value)} placeholder="0.00" type="number" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Shipper Size (PCS)</label>
                      <input value={form.shipper_size_pcs} onChange={(e) => updateForm('shipper_size_pcs', e.target.value)} placeholder="e.g. 10" type="number" className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-3 pb-1 border-b border-teal-50">Details & Composition</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Description</label>
                      <textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Add product details or indications..." rows={3} className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider pl-1">Formula Composition</label>
                      <textarea value={form.formula_composition} onChange={(e) => updateForm('formula_composition', e.target.value)} placeholder="Add ingredients or formula details..." rows={3} className="bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all text-gray-700 resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <button onClick={resetForm} className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-55 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={saveProduct} disabled={isSaving} className="inline-flex items-center gap-2 px-5 py-3 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-60 hover:bg-[#437f7f] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Save Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingProductRow && (
          <div data-lenis-prevent className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingProductRow(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            {/* Confirmation Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white border border-gray-100 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center flex flex-col items-center gap-4 z-[130]"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-555 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Delete Product?</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 leading-relaxed">
                  Are you sure you want to delete <span className="text-gray-800 font-black">{deletingProductRow.product_name}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={() => setDeletingProductRow(null)}
                  className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const row = deletingProductRow;
                    setDeletingProductRow(null);
                    await confirmDeleteProduct(row);
                  }}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-red-500/10"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product List */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex items-center justify-center text-[#549E9E]">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Product', 'Medicine', 'Source', 'Variant', 'Price', 'Status', 'Action'].map((head) => (
                    <th key={head} className="px-6 py-4.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/40 transition-colors duration-150">
                    <td className="px-6 py-4 text-xs font-black text-gray-800">{row.product_name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{row.medicine_value}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-[9px] font-black text-[#549E9E] bg-[#549E9E]/5 uppercase tracking-widest border border-teal-100/30">
                        {row.source_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{row.packing || row.size_or_weight || row.product_type || row.category || '-'}</td>
                    <td className="px-6 py-4 text-xs font-black text-gray-700">{compactPrice(row)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${row.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(row)} className="w-8.5 h-8.5 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center hover:bg-blue-50 hover:shadow-sm transition-all duration-200">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteProduct(row)} className="w-8.5 h-8.5 rounded-xl bg-red-50/50 text-red-500 flex items-center justify-center hover:bg-red-50 hover:shadow-sm transition-all duration-200">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="max-w-xs mx-auto flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center">
                          <Boxes size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No products found</p>
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-0.5">Try searching or change your filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
