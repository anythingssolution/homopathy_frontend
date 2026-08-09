import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, Search, Filter, ArrowRight, HeartPulse,
  Activity, Zap, Sparkles, X, ShieldCheck, Calendar, Image as ImageIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';
import { treatmentsData, TreatmentItem } from '../data/treatmentsData';

export { treatmentsData as treatments };
export type { TreatmentItem };

export default function Treatments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentItem | null>(null);

  useEffect(() => {
    if (!selectedTreatment) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new Event('lenis:stop'));

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.dispatchEvent(new Event('lenis:start'));
      window.scrollTo(0, scrollY);
    };
  }, [selectedTreatment]);

  const categoriesList = [
    { key: "all", label: t('treatments_page.categories.all') || "All" },
    { key: "Vital", label: t('treatments_page.categories.vital') || "Vital" },
    { key: "Pain", label: t('treatments_page.categories.pain') || "Pain" },
    { key: "Orthopedic", label: t('treatments_page.categories.orthopedic') || "Orthopedic" },
    { key: "Respiratory", label: t('treatments_page.categories.respiratory') || "Respiratory" },
    { key: "Skin", label: t('treatments_page.categories.skin') || "Skin" },
    { key: "Mental", label: t('treatments_page.categories.mental') || "Mental" },
    { key: "Neurological", label: "Neurological" },
    { key: "Digestive", label: t('treatments_page.categories.digestive') || "Digestive" },
    { key: "Pediatric", label: "Pediatric" },
    { key: "Immune", label: "Immune" },
    { key: "Chronic", label: t('treatments_page.categories.chronic') || "Chronic" },
    { key: "Specialty", label: t('treatments_page.categories.specialty') || "Specialty" }
  ];

  const filteredTreatments = treatmentsData.filter(item => {
    const matchesSearch = item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hi.includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FDFDF7]">
      {/* Header Banner */}
      <div className="relative h-[480px]">
        <div className="absolute inset-0">
          <img src="https://www.drtrivedishomeopathy.in/assets/imgs/himg-3.jpeg" className="w-full h-full object-cover" alt="Treatments Cover" />
        </div>
        <div className="absolute inset-0 bg-[#549E9E]/20 backdrop-brightness-75" />
      </div>

      {/* Title Section with Rounded Top Edge */}
      <div className="relative pb-16 -mt-16 px-6">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[#FDFDF7] rounded-t-[60px]" />

        <div className="relative z-10 max-w-7xl mx-auto pt-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <ScrollReveal width="100%" direction="right" distance={40}>
              <div className="flex-1">
                <div className="flex items-center gap-4 text-[#549E9E] opacity-60 mb-4">
                  <div className="w-12 h-[1px] bg-current" />
                  <Stethoscope size={20} />
                  <span className="text-[10px] font-black tracking-[0.4em] uppercase">{t('treatments_page.holistic_care')}</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black text-[#549E9E] tracking-tighter mb-4 leading-none">
                  {t('treatments_page.specialized_treatments').split(' ').map((word, i) => <React.Fragment key={i}>{word}{i === 0 && <br />}</React.Fragment>)}
                </h1>
                <p className="text-[#6A6A50] text-lg lg:text-xl font-medium max-w-xl opacity-80 leading-relaxed">
                  {t('treatments_page.provide_solutions')}
                </p>
                <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-6" />
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
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
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
              className={`px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.key ? 'bg-[#549E9E] text-white shadow-lg shadow-[#549E9E]/20' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence initial={false}>
            {filteredTreatments.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx, 8) * 0.03 }}
                className="group flex [content-visibility:auto] [contain-intrinsic-size:auto_420px] flex-col justify-between rounded-[40px] border border-gray-100 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[#549E9E]/30 hover:shadow-lg hover:shadow-[#549E9E]/10"
              >
                <div>
                  {/* Image Space Frame */}
                  <div className="relative mb-6 flex h-48 w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#549E9E]/15 bg-gradient-to-br from-[#EAF5F7] via-[#F5F9FA] to-[#E5F2F4] transition-colors duration-300 group-hover:border-[#549E9E]/40">
                    {item.image ? (
                      <img
                        src={encodeURI(item.image)}
                        alt={item.en}
                        loading="lazy"
                        decoding="async"
                        width={480}
                        height={192}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-[#549E9E] transition-transform duration-300 group-hover:scale-110">
                          <HeartPulse size={24} className="text-[#549E9E]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#549E9E]/60 uppercase tracking-widest flex items-center gap-1 bg-white/60 px-3 py-1 rounded-full border border-[#549E9E]/10">
                          <ImageIcon size={12} /> Image Space
                        </span>
                      </div>
                    )}
                    
                    {/* Category Tag */}
                    <div className="absolute top-3 right-3 inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-full border border-gray-100 bg-white px-2.5 shadow-sm">
                      <span className="translate-x-[0.07em] text-[8px] font-black uppercase leading-none tracking-[0.14em] text-[#549E9E]">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <h3 className="mb-1 text-xl font-black uppercase tracking-tight text-[#549E9E] transition-transform duration-300 group-hover:translate-x-1">
                    {item.en}
                  </h3>
                  <p className="text-base font-bold text-[#6A6A50] opacity-70 mb-3">
                    {item.hi}
                  </p>

                  <p className="text-[#6A6A50] text-sm leading-relaxed line-clamp-3 mb-4 opacity-80 font-medium">
                    {item.description}
                  </p>

                  {item.remedies && item.remedies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {item.remedies.map((remedy, rIdx) => (
                        <span key={rIdx} className="text-[10px] font-bold bg-[#F2D06B]/15 text-[#8A6D1B] border border-[#F2D06B]/30 px-2.5 py-0.5 rounded-full">
                          ✨ {remedy}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                  <button
                    onClick={() => setSelectedTreatment(item)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E] transition-all duration-300 group-hover:gap-3"
                  >
                    {t('treatments_page.i_want_details')}
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                  <Activity size={16} className="text-gray-200 transition-colors duration-300 group-hover:text-[#549E9E]/50" />
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
              to="/booking"
              className="inline-flex items-center gap-4 bg-white text-[#549E9E] px-12 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10"
            >
              {t('treatments_page.ask_our_doctor')} <Zap size={18} fill="currentColor" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

      {/* Details Modal via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedTreatment && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10 overscroll-none"
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTreatment(null)}
                className="absolute inset-0 bg-[#549E9E]/35 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                data-lenis-prevent
                className="relative z-10 flex max-h-[min(85vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-[36px] border border-gray-100 bg-white text-left shadow-2xl"
              >
                {/* Fixed Header */}
                <div className="shrink-0 relative px-6 pt-6 pb-4 md:px-8 md:pt-7 md:pb-5 border-b border-gray-100 bg-gradient-to-r from-[#FDFDF7] via-white to-[#F9FCFC] flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#549E9E] mb-1">
                      <Stethoscope size={16} />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                        {selectedTreatment.category} Specialist Care
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-[#549E9E] tracking-tight uppercase leading-tight">
                      {selectedTreatment.en}
                    </h2>
                    <p className="text-base md:text-lg font-bold text-[#6A6A50] opacity-80 mt-0.5">
                      {selectedTreatment.hi}
                    </p>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedTreatment(null)}
                    className="w-10 h-10 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable body only */}
                <div
                  id="treatment-modal-scroll-area"
                  data-lenis-prevent
                  className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6 md:p-8"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#549E9E]">
                      <Sparkles size={16} className="text-[#F2D06B]" />
                      <h3 className="text-xs font-black uppercase tracking-[0.2em]">
                        {t('treatments_page.about_treatment') || "About The Treatment"}
                      </h3>
                    </div>
                    <p className="text-[#6A6A50] text-base md:text-lg leading-relaxed font-medium">
                      {selectedTreatment.description}
                    </p>

                    {selectedTreatment.remedies && selectedTreatment.remedies.length > 0 && (
                      <div className="p-4 bg-[#FDFDF7] rounded-2xl border border-[#F2D06B]/30">
                        <h4 className="text-[11px] font-black text-[#8A6D1B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span>✨ Homeopathic Remedies Mentioned</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTreatment.remedies.map((remedy, rIdx) => (
                            <span key={rIdx} className="bg-white border border-[#F2D06B]/50 px-3 py-1 rounded-full text-xs font-bold text-[#6A6A50] shadow-xs">
                              {remedy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 flex items-start gap-3">
                        <ShieldCheck className="text-[#549E9E] shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-[11px] font-black text-[#549E9E] uppercase tracking-wider">
                            {t('treatments_page.safety_first') || "Safe & Natural"}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium leading-snug">
                            {t('treatments_page.natural_side_effect_free') || "No side-effects or heavy painkillers."}
                          </p>
                        </div>
                      </div>
                      <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100/60 flex items-start gap-3">
                        <Zap className="text-[#F2D06B] shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-[11px] font-black text-[#549E9E] uppercase tracking-wider">
                            {t('treatments_page.deep_healing') || "Root Cause Care"}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium leading-snug">
                            {t('treatments_page.treating_root_causes') || "Prevents recurrence naturally."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed footer CTA — always fully visible */}
                <div className="shrink-0 border-t border-gray-100 bg-gradient-to-r from-[#549E9E] to-[#3E7A7A] p-4 md:p-5 text-white">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#F2D06B] text-[9px] font-black uppercase tracking-widest">
                        <Sparkles size={11} />
                        <span>{t('treatments_page.ready_to_recover') || "Ready to recover?"}</span>
                      </div>
                      <h4 className="text-base md:text-lg font-black tracking-tight leading-snug">
                        {t('treatments_page.book_expert_consultation') || "Book your expert consultation"}
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTreatment(null);
                        navigate('/booking');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#549E9E] hover:bg-emerald-50 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer"
                    >
                      <Calendar size={15} />
                      <span>{t('hero.cta_book') || "Book Appointment"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
