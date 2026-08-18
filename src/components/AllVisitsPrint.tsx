import React from 'react';
import { Activity, Mail, Phone, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { getMedicationRoleLabel, formatPrescriptionMedicineText, formatNumericMedicineWithFormula, getRepeatSamePrintBlocks, getPrintedUniversalRemark, getPrintedDoseTimesText, getPrintedDoseUnitKind } from '../utils/prescriptionFormat';
import MedicationDispensingStatus from './MedicationDispensingStatus';

interface VisitData {
  consultation_id?: number;
  appointment_id?: number;
  event_date?: string;
  auid?: string;
  treatment_name?: string;
  slot_name?: string;
  doctor_full_name?: string;
  consultation?: any;
  appointment?: any;
  details?: any;
  blood_pressure?: string;
  oxygen_saturation?: string;
  patient_height?: string;
  patient_weight?: string;
  consultation_mode?: string;
  symptoms?: string;
  treatment_advice?: string;
  quick_formula_input?: string;
  [key: string]: any;
}

interface AllVisitsPrintProps {
  patient: any;
  visits: VisitData[];
  lang?: 'en' | 'hi';
}

export default function AllVisitsPrint({ patient, visits, lang = 'en' }: AllVisitsPrintProps) {
  const isHi = lang === 'hi';

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
                    {/* Connecting Line */}
                    <div className="absolute top-[31px] left-0 right-1 h-[2.5px] bg-[#549E9E]">
                      <div className="absolute -right-[5px] -top-[3.75px] w-[10px] h-[10px] rounded-full bg-[#549E9E]"></div>
                    </div>

                    {/* Text Content Block */}
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

              {/* Patient Info Header */}
              <div className="w-full mb-3 px-1 mt-1 font-bold text-gray-800 text-[10px]">
                <div className="flex justify-between items-start w-full">
                  {/* Left Side (Name, Patient ID, Mobile/Treatment) */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-black text-[#1a2b4c] uppercase tracking-wide">
                      {patient?.full_name || patient?.patient_full_name}
                    </span>
                    <span className="text-[#1a2b4c] font-mono font-bold">
                      {patient?.patient_uuid}
                    </span>
                    {patient?.mobile_no && (
                      <span className="text-[#1a2b4c]">
                        Ph: {patient.mobile_no}
                      </span>
                    )}
                  </div>

                  {/* Right Side (Date, Age, Sex, Visits Count) */}
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[#1a2b4c]">
                      {isHi ? "दिनांक :" : "Date :"} {new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                    {patient?.age && (
                      <span className="text-[#1a2b4c]">
                        {patient.age} {isHi ? 'वर्ष' : 'Y'}
                      </span>
                    )}
                    {patient?.gender && (
                      <span className="text-[#1a2b4c] capitalize">
                        {patient.gender}
                      </span>
                    )}
                    <span className="font-black text-[#549E9E]">
                      {visits.length} {isHi ? "विज़िट" : "Visits"}
                    </span>
                  </div>
                </div>
              </div>


              {/* Loop over Visits */}
              <div className="space-y-5">
                {visits.map((visitItem, visitIndex) => {
                  const details = visitItem.details || {};
                  const consultation = visitItem.consultation || {};
                  const appointment = visitItem.appointment || {};
                  const allMeds = consultation?.medications || details?.medications || [];
                  const tests = consultation?.tests || details?.tests || [];
                  const numericMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'NUMERIC');
                  const textMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'TEXT');
                  const visitDate = visitItem.event_date || details.appointment_date || appointment.appointment_date || consultation.created_at;
                  const formattedVisitDate = visitDate ? new Date(visitDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }) : 'N/A';
                  const auid = visitItem.auid || details.auid;
                  const hasVitalValue = (value: unknown) => {
                    const text = String(value ?? '').trim();
                    return Boolean(text) && text !== '-' && text !== '—' && text.toLowerCase() !== 'n/a';
                  };
                  const durationDays = consultation.medication_duration_days || details.medication_duration_days || visitItem.medication_duration_days || 0;
                  const repeatMonths = Number(consultation.repeat_months ?? details.repeat_months ?? 0);
                  const sameMonths = Number(consultation.same_months ?? details.same_months ?? 0);
                  const isRepeat = Boolean(Number(consultation.is_repeat ?? details.is_repeat ?? 0)) || repeatMonths > 0;
                  const isSame = Boolean(Number(consultation.is_same ?? details.is_same ?? 0)) || sameMonths > 0;
                  const repeatSameBlocks = getRepeatSamePrintBlocks({
                    isRepeat,
                    isSame,
                    repeatMonths,
                    sameMonths,
                    durationDays,
                    isHi,
                  });
                  const visitModeValue =
                    (consultation.consultation_mode || details.consultation_mode) === 'ON_CALL'
                      ? (isHi ? 'ऑन कॉल' : 'On Call')
                      : (isHi ? 'शारीरिक' : 'Physical');
                  const visitModeLabel = isHi ? 'मोड' : 'MODE';
                  const visitVitalItems = [
                    {
                      key: 'bp',
                      label: 'B/P',
                      value: consultation.blood_pressure || details.blood_pressure || visitItem.blood_pressure || '',
                      alwaysShow: false,
                    },
                    {
                      key: 'spo2',
                      label: 'SPO2',
                      value: consultation.oxygen_saturation || details.oxygen_saturation || visitItem.oxygen_saturation || '',
                      alwaysShow: false,
                    },
                    {
                      key: 'height',
                      label: isHi ? 'ऊंचाई' : 'HEIGHT',
                      value: consultation.patient_height || details.patient_height || visitItem.patient_height || '',
                      alwaysShow: false,
                    },
                    {
                      key: 'weight',
                      label: isHi ? 'वजन' : 'WEIGHT',
                      value: consultation.patient_weight || details.patient_weight || visitItem.patient_weight || '',
                      alwaysShow: false,
                    },
                  ].filter((item) => item.alwaysShow || hasVitalValue(item.value));

                  return (
                    <div key={visitIndex} className="border border-gray-200 rounded-lg p-3 bg-white shadow-xs page-break-inside-avoid">
                      {/* Visit Header Banner */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2 bg-[#1a2b4c]/5 -mx-3 -mt-3 p-2.5 rounded-t-lg">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-black text-[#1a2b4c] text-xs">
                            #{visits.length - visitIndex}
                          </span>
                          <span className="font-bold text-[#1a2b4c]">
                            {formattedVisitDate}
                          </span>
                          {auid && (
                            <span className="font-mono text-gray-500 text-[9px] bg-white px-1.5 py-0.5 rounded-xs border border-gray-200">
                              {auid}
                            </span>
                          )}
                          <span className="font-black uppercase tracking-wider text-[#549E9E]">
                            {visitItem.treatment_name || details.treatment_name || appointment.treatment_name || "Consultation"}
                          </span>
                          {repeatSameBlocks.map((block) => (
                            <span
                              key={block.key}
                              className="px-1.5 py-0.5 rounded-xs border border-[#549E9E]/30 bg-white text-[#549E9E] font-black uppercase tracking-wider"
                            >
                              {block.label} {block.value}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          {visitItem.doctor_full_name ? (
                            <span className="text-[9.5px] font-bold text-gray-600">
                              {`Dr. ${visitItem.doctor_full_name}`}
                            </span>
                          ) : null}
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            <span className="text-black">{visitModeLabel}</span>{' '}
                            <span className="text-[#549E9E]">{visitModeValue}</span>
                          </span>
                        </div>
                      </div>

                      {/* Two Column Layout for Visit Details & Remedies */}
                      <div className="flex items-stretch w-full gap-6">
                        {/* LEFT COLUMN: Vitals, Complaints, Findings */}
                        <div className="w-[48%] flex flex-col gap-3 pr-4 border-r border-[#549E9E]/20">
                          {/* Vitals Single Line Row */}
                          {visitVitalItems.length > 0 && (
                          <div className="flex flex-col gap-1 border-b border-[#549E9E]/20 pb-2">
                            <div
                              className="grid gap-1 text-left"
                              style={{
                                gridTemplateColumns: `repeat(${Math.max(visitVitalItems.length, 1)}, minmax(0, 1fr))`,
                              }}
                            >
                              {visitVitalItems.map((item) => (
                                <div key={item.key} className="flex flex-col">
                                  <span className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider">
                                    {item.label}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-800 leading-tight">
                                    {item.value || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          )}

                          {repeatSameBlocks.length > 0 && (
                            <div
                              className="grid gap-3"
                              style={{
                                gridTemplateColumns: `repeat(${repeatSameBlocks.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {repeatSameBlocks.map((block) => (
                                <div key={block.key}>
                                  <h4 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 border-b border-[#549E9E]/20 pb-0.5">
                                    {block.label}
                                  </h4>
                                  <div className="text-[10px] font-bold text-gray-800 leading-tight">
                                    {block.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Chief Complaint & Clinical Findings Side-by-Side */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <h4 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 border-b border-[#549E9E]/20 pb-0.5">
                                {isHi ? "मुख्य शिकायत" : "CHIEF COMPLAINT"}
                              </h4>
                              <div className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap leading-tight">
                                {consultation.symptoms || details.symptoms || appointment.symptoms || (isHi ? 'कोई लक्षण दर्ज नहीं।' : 'No symptoms recorded.')}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-[9px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 border-b border-[#549E9E]/20 pb-0.5">
                                {isHi ? "नैदानिक निष्कर्ष" : "CLINICAL FINDINGS"}
                              </h4>
                              <div className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap leading-tight">
                                {consultation.treatment_advice || details.treatment_advice || (isHi ? 'कोई विशेष निष्कर्ष दर्ज नहीं।' : 'No specific findings recorded.')}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Prescribed Remedies & Other Meds (Right-aligned) */}
                        <div className="flex-1">
                          <div className="p-0 flex flex-col gap-2 items-end justify-start bg-white text-right">
                            {/* Remedies */}
                            {numericMeds.length > 0 && (
                              <div className="flex flex-col gap-1.5 items-end text-right w-full">
                                {(() => {
                                  const quickFormulaText = consultation?.quick_formula_input || details?.quick_formula_input || appointment?.quick_formula_input || '';
                                  const duration = consultation?.medication_duration_days || details?.medication_duration_days || appointment?.medication_duration_days || 7;
                                  const groupedByDose: { [key: string]: { medicines: string[]; medication: any } } = {};

                                  numericMeds.forEach((med: any) => {
                                    const doses = Array.isArray(med.doses) ? med.doses : [];
                                    const kind = getPrintedDoseUnitKind(med.medicine_value, quickFormulaText);
                                    const key = JSON.stringify({
                                      kind,
                                      balls: doses.map((d: any) => Number(d.balls_per_dose)),
                                    });
                                    if (!groupedByDose[key]) {
                                      groupedByDose[key] = { medicines: [], medication: med };
                                    }
                                    groupedByDose[key].medicines.push(
                                      formatNumericMedicineWithFormula(
                                        String(med.medicine_value).trim(),
                                        quickFormulaText,
                                      ),
                                    );
                                  });

                                  const doseGroups = Object.values(groupedByDose);

                                  return doseGroups.map((group, idx) => {
                                    const formulaLabel = doseGroups.length === 1 && quickFormulaText
                                      ? quickFormulaText
                                      : `${group.medicines.join(',')},/${duration}`;
                                    return (
                                      <div key={idx} className="flex flex-col gap-0.5 items-end text-right">
                                        <div className="text-[11px] font-mono font-bold text-[#1a2b4c]">
                                          {formulaLabel}
                                        </div>
                                        <div className="text-[9px] font-bold text-gray-800 leading-tight">
                                          {getPrintedDoseTimesText(group.medication, isHi, quickFormulaText)}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}

                            {/* Text Meds */}
                            {textMeds.length > 0 && (
                              <div className="flex flex-col gap-1 items-end text-right w-full">
                                {textMeds.map((m: any, idx: number) => {
                                  const roleLabel = getMedicationRoleLabel(m);
                                  const displayRemark = isHi
                                    ? (m.remark_hi || m.remark)
                                    : (m.remark || m.remark_hi);
                                  return (
                                    <div key={idx} className="flex flex-col text-right items-end">
                                      {roleLabel && (
                                        <span className="w-fit px-1 py-0.5 rounded-xs bg-[#cc3333]/10 text-[#cc3333] text-[7.5px] font-black uppercase tracking-widest mb-0.5">
                                          {roleLabel}
                                        </span>
                                      )}
                                      <div className="flex flex-wrap items-baseline justify-end gap-x-2">
                                        <span className="text-[10px] font-bold text-gray-800">{formatPrescriptionMedicineText(m.medicine_value)}</span>
                                        {displayRemark ? (
                                          <span className="text-[9px] text-gray-600 font-medium">
                                            {displayRemark}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {(() => {
                              const printedRemark = getPrintedUniversalRemark(consultation, isHi)
                                || getPrintedUniversalRemark(details, isHi)
                                || getPrintedUniversalRemark(appointment, isHi);
                              if (!printedRemark) return null;
                              return (
                                <div className="text-[9px] text-gray-700 font-medium text-right w-full">
                                  {printedRemark}
                                </div>
                              );
                            })()}

                            {/* Tests */}
                            {tests.length > 0 && (
                              <div className="w-full">
                                <h4 className="text-[10px] font-black text-[#cc3333] uppercase tracking-widest mb-1.5 border-b border-[#cc3333]/20 pb-0.5">
                                  {isHi ? "अनुशंसित जांचें (टेस्ट)" : "Recommended Tests"}
                                </h4>
                                <div className="space-y-0.5">
                                  {tests.map((test: any, idx: number) => (
                                    <div key={idx} className="text-[10px] font-bold text-gray-700">
                                      {test.test_name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </td>
          </tr>
        </tbody>
        <tfoot className="print:table-footer-group w-full">
          <tr>
            <td className="align-bottom">
              {/* Detailed Footer */}
              <div className="print-footer pt-2 border-t-[1.5px] border-gray-300 flex flex-col w-full bg-white mt-auto sticky bottom-0 z-50 print:relative">
                {/* Instructions and Appointments */}
                <div className="flex justify-between items-stretch w-full mb-2">
                  <div className="flex-1 pr-4">
                    <h4 className="text-[#cc3333] font-black text-[12px] mb-1">
                      {isHi ? "निर्देश एवं परहेज :-" : "Instructions & Precautions :-"}
                    </h4>
                    <ol className="text-[10px] font-bold text-gray-800 space-y-0.5 leading-tight list-none">
                      <li>{isHi ? "1. बैगन, बीज वाली सब्जी, तेल-मसाला, खटाई अचार कम, रात में दूध एवं दही नहीं।" : "1. Avoid brinjal, seed vegetables, oily-spicy food, pickles, sour items. No milk/curd at night."}</li>
                      <li>{isHi ? "2. औषधि खाने से पहले और बाद में 30 मिनिट तक कुछ भी नहीं खाना चाहिए।" : "2. Do not eat or drink anything 30 minutes before and after taking medicine."}</li>
                      <li>{isHi ? "3. कृपया पर्ची को साथ अवश्य लावें।" : "3. Please bring this prescription slip on your next visit."}</li>
                      <li>{isHi ? "4. क्रानिक (जटिल रोगी) कृपया पहले से समय लेकर पधारें।" : "4. Chronic patients should book an appointment in advance."}</li>
                    </ol>
                  </div>
                  <div className="w-[210px] border-[1.5px] border-[#1a2b4c] rounded-md py-1.5 px-2 text-center shrink-0 bg-white shadow-xs">
                    <h4 className="text-[#cc3333] font-black text-[11px] mb-1">{isHi ? "अपॉइंटमेंट हेतु :" : "FOR APPOINTMENT :"}</h4>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Purani Basti : <span className="font-black text-[11px]">77720 43001</span></p>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Devendra Nagar : <span className="font-black text-[11px]">77730 43001</span></p>
                    <div className="w-full border-t border-[#1a2b4c]/30 my-1"></div>
                    <p className="text-[9px] text-gray-700 leading-tight">{isHi ? "आपातकालीन स्थिति में :" : "in case of emergency :"}</p>
                    <p className="text-[11px] font-black text-gray-800 leading-tight">84620 30001</p>
                  </div>
                </div>

                {/* Clinic Name */}
                <div className="border-t border-b border-gray-300 py-1.5 mb-2 flex items-center justify-center relative bg-gray-50/30">
                  <img src="/logo.png.png" alt="Logo" className="h-8 absolute left-2 object-contain mix-blend-multiply" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <h2 className="text-[22px] font-black text-[#1a2b4c] tracking-wide text-center w-full">
                    {isHi ? "डॉ. त्रिवेदी होम्योपैथिक क्लिनिक" : "Dr. Trivedi Homeopathic Clinic"}
                  </h2>
                </div>

                {/* Addresses */}
                <div className="flex justify-between w-full mb-1 gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">लिली चौक, बरई मंदिर गली, पुरानी बस्ती, रायपुर (छ.ग.)</p>
                    <p className="text-[10.5px] font-black text-gray-800 leading-tight mb-1 mt-0.5">मो. 7772043001</p>
                    <div className="bg-[#1a2b4c] text-white text-[8.5px] py-1 px-1 tracking-wide font-bold">
                      समय प्रातः 11 बजे से 2 बजे तक | सायं 6 बजे से 9 बजे तक | रविवार : सुबह 11 से 3 बजे तक
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">सेक्टर 5, मंडी गेट के पास, देवेन्द्र नगर, सेंट मेरी स्कूल के सामने, रायपुर (छ.ग.)</p>
                    <p className="text-[10.5px] font-black text-gray-800 leading-tight mb-1 mt-0.5">मो. 7773043001</p>
                    <div className="bg-[#1a2b4c] text-white text-[8.5px] py-1 px-1 tracking-wide font-bold">
                      प्रति मंगलवार प्रातः 11.00 से शाम 06.00 बजे तक
                    </div>
                  </div>
                </div>

                {/* Social Links */}
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
            transform: none !important;
            padding-top: 8mm !important;
            padding-bottom: 5mm !important;
            padding-left: 10mm !important;
            padding-right: 10mm !important;
          }
          * {
            transform: none !important;
            contain: none !important;
            perspective: none !important;
            filter: none !important;
          }
          .print-table {
            flex: 1 !important;
            height: 100% !important;
          }
          .print-tbody-row {
            height: 100% !important;
          }
          .print-footer {
            page-break-inside: avoid;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
