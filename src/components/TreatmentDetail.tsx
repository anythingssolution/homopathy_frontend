import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Stethoscope, ArrowRight, HeartPulse, Sparkles, ShieldCheck,
  Calendar, ArrowLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRelatedTreatments, treatmentMatchesKey, treatmentPath, treatmentPublicSlug } from '../data/treatmentsData';
import { usePublicSeo } from '../hooks/usePublicSeo';
import { usePublicTreatments } from '../hooks/usePublicTreatments';
import { treatmentSeo } from '../seo/publicPages';
import TreatmentCardBackdrop from './TreatmentCardBackdrop';

export default function TreatmentDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { treatments, isLoading } = usePublicTreatments();
  const treatment = treatments.find((item) => treatmentMatchesKey(item, slug));
  const related = treatment ? getRelatedTreatments(treatment.id, 3, treatments) : [];

  const pageSeo = useMemo(
    () =>
      treatment
        ? treatmentSeo(treatment)
        : {
            title: 'Treatment Not Found | Dr. Trivedi’s Homeopathy',
            description: 'The requested homeopathic treatment page was not found.',
            path: `/treatments/${slug}`,
            image: undefined as string | undefined,
            jsonLd: null,
          },
    [treatment, slug]
  );

  usePublicSeo({
    title: pageSeo.title,
    description: pageSeo.description,
    path: pageSeo.path,
    image: pageSeo.image,
    jsonLd: pageSeo.jsonLd,
  });

  if (treatment && slug !== treatmentPublicSlug(treatment)) {
    return <Navigate to={treatmentPath(treatment)} replace />;
  }

  if (!treatment && isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDF7] flex items-center justify-center px-6 py-32 text-public-heading font-bold">
        Loading treatment…
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="min-h-screen bg-[#FDFDF7] flex items-center justify-center px-6 py-32">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-black text-public-heading uppercase tracking-tight mb-4">
            Treatment not found
          </h1>
          <p className="text-public-body font-medium mb-8">
            This treatment page does not exist. Browse all specialized treatments instead.
          </p>
          <Link
            to="/treatments"
            className="inline-flex items-center gap-2 bg-public-action text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> All Treatments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDF7] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(84,158,158,0.10),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(242,208,107,0.14),transparent_36%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <nav className="text-[10px] sm:text-xs text-public-muted flex flex-wrap items-center gap-2 font-black uppercase tracking-[0.22em] mb-8 sm:mb-10">
          <Link to="/" className="hover:text-public-heading transition-colors">{t('common.home')}</Link>
          <span className="opacity-30">/</span>
          <Link to="/treatments" className="hover:text-public-heading transition-colors">{t('common.treatments')}</Link>
          <span className="opacity-30">/</span>
          <span className="text-public-heading">{treatment.en}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)] gap-8 lg:gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:sticky lg:top-32"
          >
            <div className="relative overflow-hidden rounded-[36px] border border-[#549E9E]/15 bg-white shadow-[0_18px_50px_rgba(36,95,98,0.08)]">
              <div className="flex min-h-[280px] sm:min-h-[360px] lg:min-h-[520px] items-center justify-center bg-gradient-to-br from-[#EAF5F7] via-[#F7FBFC] to-[#F4EED8] p-4 sm:p-6">
                {treatment.image ? (
                  <img
                    src={encodeURI(treatment.image)}
                    alt={`${treatment.en} homeopathic treatment in Raipur`}
                    className="max-h-[240px] sm:max-h-[320px] lg:max-h-[480px] w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-public-heading/50">
                    <HeartPulse size={48} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Image coming soon</span>
                  </div>
                )}
              </div>
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 shadow-sm border border-white">
                <Stethoscope size={13} className="text-public-heading" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-public-heading">
                  {treatment.category}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-white/90 rounded-[36px] border border-gray-100 shadow-sm p-6 sm:p-9 lg:p-10"
          >
            <div className="flex items-center gap-3 text-public-heading/70 mb-4">
              <div className="w-8 h-[1px] bg-current" />
              <span className="text-[10px] font-black tracking-[0.35em] uppercase">
                {treatment.category} Specialist Care
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black text-public-heading tracking-tighter uppercase leading-[0.92] mb-3">
              {treatment.en}
              <span className="mt-3 block text-sm sm:text-base font-bold tracking-[0.14em] normal-case text-public-heading/70">
                Homeopathic {treatment.en} treatment in Raipur
              </span>
            </h1>
            <p className="text-lg sm:text-xl font-bold text-public-body mb-5">{treatment.hi}</p>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-12 h-1 bg-[#F2D06B] rounded-full" />
              <div className="w-6 h-1 bg-[#549E9E]/40 rounded-full" />
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 text-public-heading mb-3">
                <Sparkles size={16} className="text-[#F2D06B]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">
                  {t('treatments_page.about_treatment') || 'About The Treatment'}
                </h2>
              </div>
              <p className="text-public-body text-base sm:text-lg leading-relaxed font-medium">
                {treatment.description}
              </p>
            </div>

            {treatment.remedies && treatment.remedies.length > 0 && (
              <div className="p-5 bg-[#FDFDF7] rounded-[24px] border border-[#F2D06B]/35 mb-8">
                <h2 className="text-[11px] font-black text-[#8A6D1B] uppercase tracking-wider mb-3">
                  Homeopathic Remedies Mentioned
                </h2>
                <div className="flex flex-wrap gap-2">
                  {treatment.remedies.map((remedy) => (
                    <span key={remedy} className="bg-white border border-[#F2D06B]/50 px-3 py-1.5 rounded-full text-xs font-bold text-public-body">
                      {remedy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-9">
              <div className="p-4 bg-[#EAF5F7] rounded-2xl border border-[#549E9E]/15 flex items-start gap-3">
                <ShieldCheck className="text-public-heading shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-[11px] font-black text-public-heading uppercase tracking-wider">
                    {t('treatments_page.safety_first') || 'Safe & Natural'}
                  </h3>
                  <p className="text-[11px] text-public-muted font-medium leading-snug mt-1">
                    {t('treatments_page.natural_side_effect_free') || 'No side-effects or heavy painkillers.'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-[#FBF6E8] rounded-2xl border border-[#F2D06B]/40 flex items-start gap-3">
                <Sparkles className="text-[#C9A227] shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-[11px] font-black text-public-heading uppercase tracking-wider">
                    {t('treatments_page.deep_healing') || 'Root Cause Care'}
                  </h3>
                  <p className="text-[11px] text-public-muted font-medium leading-snug mt-1">
                    {t('treatments_page.treating_root_causes') || 'Prevents recurrence naturally.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                to="/booking"
                className="inline-flex items-center justify-center gap-2 bg-public-action text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-[#549E9E]/20 hover:bg-[#245F62] transition-colors"
              >
                <Calendar size={16} />
                {t('hero.cta_book') || 'Book Appointment'}
              </Link>
              <Link
                to="/treatments"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest text-public-heading border border-[#549E9E]/20 hover:bg-[#EAF5F7] transition-colors"
              >
                <ArrowLeft size={16} />
                {t('about_page.view_detailed_services') || 'All Treatments'}
              </Link>
            </div>
          </motion.article>
        </div>

        {related.length > 0 && (
          <div className="mt-16 lg:mt-20">
            <div className="flex items-end justify-between gap-4 mb-7">
              <h2 className="text-2xl sm:text-3xl font-black text-public-heading uppercase tracking-tight">
                Related Treatments
              </h2>
              <div className="hidden sm:block w-24 h-[1px] bg-[#549E9E]/20 mb-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className="group relative isolate flex flex-col rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm hover:border-[#549E9E]/30 hover:shadow-lg hover:shadow-[#549E9E]/10 transition-all"
                >
                  <Link
                    to={treatmentPath(item)}
                    className="absolute inset-0 z-10 rounded-[32px] cursor-pointer"
                    aria-label={`${item.en} homeopathic treatment in Raipur`}
                  />
                  <TreatmentCardBackdrop image={item.image} />
                  <div className="relative mb-4 h-40 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#EAF5F7] to-[#F4EED8]">
                    {item.image ? (
                      <img src={encodeURI(item.image)} alt={`${item.en} homeopathic treatment in Raipur`} className="h-full w-full object-contain p-3" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <HeartPulse className="text-public-heading" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-public-heading mb-1">
                    {item.en}
                  </h3>
                  <p className="text-sm text-public-body line-clamp-2 mb-4">{item.description}</p>
                  <span className="mt-auto inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-public-heading">
                    {t('treatments_page.i_want_details')}
                    <ArrowRight size={14} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
