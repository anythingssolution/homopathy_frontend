import React from 'react';
import { useTranslation } from 'react-i18next';

export type PatientAddressExtraField = 'ward_no' | 'vidhan_sabha';

export default function PatientAddressExtraFields({ values, onChange, disabled, inputClassName, labelClassName = 'block text-[10px] font-black uppercase tracking-widest text-gray-500' }: {
  values: Record<PatientAddressExtraField, string>;
  onChange: (field: PatientAddressExtraField, value: string) => void;
  disabled?: boolean;
  inputClassName: string;
  labelClassName?: string;
}) {
  const { t } = useTranslation();
  return <>
    {(['ward_no', 'vidhan_sabha'] as const).map(field => <label key={field} className={labelClassName}>
      <span>{t(`patient_registration.${field === 'ward_no' ? 'ward' : field}`, field === 'ward_no' ? 'Ward No.' : 'Vidhan Sabha')}</span>
      <input type="text" value={values[field]} maxLength={field === 'ward_no' ? 50 : 150}
        disabled={disabled} onChange={event => onChange(field, event.target.value)} className={inputClassName} />
    </label>)}
  </>;
}
