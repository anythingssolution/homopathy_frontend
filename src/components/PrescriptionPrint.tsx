import React from 'react';
import { Mail, Phone, MapPin, Pill, Activity, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { getDosePreview, getMedicationRoleLabel } from '../utils/prescriptionFormat';

interface PrescriptionPrintProps {
  consultation: any;
  appointment: any;
}

const DoseVisual = ({ medication }: { medication: any }) => {
  const doses = Array.isArray(medication?.doses) ? medication.doses : [];
  const validDoses = doses.filter((d: any) => Number(d.balls_per_dose) > 0);

  if (validDoses.length === 0) {
    return <span className="font-black text-[10px] text-[#cc3333] uppercase tracking-widest">No dose details</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {validDoses.map((dose: any, idx: number) => {
          const balls = Number(dose.balls_per_dose);
          return (
            <React.Fragment key={idx}>
              <div className="flex items-center justify-center w-[16px] h-[16px] rounded-full border-[1.5px] border-black bg-white z-10 shrink-0 shadow-sm">
                <span className="text-[9px] font-black text-black leading-none tracking-tight mt-[1px]">
                  {balls}
                </span>
              </div>
              {idx < validDoses.length - 1 && (
                <div className="w-2 h-[1.5px] bg-black -mx-[1px] z-0"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default function PrescriptionPrint({ consultation, appointment }: PrescriptionPrintProps) {
  const allMeds = consultation?.medications || consultation?.prescription?.medications || [];
  const tests = consultation?.tests || [];
  const numericMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'NUMERIC');
  const textMeds = allMeds.filter((m: any) => m.medicine_type?.toUpperCase() === 'TEXT');

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
              <div className="flex flex-col w-full mb-4">
                {/* Top Center Text */}
                <div className="text-center space-y-0 mb-3">
                  <div className="text-[#cc3333] text-sm font-bold">ॐ</div>
                  <div className="text-[#cc3333] text-[10px] font-bold">।। सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः ।।</div>
                  <div className="text-[#1a2b4c] text-[10px] font-bold">संस्थापक : डॉ. विद्याकांत त्रिवेदी</div>
                </div>

                {/* Lower Header Section */}
                <div className="flex items-start justify-between w-full relative mt-2">
                  {/* Stethoscope */}
                  <div className="relative z-10 shrink-0 flex flex-col">
                    <svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="#549E9E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M 11 11 L 14 10 M 37 11 L 34 10" strokeWidth="3.5" />
                      <path d="M 14 10 L 16 25 A 8 8 0 0 0 32 25 L 34 10" />
                      <path d="M 24 33 V 55 A 11 11 0 0 0 46 55 V 40 A 5 5 0 0 1 51 35 H 60" />
                    </svg>
                  </div>

                  <div className="flex-1 flex flex-col relative z-0">
                    {/* The Connecting Line */}
                    <div className="absolute top-[33.75px] left-0 right-1 h-[2.5px] bg-[#549E9E]">
                      <div className="absolute -right-[5px] -top-[3.75px] w-[10px] h-[10px] rounded-full bg-[#549E9E]"></div>
                    </div>

                    {/* The Text Content Block */}
                    <div className="flex flex-col items-end pr-1">
                      <h1 className="text-[30px] font-black text-[#1a2b4c] tracking-wide leading-none">डॉ. उत्कर्ष त्रिवेदी</h1>

                      <div className="flex flex-col items-end mt-4">
                        <p className="text-[13px] font-bold text-gray-800 leading-tight">होम्योपैथिक चिकित्सक</p>
                        <p className="text-[13px] font-bold text-gray-800 leading-tight mt-0.5">बी.एच.एम.एस.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-gray-700 whitespace-nowrap mt-0 mb-4 px-1">
                  Patient ID: <span className="text-[#3b4b8a] ml-1 font-serif text-sm tracking-widest italic">{appointment.patient_uuid}</span>
                </div>
              </div>

              {/* Patient & Consultation Info (Dotted Layout) */}
              <div className="w-full mb-8 font-bold text-gray-800 text-[13px] space-y-5 px-2 mt-4">
                <div className="flex gap-2 items-end w-[40%]">
                  <span>Date :</span>
                  <div className="flex-1 flex items-end gap-2 pb-0.5 text-[#1a2b4c] text-center">
                    <span className="border-b-[1.5px] border-dotted border-gray-400 flex-1 px-1">
                      {new Date(appointment.appointment_date).toLocaleDateString('en-GB', { day: '2-digit' })}
                    </span>
                    <span className="text-gray-800 font-bold">/</span>
                    <span className="border-b-[1.5px] border-dotted border-gray-400 flex-1 px-1">
                      {new Date(appointment.appointment_date).toLocaleDateString('en-GB', { month: '2-digit' })}
                    </span>
                    <span className="text-gray-800 font-bold">/</span>
                    <span className="border-b-[1.5px] border-dotted border-gray-400 flex-[1.5] px-1">
                      {new Date(appointment.appointment_date).toLocaleDateString('en-GB', { year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end gap-4 w-full">
                  <div className="flex gap-2 items-end flex-[2.5]">
                    <span>Name :</span>
                    <div className="border-b-[1.5px] border-dotted border-gray-400 flex-1 pb-0.5 text-center px-2 text-[#1a2b4c] uppercase">
                      {appointment.patient_full_name}
                    </div>
                  </div>
                  <div className="flex gap-2 items-end flex-1">
                    <span>Age :</span>
                    <div className="border-b-[1.5px] border-dotted border-gray-400 flex-1 pb-0.5 text-center px-2 text-[#1a2b4c]">
                      {appointment.patient_age || 'N/A'} Y
                    </div>
                  </div>
                  <div className="flex gap-2 items-end flex-1">
                    <span>Sex :</span>
                    <div className="border-b-[1.5px] border-dotted border-gray-400 flex-1 pb-0.5 text-center px-2 text-[#1a2b4c] capitalize">
                      {appointment.patient_gender || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-end w-full">
                  <span>Treatment :</span>
                  <div className="border-b-[1.5px] border-dotted border-gray-400 flex-1 pb-0.5 text-center px-2 text-[#1a2b4c] uppercase tracking-wider">
                    {appointment.treatment_name}
                  </div>
                </div>
              </div>

              {/* Two Column Layout for Clinical Details & Prescriptions */}
              <div className="flex items-start w-full gap-8 mt-2">
                {/* LEFT COLUMN: Vitals, Findings, Advice */}
                <div className="w-[45%] flex flex-col gap-6">

                  {/* Vitals */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-1 border-b border-[#549E9E]/20 pb-1 flex items-center gap-2">
                      <Activity size={12} /> Consultation Mode & Vitals
                    </h3>

                    <div className="flex items-center text-xs font-bold text-gray-800">
                      <span className="w-28 text-[10px] text-[#549E9E] uppercase font-black">Mode</span>
                      <span>{consultation.consultation_mode === 'ON_CALL' ? 'On Call' : 'Physical'}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-gray-800">
                      <span className="w-28 text-[10px] text-[#549E9E] uppercase font-black">B/P</span>
                      <span>{consultation.blood_pressure || '—'}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-gray-800">
                      <span className="w-28 text-[10px] text-[#549E9E] uppercase font-black">SpO2</span>
                      <span>{consultation.oxygen_saturation || '—'}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-gray-800">
                      <span className="w-28 text-[10px] text-[#549E9E] uppercase font-black">Height</span>
                      <span>{consultation.patient_height || '—'}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-gray-800">
                      <span className="w-28 text-[10px] text-[#549E9E] uppercase font-black">Weight</span>
                      <span>{consultation.patient_weight || '—'}</span>
                    </div>
                  </div>

                  {/* Clinical Findings */}
                  <div>
                    <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-2 border-b border-[#549E9E]/20 pb-1">Clinical Findings</h3>
                    <div className="text-xs font-medium text-gray-700 whitespace-pre-wrap">
                      {consultation.symptoms || appointment.symptoms || 'No symptoms recorded.'}
                    </div>
                  </div>

                  {/* Treatment Advice */}
                  <div>
                    <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-2 border-b border-[#549E9E]/20 pb-1">Treatment Advice</h3>
                    <div className="text-xs font-medium text-gray-600 whitespace-pre-wrap">
                      {consultation.treatment_advice || 'No specific advice recorded.'}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Medications and Tests in a Box */}
                <div className="flex-1">
                  <div className="border-[1.5px] border-[#cc3333]/60 p-4 rounded-lg bg-white flex flex-col gap-5 min-h-[300px]">

                    {/* Remedies */}
                    <div>
                      <div className="flex justify-between items-end mb-3 border-b border-[#cc3333]/20 pb-1">
                        <h3 className="text-[11px] font-black text-[#cc3333] uppercase tracking-widest">Homeopathic Remedies</h3>
                        {consultation.medication_duration_days && (
                          <span className="text-[9px] font-black text-[#cc3333] uppercase tracking-widest bg-[#cc3333]/10 px-2 py-0.5 rounded-sm">
                            {consultation.medication_duration_days} DAYS
                          </span>
                        )}
                      </div>

                      {numericMeds.length > 0 ? (
                        <table className="w-full border-collapse text-center">
                          <thead>
                            <tr className="bg-red-50/50">
                              <th className="border border-[#cc3333]/20 p-1.5 text-[9px] font-black text-gray-600 uppercase">Remedy Name</th>
                              <th className="border border-[#cc3333]/20 p-1.5 text-[9px] font-black text-gray-600 uppercase">Schedule</th>
                            </tr>
                          </thead>
                          <tbody>
                            {numericMeds.map((med: any, idx: number) => (
                              <tr key={idx}>
                                <td className="border border-[#cc3333]/20 p-1.5 font-bold text-gray-800 text-[10px]">
                                  Remedy No. {med.medicine_value}
                                </td>
                                <td className="border border-[#cc3333]/20 p-1.5 text-center">
                                  <div className="flex justify-center">
                                    <DoseVisual medication={med} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic">No homeopathic remedies prescribed.</p>
                      )}
                    </div>

                    {/* Other Medications */}
                    {textMeds.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-black text-[#cc3333] uppercase tracking-widest mb-3 border-b border-[#cc3333]/20 pb-1">Other Medications / Syrups</h3>
                        <div className="p-2 bg-red-50/30 border border-[#cc3333]/20 rounded-lg text-[10px] font-bold text-gray-800 space-y-1.5">
                          {textMeds.map((m: any, idx: number) => {
                            const roleLabel = getMedicationRoleLabel(m);
                            return (
                              <div key={idx} className="flex flex-col">
                                {roleLabel && (
                                  <div className="mb-0.5">
                                    <span className="px-1.5 py-0.5 rounded-md bg-[#cc3333]/10 text-[#cc3333] text-[8px] font-black uppercase tracking-widest">
                                      {roleLabel}
                                    </span>
                                  </div>
                                )}
                                <div className="text-[10px] font-bold text-gray-800">{m.medicine_value}</div>
                                {m.remark && <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{m.remark}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tests */}
                    {tests.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-black text-[#cc3333] uppercase tracking-widest mb-3 border-b border-[#cc3333]/20 pb-1">Recommended Tests</h3>
                        <div className="p-3 bg-red-50/30 border border-[#cc3333]/20 rounded-lg text-xs font-bold text-gray-700 space-y-2">
                          {tests.map((test: any, idx: number) => (
                            <div key={idx} className="px-3 py-2 bg-white border border-[#cc3333]/10 rounded-md">
                              {test.test_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                    <h4 className="text-[#cc3333] font-black text-[12px] mb-1">निर्देश एवं परहेज :-</h4>
                    <ol className="text-[10px] font-bold text-gray-800 space-y-0.5 leading-tight list-none">
                      <li>1. बैगन, बीज वाली सब्जी, तेल-मसाला, खटाई अचार कम, रात में दूध एवं दही नहीं।</li>
                      <li>2. औषधि खाने से पहले और बाद में 30 मिनिट तक कुछ भी नहीं खाना चाहिए।</li>
                      <li>3. कृपया पर्ची को साथ अवश्य लावें।</li>
                      <li>4. क्रानिक (जटिल रोगी) कृपया पहले से समय लेकर पधारें।</li>
                    </ol>
                  </div>
                  {/* Appointments Box */}
                  <div className="w-[210px] border-[1.5px] border-[#1a2b4c] rounded-md py-1.5 px-2 text-center shrink-0 bg-white shadow-sm">
                    <h4 className="text-[#cc3333] font-black text-[11px] mb-1">FOR APPOINTMENT :</h4>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Purani Basti : <span className="font-black text-[11px]">77720 43001</span></p>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">Devendra Nagar : <span className="font-black text-[11px]">77730 43001</span></p>
                    <div className="w-full border-t border-[#1a2b4c]/30 my-1"></div>
                    <p className="text-[9px] text-gray-700 leading-tight">in case of emergency :</p>
                    <p className="text-[11px] font-black text-gray-800 leading-tight">84620 30001</p>
                  </div>
                </div>

                {/* Middle section: Clinic Name */}
                <div className="border-t border-b border-gray-300 py-1.5 mb-2 flex items-center justify-center relative bg-gray-50/30">
                  <img src="/logo.png.png" alt="Logo" className="h-8 absolute left-2 object-contain mix-blend-multiply" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <h2 className="text-[22px] font-black text-[#1a2b4c] tracking-wide text-center w-full">डॉ. त्रिवेदी होम्योपैथिक क्लिनिक</h2>
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
            padding-top: 15mm !important;
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
