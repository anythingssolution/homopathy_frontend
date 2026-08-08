import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PatientDetailsEditModalProps {
  isOpen: boolean;
  patientData: {
    patient_id: number;
    full_name: string;
    age: string | number;
    gender: string;
    mobile_no: string;
  };
  onClose: () => void;
  onSave: (data: {
    full_name: string;
    age: number;
    gender: string;
    mobile_no: string;
  }) => Promise<void>;
}

export default function PatientDetailsEditModal({
  isOpen,
  patientData,
  onClose,
  onSave,
}: PatientDetailsEditModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && patientData) {
      setFullName(patientData.full_name || "");
      setAge(String(patientData.age || ""));
      setGender(patientData.gender || "");
      setMobileNo(patientData.mobile_no || "");
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen, patientData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length > 100) {
      newErrors.full_name = "Name must be between 1 and 100 characters";
    }
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      newErrors.age = "Age must be between 1 and 120";
    }
    if (!["male", "female", "other"].includes(gender.toLowerCase())) {
      newErrors.gender = "Please select a valid gender";
    }
    const trimmedMobile = mobileNo.trim();
    if (!/^[0-9]{10,15}$/.test(trimmedMobile)) {
      newErrors.mobile_no = "Mobile must be 10 to 15 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({
        full_name: fullName.trim(),
        age: Number(age),
        gender: gender.toLowerCase(),
        mobile_no: mobileNo.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#549E9E] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-black text-sm uppercase tracking-widest">
            {t("patient_edit.title", "Edit Patient Details")}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
              {t("patient_edit.full_name", "Full Name")}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm font-bold text-gray-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#549E9E]/10 focus:border-[#549E9E] ${errors.full_name ? "border-red-400" : "border-gray-200"}`}
              disabled={isSaving}
            />
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                {t("patient_edit.age", "Age")}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={1}
                max={120}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-bold text-gray-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#549E9E]/10 focus:border-[#549E9E] ${errors.age ? "border-red-400" : "border-gray-200"}`}
                disabled={isSaving}
              />
              {errors.age && (
                <p className="text-red-500 text-xs mt-1">{errors.age}</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                {t("patient_edit.gender", "Gender")}
              </label>
              <select
                value={gender.toLowerCase()}
                onChange={(e) => setGender(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-bold text-gray-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#549E9E]/10 focus:border-[#549E9E] ${errors.gender ? "border-red-400" : "border-gray-200"}`}
                disabled={isSaving}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
              {t("patient_edit.mobile", "Mobile Number")}
            </label>
            <input
              type="text"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value.replace(/[^0-9]/g, ""))}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm font-bold text-gray-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#549E9E]/10 focus:border-[#549E9E] ${errors.mobile_no ? "border-red-400" : "border-gray-200"}`}
              disabled={isSaving}
            />
            {errors.mobile_no && (
              <p className="text-red-500 text-xs mt-1">{errors.mobile_no}</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
            >
              {t("patient_edit.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-[#549E9E] text-white rounded-lg text-sm font-bold hover:bg-[#478787] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSaving
                ? t("patient_edit.saving", "Saving...")
                : t("patient_edit.save", "Save Changes")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
