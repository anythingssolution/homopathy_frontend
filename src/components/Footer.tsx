import React from 'react';
import { motion } from 'motion/react';
import { Send, Mail, Map as MapIcon, ExternalLink, Phone, MapPin, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="relative bg-white pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        {/* Logo Section */}
        <div className="mb-16 flex flex-col items-center">
          <div className="text-primary-teal mb-4 group cursor-pointer">
            <div className="w-16 h-16 bg-primary-teal/10 rounded-2xl flex items-center justify-center text-primary-teal group-hover:bg-primary-teal group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1">
              <Stethoscope size={32} strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#549E9E] tracking-widest leading-tight uppercase">
            {t('footer.clinic_name_main')}<br />
            <span className="text-sm opacity-80">{t('footer.clinic_name_sub')}</span>
          </h2>
        </div>

        {/* Dual Clinic Cards Grid (Moved up after Logo) */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-20">
          {/* Card 1: Purani Basti */}
          <div className="flex flex-col overflow-hidden rounded-[50px] bg-[#FAFBFD] p-8 shadow-sm ring-1 ring-black/5 [content-visibility:auto] [contain-intrinsic-size:auto_520px]">
            <div className="flex items-start justify-between mb-6 text-left">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-primary-teal" />
                <div>
                  <h4 className="text-sm font-black text-primary-teal uppercase tracking-widest">{t('footer.purani_basti')}</h4>
                  <p className="text-[10px] font-bold text-gray-400">{t('footer.address_pb')}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] block opacity-40 font-black uppercase tracking-widest">{t('footer.phone')}</span>
                <a href="tel:+917772043001" className="text-sm font-black text-primary-teal whitespace-nowrap">+91-7772043001</a>
              </div>
            </div>

            {/* Mini Map */}
            <div className="relative mb-8 h-[200px] overflow-hidden rounded-3xl group">
              <img
                src="/map.png"
                alt="Purani Basti Clinic"
                loading="lazy"
                decoding="async"
                width={640}
                height={200}
                className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/5" />
              <a
                href="https://www.google.com/maps/search/?api=1&query=Dr.Trivedis+Homeopathy+Clinic+Purani+Basti+Raipur"
                target="_blank" rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                <div className="rounded-full bg-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-primary-teal shadow-lg">{t('footer.view_map')}</div>
              </a>
            </div>

            {/* Timetable UI */}
            <div className="overflow-x-auto mb-6 text-left">
              <table className="w-full text-[10px] font-bold text-primary-teal">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left">{t('footer.time')} (P.B)</th>
                    <th className="pb-3">{t('footer.days.mon')}</th>
                    <th className="pb-3">{t('footer.days.tue')}</th>
                    <th className="pb-3">{t('footer.days.wed')}</th>
                    <th className="pb-3">{t('footer.days.thu')}</th>
                    <th className="pb-3">{t('footer.days.fri')}</th>
                    <th className="pb-3">{t('footer.days.sat')}</th>
                    <th className="pb-3 text-red-500">{t('footer.days.sun')}</th>
                  </tr>
                </thead>
                <tbody className="text-[#6A6A50]">
                  <tr className="border-b border-gray-50">
                    <td className="py-3 text-left border-r border-gray-50 pr-4">11:00-14:30</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center opacity-20">/</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-left border-r border-gray-50 pr-4">18:00-21:00</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center">●</td>
                    <td className="py-3 text-center opacity-20">/</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center mt-auto pt-4 border-t border-gray-50">
              <MapIcon size={16} className="text-primary-teal/20" />
            </div>
          </div>

          {/* Card 2: Pandri Clinic */}
          <div className="flex flex-col overflow-hidden rounded-[50px] bg-[#FAFBFD] p-8 shadow-sm ring-1 ring-black/5 [content-visibility:auto] [contain-intrinsic-size:auto_520px]">
            <div className="flex items-start justify-between mb-6 text-left">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-[#F2D06B]" />
                <div>
                  <h4 className="text-sm font-black text-primary-teal uppercase tracking-widest">{t('footer.pandri')}</h4>
                  <p className="text-[10px] font-bold text-gray-400">{t('footer.address_pandri')}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] block opacity-40 font-black uppercase tracking-widest">{t('footer.phone')}</span>
                <a href="tel:+917773043001" className="text-sm font-black text-primary-teal whitespace-nowrap">+91-7773043001</a>
              </div>
            </div>

            {/* Mini Map */}
            <div className="relative mb-8 h-[200px] overflow-hidden rounded-3xl group">
              <img
                src="/pandri-clinic.png"
                alt="Pandri Clinic"
                loading="lazy"
                decoding="async"
                width={640}
                height={200}
                className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/5" />
              <a
                href="https://www.google.com/maps/place/Dr.Trivedis+Homeopathy+Clinic+:+Devendra+Nagar,+Pandri/@21.261514,81.653251,14z/data=!4m6!3m5!1s0x3a28ddd8a2add937:0x5417ef7682d680f1!8m2!3d21.2615138!4d81.6532511!16s%2Fg%2F11y07h6jxb"
                target="_blank" rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                <div className="rounded-full bg-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-primary-teal shadow-lg">{t('footer.view_map')}</div>
              </a>
            </div>

            {/* Timetable UI */}
            <div className="overflow-x-auto mb-6 text-left">
              <table className="w-full text-[10px] font-bold text-primary-teal">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left">{t('footer.time')} (Pandri)</th>
                    <th className="pb-3">{t('footer.days.mon')}</th>
                    <th className="pb-3">{t('footer.days.tue')}</th>
                    <th className="pb-3">{t('footer.days.wed')}</th>
                    <th className="pb-3">{t('footer.days.thu')}</th>
                    <th className="pb-3">{t('footer.days.fri')}</th>
                    <th className="pb-3">{t('footer.days.sat')}</th>
                    <th className="pb-3 text-red-500">{t('footer.days.sun')}</th>
                  </tr>
                </thead>
                <tbody className="text-[#6A6A50]">
                  <tr>
                    <td className="py-3 text-left border-r border-gray-50 pr-4">11:00-18:00</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center font-black text-[#F2D06B]">●</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center opacity-20">/</td>
                    <td className="py-3 text-center opacity-20">/</td>
                  </tr>
                  <tr className="opacity-0">
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                    <td className="py-3">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center mt-auto pt-4 border-t border-gray-50">
              <MapIcon size={16} className="text-primary-teal/20" />
            </div>
          </div>
        </div>

        {/* Global Contact Info Bar (Moved down) */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-12 text-[#6A6A50]">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-primary-teal" />
            <a href="mailto:care@drtrivedishomeopathy.in" className="font-bold hover:text-primary-teal transition-colors">care@drtrivedishomeopathy.in</a>
          </div>
          <div className="w-[1px] h-4 bg-gray-200 hidden md:block" />
          <p className="font-bold tracking-widest uppercase text-xs opacity-60">{t('footer.leading_clinic')}</p>
        </div>

        {/* Buttons (Moved down) */}
        <div className="flex flex-col md:flex-row gap-6 justify-center mb-20 max-w-2xl mx-auto">
          <Link to="/booking" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              className="w-full bg-[#F5DE9B] text-[#549E9E] py-4 rounded-full font-bold shadow-[0_4px_0_#e5ce8b] flex items-center justify-center gap-4 group"
            >
              <span>{t('footer.web_reservation')}</span>
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          </Link>

          <Link to="/contact" className="flex-1">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              className="w-full bg-[#B7CED6] text-white py-4 rounded-full font-bold shadow-[0_4px_0_#a5bcc4] flex items-center justify-center gap-4 group"
            >
              <span>{t('common.contact_us')}</span>
              <Mail size={18} className="group-hover:scale-110 transition-transform" />
            </motion.button>
          </Link>
        </div>

        {/* Nav Links */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-20 text-xs font-bold text-[#549E9E] tracking-widest uppercase">
          <Link to="/" className="hover:text-primary-teal transition-colors">{t('common.home')}</Link>
          <Link to="/about" className="hover:text-primary-teal transition-colors">{t('common.about')}</Link>
          <Link to="/treatments" className="hover:text-primary-teal transition-colors">{t('common.treatments')}</Link>
          <Link to="/gallery" className="hover:text-primary-teal transition-colors">{t('common.gallery')}</Link>
        </div>

        {/* Social Links */}
        <div className="flex flex-wrap justify-center gap-6 mb-12 px-6">
          <a
            href="https://wa.me/+918462030001"
            target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </a>
          <a
            href="https://www.instagram.com/drtrivedishomeopathy/"
            target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-600 hover:bg-pink-600 hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
          </a>
          <a
            href="https://www.youtube.com/@drtrivedishomeopathy"
            target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136C0 8.055 0 12 0 12s0 3.945.501 5.814a3.017 3.017 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
          </a>
          <a
            href="https://www.facebook.com/drtrivedishomeopathy/"
            target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
          <a
            href="https://share.google/N1aVVTJeKghuz1qmu"
            target="_blank" rel="noopener noreferrer"
            className="w-12 h-12 bg-[#4285F4]/10 rounded-full flex items-center justify-center text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-gray-400 font-medium tracking-[0.2em]">
          &copy; 2026 DR. TRIVEDI'S HOMEOPATHY CLINIC. {t('footer.all_rights_reserved')}
        </div>
      </div>

      {/* Scattered decorations */}
      <div className="absolute bottom-10 left-[10%] text-yellow-200 opacity-20 pointer-events-none">✦</div>
      <div className="absolute bottom-20 right-[15%] text-primary-teal opacity-20 pointer-events-none">✧</div>
    </footer>
  );
}
