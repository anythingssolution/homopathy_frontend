import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';

export default function Consultation() {
  const { t } = useTranslation();

  const consultationItems = [
    { id: '01', label: t('consultation.piles'), icon: '🩸' },
    { id: '02', label: t('consultation.skin'), icon: '🧴' },
    { id: '03', label: t('consultation.ent'), icon: '👂' },
    { id: '04', label: t('consultation.urinary'), icon: '🚽' },
    { id: '05', label: t('consultation.respiratory'), icon: '🫁' },
    { id: '06', label: t('consultation.sinusitis'), icon: '👃' },
  ];
  return (
    <section className="relative bg-[#EAF5F7] pt-10 pb-32 overflow-hidden">
      {/* Cloud Shapes in background */}
      <div className="absolute top-10 left-[-15%] w-[60%] aspect-square bg-[#DCEEF2] rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-10 right-[-15%] w-[60%] aspect-square bg-[#DCEEF2] rounded-full blur-[100px] opacity-60" />
      
      {/* Small accent clouds */}
      <div className="absolute top-40 right-[10%] w-48 h-32 bg-white/40 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-40 left-[5%] w-64 h-40 bg-white/30 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Heading Area */}
        <ScrollReveal width="100%" direction="up" distance={30}>
          <div className="text-center mb-16">
            <div className="inline-flex flex-col items-center mb-6">
              <div className="w-20 h-20 border border-primary-teal/20 rounded-full flex items-center justify-center mb-4 bg-white/50 backdrop-blur-sm">
                 <div className="text-[8px] text-primary-teal font-black tracking-widest leading-tight flex flex-col items-center text-center px-2">
                   <span className="uppercase">{t('consultation.doctor')}<br/>{t('consultation.consultation')}</span>
                   <Sparkles size={10} className="text-primary-teal mt-1" />
                 </div>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#549E9E] tracking-[0.2em] mb-4">
                {t('consultation.common_consultations')}
              </h2>
              <div className="flex justify-center gap-1.5">
                <div className="w-12 h-1 bg-[#F2D06B] rounded-full" />
                <div className="w-12 h-1 bg-primary-teal/30 rounded-full" />
                <div className="w-12 h-1 bg-primary-teal/50 rounded-full" />
              </div>
            </div>

            <div className="flex flex-col items-center lg:flex-row lg:justify-center gap-10 mt-16 max-w-4xl mx-auto">
              <ScrollReveal direction="right" delay={0.2}>
                <div className="relative">
                  <div className="w-48 h-48 rounded-full border-8 border-white shadow-2xl bg-white shrink-0 relative z-10 flex flex-col items-center justify-center text-center">
                    <span className="text-[#549E9E] font-black text-sm lg:text-base leading-[1.2] uppercase tracking-[0.15em]">{t('consultation.doctor')}<br/>{t('consultation.consultation')}</span>
                    <div className="w-10 h-1 bg-[#F2D06B] mt-4 rounded-full" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500 z-20 shadow-sm font-bold text-xl">?</div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-400 z-20 shadow-sm text-sm">?</div>
                </div>
              </ScrollReveal>
              
              <ScrollReveal width="100%" direction="left" delay={0.4}>
                <div className="text-left bg-white/40 backdrop-blur-md p-8 lg:p-10 rounded-[40px] border border-white/60 shadow-sm flex-1 relative">
                  <p className="text-[#6A6A50] text-[15px] leading-[2.2] tracking-wider font-medium">
                    {t('consultation.description')}
                  </p>
                  
                  {/* Floating accents around the bubble */}
                  <div className="absolute -top-10 right-0 text-yellow-300 opacity-40">✨</div>
                  <div className="absolute -bottom-6 left-[20%] text-primary-teal opacity-30">✦</div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </ScrollReveal>

        {/* Grid Container */}
        <ScrollReveal width="100%" direction="up" distance={40} delay={0.6}>
          <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3">
              {consultationItems.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ backgroundColor: '#F9FCFD' }}
                  className={`p-10 border-r border-b border-dashed border-gray-100 flex flex-col items-center justify-center gap-6 cursor-pointer group 
                    ${(idx + 1) % 2 === 0 ? 'md:border-r' : ''}
                    ${(idx + 1) % 3 === 0 ? 'md:border-r-0' : ''}
                  `}
                >
                  <div className="text-[#F2D06B] font-bold self-start text-sm tracking-widest">{item.id}</div>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-[#F9FBFC] ring-1 ring-inset ring-black/5 text-6xl">
                    {item.icon}
                  </div>
                  <span className="text-base font-bold text-[#549E9E] tracking-tight group-hover:text-[#F2D06B] transition-colors text-center whitespace-pre-line uppercase">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Background Decor Shapes */}
      <div className="absolute top-[20%] left-[5%] text-yellow-300 opacity-20 rotate-12 scale-150">✦</div>
      <div className="absolute bottom-[20%] right-[3%] text-primary-teal opacity-20 -rotate-12 scale-150">✧</div>
    </section>
  );
}

