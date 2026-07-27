import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

type SkippedRow = {
  row_number: number;
  product_name: string | null;
  reason: string;
};

type ImportResult = {
  inserted_medicines: number;
  inserted_products: number;
  total_skipped_rows: number;
  skipped_rows: SkippedRow[];
};

const columns = [
  'medicine_value',
  'source_type',
  'product_name',
  'product_type',
  'category',
  'packing',
  'size_or_weight',
  'mrp_rate',
  'price_min',
  'price_max',
  'shipper_size_pcs',
  'description',
  'formula_composition',
  'is_active',
];

export default function MedicalProductImport() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/v1/medical/master-medical-products/template', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Unable to download template');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'medical_products_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      addToast(error.message || 'Template download failed', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      addToast('Please select an Excel file first', 'error');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/v1/medical/master-medical-products/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Import failed');
      }

      setResult(payload.data);
      addToast('Medical products import completed', 'success');
    } catch (error: any) {
      addToast(error.message || 'Import failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="pb-12 space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
        <div>
          <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-1">Medical Master Import</p>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 uppercase tracking-tight">Product Excel Import</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
            Single sheet upload for medicines, syrups, drops, oils, creams and product prices
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          disabled={isDownloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#437f7f] hover:shadow-lg hover:shadow-teal-900/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
        >
          {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download Template
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#549E9E]/10 text-[#549E9E] rounded-xl flex items-center justify-center shrink-0">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Upload Filled Excel</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Duplicate product names will not be inserted and will be listed with reasons.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />

            <div className="border-2 border-dashed border-teal-100 rounded-2xl p-10 text-center bg-teal-50/5 hover:bg-teal-50/10 hover:border-[#549E9E]/30 transition-all duration-300">
              <FileSpreadsheet size={40} className="mx-auto text-[#549E9E]/50 mb-4" />
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest mb-1">
                {selectedFile ? selectedFile.name : 'Drag & drop or select file'}
              </p>
              {selectedFile && (
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-4">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3 bg-white border border-gray-200 hover:border-[#549E9E] hover:text-[#549E9E] rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:shadow-sm active:scale-[0.98] transition-all"
              >
                Choose Excel File
              </button>
            </div>
          </div>

          <button
            onClick={uploadFile}
            disabled={isUploading || !selectedFile}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-sm"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import Products
          </button>
        </section>

        <aside className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2">Single Sheet Columns</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Your Excel file must contain these exact column names:</p>
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <span key={column} className="px-3 py-2 bg-gray-50 border border-gray-100/50 rounded-xl text-[10px] font-black text-gray-550 uppercase tracking-widest hover:bg-[#549E9E]/5 hover:text-[#549E9E] hover:border-teal-100/30 transition-all cursor-default">
                {column}
              </span>
            ))}
          </div>
        </aside>
      </div>

      {result && (
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Import Result</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Current upload summary</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="px-5 py-3.5 bg-emerald-50 border border-emerald-100/50 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-black text-emerald-600 leading-tight">{result.inserted_products}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Inserted</p>
              </div>
              <div className="px-5 py-3.5 bg-blue-50 border border-blue-100/50 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-black text-blue-600 leading-tight">{result.inserted_medicines}</p>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Medicines</p>
              </div>
              <div className="px-5 py-3.5 bg-amber-50 border border-amber-100/50 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-black text-amber-600 leading-tight">{result.total_skipped_rows}</p>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">Skipped</p>
              </div>
            </div>
          </div>

          {result.skipped_rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-55/70 border-b border-gray-100">
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="px-6 py-4.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Row</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Name</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Skip Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-55">
                  {result.skipped_rows.map((row, index) => (
                    <tr key={`${row.row_number}-${index}`} className="hover:bg-amber-50/10 transition-colors duration-150">
                      <td className="px-6 py-4 text-xs font-black text-gray-700">{row.row_number}</td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">{row.product_name || '-'}</td>
                      <td className="px-6 py-4 text-xs font-bold text-amber-600 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-550 shrink-0" />
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 flex items-center gap-3 text-emerald-600 justify-center">
              <CheckCircle2 size={20} />
              <p className="text-xs font-black uppercase tracking-widest">No skipped rows in this import</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
