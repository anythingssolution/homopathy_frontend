import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Testimonials from './Testimonials';
import { ScrollReveal } from './ScrollReveal';
import { getPublicHomepageCms } from '../modules/doctor-cms/api';
import { HomepageCmsResponse } from '../modules/doctor-cms/types';
import { resolvePublicImage } from '../utils/publicImages';
import { FacebookLogo, GoogleLogo, InstagramLogo, WhatsAppLogo, YouTubeLogo } from './SocialBrandIcons';

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const { t } = useTranslation();
  
  const [cmsData, setCmsData] = useState<HomepageCmsResponse | null>(null);

  const fallbackImages = [
    '/slide1.jpeg',
    '/slide2.jpeg',
    '/slide3.jpeg',
    '/slide4.jpeg'
  ];

  useEffect(() => {
    getPublicHomepageCms().then(res => {
      if (res.success && res.data) {
        setCmsData(res.data);
      }
    });
  }, []);

  const heroItems = cmsData?.hero?.length 
    ? [...cmsData.hero].sort((a, b) => a.sort_order - b.sort_order) 
    : [];

  const images = heroItems.length > 0 
    ? heroItems.map(item => resolvePublicImage(item.image_url))
    : fallbackImages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(timer);
  }, [images.length]);

  const socialCards = [
    { name: 'WhatsApp', icon: WhatsAppLogo, url: 'https://wa.me/+918462030001', blurb: 'Chat with the clinic instantly.', cta: 'Chat', card: 'bg-[#E7F6F1]', button: 'bg-public-action text-white' },
    { name: 'Instagram', icon: InstagramLogo, url: 'https://www.instagram.com/drtrivedishomeopathy/', blurb: 'Daily care notes and clinic life.', cta: 'Follow', card: 'bg-[#F8F1E4]', button: 'bg-public-action text-white' },
    { name: 'YouTube', icon: YouTubeLogo, url: 'https://www.youtube.com/@drtrivedishomeopathy', blurb: 'Health talks and patient stories.', cta: 'Watch', card: 'bg-[#F6EEE8]', button: 'bg-public-action text-white' },
    { name: 'Facebook', icon: FacebookLogo, url: 'https://www.facebook.com/drtrivedishomeopathy/', blurb: 'News, events and community posts.', cta: 'Follow', card: 'bg-[#EAF5F7]', button: 'bg-public-action text-white' },
    { name: 'Google', icon: GoogleLogo, url: 'https://share.google/N1aVVTJeKghuz1qmu', blurb: 'Read and share clinic reviews.', cta: 'Review', card: 'bg-[#F3F6EA]', button: 'bg-public-action text-white' },
  ];

  return (
    <div className="relative w-full overflow-x-hidden">
      <h1 className="sr-only">{t('hero.story_title')} — {t('hero.story_subtitle')}</h1>
      {/* Hero Visual Section */}
      <div className="relative w-full h-screen pt-36 overflow-hidden bg-white">
        {/* Background Container */}
        <div className="absolute inset-0 w-full h-full">
          {/* Image Wrapper with Top Padding */}
          <div className="absolute inset-x-0 top-20 h-[calc(100%-5rem)] w-full">
            <AnimatePresence>
              <motion.img
                key={currentIndex}
                src={images[currentIndex]}
                alt={`Dr. Trivedi's Homeopathy Clinic in Raipur – ${t('hero.slide')} ${currentIndex + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className={`absolute inset-0 w-full h-full object-cover filter contrast-[0.85] brightness-[1.05] ${(currentIndex === 0 || currentIndex === 1) ? 'object-top' : 'object-center'}`}
              />
            </AnimatePresence>
          </div>
          {/* Full-screen Overlay */}
          <div className="absolute inset-0 bg-white/5" />
        </div>

        {/* Dynamic Vertical Indicator */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-40 hidden lg:flex pointer-events-none">
          <div className="w-px h-20 bg-gray-300/50" />
          <div className="flex flex-col gap-5 pointer-events-auto">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className="relative group cursor-pointer flex items-center"
              >
                <motion.div
                  animate={{ 
                    scale: currentIndex === idx ? 1.5 : 1,
                    backgroundColor: currentIndex === idx ? '#3AADAE' : '#D1D5DB'
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${currentIndex === idx ? 'ring-4 ring-primary-teal/20' : 'group-hover:bg-gray-400'}`}
                />
                <AnimatePresence>
                  {currentIndex === idx && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute left-6 text-[10px] font-black text-public-heading tracking-widest"
                    >
                      0{idx + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          <div className="w-px h-20 bg-gray-300/50" />
        </div>

        {/* Decorative Assets */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-40 left-10"
          >
            <div className="w-12 h-12 bg-yellow-400 opacity-60" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-56 left-24 w-8 h-8 bg-primary-teal/40 rounded-sm rotate-12"
          />
        </div>
      </div>

      {/* Side Floating Bar (Right Side) — Desktop only */}
      <div className="fixed right-0 top-1/4 hidden sm:flex flex-col items-end gap-3 z-[100]">
        {/* Side Connect tab moved to the compact strip under the hero carousel. */}

        {/* Schedule Trigger */}
        <div className="relative flex items-center h-[160px]">
          <AnimatePresence>
            {showSchedule && (
              <motion.div 
                initial={{ x: 100, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 100, opacity: 0, scale: 0.9 }}
                className="absolute right-full mr-4 bg-white rounded-[40px] shadow-2xl overflow-hidden flex h-full w-[85vw] max-w-[500px] border border-gray-100"
                style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.1))' }}
              >
                {/* Left Side Tab */}
                <div className="bg-amber-400 w-12 flex flex-col items-center justify-center text-white gap-3 shrink-0">
                  <Clock size={16} />
                  <span className="writing-vertical text-[8px] font-black tracking-[0.3em] uppercase">{t('hero.hours')}</span>
                </div>

                {/* Main Schedule Content */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{t('hero.clinic_schedule')}</span>
                       <div className="w-8 h-[1px] bg-gray-50" />
                    </div>
                    <button onClick={() => setShowSchedule(false)} className="text-gray-200 hover:text-public-muted transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <table className="w-full text-[10px] font-bold text-amber-500">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-1.5 text-left font-medium text-gray-300 uppercase tracking-widest text-[6px]">Shift</th>
                          <th className="pb-1.5">M</th>
                          <th className="pb-1.5">T</th>
                          <th className="pb-1.5">W</th>
                          <th className="pb-1.5">T</th>
                          <th className="pb-1.5">F</th>
                          <th className="pb-1.5 text-pink-300">S</th>
                          <th className="pb-1.5 text-red-300">S</th>
                        </tr>
                      </thead>
                      <tbody className="text-public-body">
                        <tr className="border-b border-gray-50">
                          <td className="py-2.5 text-left border-r border-gray-50 pr-2 font-black">11:00-14:30</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5 opacity-20">/</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5 opacity-20">/</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-left border-r border-gray-50 pr-2 font-black">18:00-21:00</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5 opacity-20">/</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5">●</td>
                          <td className="py-2.5 opacity-20">/</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={10} className="text-amber-500/30" />
                      <p className="text-[8px] font-bold text-gray-300 uppercase">Raipur, CG</p>
                    </div>
                    <button className="px-4 py-1.5 bg-gray-50 rounded-full font-black text-[7px] text-amber-500 uppercase tracking-widest hover:bg-amber-400 hover:text-white transition-all shadow-sm">
                      {t('hero.view_map')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger Button */}
          <motion.div
            whileHover={{ x: -10 }}
            onClick={() => {
              setShowSchedule(!showSchedule);
            }}
            className={`group bg-white px-4 py-6 rounded-l-3xl shadow-lg border border-r-0 border-gray-100 flex flex-col items-center gap-3 cursor-pointer pointer-events-auto transition-all z-10 h-full justify-center hover:shadow-2xl hover:border-amber-500/30 ${showSchedule ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : ''}`}
          >
            <Clock className={`transition-colors ${showSchedule ? 'text-amber-500' : 'text-gray-300 group-hover:text-amber-500'}`} size={20} />
            <span className={`writing-vertical text-[9px] font-bold tracking-[0.2em] uppercase transition-colors ${showSchedule ? 'text-amber-500' : 'text-public-muted group-hover:text-amber-500'}`}>{t('hero.hours')}</span>
          </motion.div>
        </div>
      </div>

      {/* Mobile Floating Bottom Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100] sm:hidden">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setShowSchedule(!showSchedule); }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${showSchedule ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border border-gray-200'}`}
        >
          <Clock size={18} />
        </motion.button>
      </div>

      {/* Mobile Schedule Bottom Sheet */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 left-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 z-[99] sm:hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('hero.clinic_schedule')}</span>
              <button onClick={() => setShowSchedule(false)} className="text-gray-300 hover:text-public-muted">
                <X size={16} />
              </button>
            </div>
            <table className="w-full text-[11px] font-bold text-center">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-public-muted uppercase tracking-widest text-[8px]">Shift</th>
                  <th className="pb-2 text-amber-500">M</th>
                  <th className="pb-2 text-amber-500">T</th>
                  <th className="pb-2 text-amber-500">W</th>
                  <th className="pb-2 text-amber-500">T</th>
                  <th className="pb-2 text-amber-500">F</th>
                  <th className="pb-2 text-pink-400">S</th>
                  <th className="pb-2 text-red-400">S</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 text-left font-black text-[10px]">11:00-14:30</td>
                  <td>●</td><td>●</td><td>●</td><td className="opacity-20">/</td><td>●</td><td>●</td><td className="opacity-20">/</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-left font-black text-[10px]">18:00-21:00</td>
                  <td>●</td><td>●</td><td>●</td><td className="opacity-20">/</td><td>●</td><td>●</td><td className="opacity-20">/</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-amber-400" />
                <span className="text-[9px] font-bold text-public-muted uppercase">Raipur, CG</span>
              </div>
              <button className="px-4 py-1.5 bg-amber-50 rounded-full font-black text-[8px] text-amber-600 uppercase tracking-widest active:scale-95 transition-transform">
                {t('hero.view_map')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative z-40 bg-white px-4 sm:px-8 pt-10 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end gap-2 mb-6 px-1">
            <h2 className="text-xl sm:text-2xl font-black text-public-heading tracking-tight">
              {t('hero.connect')}
            </h2>
            <span className="text-xl sm:text-2xl font-black text-[#C9A227] tracking-tight">with us</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {socialCards.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-[28px] p-4 sm:p-5 text-left transition-transform duration-300 hover:-translate-y-1 ${social.card}`}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  <social.icon className="h-10 w-10" />
                </div>
                <h3 className="text-sm font-black text-public-heading">{social.name}</h3>
                <p className="mt-1 mb-4 min-h-[2.4rem] text-[11px] leading-snug text-public-muted font-medium">
                  {social.blurb}
                </p>
                <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest ${social.button}`}>
                  + {social.cta}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ScrollReveal width="100%" direction="up" distance={50}>
        <div className="relative z-30 bg-white px-8 pb-32 text-center pt-14">
          <Testimonials cmsData={cmsData?.testimonials} cmsReady={cmsData !== null} />
        </div>
      </ScrollReveal>

      {/* Support story Section */}
      <div className="relative bg-[#EAF5F7] pb-20 overflow-hidden">
        <ScrollReveal width="100%" direction="up" distance={60}>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 pt-20">
            <ScrollReveal direction="down" delay={0.2} className="mx-auto">
              <div className="inline-block text-[12px] font-bold text-public-heading tracking-[0.3em] mb-10 px-6 py-2 border border-primary-teal/20 rounded-full uppercase">{t('hero.story_label')}</div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3} className="mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-public-heading leading-[1.5] sm:leading-[1.7] mb-8 sm:mb-12 tracking-[0.05em] sm:tracking-[0.1em]">
                {t('hero.story_title')}<br />
                {t('hero.story_subtitle')}
              </h2>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4} className="mx-auto">
              <div className="flex justify-center gap-2 mb-16">
                <div className="w-16 h-1.5 bg-yellow-300 rounded-full" />
                <div className="w-16 h-1.5 bg-primary-teal/40 rounded-full" />
                <div className="w-16 h-1.5 bg-primary-teal/60 rounded-full" />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.5} className="mx-auto">
              <div className="space-y-10 text-public-body text-base lg:text-lg leading-[2.6] tracking-wider font-medium max-w-3xl mx-auto text-justify lg:text-center">
                <p>{t('hero.story_description_1')}</p>
                <p>{t('hero.story_description_2')}<br />
                  {t('hero.story_description_3')}</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.6} className="mx-auto w-full">
              <div className="flex flex-col gap-6 items-center mt-20 pb-0">
                <div className="flex flex-col md:flex-row justify-center gap-6 w-full max-w-4xl">
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-public-heading py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
                    {t('hero.doctors')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-public-heading py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
                    {t('hero.wellness_hub')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-public-heading py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
                    {t('hero.consultation_room')}
                  </motion.button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
