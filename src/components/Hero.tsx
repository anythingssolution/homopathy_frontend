import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, Clock, X, MapPin, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Testimonials from './Testimonials';
import { ScrollReveal } from './ScrollReveal';
import { getPublicHomepageCms } from '../modules/doctor-cms/api';
import { HomepageCmsResponse } from '../modules/doctor-cms/types';

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
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
    ? heroItems.map(item => item.image_url)
    : fallbackImages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(timer);
  }, [images.length]);

  const socials = [
    { name: 'WhatsApp', icon: (props: any) => <svg viewBox="0 0 24 24" {...props} className="fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, url: 'https://wa.me/+918462030001', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', hover: 'hover:bg-[#25D366]' },
    { name: 'Instagram', icon: (props: any) => <svg viewBox="0 0 24 24" {...props} className="fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>, url: 'https://www.instagram.com/drtrivedishomeopathy/', color: 'text-pink-600', bg: 'bg-pink-600/10', hover: 'hover:bg-pink-600' },
    { name: 'YouTube', icon: (props: any) => <svg viewBox="0 0 24 24" {...props} className="fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136C0 8.055 0 12 0 12s0 3.945.501 5.814a3.017 3.017 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, url: 'https://www.youtube.com/@drtrivedishomeopathy', color: 'text-red-600', bg: 'bg-red-600/10', hover: 'hover:bg-red-600' },
    { name: 'Facebook', icon: (props: any) => <svg viewBox="0 0 24 24" {...props} className="fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, url: 'https://www.facebook.com/drtrivedishomeopathy/', color: 'text-blue-600', bg: 'bg-blue-600/10', hover: 'hover:bg-blue-600' },
    { name: 'Google', icon: (props: any) => <svg viewBox="0 0 24 24" {...props} className="fill-current"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>, url: 'https://share.google/N1aVVTJeKghuz1qmu', color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', hover: 'hover:bg-[#4285F4]' },
  ];

  return (
    <div className="relative w-full overflow-x-hidden">
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
                alt={`${t('hero.slide')} ${currentIndex + 1}`}
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
                      className="absolute left-6 text-[10px] font-black text-primary-teal tracking-widest"
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
        {/* Socials Tab */}
        <div className="relative flex items-center h-[160px]">
          <AnimatePresence>
            {showSocials && (
              <motion.div 
                initial={{ x: 100, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 100, opacity: 0, scale: 0.9 }}
                className="absolute right-full mr-4 bg-white rounded-[40px] shadow-2xl overflow-hidden flex h-full w-[85vw] max-w-[380px] border border-gray-100"
                style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.1))' }}
              >
                {/* Left Side Tab (Consistent with Hours) */}
                <div className="bg-[#549E9E] w-12 flex flex-col items-center justify-center text-white gap-3 shrink-0">
                  <Share2 size={16} />
                  <span className="writing-vertical text-[8px] font-black tracking-[0.3em] uppercase">{t('hero.connect')}</span>
                </div>
 
                {/* Main Content (Horizontal Icons) */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{t('hero.connect_with_us')}</span>
                       <div className="w-8 h-[1px] bg-gray-50" />
                    </div>
                    <button onClick={() => setShowSocials(false)} className="text-gray-200 hover:text-gray-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 flex items-center justify-around px-2">
                    {socials.map((social) => (
                      <a 
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group transition-all"
                        title={social.name}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${social.bg} ${social.color} transition-all group-hover:scale-110 active:scale-95 ${social.hover} hover:text-white shadow-sm ring-1 ring-black/5`}>
                          <social.icon size={20} />
                        </div>
                      </a>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-teal animate-pulse" />
                      <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{t('hero.online_support')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            whileHover={{ x: -10 }}
            onClick={() => {
              setShowSocials(!showSocials);
              setShowSchedule(false);
            }}
            className={`group bg-white px-4 py-8 rounded-l-3xl shadow-lg border border-r-0 border-gray-100 flex flex-col items-center gap-4 cursor-pointer pointer-events-auto transition-all z-10 h-full justify-center hover:shadow-2xl hover:border-primary-teal/30 ${showSocials ? 'bg-primary-teal/5 ring-1 ring-primary-teal/20' : ''}`}
          >
            <Share2 className={`transition-colors ${showSocials ? 'text-primary-teal' : 'text-gray-400 group-hover:text-primary-teal'}`} size={20} />
            <span className={`writing-vertical text-[9px] font-bold tracking-[0.2em] uppercase transition-colors ${showSocials ? 'text-primary-teal' : 'text-gray-400 group-hover:text-primary-teal'}`}>{t('hero.connect')}</span>
          </motion.div>
        </div>

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
                    <button onClick={() => setShowSchedule(false)} className="text-gray-200 hover:text-gray-400 transition-colors">
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
                      <tbody className="text-[#6A6A50]">
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
              setShowSocials(false);
            }}
            className={`group bg-white px-4 py-6 rounded-l-3xl shadow-lg border border-r-0 border-gray-100 flex flex-col items-center gap-3 cursor-pointer pointer-events-auto transition-all z-10 h-full justify-center hover:shadow-2xl hover:border-amber-500/30 ${showSchedule ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : ''}`}
          >
            <Clock className={`transition-colors ${showSchedule ? 'text-amber-500' : 'text-gray-300 group-hover:text-amber-500'}`} size={20} />
            <span className={`writing-vertical text-[9px] font-bold tracking-[0.2em] uppercase transition-colors ${showSchedule ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-500'}`}>{t('hero.hours')}</span>
          </motion.div>
        </div>
      </div>

      {/* Mobile Floating Bottom Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100] sm:hidden">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setShowSocials(!showSocials); setShowSchedule(false); }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${showSocials ? 'bg-[#549E9E] text-white' : 'bg-white text-[#549E9E] border border-gray-200'}`}
        >
          <Share2 size={18} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setShowSchedule(!showSchedule); setShowSocials(false); }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${showSchedule ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border border-gray-200'}`}
        >
          <Clock size={18} />
        </motion.button>
      </div>

      {/* Mobile Socials Bottom Sheet */}
      <AnimatePresence>
        {showSocials && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 left-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 z-[99] sm:hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('hero.connect_with_us')}</span>
              <button onClick={() => setShowSocials(false)} className="text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-around">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${social.bg} ${social.color} transition-all active:scale-90 shadow-sm ring-1 ring-black/5`}>
                    <social.icon size={20} />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <button onClick={() => setShowSchedule(false)} className="text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            </div>
            <table className="w-full text-[11px] font-bold text-center">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-400 uppercase tracking-widest text-[8px]">Shift</th>
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
                <span className="text-[9px] font-bold text-gray-400 uppercase">Raipur, CG</span>
              </div>
              <button className="px-4 py-1.5 bg-amber-50 rounded-full font-black text-[8px] text-amber-600 uppercase tracking-widest active:scale-95 transition-transform">
                {t('hero.view_map')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollReveal width="100%" direction="up" distance={50}>
        <div className="relative z-30 bg-white px-8 pb-32 text-center pt-10">
          <Testimonials cmsData={cmsData?.testimonials} />
        </div>
      </ScrollReveal>

      {/* Support story Section */}
      <div className="relative bg-[#EAF5F7] pb-20 overflow-hidden">
        <ScrollReveal width="100%" direction="up" distance={60}>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 pt-20">
            <ScrollReveal direction="down" delay={0.2} className="mx-auto">
              <div className="inline-block text-[12px] font-bold text-primary-teal tracking-[0.3em] mb-10 px-6 py-2 border border-primary-teal/20 rounded-full uppercase">{t('hero.story_label')}</div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3} className="mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#549E9E] leading-[1.5] sm:leading-[1.7] mb-8 sm:mb-12 tracking-[0.05em] sm:tracking-[0.1em]">
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
              <div className="space-y-10 text-[#6A6A50] text-base lg:text-lg leading-[2.6] tracking-wider font-medium max-w-3xl mx-auto text-justify lg:text-center">
                <p>{t('hero.story_description_1')}</p>
                <p>{t('hero.story_description_2')}<br />
                  {t('hero.story_description_3')}</p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.6} className="mx-auto w-full">
              <div className="flex flex-col gap-6 items-center mt-20 pb-0">
                <div className="flex flex-col md:flex-row justify-center gap-6 w-full max-w-4xl">
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-[#549E9E] py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
                    {t('hero.doctors')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-[#549E9E] py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
                    {t('hero.wellness_hub')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05, y: -2 }} className="bg-[#F5DE9B] text-[#549E9E] py-3 sm:py-4 px-8 sm:px-10 rounded-full font-bold text-sm sm:text-base shadow-[0_4px_0_#e5ce8b] w-fit mx-auto active:scale-95 transition-transform">
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
