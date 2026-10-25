import PatientAddressExtraFields from './PatientAddressExtraFields';
import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PatientAddress = { patient_id: number; address?: string | null; area_name?: string | null; ward_no?: string | null; vidhan_sabha?: string | null; city?: string | null; pincode?: string | null };

export default function ReceptionBookingAddress({ patient, token, onSaved }: { patient: PatientAddress; token: string | null; onSaved: (patient: PatientAddress) => void }) {
  const { i18n } = useTranslation();
  const label = (en: string, hi: string) => i18n.language.startsWith('hi') ? hi : en;
  const address = patient.address || [patient.area_name, patient.pincode, patient.city].filter(Boolean).join(', ');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ area_name: patient.area_name || '', ward_no: patient.ward_no || '', vidhan_sabha: patient.vidhan_sabha || '', city: patient.city || '', pincode: patient.pincode || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!token || saving) return;
    if (!form.area_name.trim() || !form.city.trim()) { setError(label('Area and city are required.', 'क्षेत्र और शहर आवश्यक हैं।')); return; }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) { setError(label('Pincode must contain 6 digits.', 'पिनकोड 6 अंकों का होना चाहिए।')); return; }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/receptionist/patients/${patient.patient_id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ area_name: form.area_name.trim(), ward_no: form.ward_no.trim(), vidhan_sabha: form.vidhan_sabha.trim(), city: form.city.trim(), pincode: form.pincode || null }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.patient) throw new Error(result.message || label('Unable to save address.', 'पता सेव नहीं हुआ।'));
      onSaved(result.data.patient);
      setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : label('Unable to save address.', 'पता सेव नहीं हुआ।')); }
    finally { setSaving(false); }
  };
  return <div className="bg-gray-50 border border-gray-100 rounded-[26px] p-5 space-y-4">
    <div className="flex justify-between items-start gap-4">
      <div className="flex gap-3">
        <MapPin size={20} className="text-primary-teal shrink-0 mt-1" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-teal mb-1">{label('Patient account address', 'मरीज के खाते का पता')}</p>
          <p className={`text-sm font-medium ${address ? 'text-gray-600' : 'text-gray-400 italic'}`}>{address || label('No address provided', 'पता दर्ज नहीं है')}</p>
        </div>
      </div>
      {!editing && <button type="button" onClick={() => { setForm({ area_name: patient.area_name || '', ward_no: patient.ward_no || '', vidhan_sabha: patient.vidhan_sabha || '', city: patient.city || '', pincode: patient.pincode || '' }); setError(''); setEditing(true); }} className="px-4 py-2 bg-primary-teal/10 text-primary-teal text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-primary-teal/20 whitespace-nowrap">{address ? label('Edit Address', 'पता बदलें') : label('Add Address', 'पता जोड़ें')}</button>}
    </div>
    {editing && <>
      <div className="grid md:grid-cols-3 gap-4">
        {([['area_name', label('Area / Mohalla / Colony', 'क्षेत्र / मोहल्ला / कॉलोनी')], ['city', label('City', 'शहर')], ['pincode', label('Pincode (optional)', 'पिनकोड (वैकल्पिक)')]] as const).map(([key, title]) => <label key={key} className="space-y-2 text-xs font-bold text-primary-teal">
          <span>{title}{(key === 'area_name' || key === 'city') && <span className="text-red-500"> *</span>}</span>
          <input disabled={saving} value={form[key]} maxLength={key === 'pincode' ? 6 : key === 'city' ? 100 : 150} inputMode={key === 'pincode' ? 'numeric' : 'text'} onChange={event => setForm(current => ({ ...current, [key]: key === 'pincode' ? event.target.value.replace(/\D/g, '') : event.target.value }))} className="w-full rounded-full bg-white border border-gray-100 py-3 px-4 outline-none focus:ring-2 focus:ring-primary-teal/20 text-gray-700 font-medium" />
        </label>)}
        <PatientAddressExtraFields values={form} disabled={saving}
          onChange={(field, value) => setForm(current => ({ ...current, [field]: value }))}
          labelClassName="space-y-2 text-xs font-bold text-primary-teal"
          inputClassName="w-full rounded-full bg-white border border-gray-100 py-3 px-4 outline-none focus:ring-2 focus:ring-primary-teal/20 text-gray-700 font-medium" />
      </div>
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" disabled={saving} onClick={() => setEditing(false)} className="px-4 py-2 rounded-full text-xs font-bold text-gray-500">{label('Cancel', 'रद्द करें')}</button>
        <button type="button" disabled={saving} onClick={save} className="px-5 py-2 rounded-full bg-primary-teal text-white text-xs font-black disabled:opacity-50">{saving ? label('Saving…', 'सेव हो रहा है…') : label('Save Address', 'पता सेव करें')}</button>
      </div>
    </>}
  </div>;
}
