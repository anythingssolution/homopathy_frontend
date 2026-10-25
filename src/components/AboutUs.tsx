import React from 'react';
import { motion } from 'motion/react';
import { Heart, Users, Microscope, Award, Target, Compass, ShieldCheck, CheckCircle2, History, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { treatmentPath } from '../data/treatmentsData';
import { usePublicTreatments } from '../hooks/usePublicTreatments';
import { usePublicSeo } from '../hooks/usePublicSeo';
import { ABOUT_SEO } from '../seo/publicPages';

export default function AboutUs() {
  const { t } = useTranslation();
  usePublicSeo({
    title: ABOUT_SEO.title,
    description: ABOUT_SEO.description,
    path: ABOUT_SEO.path,
    image: ABOUT_SEO.image,
    jsonLd: ABOUT_SEO.jsonLd,
  });
  
  const awards = t('about_page.awards', { returnObjects: true }) as Array<{ year: string, desc: string }>;
  const reasons = t('about_page.why_choose_reasons', { returnObjects: true }) as Array<{ title: string, desc: string }>;
  const uttkarshReasons = t('about_page.uttkarsh_reasons', { returnObjects: true }) as string[];
  const missionPoints = t('about_page.mission_points', { returnObjects: true }) as string[];
  const { treatments } = usePublicTreatments();
  return (
    <div className="min-h-screen bg-[#FDFDF7] overflow-x-hidden">
      {/* Header Banner */}
      <div className="relative h-[550px]">
        <div className="absolute inset-0">
           <img src="/site-images/images/about-cover.webp" className="w-full h-full object-cover" alt="Dr. Trivedi's Homeopathy Clinic in Raipur" />
        </div>
        <div className="absolute inset-0 bg-primary-teal/5" />
      </div>

      {/* Title Section */}
      <div className="relative pb-20 -mt-16">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[#FDFDF7] rounded-t-[60px]" />
        
        <div className="relative z-10 flex flex-col items-center pt-12">
          <div className="flex flex-col items-center max-w-4xl px-6">
             <div className="flex items-center gap-4 text-public-heading opacity-60 mb-6">
                <div className="w-8 h-[1px] bg-current" />
                <History size={16} />
                <div className="w-8 h-[1px] bg-current" />
             </div>
             
             <h1 className="text-3xl lg:text-5xl font-bold text-public-heading tracking-[0.05em] mb-4 text-center leading-tight">
               {t('about_page.welcome_title')}
             </h1>
             <span className="text-sm font-bold text-public-muted tracking-[0.2em] uppercase text-center">{t('about_page.trusted_center')}</span>
             
             <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-8" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24 relative">
        {/* Breadcrumb */}
        <div className="text-base text-public-muted mb-16 flex gap-2 font-medium">
          <Link to="/" className="hover:text-public-heading transition-colors">{t('common.home')}</Link>
          <span>&gt;</span>
          <span className="text-public-heading">{t('common.about')}</span>
        </div>

        {/* Introduction Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <h2 className="text-3xl font-bold text-public-heading leading-relaxed">
              {t('about_page.legacy_title')} <br />
              <span className="text-[#F2D06B]">{t('about_page.healing_trust')}</span>
            </h2>
            <div className="text-public-body leading-loose text-xl font-medium space-y-6">
              <p>{t('about_page.description_1')}</p>
              <p>{t('about_page.description_2')}</p>
              <p>{t('about_page.description_3')}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-[30px] shadow-sm border border-gray-100">
                <Users className="text-public-heading mb-4" />
                <h4 className="font-bold text-public-heading mb-2 uppercase text-xs tracking-widest">20,000+</h4>
                <p className="text-sm text-public-muted">{t('about_page.stats_covid')}</p>
              </div>
              <div className="p-6 bg-white rounded-[30px] shadow-sm border border-gray-100">
                <Microscope className="text-public-heading mb-4" />
                <h4 className="font-bold text-public-heading mb-2 uppercase text-xs tracking-widest">400+</h4>
                <p className="text-sm text-public-muted">{t('about_page.stats_camps')}</p>
              </div>
            </div>
          </motion.div>
          <div className="relative">
             <div className="aspect-square rounded-[60px] overflow-hidden shadow-2xl">
                <img src="/site-images/images/about-doctor.webp" className="w-full h-full object-cover" alt="Dr. Uttkarsh Trivedi, homeopathy doctor in Raipur" />
             </div>
             <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#F2D06B] rounded-full blur-3xl opacity-20 -z-10" />
          </div>
        </div>

        {/* Why Dr. Uttkarsh Section */}
        <div className="bg-white rounded-[60px] p-10 lg:p-16 shadow-sm border border-gray-50 mb-32">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/3">
              <div className="aspect-[3/4] rounded-[40px] overflow-hidden shadow-xl">
                 <img src="/slide4.jpeg" className="w-full h-full object-cover" alt="Dr. Uttkarsh Trivedi at Dr. Trivedi's Homeopathy Clinic, Raipur" />
              </div>
            </div>
            <div className="lg:w-2/3 space-y-6">
              <div className="inline-block px-4 py-1 bg-primary-teal/10 rounded-full text-public-heading text-xs font-bold tracking-widest uppercase">
                {t('about_page.director_title')}
              </div>
              <h2 className="text-3xl font-bold text-public-heading">{t('about_page.why_uttkarsh')}</h2>
              <p className="text-public-body text-lg leading-loose font-medium">
                {t('about_page.uttkarsh_description')}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {uttkarshReasons.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-public-heading font-bold">
                    <CheckCircle2 size={18} />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-32">
          <div className="bg-public-action p-12 rounded-[50px] text-white">
            <Target className="mb-6 w-12 h-12 opacity-80" />
            <h3 className="text-2xl font-bold mb-6 tracking-wide">{t('about_page.vision')}</h3>
            <p className="text-white/90 text-lg leading-relaxed font-medium">
              {t('about_page.vision_text')}
            </p>
          </div>
          <div className="bg-[#F2D06B] p-12 rounded-[50px] text-public-body">
            <Compass className="mb-6 w-12 h-12 opacity-80" />
            <h3 className="text-2xl font-bold mb-6 tracking-wide">{t('about_page.mission')}</h3>
            <ul className="space-y-4 text-public-body font-medium">
              {missionPoints.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Awards Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-public-heading mb-4">{t('about_page.milestones')}</h2>
            <div className="w-16 h-1 bg-[#F2D06B] mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {awards.map((award, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="flex gap-6 p-6 bg-white rounded-[30px] border border-gray-50 shadow-sm"
              >
                <div className="text-public-heading font-black text-xl italic">{award.year}</div>
                <div className="text-public-body text-sm font-medium leading-relaxed">
                  {award.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-public-heading mb-4">{t('about_page.why_choose_title')}</h2>
            <div className="w-16 h-1 bg-primary-teal/40 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {reasons.map((reason, i) => (
              <div key={i} className="text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-md border border-gray-50 text-public-heading">
                  <ShieldCheck />
                </div>
                <h4 className="font-bold text-public-heading text-xs uppercase tracking-widest">{reason.title}</h4>
                <p className="text-[11px] text-public-muted leading-relaxed font-medium">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comprehensive Care Section */}
        <div className="bg-[#EAF5F7] rounded-[60px] p-10 lg:p-20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-public-heading mb-4">{t('about_page.treatments_title')}</h2>
              <p className="text-public-body font-medium italic">{t('about_page.treatments_subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-12">
              {treatments.map((treatment) => (
                <Link
                  key={treatment.id}
                  to={treatmentPath(treatment)}
                  className="flex items-center gap-3 text-public-body font-medium border-b border-primary-teal/10 pb-2 hover:text-public-heading hover:border-primary-teal/40 transition-colors group"
                >
                  <div className="w-1.5 h-1.5 bg-[#F2D06B] rounded-full" />
                  <span className="text-sm">{treatment.en} | {treatment.hi}</span>
                  <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                </Link>
              ))}
            </div>
            <div className="text-center mt-16">
               <Link to="/treatments" className="px-10 py-4 bg-public-action text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-public-action transition-colors shadow-xl inline-block">
                 {t('about_page.view_detailed_services')}
               </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-teal/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-200/10 rounded-full blur-3xl -ml-32 -mb-32" />
        </div>

      </div>
    </div>
  );
}
