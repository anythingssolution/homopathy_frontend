import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, Search, Filter, ArrowRight, HeartPulse,
  Activity, Zap, Sparkles, X, ShieldCheck, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';

export interface TreatmentItem {
  id: string;
  en: string;
  hi: string;
  category: string;
  description: string;
}

export const treatments: TreatmentItem[] = [
  { id: "kidney-stones", en: "Kidney Stones", hi: "गुर्दे की पथरी", category: "Vital", description: "Safe and effective homeopathic treatment to help dissolve and pass kidney stones naturally while preventing recurrence." },
  { id: "arthritis", en: "Arthritis", hi: "गठिया", category: "Pain", description: "Comprehensive care for joint inflammation and pain, focusing on improving mobility and reducing stiffness without side effects." },
  { id: "asthma", en: "Asthma", hi: "दमा", category: "Respiratory", description: "Holistic management of respiratory distress and wheezing by strengthening the immune system and reducing allergic sensitivity." },
  { id: "acne", en: "Acne (Pimples)", hi: "मुँहासे (पिंपल्स)", category: "Skin", description: "Deep-acting remedies to treat the hormonal and constitutional root causes of acne for clear, healthy skin." },
  { id: "allergies", en: "Allergies", hi: "एलर्जी", category: "Immune", description: "Natural desensitization to allergens like dust and pollen to provide long-term relief from recurrent sneezing and itching." },
  { id: "back-pain", en: "Back Pain", hi: "पीठ दर्द", category: "Pain", description: "Specialized remedies for acute and chronic backache, addressing muscular strain, nerve issues, and structural support." },
  { id: "bone-disorders", en: "Bone-related Disorders", hi: "हड्डियों से संबंधित विकार", category: "Orthopedic", description: "Supportive care for bone density and strength, treating various degenerative and structural bone conditions." },
  { id: "cervical", en: "Cervical Spondylitis", hi: "सर्वाइकल स्पॉन्डिलाइटिस", category: "Orthopedic", description: "Effective relief from neck pain, stiffness, and radiating numbness through gentle homeopathic intervention." },
  { id: "autism", en: "Autism", hi: "ऑटिज़्म", category: "Mental", description: "Supportive constitutional treatment focusing on behavioral improvements and developmental support for children." },
  { id: "hip-pain", en: "Hip Pain", hi: "कूल्हे का दर्द", category: "Pain", description: "Addressing hip joint issues, bursitis, and referred pain to restore comfortable movement and posture." },
  { id: "eye-disorders", en: "Eye Disorders", hi: "आंखों के विकार", category: "Specialty", description: "Natural support for various eye conditions, focusing on improving ocular health and relieving strain." },
  { id: "mental-health", en: "Mental Health Issues", hi: "मानसिक स्वास्थ्य समस्याएँ", category: "Mental", description: "Compassionate care for anxiety, depression, and stress-related disorders using gentle constitutional remedies." },
  { id: "migraine", en: "Migraine", hi: "माइग्रेन", category: "Neurological", description: "Long-term relief from recurrent headaches and sensitivity by addressing neurological and digestive triggers." },
  { id: "piles", en: "Piles (Hemorrhoids)", hi: "बवासीर (पाइल्स)", category: "Chronic", description: "Non-surgical homeopathic management to reduce pain, swelling, and bleeding while correcting digestive health." },
  { id: "prostate", en: "Prostate Issues", hi: "प्रोस्टेट समस्याएँ", category: "Vital", description: "Safe management of urinary difficulties associated with prostate enlargement through natural remedies." },
  { id: "lower-back-pain", en: "Lower Back Pain", hi: "कमर दर्द", category: "Pain", description: "Targeted treatment for lumbar issues, disc compression, and muscle spasms for lasting relief." },
  { id: "sciatica", en: "Sciatica", hi: "साइटिका", category: "Pain", description: "Effective remedies for nerve-related leg pain and numbness, focusing on reducing inflammation around the sciatic nerve." },
  { id: "slip-disc", en: "Slip Disc", hi: "स्लिप डिस्क", category: "Orthopedic", description: "Non-invasive care for spinal disc issues, helping to reduce pressure and promote natural recovery." },
  { id: "joint-muscular-pain", en: "Joint and Muscular Pain", hi: "जोड़ और मांसपेशियों का दर्द", category: "Pain", description: "Wide-spectrum relief for various muscular strains and joint aches using deep-acting homeopathic medicines." },
  { id: "paralysis", hi: "लकवा", en: "Paralysis", category: "Neurological", description: "Supportive neurological rehabilitation focusing on nerve recovery and muscular stimulation." },
  { id: "thyroid", en: "Thyroid Disorders", hi: "थायरॉयड विकार", category: "Vital", description: "Holistic management of Hypo/Hyperthyroidism by restoring hormonal balance and improving metabolism." },
  { id: "urinary-disorders", en: "Urinary Disorders", hi: "मूत्र संबंधी विकार", category: "Vital", description: "Effective treatment for recurrent UTIs, burning sensation, and other bladder-related issues." },
  { id: "heart-diseases", en: "Heart Diseases", hi: "हृदय रोग", category: "Vital", description: "Supportive cardiac care focusing on strengthening the heart muscle and managing blood pressure naturally." },
  { id: "hair-fall", en: "Hair Fall", hi: "बाल झड़ना", category: "Skin", description: "Constitutional remedies to treat the root causes of hair loss, such as stress, nutrition, and hormonal issues." },
  { id: "herpes", en: "Herpes", hi: "हरपीज", category: "Skin", description: "Natural management of viral outbreaks, focusing on reducing pain and boosting the immune system's response." },
  { id: "infertility", en: "Infertility", hi: "बांझपन", category: "Specialty", description: "Gentle hormonal balancing and reproductive support for both men and women to improve natural fertility." },
  { id: "dental-problems", en: "Dental Problems", hi: "दांतों की समस्याएँ", category: "Specialty", description: "Supportive homeopathic care for gum issues, tooth sensitivity, and recurrent mouth ulcers." },
  { id: "liver-problems", en: "Liver Problems", hi: "लीवर की समस्याएँ", category: "Vital", description: "Natural detoxification and hepatoprotective care for fatty liver, jaundice, and digestive sluggishness." },
  { id: "diarrhea", en: "Diarrhea and Dysentery", hi: "दस्त और पेचिश", category: "Digestive", description: "Rapid and safe relief for intestinal issues and infections while restoring gut health." },
  { id: "leucorrhoea", en: "Leucorrhoea", hi: "श्वेत प्रदर", category: "Specialty", description: "Effective management of female health issues and hormonal imbalances through safe natural remedies." },
  { id: "sexual-health", en: "Sexual Health Problems", hi: "यौन स्वास्थ्य समस्याएँ", category: "Specialty", description: "Confidential and effective constitutional treatment for various male and female sexual wellness issues." },
  { id: "osteoarthritis", en: "Osteoarthritis", hi: "ऑस्टियोआर्थराइटिस", category: "Orthopedic", description: "Focused joint care to reduce friction, pain, and degeneration in weight-bearing joints." },
  { id: "sinusitis", en: "Sinusitis", hi: "साइनसाइटिस", category: "Respiratory", description: "Relief from chronic nasal congestion, headaches, and facial pain by addressing the root of the inflammation." },
  { id: "anemia", en: "Anemia (Blood Deficiency)", hi: "एनीमिया (रक्त की कमी)", category: "Vital", description: "Natural support to improve iron absorption and red blood cell production through constitutional care." },
  { id: "ent", en: "Ear, Nose & Throat Disorders (ENT)", hi: "कान, नाक और गले के विकार (ईएनटी)", category: "Specialty", description: "Comprehensive management of recurrent throat infections, ear pain, and nasal issues." },
  { id: "gynecology", en: "Gynecological Disorders", hi: "स्त्री रोग", category: "Specialty", description: "Safe and effective treatment for PCOD, irregular periods, and other hormonal issues in women." },
  { id: "pediatrics", en: "Pediatric Diseases", hi: "बाल रोग", category: "Pediatric", description: "Gentle and child-friendly remedies for recurrent colds, immunity issues, and growth support." },
  { id: "skin-diseases", en: "Skin Diseases", hi: "त्वचा रोग", category: "Skin", description: "Holistic treatment for Eczema, Psoriasis, and other chronic dermatological conditions." },
  { id: "chronic-diseases", en: "Chronic & Complex Diseases", hi: "पुरानी और जटिल बीमारियाँ", category: "Chronic", description: "Specialized care for long-standing conditions that have not responded to conventional treatments." },
  { id: "obesity", en: "Obesity (Weight Management)", hi: "मोटापा", category: "Chronic", description: "Metabolic correction and constitutional support to manage weight healthily and naturally." },
];

