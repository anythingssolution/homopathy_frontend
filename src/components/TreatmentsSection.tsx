import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, Search, Filter, ArrowRight, HeartPulse,
  Activity, Zap, Sparkles, X, ShieldCheck, Calendar, Image as ImageIcon, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';
import { treatmentsData, TreatmentItem } from '../data/treatmentsData';

export default function TreatmentsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentItem | null>(null);

  useEffect(() => {
    if (selectedTreatment) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        const storedY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (storedY) {
          window.scrollTo(0, parseInt(storedY || '0', 10) * -1);
        }
      };
    }
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
    <section className="relative bg-[#FDFDF7] py-24 overflow-hidden border-t border-gray-100/60" id="treatments-section">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-[-10%] w-[45%] aspect-square bg-[#549E9E]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-10%] w-[45%] aspect-square bg-[#F2D06B]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Section Header */}
        <ScrollReveal width="100%" direction="up" distance={30}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#549E9E]/10 border border-[#549E9E]/20 text-[#549E9E] text-xs font-black uppercase tracking-widest mb-4">
              <Stethoscope size={16} />
              <span>{t('treatments_page.holistic_care') || "Holistic Care & Treatments"}</span>
            </div>

            <h2 className="text-4xl lg:text-6xl font-black text-[#549E9E] tracking-tighter mb-4 leading-tight">
              {t('about_page.treatments_title') || "Treatments We Provide"}
            </h2>
            <p className="text-[#6A6A50] text-base lg:text-lg font-medium opacity-80 leading-relaxed max-w-2xl mx-auto">
              {t('about_page.treatments_subtitle') || "Effective, personalized, and root-cause homeopathic solutions for acute and chronic conditions."}
            </p>
            <div className="flex justify-center gap-1.5 mt-6">
              <div className="w-12 h-1 bg-[#F2D06B] rounded-full" />
              <div className="w-12 h-1 bg-[#549E9E]/30 rounded-full" />
              <div className="w-12 h-1 bg-[#549E9E]/60 rounded-full" />
            </div>
          </div>
        </ScrollReveal>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 bg-white/70 backdrop-blur-md p-6 rounded-[35px] border border-gray-100 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search treatment (e.g., Kidney Stones, गठिया, Acne)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-[25px] pl-14 pr-6 py-3.5 text-sm font-bold text-[#549E9E] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#549E9E]/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-2 text-gray-400 shrink-0 mr-2">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter:</span>
            </div>
            {categoriesList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20 scale-105'
                    : 'bg-white text-gray-500 hover:bg-gray-100/80 border border-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTreatments.map((item, idx) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: (idx % 6) * 0.05 }}
                className="group bg-white rounded-[35px] p-6 border border-gray-100 hover:border-[#549E9E]/30 shadow-sm hover:shadow-xl hover:shadow-[#549E9E]/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Image Space Frame */}
                  <div className="relative w-full h-48 mb-6 rounded-[24px] overflow-hidden bg-gradient-to-br from-[#EAF5F7] via-[#F5F9FA] to-[#E5F2F4] border border-[#549E9E]/15 flex items-center justify-center group-hover:border-[#549E9E]/40 transition-colors">
                    {item.image ? (
                      <img
                        src={encodeURI(item.image)}
                        alt={item.en}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-[#549E9E] mb-2 group-hover:scale-110 transition-transform">
                          <HeartPulse size={28} className="text-[#549E9E]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#549E9E]/60 uppercase tracking-widest flex items-center gap-1 bg-white/60 px-3 py-1 rounded-full border border-[#549E9E]/10">
                          <ImageIcon size={12} /> Image Space
                        </span>
                      </div>
                    )}
                    
                    {/* Category Badge overlay */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                      <span className="text-[9px] font-black text-[#549E9E] uppercase tracking-widest">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Header Titles */}
                  <div className="mb-3">
                    <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-tight group-hover:text-primary-teal transition-colors">
                      {item.en}
                    </h3>
                    <p className="text-base font-bold text-[#6A6A50]/70">
                      {item.hi}
                    </p>
                  </div>

                  {/* Description Preview */}
                  <p className="text-[#6A6A50] text-sm leading-relaxed line-clamp-3 mb-4 opacity-80">
                    {item.description}
                  </p>

                  {/* Remedy Pills if available */}
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

                {/* Card Footer */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-2">
                  <button
                    onClick={() => setSelectedTreatment(item)}
                    className="inline-flex items-center gap-2 text-xs font-black text-[#549E9E] uppercase tracking-widest hover:gap-3 transition-all group-hover:text-[#3B7A7A]"
                  >
                    <span>View Treatment Details</span>
                    <ArrowRight size={14} />
                  </button>
                  <Activity size={16} className="text-gray-200 group-hover:text-[#549E9E]/40 transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredTreatments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-gray-200">
            <div className="inline-block p-5 bg-gray-50 rounded-full mb-4">
              <Search size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-tight mb-1">
              No matching treatments found
            </h3>
            <p className="text-gray-400 text-sm mb-6">Try clearing your search or category filter.</p>
            <button
              onClick={() => { setSearchTerm(""); setActiveCategory("all"); }}
              className="px-8 py-3 bg-[#549E9E] text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#438383] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* View All / Explore Banner */}
        <ScrollReveal width="100%" direction="up" distance={30}>
          <div className="mt-16 bg-gradient-to-r from-[#549E9E] to-[#438383] rounded-[40px] p-8 lg:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-black uppercase tracking-widest mb-3">
                <Sparkles size={14} className="text-[#F2D06B]" /> 100+ Specialized Conditions Treated
              </div>
              <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight mb-2">
                Need Guidance For Your Specific Health Condition?
              </h3>
              <p className="text-white/80 text-sm max-w-xl font-medium">
                Our expert homeopathic physicians design customized treatment plans tailored to your exact physical and emotional symptoms.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto">
              <Link
                to="/treatments"
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all text-center"
              >
                <span>Browse All Treatments</span>
              </Link>
              <Link
                to="/booking"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#549E9E] hover:bg-gray-50 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-black/10 transition-all text-center"
              >
                <Calendar size={16} />
                <span>Book Appointment</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </div>

      {/* Details Modal via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedTreatment && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-10">
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
                className="relative w-full max-w-3xl bg-white rounded-[36px] shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh] z-10 border border-gray-100 text-left"
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

                {/* Dedicated Scrollable Body Content inside Modal Box */}
                <div id="treatment-section-modal-scroll-area" className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-6 overscroll-contain">

                  {/* Treatment Details & About Section */}
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

                    {/* Homeopathic Remedies List */}
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

                    {/* Safety & Healing Badges */}
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

                  {/* Compact Horizontal Consultation CTA Section */}
                  <div className="bg-gradient-to-r from-[#549E9E] to-[#3E7A7A] rounded-2xl p-5 md:p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#F2D06B] text-[9px] font-black uppercase tracking-widest">
                        <Sparkles size={11} />
                        <span>{t('treatments_page.ready_to_recover') || "Ready to recover?"}</span>
                      </div>
                      <h4 className="text-base md:text-lg font-black tracking-tight leading-snug">
                        {t('treatments_page.book_expert_consultation') || "Book your expert consultation"}
                      </h4>
                      <p className="text-xs text-white/85 font-medium max-w-md leading-relaxed">
                        Consult Dr. Uttkarsh Trivedi for a personalized treatment plan for <span className="font-bold underline decoration-[#F2D06B]/50">{selectedTreatment.en}</span>.
                      </p>
                    </div>

                    <div className="flex flex-col items-center sm:items-end shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setSelectedTreatment(null);
                          navigate('/booking');
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#549E9E] hover:bg-emerald-50 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-md hover:scale-102 transition-all cursor-pointer"
                      >
                        <Calendar size={15} />
                        <span>{t('hero.cta_book') || "Book Appointment"}</span>
                      </button>
                      <span className="text-[9px] font-extrabold text-[#F2D06B] uppercase tracking-widest mt-2 bg-black/10 px-2.5 py-0.5 rounded-full">
                        Raipur's Top Specialist
                      </span>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
