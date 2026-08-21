import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, CheckCircle2, ChevronDown, IndianRupee, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatConsultationMedicineText } from '../../utils/prescriptionFormat';

const money = (value: number | string | null | undefined) => Number(value || 0).toFixed(2);

type Patient = {
  patient_id: number;
  uuid?: string;
  clinic_patient_no?: string;
  full_name: string;
  mobile_no: string;
  age?: number;
  gender?: string;
};

type PrescriptionMedicine = {
  consultation_medication_id: number;
  medicine_value: string;
  medicine_type?: string;
  remark?: string;
  last_amount?: number | string;
};

type LastPrescription = {
  patient: Patient;
  prescription: {
    consultation_id: number;
    doctor_name: string;
    appointment_date: string;
    prescription_date: string;
    treatment_name?: string;
    branch_name?: string;
    medications: PrescriptionMedicine[];
  };
};

type AdditionalMedicine = {
  name: string;
  medicine_value: string;
  selectedVariant?: { label: string; price: string | number } | null;
  quantity?: number | string;
  amount: string;
  reason: string;
};

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  allowCustom,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  allowCustom?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const showCustomOption = allowCustom
    && searchTerm.trim()
    && !options.some((opt) => opt.label.toLowerCase() === searchTerm.trim().toLowerCase());
  if (showCustomOption) {
    filteredOptions.push({ label: `Use "${searchTerm.trim()}"`, value: searchTerm.trim() });
  }

  const selectedOption = options.find((opt) => opt.value === value) || options.find((opt) => opt.label === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-9 px-3 bg-white border flex items-center justify-between text-xs font-bold text-gray-800 transition-all outline-none ${
          disabled
            ? 'bg-gray-100 opacity-80 cursor-not-allowed border-gray-200'
            : isOpen
              ? 'border-[#549E9E] ring-2 ring-[#549E9E]/10 cursor-pointer'
              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
        }`}
      >
        <span className={`truncate ${!displayValue ? 'text-gray-400 font-normal' : ''}`}>{displayValue || placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#549E9E]' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-[150] overflow-hidden max-h-56 flex flex-col"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 px-2.5 bg-white border border-gray-200 text-xs font-bold text-gray-800 outline-none focus:border-[#549E9E]"
              />
            </div>
            <div className="overflow-y-auto max-h-44 p-1 space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => (
                  <div
                    key={`${opt.value}-${idx}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`px-3 py-2 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${
                      value === opt.value ? 'bg-[#549E9E] text-white' : 'text-gray-700 hover:bg-[#549E9E]/10 hover:text-[#549E9E]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && <Check size={12} />}
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-xs font-bold text-gray-400 text-center">No matches found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RepeatMedicine() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [lastPrescription, setLastPrescription] = useState<LastPrescription | null>(null);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<Record<number, boolean>>({});
  const [medicineAmounts, setMedicineAmounts] = useState<Record<number, string>>({});
  const [additionalMedicines, setAdditionalMedicines] = useState<AdditionalMedicine[]>([]);
  const [textMedicines, setTextMedicines] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [remark, setRemark] = useState('');
  const [isCourierDelivery, setIsCourierDelivery] = useState(false);
  const [courierAddress, setCourierAddress] = useState('');
  const [courierCharge, setCourierCharge] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [deliveryRemark, setDeliveryRemark] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalAmount = useMemo(() => {
    const prescribedTotal = Object.entries(selectedMedicineIds).reduce((sum, [id, checked]) => {
      if (!checked) return sum;
      return sum + (Number(medicineAmounts[Number(id)] || 0) || 0);
    }, 0);
    const additionalTotal = additionalMedicines.reduce((sum, item) => sum + (Number(item.amount || 0) || 0), 0);
    const deliveryTotal = isCourierDelivery ? (Number(courierCharge || 0) || 0) : 0;
    return Number((prescribedTotal + additionalTotal + deliveryTotal).toFixed(2));
  }, [additionalMedicines, courierCharge, isCourierDelivery, medicineAmounts, selectedMedicineIds]);

  useEffect(() => {
    const fetchTextMedicines = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/v1/medical/masters/text-medicines', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && Array.isArray(result.data?.text_medicines)) {
          setTextMedicines(result.data.text_medicines);
        }
      } catch (error) {
        console.error('Failed to fetch text medicines for repeat medicine:', error);
      }
    };

    void fetchTextMedicines();
  }, [token]);

  const searchPatients = async (options: { silent?: boolean } = {}) => {
    if (!token || search.trim().length < 2) {
      setPatients([]);
      if (!options.silent) {
        addToast('Search at least 2 characters', 'warning');
      }
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/medical/repeat-medicine/patients?search=${encodeURIComponent(search.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Patient search failed');
      setPatients(result.data || []);
    } catch (error: any) {
      addToast(error.message || 'Patient search failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setPatients([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchPatients({ silent: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, token]);

  const loadLastPrescription = async (patient: Patient) => {
    if (!token) return;
    setSelectedPatient(patient);
    setLastPrescription(null);
    setSelectedMedicineIds({});
    setMedicineAmounts({});
    setAdditionalMedicines([]);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/medical/repeat-medicine/patients/${patient.patient_id}/last-prescription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Last prescription not found');

      const data = result.data as LastPrescription;
      const nextSelected: Record<number, boolean> = {};
      const nextAmounts: Record<number, string> = {};
      (data.prescription?.medications || []).forEach((med) => {
        nextSelected[med.consultation_medication_id] = true;
        nextAmounts[med.consultation_medication_id] = med.last_amount && Number(med.last_amount) > 0
          ? String(med.last_amount)
          : '';
      });
      setLastPrescription(data);
      setSelectedMedicineIds(nextSelected);
      setMedicineAmounts(nextAmounts);
    } catch (error: any) {
      addToast(error.message || 'Last prescription not found', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addAdditionalMedicine = () => {
    setAdditionalMedicines((items) => [...items, { name: '', medicine_value: '', selectedVariant: null, quantity: 1, amount: '', reason: '' }]);
  };

  const updateAdditionalMedicine = (index: number, patch: Partial<AdditionalMedicine>) => {
    setAdditionalMedicines((items) => items.map((item, idx) => idx === index ? { ...item, ...patch } : item));
  };

  const getVariantOptions = (medicineName: string) => {
    const medicine = textMedicines.find((item) => item.medicine_value === medicineName);
    if (!medicine) return [];

    return medicine.medical_products?.length
      ? medicine.medical_products
        .map((product: any) => ({
          label: product.packing || product.size_or_weight || product.net_weight_or_size || product.product_name || 'N/A',
          price: product.mrp_rate || product.price_max || product.price_min || '0',
        }))
        .filter((variant: any) => variant.label !== 'N/A')
      : [
        ...(medicine.products || []).map((product: any) => ({ label: product.packing || 'N/A', price: product.mrp_rate || '0' })),
        ...(medicine.radient_pharma_products || []).map((product: any) => ({ label: product.net_weight_or_size || 'N/A', price: product.mrp_rate || '0' })),
        ...(medicine.handwritten_product_prices || []).map((product: any) => ({ label: product.product_name || product.category || 'N/A', price: product.price_max || '0' })),
      ].filter((variant: any) => variant.label !== 'N/A');
  };

  const updateAdditionalMedicineField = (
    index: number,
    field: 'name' | 'selectedVariant' | 'quantity' | 'amount' | 'reason',
    value: any
  ) => {
    setAdditionalMedicines((items) => {
      const updated = [...items];
      const current = { ...updated[index] };

      if (field === 'name') {
        current.name = value;
        const variants = getVariantOptions(value);
        const defaultVariant = variants.length === 1 ? variants[0] : null;
        current.selectedVariant = defaultVariant;
        const qtyNum = Math.max(1, parseInt(String(current.quantity || 1), 10) || 1);
        const unitPrice = defaultVariant?.price ? Number(defaultVariant.price) : 0;
        if (unitPrice) current.amount = (unitPrice * qtyNum).toFixed(2);
      } else if (field === 'selectedVariant') {
        current.selectedVariant = value;
        const qtyNum = Math.max(1, parseInt(String(current.quantity || 1), 10) || 1);
        const unitPrice = value?.price ? Number(value.price) : 0;
        if (unitPrice) current.amount = (unitPrice * qtyNum).toFixed(2);
      } else if (field === 'quantity') {
        current.quantity = value;
        const qtyNum = Math.max(1, parseInt(String(value), 10) || 1);
        const unitPrice = current.selectedVariant?.price ? Number(current.selectedVariant.price) : 0;
        if (unitPrice) current.amount = (unitPrice * qtyNum).toFixed(2);
      } else if (field === 'amount') {
        current.amount = value;
      } else if (field === 'reason') {
        current.reason = value;
      }

      current.medicine_value = formatConsultationMedicineText(
        current.name || current.medicine_value,
        current.selectedVariant?.label,
        current.quantity
      );

      updated[index] = current;
      return updated;
    });
  };

  const removeAdditionalMedicine = (index: number) => {
    setAdditionalMedicines((items) => items.filter((_, idx) => idx !== index));
  };

  const createRepeatBill = async () => {
    if (!token || !selectedPatient || !lastPrescription) return;
    const medicines = (lastPrescription.prescription.medications || [])
      .filter((med) => selectedMedicineIds[med.consultation_medication_id])
      .map((med) => ({
        consultation_medication_id: med.consultation_medication_id,
        amount: Number(medicineAmounts[med.consultation_medication_id] || 0),
      }))
      .filter((med) => med.amount > 0);
    const additional = additionalMedicines
      .map((item) => ({
        medicine_value: item.medicine_value.trim(),
        amount: Number(item.amount || 0),
        reason: item.reason.trim(),
      }))
      .filter((item) => item.medicine_value || item.amount || item.reason);

    if (medicines.length === 0 && additional.length === 0) {
      addToast('Select medicine or add medical medicine', 'warning');
      return;
    }

    if (additional.some((item) => !item.medicine_value || item.amount <= 0 || !item.reason)) {
      addToast('Medical Added medicine me name, amount aur reason mandatory hai', 'warning');
      return;
    }

    if (totalAmount <= 0) {
      addToast('Total amount greater than 0 hona chahiye', 'warning');
      return;
    }

    if (isCourierDelivery && !courierAddress.trim()) {
      addToast('Courier address mandatory hai', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/medical/repeat-medicine/bills', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          source_consultation_id: lastPrescription.prescription.consultation_id,
          medicines,
          additional_medications: additional,
          remark: remark.trim() || null,
          delivery: {
            delivery_mode: isCourierDelivery ? 'COURIER' : 'HAND_DELIVERY',
            received_by: null,
            courier_address: isCourierDelivery ? courierAddress.trim() : null,
            courier_charge: isCourierDelivery ? Number(courierCharge || 0) : 0,
            tracking_no: isCourierDelivery ? (trackingNo.trim() || null) : null,
            delivery_remark: isCourierDelivery ? (deliveryRemark.trim() || null) : null,
          },
          payment: {
            payment_mode: paymentMode,
            amount: totalAmount,
            transaction_reference: transactionReference.trim() || null,
            remark: remark.trim() || 'Repeat Medicine',
          },
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Repeat bill failed');
      addToast(`Repeat Medicine bill created: ${result.data?.bill_number || ''}`, 'success');
      setLastPrescription(null);
      setSelectedPatient(null);
      setPatients([]);
      setSearch('');
      setAdditionalMedicines([]);
      setRemark('');
      setTransactionReference('');
      setIsCourierDelivery(false);
      setCourierAddress('');
      setCourierCharge('');
      setTrackingNo('');
      setDeliveryRemark('');
    } catch (error: any) {
      addToast(error.message || 'Repeat bill failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Repeat Medicine</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Last prescription based medicine repeat
            </p>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void searchPatients(); }}
                placeholder="Search by mobile, patient id or name"
                className="w-full bg-gray-50 border border-gray-100 py-3 pl-11 pr-4 text-xs font-bold outline-none focus:border-[#549E9E]"
              />
            </div>
            <button
              onClick={() => searchPatients()}
              disabled={isLoading}
              className="px-5 py-3 bg-[#549E9E] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2"
            >
              <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              Search
            </button>
          </div>
        </div>

        {patients.length > 0 && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {patients.map((patient) => (
              <button
                key={patient.patient_id}
                onClick={() => loadLastPrescription(patient)}
                className={`text-left border p-4 transition-all ${selectedPatient?.patient_id === patient.patient_id ? 'border-[#549E9E] bg-[#549E9E]/5' : 'border-gray-100 hover:border-[#549E9E]/40'}`}
              >
                <div className="text-sm font-black text-gray-800">{patient.full_name}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {patient.clinic_patient_no || patient.uuid} • {patient.mobile_no}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lastPrescription && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white border border-gray-200 p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                  {lastPrescription.patient.full_name}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Last prescription: {lastPrescription.prescription.appointment_date} • {lastPrescription.prescription.doctor_name}
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                Doctor Prescription
              </span>
            </div>

            <div className="space-y-3">
              {(lastPrescription.prescription.medications || []).map((med) => {
                const checked = Boolean(selectedMedicineIds[med.consultation_medication_id]);
                return (
                  <div key={med.consultation_medication_id} className="grid grid-cols-[auto_1fr_140px] gap-4 items-center border border-gray-100 p-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSelectedMedicineIds((state) => ({ ...state, [med.consultation_medication_id]: e.target.checked }))}
                      className="w-5 h-5 accent-[#549E9E]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate">{med.medicine_value}</p>
                      {med.remark && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{med.remark}</p>}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={medicineAmounts[med.consultation_medication_id] || ''}
                      disabled={!checked}
                      onChange={(e) => setMedicineAmounts((state) => ({ ...state, [med.consultation_medication_id]: e.target.value }))}
                      placeholder="Amount"
                      className="bg-gray-50 border border-gray-100 px-3 py-2 text-xs font-bold outline-none focus:border-[#549E9E] disabled:opacity-40"
                    />
                  </div>
                );
              })}
            </div>

            <div className="border border-amber-100 bg-amber-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest">Medical Added</h4>
                  <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mt-1">Reason mandatory</p>
                </div>
                <button onClick={addAdditionalMedicine} className="px-3 py-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Plus size={14} /> Add
                </button>
              </div>

              {additionalMedicines.map((item, index) => {
                const variantOptions = getVariantOptions(item.name);
                const medicineOptions = textMedicines.map((medicine) => ({
                  label: medicine.medicine_value,
                  value: medicine.medicine_value,
                }));

                return (
                  <div key={index} className="grid grid-cols-1 xl:grid-cols-[minmax(160px,1.1fr)_minmax(120px,0.9fr)_70px_105px_minmax(150px,1fr)_36px] gap-2.5 items-center">
                    <SearchableDropdown
                      allowCustom
                      options={medicineOptions}
                      value={item.name || item.medicine_value}
                      onChange={(value) => updateAdditionalMedicineField(index, 'name', value)}
                      placeholder="Medicine name"
                    />
                    <SearchableDropdown
                      disabled={variantOptions.length === 0}
                      options={variantOptions.map((variant: any) => ({ label: variant.label, value: variant.label }))}
                      value={item.selectedVariant?.label || ''}
                      onChange={(value) => {
                        const variant = variantOptions.find((option: any) => option.label === value);
                        updateAdditionalMedicineField(index, 'selectedVariant', variant || null);
                      }}
                      placeholder={variantOptions.length > 0 ? 'Variant' : 'No variants'}
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity ?? 1}
                      onChange={(e) => updateAdditionalMedicineField(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="bg-white border border-amber-100 px-3 py-2 text-xs font-bold outline-none text-center"
                    />
                    <div className="relative">
                      <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateAdditionalMedicineField(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="w-full bg-white border border-amber-100 pl-7 pr-3 py-2 text-xs font-bold outline-none text-right"
                      />
                    </div>
                    <input
                      value={item.reason}
                      onChange={(e) => updateAdditionalMedicineField(index, 'reason', e.target.value)}
                      placeholder="Reason"
                      className="bg-white border border-amber-100 px-3 py-2 text-xs font-bold outline-none"
                    />
                    <button onClick={() => removeAdditionalMedicine(index)} className="h-9 bg-white border border-amber-100 text-amber-700 flex items-center justify-center">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6 shadow-sm h-max space-y-5">
            <div className="flex items-center gap-3 text-[#549E9E]">
              <CheckCircle2 size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Repeat Bill</h3>
            </div>
            <div className="bg-[#549E9E]/5 border border-[#549E9E]/10 p-5">
              <p className="text-[10px] font-black text-[#549E9E]/70 uppercase tracking-widest">Total Amount</p>
              <p className="text-3xl font-black text-[#549E9E] mt-1">₹ {money(totalAmount)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'ONLINE'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-3 text-[10px] font-black uppercase tracking-widest border ${paymentMode === mode ? 'bg-[#549E9E] text-white border-[#549E9E]' : 'bg-white text-gray-500 border-gray-100'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {paymentMode === 'ONLINE' && (
              <input
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="Transaction reference"
                className="w-full bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-bold outline-none"
              />
            )}

            <div className="border border-gray-100 bg-gray-50/60 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-3 border px-4 py-3 cursor-pointer ${!isCourierDelivery ? 'bg-[#549E9E]/10 border-[#549E9E]/20 text-[#549E9E]' : 'bg-white border-gray-100 text-gray-500'}`}>
                  <input
                    type="checkbox"
                    checked={!isCourierDelivery}
                    onChange={() => setIsCourierDelivery(false)}
                    className="w-4 h-4 accent-[#549E9E]"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hand Delivery</span>
                </label>
                <label className={`flex items-center gap-3 border px-4 py-3 cursor-pointer ${isCourierDelivery ? 'bg-[#549E9E]/10 border-[#549E9E]/20 text-[#549E9E]' : 'bg-white border-gray-100 text-gray-500'}`}>
                  <input
                    type="checkbox"
                    checked={isCourierDelivery}
                    onChange={() => setIsCourierDelivery(true)}
                    className="w-4 h-4 accent-[#549E9E]"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">Courier Delivery</span>
                </label>
              </div>

              {isCourierDelivery && (
                <div className="space-y-3">
                  <textarea
                    value={courierAddress}
                    onChange={(e) => setCourierAddress(e.target.value)}
                    placeholder="Courier address"
                    className="w-full bg-white border border-gray-100 px-4 py-3 text-xs font-bold outline-none min-h-[80px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={courierCharge}
                      onChange={(e) => setCourierCharge(e.target.value)}
                      placeholder="Courier charge"
                      className="bg-white border border-gray-100 px-4 py-3 text-xs font-bold outline-none"
                    />
                    <input
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="Tracking no"
                      className="bg-white border border-gray-100 px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <input
                    value={deliveryRemark}
                    onChange={(e) => setDeliveryRemark(e.target.value)}
                    placeholder="Delivery remark"
                    className="w-full bg-white border border-gray-100 px-4 py-3 text-xs font-bold outline-none"
                  />
                </div>
              )}
            </div>

            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Bill remark"
              className="w-full bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-bold outline-none min-h-[90px]"
            />

            <button
              onClick={createRepeatBill}
              disabled={isSaving || totalAmount <= 0}
              className="w-full py-4 bg-[#549E9E] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Repeat Bill'}
            </button>

            <div className="flex gap-2 text-[10px] font-bold text-gray-400 leading-relaxed">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Repeat sirf last doctor prescription ke basis par banega. Medical Added medicine me reason mandatory hai.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