export default function Treatments() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentItem | null>(null);

  const categoriesList = [
    { key: "all", label: t('treatments_page.categories.all') },
    { key: "Vital", label: t('treatments_page.categories.vital') },
    { key: "Pain", label: t('treatments_page.categories.pain') },
    { key: "Orthopedic", label: t('treatments_page.categories.orthopedic') },
    { key: "Respiratory", label: t('treatments_page.categories.respiratory') },
    { key: "Skin", label: t('treatments_page.categories.skin') },
    { key: "Mental", label: t('treatments_page.categories.mental') },
    { key: "Digestive", label: t('treatments_page.categories.digestive') },
    { key: "Chronic", label: t('treatments_page.categories.chronic') },
    { key: "Specialty", label: t('treatments_page.categories.specialty') }
  ];

  const filteredTreatments = treatments.filter(item => {
    const matchesSearch = item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hi.includes(searchTerm);
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FDFDF7]">
      {/* Header Banner */}
      <div className="relative h-[550px]">
        <div className="absolute inset-0">
          <img src="https://www.drtrivedishomeopathy.in/assets/imgs/himg-3.jpeg" className="w-full h-full object-cover" alt="Treatments Cover" />
        </div>
        <div className="absolute inset-0 bg-primary-teal/5" />
      </div>

      {/* Title Section with Rounder Top Edge */}
      <div className="relative pb-20 -mt-16 px-6">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[#FDFDF7] rounded-t-[60px]" />

        <div className="relative z-10 max-w-7xl mx-auto pt-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <ScrollReveal width="100%" direction="right" distance={40}>
              <div className="flex-1">
                <div className="flex items-center gap-4 text-primary-teal opacity-40 mb-6">
                  <div className="w-12 h-[1px] bg-current" />
                  <Stethoscope size={20} />
                  <span className="text-[10px] font-black tracking-[0.4em] uppercase">{t('treatments_page.holistic_care')}</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black text-[#549E9E] tracking-tighter mb-4 leading-none">
                  {t('treatments_page.specialized_treatments').split(' ').map((word, i) => <React.Fragment key={i}>{word}{i === 0 && <br />}</React.Fragment>)}
                </h1>
                <p className="text-[#6A6A50] text-lg lg:text-xl font-medium max-w-xl opacity-70 leading-relaxed">
                  {t('treatments_page.provide_solutions')}
                </p>
                <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-8" />
              </div>
            </ScrollReveal>

            <ScrollReveal width="100%" direction="left" distance={40} delay={0.2}>
              <div className="w-full lg:w-[400px] space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input
                    type="text"
                    placeholder={t('treatments_page.search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-[30px] pl-16 pr-8 py-5 text-sm font-bold text-[#549E9E] placeholder:text-gray-300 focus:ring-2 focus:ring-[#549E9E]/20 transition-all shadow-xl shadow-[#549E9E]/5"
                  />
                </div>
                {/* Breadcrumb */}
                <div className="text-sm text-gray-400 flex items-center gap-2 font-black uppercase tracking-widest px-6">
                  <Link to="/" className="hover:text-primary-teal transition-colors">{t('common.home')}</Link>
                  <span className="opacity-30">/</span>
                  <span className="text-primary-teal">{t('common.treatments')}</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-32">

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-16 px-4">
          <div className="flex items-center gap-3 text-gray-400 mr-4">
            <Filter size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('treatments_page.filter')}:</span>
          </div>
          {categoriesList.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.key ? 'bg-[#549E9E] text-white shadow-lg shadow-[#549E9E]/20' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode='popLayout'>
            {filteredTreatments.map((item, idx) => (
              <motion.div
                layout
                key={item.en}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: (idx % 9) * 0.05 }}
                className="group bg-white rounded-[40px] p-8 border border-gray-100 hover:border-[#549E9E]/20 shadow-sm hover:shadow-2xl hover:shadow-[#549E9E]/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#549E9E]/10 transition-colors">
                      <HeartPulse className="text-[#549E9E]/30 group-hover:text-[#549E9E] transition-colors" size={24} />
                    </div>
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">{t(`treatments_page.categories.${item.category.toLowerCase()}`)}</span>
                  </div>

                  <h3 className="text-xl font-black text-[#549E9E] mb-2 uppercase tracking-tight group-hover:translate-x-2 transition-transform">
                    {item.en}
                  </h3>
                  <p className="text-lg font-bold text-[#6A6A50] opacity-60 mb-6">
                    {item.hi}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                  <button
                    onClick={() => setSelectedTreatment(item)}
                    className="flex items-center gap-2 text-[10px] font-black text-[#549E9E] uppercase tracking-widest group-hover:gap-4 transition-all"
                  >
                    {t('treatments_page.i_want_details')} <ArrowRight size={14} />
                  </button>
                  <Activity size={16} className="text-gray-100 group-hover:text-primary-teal/20 transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredTreatments.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[60px] border border-dashed border-gray-200">
            <div className="inline-block p-6 bg-gray-50 rounded-full mb-6">
              <Search size={40} className="text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-[#549E9E] uppercase tracking-tighter mb-2">{t('treatments_page.no_treatments_found')}</h3>
            <p className="text-gray-400 font-medium">{t('treatments_page.try_searching_different')}</p>
            <button
              onClick={() => { setSearchTerm(""); setActiveCategory("all"); }}
              className="mt-8 px-10 py-4 bg-[#549E9E] text-white rounded-full font-black text-xs uppercase tracking-widest"
            >
              {t('treatments_page.clear_all_filters')}
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <ScrollReveal width="100%" direction="up" distance={50}>
          <div className="mt-32 bg-[#549E9E] rounded-[60px] p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-2xl" />
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>

            <Sparkles className="text-white/20 mx-auto mb-8" size={48} />
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter mb-8 leading-tight">
              {t('treatments_page.cant_find_condition')}<br />
              <span className="opacity-60">{t('treatments_page.treat_over_100')}</span>
            </h2>
            <Link
              to="/contact"
              className="inline-flex items-center gap-4 bg-white text-[#549E9E] px-12 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10"
            >
              {t('treatments_page.ask_our_doctor')} <Zap size={18} fill="currentColor" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedTreatment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTreatment(null)}
              className="absolute inset-0 bg-[#549E9E]/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[50px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedTreatment(null)}
                className="absolute top-8 right-8 z-20 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-all shadow-sm"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto p-10 lg:p-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 pb-12 border-b border-gray-50">
                  <div>
                    <div className="flex items-center gap-3 text-primary-teal/40 mb-4">
                      <Stethoscope size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t(`treatments_page.categories.${selectedTreatment.category.toLowerCase()}`)} Specialist</span>
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black text-[#549E9E] tracking-tight mb-2 uppercase leading-none">
                      {selectedTreatment.en}
                    </h2>
                    <p className="text-2xl font-bold text-[#6A6A50] opacity-60">
                      {selectedTreatment.hi}
                    </p>
                  </div>
                  <div className="w-20 h-20 bg-[#549E9E]/5 rounded-3xl flex items-center justify-center text-[#549E9E] shrink-0">
                    <HeartPulse size={40} />
                  </div>
                </div>

                <div className="grid md:grid-cols-12 gap-12">
                  <div className="md:col-span-7 space-y-8">
                    <div>
                      <h3 className="text-xs font-black text-[#549E9E] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-[#F2D06B]" /> {t('treatments_page.about_treatment')}
                      </h3>
                      <p className="text-[#6A6A50] text-lg lg:text-xl leading-loose font-medium">
                        {selectedTreatment.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-[#FDFDF7] rounded-[30px] border border-gray-50">
                        <ShieldCheck className="text-[#549E9E] mb-3" size={24} />
                        <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-1">{t('treatments_page.safety_first')}</h4>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{t('treatments_page.natural_side_effect_free')}</p>
                      </div>
                      <div className="p-6 bg-[#FDFDF7] rounded-[30px] border border-gray-100">
                        <Zap className="text-[#F2D06B] mb-3" size={24} />
                        <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-1">{t('treatments_page.deep_healing')}</h4>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{t('treatments_page.treating_root_causes')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <div className="bg-[#549E9E] rounded-[40px] p-8 text-white">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">{t('treatments_page.ready_to_recover')}</h4>
                      <h3 className="text-2xl font-black mb-8 leading-tight">{t('treatments_page.book_expert_consultation')}</h3>
                      <Link
                        to="/booking"
                        className="flex items-center justify-center gap-3 bg-white text-[#549E9E] py-5 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10 w-full"
                      >
                        <Calendar size={16} /> {t('hero.cta_book')}
                      </Link>
                      <p className="text-center text-[10px] font-bold mt-6 opacity-40 uppercase tracking-tighter"> Raipur's Top Specialist </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
