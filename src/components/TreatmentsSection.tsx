import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, Search, Filter, ArrowRight, HeartPulse,
  Activity, Sparkles, X, Calendar, Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';
import { treatmentPath } from '../data/treatmentsData';
import { usePublicTreatments } from '../hooks/usePublicTreatments';

export default function TreatmentsSection() {
  const { t } = useTranslation();
  const { treatments } = usePublicTreatments();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

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

  const filteredTreatments = treatments.filter(item => {
    const matchesSearch = item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hi.includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const displayedTreatments = filteredTreatments.slice(0, 6);

  return (
    <section className="relative bg-[#FDFDF7] py-24 overflow-hidden border-t border-gray-100/60" id="treatments-section">
      {/* Soft background accents (no heavy blur — keeps scroll smooth over images) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(84,158,158,0.08),transparent_42%),radial-gradient(circle_at_85%_75%,rgba(242,208,107,0.10),transparent_40%)]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* Section Header */}
        <ScrollReveal width="100%" direction="up" distance={30}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#549E9E]/10 border border-[#549E9E]/20 text-public-heading text-xs font-black uppercase tracking-widest mb-4">
              <Stethoscope size={16} />
              <span>{t('treatments_page.holistic_care') || "Holistic Care & Treatments"}</span>
            </div>

            <h2 className="text-4xl lg:text-6xl font-black text-public-heading tracking-tighter mb-4 leading-tight">
              {t('about_page.treatments_title') || "Treatments We Provide"}
            </h2>
            <p className="text-public-body text-base lg:text-lg font-medium leading-relaxed max-w-2xl mx-auto">
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
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-public-muted" size={18} />
            <input
              type="text"
              placeholder="Search treatment (e.g., Kidney Stones, गठिया, Acne)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-[25px] pl-14 pr-6 py-3.5 text-sm font-bold text-public-heading placeholder:text-public-muted focus:outline-none focus:ring-2 focus:ring-[#549E9E]/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-public-muted hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-2 text-public-muted shrink-0 mr-2">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter:</span>
            </div>
            {categoriesList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-public-action text-white shadow-md shadow-[#549E9E]/20 scale-105'
                    : 'bg-white text-public-muted hover:bg-gray-100/80 border border-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence initial={false}>
            {displayedTreatments.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx, 8) * 0.03 }}
                className="group relative isolate flex [content-visibility:auto] [contain-intrinsic-size:auto_420px] flex-col justify-between rounded-[35px] border border-gray-100 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[#549E9E]/35 hover:shadow-lg hover:shadow-[#549E9E]/10"
              >
                <Link
                  to={treatmentPath(item)}
                  className="absolute inset-0 z-10 rounded-[35px] cursor-pointer"
                  aria-label={`${item.en} homeopathic treatment in Raipur`}
                />
                <div>
                  {/* Image Space Frame */}
                  <div className="relative mb-6 flex h-48 w-full items-center justify-center overflow-hidden rounded-[24px] border border-[#549E9E]/15 bg-gradient-to-br from-[#EAF5F7] via-[#F5F9FA] to-[#E5F2F4] transition-colors duration-300 group-hover:border-[#549E9E]/40">
                    {item.image ? (
                      <img
                        src={encodeURI(item.image)}
                        alt={`${item.en} homeopathic treatment in Raipur`}
                        loading="lazy"
                        decoding="async"
                        width={480}
                        height={192}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-public-heading transition-transform duration-300 group-hover:scale-110">
                          <HeartPulse size={28} className="text-public-heading" />
                        </div>
                        <span className="text-[10px] font-bold text-public-heading/60 uppercase tracking-widest flex items-center gap-1 bg-white/60 px-3 py-1 rounded-full border border-[#549E9E]/10">
                          <ImageIcon size={12} /> Image Space
                        </span>
                      </div>
                    )}
                    
                    {/* Category Badge overlay */}
                    <div className="absolute top-3 right-3 inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-full border border-gray-100 bg-white px-2.5 shadow-sm">
                      <span className="translate-x-[0.07em] text-[9px] font-black uppercase leading-none tracking-[0.14em] text-public-heading">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Header Titles */}
                  <div className="mb-3">
                    <h3 className="text-xl font-black text-public-heading uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-1">
                      {item.en}
                    </h3>
                    <p className="text-base font-bold text-public-body/70">
                      {item.hi}
                    </p>
                  </div>

                  {/* Description Preview */}
                  <p className="text-public-body text-sm leading-relaxed line-clamp-3 mb-4">
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
                  <span className="inline-flex items-center gap-2 text-xs font-black text-public-heading uppercase tracking-widest transition-all duration-300 group-hover:gap-3">
                    <span>View Treatment Details</span>
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                  <Activity size={16} className="text-gray-200 transition-colors duration-300 group-hover:text-public-heading/50" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayedTreatments.length > 0 && (
          <div className="mt-12 flex justify-center">
            <Link
              to="/treatments"
              className="inline-flex items-center justify-center gap-2 bg-public-action hover:bg-[#438383] text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[#549E9E]/20 transition-all cursor-pointer"
            >
              <span>Browse All Treatments</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Empty State */}
        {filteredTreatments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-gray-200">
            <div className="inline-block p-5 bg-gray-50 rounded-full mb-4">
              <Search size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-public-heading uppercase tracking-tight mb-1">
              No matching treatments found
            </h3>
            <p className="text-public-muted text-sm mb-6">Try clearing your search or category filter.</p>
            <button
              onClick={() => { setSearchTerm(""); setActiveCategory("all"); }}
              className="px-8 py-3 bg-public-action text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#438383] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Guidance banner */}
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
            <div className="flex shrink-0 w-full md:w-auto">
              <Link
                to="/booking"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-public-heading hover:bg-gray-50 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-black/10 transition-all text-center cursor-pointer"
              >
                <Calendar size={16} />
                <span>Book Appointment</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
