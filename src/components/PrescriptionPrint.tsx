import React from 'react';
import { Mail, Phone, MapPin, Pill, Activity, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { getMedicationRoleLabel, formatPrescriptionMedicineText, getRepeatSamePrintBlocks, getPrintedUniversalRemark, getPrintedNumericFormulaDisplay, getPrintedTestFinding } from '../utils/prescriptionFormat';
import { formatPrintDurationLabel, getFollowUpDueDate, getMedicationPeriodDates } from '../utils/medicationDuration';
import MedicationDispensingStatus from './MedicationDispensingStatus';

interface PrescriptionPrintProps {
  consultation: any;
  appointment: any;
  lang?: 'en' | 'hi';
}

export default function PrescriptionPrint({ consultation, appointment, lang = 'en' }: PrescriptionPrintProps) {
  const isHi = lang === 'hi';
  const allMeds = consultation?.medications || consultation?.prescription?.medications || [];
  const tests = consultation?.tests || [];
  const numericMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'NUMERIC');
  const textMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'TEXT');

  const hasVitalValue = (value: unknown) => {
    const text = String(value ?? '').trim();
    return Boolean(text) && text !== '-' && text !== '—' && text.toLowerCase() !== 'n/a';
  };

  const bloodPressure =
    consultation.blood_pressure ||
    appointment.details?.blood_pressure ||
    appointment.blood_pressure ||
    '';
  const oxygenSaturation =
    consultation.oxygen_saturation ||
    appointment.details?.oxygen_saturation ||
    appointment.oxygen_saturation ||
    '';
  const patientHeight =
    consultation.patient_height ||
    appointment.details?.patient_height ||
    appointment.patient_height ||
    '';
  const patientWeight =
    consultation.patient_weight ||
    appointment.details?.patient_weight ||
    appointment.patient_weight ||
    '';

  const durationDays =
    consultation.medication_duration_days ||
    appointment.medication_duration_days ||
    appointment.details?.medication_duration_days ||
    0;
  const durationLabel = formatPrintDurationLabel(durationDays, isHi);
  const medicationPeriod = getMedicationPeriodDates(
    appointment.appointment_date || appointment.details?.appointment_date || consultation.created_at,
    durationDays,
  );
  const followUpDueDate = getFollowUpDueDate(
    appointment.appointment_date || appointment.details?.appointment_date || consultation.created_at,
    consultation.follow_up_after_days || appointment.details?.follow_up_after_days || durationDays,
  );
  const repeatMonths = Number(
    consultation.repeat_months ?? appointment.details?.repeat_months ?? 0,
  );
  const sameMonths = Number(
    consultation.same_months ?? appointment.details?.same_months ?? 0,
  );
  const isRepeat = Boolean(
    Number(
      consultation.is_repeat
      ?? appointment.details?.is_repeat
      ?? appointment.is_repeat
      ?? 0,
    ),
  ) || repeatMonths > 0;
  const isSame = Boolean(
    Number(
      consultation.is_same
      ?? appointment.details?.is_same
      ?? appointment.is_same
      ?? 0,
    ),
  ) || sameMonths > 0;
  const repeatSameBlocks = getRepeatSamePrintBlocks({
    isRepeat,
    isSame,
    repeatMonths,
    sameMonths,
    durationDays,
    isHi,
  });

  const consultationModeValue =
    (consultation.consultation_mode || appointment.details?.consultation_mode) === 'ON_CALL'
      ? isHi
        ? 'ऑन कॉल'
        : 'On Call'
      : isHi
        ? 'शारीरिक'
        : 'Physical';
  const modeLabel = isHi ? 'मोड' : 'MODE';

  const vitalItems = [
    { key: 'bp', label: 'B/P', value: bloodPressure, alwaysShow: false },
    { key: 'spo2', label: 'SPO2', value: oxygenSaturation, alwaysShow: false },
    {
      key: 'height',
      label: isHi ? 'ऊंचाई' : 'HEIGHT',
      value: patientHeight,
      alwaysShow: false,
    },
    {
      key: 'weight',
      label: isHi ? 'वजन' : 'WEIGHT',
      value: patientWeight,
      alwaysShow: false,
    },
  ].filter((item) => item.alwaysShow || hasVitalValue(item.value));

  return (
    <div className="bg-white px-2 pt-2 pb-4 max-w-4xl mx-auto font-sans text-gray-800 printable-content leading-tight text-sm flex flex-col flex-1 min-h-full w-full">
      {/* Header */}
      <table className="w-full print-table">
        <thead className="print:table-header-group hidden">
          <tr><td><div className="h-[2px]"></div></td></tr>
        </thead>
        <tbody>
          <tr className="print-tbody-row">
            <td className="align-top">
              <div className="flex flex-col w-full mb-2">
                {/* Top Center Text */}
                <div className="text-center space-y-0 mb-1">
                  <div className="text-[#cc3333] text-xs font-bold leading-none">ॐ</div>
                  <div className="text-[#cc3333] text-[9.5px] font-bold leading-tight">।। सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः ।।</div>
                  <div className="text-[#1a2b4c] text-[9.5px] font-bold leading-tight">
                    {isHi ? "संस्थापक : डॉ. विद्याकांत त्रिवेदी" : "Founder : Dr. Vidyakant Trivedi"}
                  </div>
                </div>

                {/* Lower Header Section */}
                <div className="flex items-start justify-between w-full relative mt-0">
                  {/* Stethoscope */}
                  <div className="relative z-10 shrink-0 flex flex-col">
                    <svg width="55" height="75" viewBox="0 0 60 80" fill="none" stroke="#549E9E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M 11 11 L 14 10 M 37 11 L 34 10" strokeWidth="3.5" />
                      <path d="M 14 10 L 16 25 A 8 8 0 0 0 32 25 L 34 10" />
                      <path d="M 24 33 V 55 A 11 11 0 0 0 46 55 V 40 A 5 5 0 0 1 51 35 H 60" />
                    </svg>
                  </div>

                  <div className="flex-1 flex flex-col relative z-0">
                    {/* The Connecting Line */}
                    <div className="absolute top-[31px] left-0 right-1 h-[2.5px] bg-[#549E9E]">
                      <div className="absolute -right-[5px] -top-[3.75px] w-[10px] h-[10px] rounded-full bg-[#549E9E]"></div>
                    </div>

                    {/* The Text Content Block */}
                    <div className="flex flex-col items-end pr-1">
                      <h1 className="text-[28px] font-black text-[#1a2b4c] tracking-wide leading-none">
                        {isHi ? "डॉ. उत्कर्ष त्रिवेदी" : "Dr. Utkarsh Trivedi"}
                      </h1>

                      <div className="flex flex-col items-end mt-2">
                        <p className="text-[12.5px] font-bold text-gray-800 leading-tight">
                          {isHi ? "होम्योपैथिक चिकित्सक" : "Homeopathic Physician"}
                        </p>
                        <p className="text-[12.5px] font-bold text-gray-800 leading-tight mt-0.5">B.H.M.S.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient & Consultation Info (2-Side Layout: 3 Data on Each Side, No Underlines, Remedy Name Font Size) */}
              <div className="w-full mb-4 px-1 mt-1 font-bold text-gray-800 text-[10px]">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 w-full">
                  {/* Left Side (3 Data: Simple Name, Patient ID, Treatment) */}
                  <div className="flex flex-col gap-1">
                    {/* 1. Simple Name (no 'Name:' label) */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-[#1a2b4c] uppercase tracking-wide">
                        {appointment.patient_full_name}
                      </span>
                    </div>

                    {/* 2. Patient ID */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#1a2b4c] font-mono font-bold">{appointment.patient_uuid}</span>
                    </div>

                    {/* 3. Treatment */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#1a2b4c] uppercase tracking-wider">{appointment.treatment_name}</span>
                    </div>
                  </div>

                  {/* Right Side (3 Data: Date, Age, Sex) */}
                  <div className="flex flex-col gap-1 items-end">
                    {/* 1. Date */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-gray-600 shrink-0">{isHi ? "दिनांक :" : "Date :"}</span>
                      <span className="text-[#1a2b4c]">
                        {new Date(appointment.appointment_date || Date.now()).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* 2. Age */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#1a2b4c]">
                        {appointment.patient_age || 'N/A'} {isHi ? 'वर्ष' : 'Y'}
                      </span>
                    </div>

                    {/* 3. Sex */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#1a2b4c] capitalize">
                        {appointment.patient_gender || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Details & Prescriptions Card (Matches AllVisitsPrint UI) */}
              <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-xs mt-2 page-break-inside-avoid">
                {/* Visit Header Banner */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2 mb-2 bg-[#1a2b4c]/5 -mx-3 -mt-3 p-2.5 rounded-t-lg">
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] leading-tight min-w-0">
                    <span className="font-bold text-[#1a2b4c]">
                      {appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : 'N/A'}
                    </span>
                    {appointment.treatment_name && (
                      <span className="font-black uppercase tracking-wider text-[#549E9E]">
                        {appointment.treatment_name}
                      </span>
                    )}
                    {durationLabel && (
                      <span className="px-1.5 py-0.5 rounded-xs border border-[#549E9E]/25 bg-white text-[#549E9E] font-black uppercase tracking-wider whitespace-nowrap">
                        {isHi ? 'अवधि' : 'DURATION'} {durationLabel}
                      </span>
                    )}
                    {medicationPeriod && (
                      <span className="font-bold text-[#1a2b4c] whitespace-nowrap">
                        {medicationPeriod.fromDate} – {medicationPeriod.toDate}
                      </span>
                    )}
                    {followUpDueDate && !consultation.follow_up_chain_closed && (
                      <span className="px-1.5 py-0.5 rounded-xs border border-red-100 bg-white text-red-500 font-black uppercase tracking-wider whitespace-nowrap">
                        {isHi ? 'अगला फॉलो-अप' : 'NEXT FOLLOW-UP'} {followUpDueDate}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right pt-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                      <span className="text-black">{modeLabel}</span>{' '}
                      <span className="text-[#549E9E]">{consultationModeValue}</span>
                    </span>
                  </div>
                </div>

                {/* Two Column Layout for Visit Details & Remedies */}
                <div className="flex items-stretch w-full gap-6">
                  {/* LEFT COLUMN: Vitals, Complaints, Findings, Diagnosis */}
                  <div className="w-[48%] flex flex-col gap-3 pr-4 border-r border-[#549E9E]/20">
                    {/* Vitals Single Line Row — only show fields that have values */}
                    {vitalItems.length > 0 && (
                    <div className="flex flex-col gap-1 border-b border-[#549E9E]/20 pb-2">
                      <div
                        className="grid gap-1 text-left"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(vitalItems.length, 1)}, minmax(0, 1fr))`,
                        }}
                      >
                        {vitalItems.map((item) => (
                          <div key={item.key} className="flex flex-col">
                            <span className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-bold text-gray-800 leading-tight">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    {repeatSameBlocks.length > 0 && (
                      <div
                        className="grid gap-2 rounded-md border border-[#549E9E]/15 bg-[#549E9E]/[0.03] p-2"
                        style={{
                          gridTemplateColumns: `repeat(${repeatSameBlocks.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {repeatSameBlocks.map((block) => (
                          <div key={block.key}>
                            <h3 className="text-[8px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5">
                              {block.label}
                            </h3>
                            <div className="text-[10px] font-black text-gray-800 leading-tight">
                              {block.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Chief Complaint */}
                      <div>
                        <h3 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-1 border-b border-[#549E9E]/20 pb-0.5">
                          {isHi ? "मुख्य शिकायत" : "CHIEF COMPLAINT"}
                        </h3>
                        <div className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap leading-tight">
                          {consultation.symptoms || appointment.details?.symptoms || appointment.symptoms || (isHi ? 'कोई लक्षण दर्ज नहीं।' : 'No symptoms recorded.')}
                        </div>
                      </div>

                      {/* Clinical Findings */}
                      <div>
                        <h3 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-1 border-b border-[#549E9E]/20 pb-0.5">
                          {isHi ? "नैदानिक निष्कर्ष" : "CLINICAL FINDINGS"}
                        </h3>
                        <div className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap leading-tight">
                          {consultation.treatment_advice || appointment.details?.treatment_advice || (isHi ? 'कोई विशेष निष्कर्ष दर्ज नहीं।' : 'No specific findings recorded.')}
                        </div>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {consultation?.diagnosis && (
                      <div>
                        <h3 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-1 border-b border-[#549E9E]/20 pb-0.5">
                          {isHi ? "रोग का निदान (डायग्नोसिस)" : "DIAGNOSIS"}
                        </h3>
                        <div className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap leading-tight">
                          {consultation.diagnosis}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Remedies and Other Medications (Right-aligned) */}
                  <div className="flex-1">
                    <div className="p-0 flex flex-col gap-3 items-end justify-start bg-white text-right">
                      {/* Remedies */}
                      {numericMeds.length > 0 && (
                        <div className="flex flex-col gap-2 items-end text-right w-full">
                          {(() => {
                            const quickFormulaText = consultation?.quick_formula_input || appointment?.quick_formula_input || consultation?.prescription?.quick_formula_input || '';
                            const duration = consultation?.medication_duration_days || appointment?.medication_duration_days || 7;
                            const { formulaLabel, doseLines } = getPrintedNumericFormulaDisplay({
                              numericMeds,
                              quickFormulaText,
                              durationDays: duration,
                              isHi,
                            });

                            return (
                              <div className="flex flex-col gap-0.5 items-end text-right">
                                {formulaLabel ? (
                                  <div className="text-xs font-mono font-bold text-[#1a2b4c]">
                                    {formulaLabel}
                                  </div>
                                ) : null}
                                {doseLines.map((line) => (
                                  <div key={line} className="text-[10px] font-bold text-gray-800 leading-tight">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Other Medications — name and dosage on the same line */}
                      {textMeds.length > 0 && (
                        <div className="flex flex-col gap-1.5 items-end text-right w-full">
                          {textMeds.map((m: any, idx: number) => {
                            const roleLabel = getMedicationRoleLabel(m);
                            const displayRemark = isHi
                              ? (m.remark_hi || m.remark)
                              : (m.remark || m.remark_hi);
                            return (
                              <div key={idx} className="flex flex-col items-end text-right leading-tight w-full">
                                {roleLabel && (
                                  <span className="w-fit px-1.5 py-0.5 rounded-md bg-[#cc3333]/10 text-[#cc3333] text-[8px] font-black uppercase tracking-widest mb-0.5">
                                    {roleLabel}
                                  </span>
                                )}
                                <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right">
                                  <span className="text-xs font-bold text-gray-800">
                                    {formatPrescriptionMedicineText(m.medicine_value)}
                                  </span>
                                  {displayRemark ? (
                                    <span className="text-[10px] text-gray-600 font-medium">
                                      {displayRemark}
                                    </span>
                                  ) : null}
                                </div>
                                <MedicationDispensingStatus
                                  medication={m}
                                  label={isHi ? 'दवा नहीं दी गई' : 'Not dispensed'}
                                  reasonLabel={isHi ? 'कारण' : 'Reason'}
                                  compact
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(() => {
                        const printedRemark = getPrintedUniversalRemark(consultation, isHi)
                          || getPrintedUniversalRemark(appointment, isHi);
                        if (!printedRemark) return null;
                        return (
                          <div className="text-[10px] text-gray-700 font-medium leading-tight text-right w-full">
                            {printedRemark}
                          </div>
                        );
                      })()}

                      {/* Tests */}
                      {tests.length > 0 && (
                        <div className="w-full">
                          <h3 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-1 border-b border-[#549E9E]/20 pb-0.5">
                            {isHi ? "अनुशंसित जांचें (टेस्ट)" : "Recommended Tests"}
                          </h3>
                          <div className="space-y-1">
                            {tests.map((test: any, idx: number) => {
                              const finding = getPrintedTestFinding(test);
                              return (
                              <div key={idx} className="text-xs font-bold text-gray-700">
                                <div>{test.test_name}</div>
                                {finding && (
                                  <div className="text-[9px] font-medium text-gray-600 leading-tight mt-0.5">
                                    {isHi ? 'जाँच निष्कर्ष' : 'Lab findings'}: {finding.findingText}
                                    {finding.findingNotes ? ` — ${finding.findingNotes}` : ''}
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </td>
          </tr>
        </tbody>
        <tfoot className="print:table-footer-group w-full">
          <tr>
            <td className="align-bottom">
              {/* Detailed Footer (Pushed to bottom of page by table height) */}
              <div className="print-footer pt-2 border-t-[1.5px] border-gray-300 flex flex-col w-full bg-white mt-auto sticky bottom-0 z-50 print:relative">
                {/* Top section: Instructions and Appointments */}
                <div className="flex justify-between items-stretch w-full mb-2">
                  {/* Instructions */}
                  <div className="flex-1 pr-4">
                    <h4 className="text-[#cc3333] font-black text-[12px] mb-1">
                      निर्देश एवं परहेज :-
                    </h4>
                    <ol className="text-[10px] font-bold text-gray-800 space-y-0.5 leading-tight list-none">
                      <li>
                        1. बैगन, बीज वाली सब्जी, तेल-मसाला, खटाई अचार कम, रात में दूध एवं दही नहीं।
                      </li>
                      <li>
                        2. औषधि खाने से पहले और बाद में 30 मिनिट तक कुछ भी नहीं खाना चाहिए।
                      </li>
                      <li>
                        3. कृपया पर्ची को साथ अवश्य लावें।
                      </li>
                      <li>
                        4. क्रानिक (जटिल रोगी) कृपया पहले से समय लेकर पधारें।
                      </li>
                    </ol>
                  </div>
                  {/* Appointments Box */}
                  <div className="w-[210px] border-[1.5px] border-[#1a2b4c] rounded-md py-1.5 px-2 text-center shrink-0 bg-white shadow-sm">
                    <h4 className="text-[#cc3333] font-black text-[11px] mb-1">
                      {isHi ? "अपॉइंटमेंट हेतु :" : "FOR APPOINTMENT :"}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Purani Basti : <span className="font-black text-[11px]">77720 43001</span></p>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Devendra Nagar : <span className="font-black text-[11px]">77730 43001</span></p>
                    <div className="w-full border-t border-[#1a2b4c]/30 my-1"></div>
                    <p className="text-[9px] text-gray-700 leading-tight">
                      {isHi ? "आपातकालीन स्थिति में :" : "in case of emergency :"}
                    </p>
                    <p className="text-[11px] font-black text-gray-800 leading-tight">84620 30001</p>
                  </div>
                </div>

                {/* Middle section: Clinic Name */}
                <div className="border-t border-b border-gray-300 py-1.5 mb-2 flex items-center justify-center relative bg-gray-50/30">
                  <img src="/logo.png.png" alt="Logo" className="h-8 absolute left-2 object-contain mix-blend-multiply" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <h2 className="text-[22px] font-black text-[#1a2b4c] tracking-wide text-center w-full">
                    {isHi ? "डॉ. त्रिवेदी होम्योपैथिक क्लिनिक" : "Dr. Trivedi Homeopathic Clinic"}
                  </h2>
                </div>

                {/* Bottom section: Addresses and Timings */}
                <div className="flex justify-between w-full mb-1 gap-4">
                  {/* Left Address */}
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">लिली चौक, बरई मंदिर गली, पुरानी बस्ती, रायपुर (छ.ग.)</p>
                    <p className="text-[10.5px] font-black text-gray-800 leading-tight mb-1 mt-0.5">मो. 7772043001</p>
                    <div className="bg-[#1a2b4c] text-white text-[8.5px] py-1 px-1 tracking-wide font-bold">
                      समय प्रातः 11 बजे से 2 बजे तक | सायं 6 बजे से 9 बजे तक | रविवार : सुबह 11 से 3 बजे तक
                    </div>
                  </div>

                  {/* Right Address */}
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">सेक्टर 5, मंडी गेट के पास, देवेन्द्र नगर, सेंट मेरी स्कूल के सामने, रायपुर (छ.ग.)</p>
                    <p className="text-[10.5px] font-black text-gray-800 leading-tight mb-1 mt-0.5">मो. 7773043001</p>
                    <div className="bg-[#1a2b4c] text-white text-[8.5px] py-1 px-1 tracking-wide font-bold">
                      प्रति मंगलवार प्रातः 11.00 से शाम 06.00 बजे तक
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="flex justify-center items-center space-x-3 mt-1.5 mb-1">
                  <div className="flex items-center text-[8px] text-gray-600 font-bold tracking-tight">
                    <Facebook className="w-3 h-3 text-[#3b5998] mr-1" fill="currentColor" strokeWidth={0} /> dr.trivedishomeopathy
                  </div>
                  <div className="flex items-center text-[8px] text-gray-600 font-bold tracking-tight">
                    <Instagram className="w-3 h-3 text-[#E1306C] mr-1" /> drtrivedishomeopathy
                  </div>
                  <div className="flex items-center text-[8px] text-gray-600 font-bold tracking-tight">
                    <Twitter className="w-3 h-3 text-[#1DA1F2] mr-1" fill="currentColor" strokeWidth={0} /> drtrivedishomeo
                  </div>
                  <div className="flex items-center text-[8px] text-gray-600 font-bold tracking-tight">
                    <Youtube className="w-3 h-3 text-[#FF0000] mr-1" /> drtrivedishomeopathy
                  </div>
                  <div className="flex items-center text-[8px] text-gray-600 font-bold tracking-tight">
                    <Mail className="w-3 h-3 text-[#DB4437] mr-1" /> drtrivedishomeopathy@gmail.com
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <style>{`
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: 100%;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
          body * {
            visibility: hidden;
          }
          .printable-content, .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            min-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            background: white;
            /* Extra safety to escape modal constraints */
            transform: none !important;
            padding-top: 8mm !important;
            padding-bottom: 5mm !important;
            padding-left: 10mm !important;
            padding-right: 10mm !important;
          }
          /* Strip all transforms and containments globally during print so fixed elements attach to the page */
          * {
            transform: none !important;
            contain: none !important;
            perspective: none !important;
            filter: none !important;
          }
          .print-table {
            flex: 1 !important; /* Stretches exactly to fill remaining page height, pushing tfoot down */
            height: 100% !important;
          }
          .print-tbody-row {
            height: 100% !important; /* Force body row to expand */
          }
          .print-footer {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
