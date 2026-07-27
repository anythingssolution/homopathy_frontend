import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Mail, MapPin, Globe, User, Send, Clock, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Contact() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);

    if (val.length > 0 && !/^[6-9]/.test(val)) {
      setPhoneError(t('contact_page.error_phone_start'));
    } else if (val.length > 0 && val.length < 10) {
      setPhoneError(t('contact_page.error_phone_digits'));
    } else {
      setPhoneError('');
    }
  };

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (val.length > 0 && !emailRegex.test(val)) {
      setEmailError(t('contact_page.error_email_invalid'));
    } else {
      setEmailError('');
    }
  };

  const isPhoneValid = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isPhoneValid && isEmailValid;

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      setShowSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDF7] pt-24 lg:pt-32">
      <div className="max-w-6xl mx-auto px-6 pb-24 relative">
        {/* Title Section */}
        <div className="flex flex-col items-center mb-16">
          <div className="flex items-center gap-4 text-primary-teal opacity-60 mb-6">
            <div className="w-8 h-[1px] bg-current" />
            <Phone size={16} />
            <div className="w-8 h-[1px] bg-current" />
          </div>

          <h1 className="text-3xl lg:text-5xl font-bold text-[#549E9E] tracking-[0.2em] mb-4 text-center">
            {t('contact_page.title')}
          </h1>
          <span className="text-xs font-bold text-primary-teal/60 tracking-[0.4em] uppercase">{t('contact_page.subtitle')}</span>

          <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-8" />
        </div>

        {/* Breadcrumb */}
        <div className="text-base text-gray-400 mb-12 flex gap-2 font-medium justify-center">
          <Link to="/" className="hover:text-primary-teal transition-colors">{t('common.home')}</Link>
          <span>&gt;</span>
          <span className="text-primary-teal">{t('contact_page.title')}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Clinic 1: Purani Basti */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 pb-0">
              <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-tight">{t('contact_page.purani_basti_title')}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('contact_page.main_branch')}</p>
            </div>

            {/* Map Section */}
            <div className="mt-6 px-8">
              <div className="rounded-3xl overflow-hidden shadow-inner border border-gray-50 h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.1678229411!2d81.62432611493485!3d21.233441!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28ddb86bdecbe1%3A0x4af7c000384ba26e!2sDr.Trivedis%20Homeopathy%20Clinic%20%3A%20Purani%20Basti%20(Dr.Uttkarsh%20Trivedi)!5e0!3m2!1sen!2sin!4v1624860000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  title="Purani Basti Clinic Map"
                ></iframe>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-10 space-y-8 flex-1">
              <div className="flex gap-4">
                <MapPin className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.address_label')}</h4>
                  <p className="text-sm font-bold text-[#6A6A50] leading-relaxed">
                    {t('contact_page.pb_address')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.timings_label')}</h4>
                  <div className="space-y-1 text-sm font-bold text-[#6A6A50]">
                    <p>{t('contact_page.pb_timings_1')}</p>
                    <p>{t('contact_page.pb_timings_2')}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.contact_label')}</h4>
                  <a href="tel:+917772043001" className="text-lg font-black text-[#549E9E] hover:opacity-70 transition-opacity">
                    +91-7772043001
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Dr.Trivedis+Homeopathy+Clinic+Purani+Basti+Raipur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-gray-50 text-primary-teal py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary-teal hover:text-white transition-all shadow-sm"
                >
                  <Globe size={16} /> {t('contact_page.view_on_map')}
                </a>
              </div>
            </div>
          </motion.div>

          {/* Clinic 2: Pandri */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 pb-0">
              <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-tight">{t('contact_page.pandri_title')}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('contact_page.secondary_branch')}</p>
            </div>

            {/* Map Section */}
            <div className="mt-6 px-8">
              <div className="rounded-3xl overflow-hidden shadow-inner border border-gray-50 h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3718.599925206338!2d81.65106241493514!3d21.2615138!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28ddd8a2add937%3A0x5417ef7682d680f1!2sDr.Trivedis%20Homeopathy%20Clinic%20%3A%20Devendra%20Nagar%2C%20Pandri!5e0!3m2!1sen!2sin!4v1624860000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  title="Pandri Clinic Map"
                ></iframe>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-10 space-y-8 flex-1">
              <div className="flex gap-4">
                <MapPin className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.address_label')}</h4>
                  <p className="text-sm font-bold text-[#6A6A50] leading-relaxed">
                    {t('contact_page.pandri_address')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.timings_label')}</h4>
                  <div className="space-y-1 text-sm font-bold text-[#6A6A50]">
                    <p>{t('contact_page.pandri_timings_day')}</p>
                    <p>{t('contact_page.pandri_timings_time')}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone className="text-primary-teal shrink-0" size={20} />
                <div>
                  <h4 className="text-[10px] font-black text-primary-teal uppercase tracking-widest mb-1 opacity-50">{t('contact_page.contact_label')}</h4>
                  <a href="tel:+917773043001" className="text-lg font-black text-[#549E9E] hover:opacity-70 transition-opacity">
                    +91-7773043001
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <a
                  href="https://www.google.com/maps/place/Dr.Trivedis+Homeopathy+Clinic+:+Devendra+Nagar,+Pandri/@21.261514,81.653251,14z/data=!4m6!3m5!1s0x3a28ddd8a2add937:0x5417ef7682d680f1!8m2!3d21.2615138!4d81.6532511!16s%2Fg%2F11y07h6jxb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-gray-50 text-primary-teal py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-primary-teal hover:text-white transition-all shadow-sm"
                >
                  <Globe size={16} /> {t('contact_page.view_on_map')}
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Global Contact Info */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-8 bg-[#549E9E]/5 rounded-[40px] border border-[#549E9E]/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary-teal shadow-sm">
              <Mail size={18} />
            </div>
            <div>
              <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('contact_page.official_email')}</h4>
              <p className="text-sm font-bold text-[#549E9E]">care@drtrivedishomeopathy.in</p>
            </div>
          </div>
          <div className="w-[1px] h-10 bg-gray-200 hidden md:block" />
          <div className="text-center md:text-left">
            <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('contact_page.central_helpline')}</h4>
            <p className="text-lg font-black text-[#549E9E] tracking-tight">{t('contact_page.support_24_7')}</p>
          </div>
        </div>

        {/* Keep In Touch Form */}
        <div id="contact-form" className="mt-32 max-w-4xl mx-auto">
          <div className="bg-white rounded-[60px] p-12 lg:p-20 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Decorative Background Element */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-teal/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-5xl font-black text-[#549E9E] tracking-tighter uppercase mb-4">{t('contact_page.keep_in_touch')}</h2>
                <p className="text-gray-400 font-medium">{t('contact_page.form_desc')}</p>
              </div>

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary-teal uppercase tracking-[0.2em] ml-6">{t('contact_page.your_name')}</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="text"
                        placeholder={t('contact_page.your_name')}
                        className="w-full bg-gray-50 border-none rounded-full py-5 pl-14 pr-8 focus:ring-2 focus:ring-primary-teal/20 transition-all outline-none text-[#6A6A50] font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary-teal uppercase tracking-[0.2em] ml-6">{t('contact_page.your_email')}</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="email"
                        placeholder={t('contact_page.your_email')}
                        value={email}
                        onChange={handleEmailChange}
                        className={`w-full bg-gray-50 border-none rounded-full py-5 pl-14 pr-8 focus:ring-2 transition-all outline-none text-[#6A6A50] font-bold ${emailError ? 'focus:ring-red-200' : 'focus:ring-primary-teal/20'}`}
                      />
                      {emailError && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold mt-2 ml-6 uppercase tracking-widest">{emailError}</motion.p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary-teal uppercase tracking-[0.2em] ml-6">{t('contact_page.contact_phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="tel"
                      placeholder={t('contact_page.contact_phone')}
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`w-full bg-gray-50 border-none rounded-full py-5 pl-14 pr-8 focus:ring-2 transition-all outline-none text-[#6A6A50] font-bold ${phoneError ? 'focus:ring-red-200' : 'focus:ring-primary-teal/20'}`}
                    />
                    {phoneError && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold mt-2 ml-6 uppercase tracking-widest">{phoneError}</motion.p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary-teal uppercase tracking-[0.2em] ml-6">{t('contact_page.comments_label')}</label>
                  <textarea
                    rows={5}
                    placeholder={t('contact_page.comments_placeholder')}
                    className="w-full bg-gray-50 border-none rounded-[30px] p-8 focus:ring-2 focus:ring-primary-teal/20 transition-all outline-none text-[#6A6A50] font-bold resize-none"
                  />
                </div>

                <motion.button
                  whileHover={isFormValid ? { scale: 1.02, y: -2 } : {}}
                  whileTap={isFormValid ? { scale: 0.98 } : {}}
                  disabled={!isFormValid}
                  type="submit"
                  className={`w-full py-6 rounded-full font-black text-sm uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 group transition-all ${!isFormValid ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#549E9E] text-white shadow-[#549E9E]/20'}`}
                >
                  <span>{t('contact_page.send_message')}</span>
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </motion.button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccess(false)}
              className="absolute inset-0 bg-[#549E9E]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden p-12 text-center"
            >
              <button
                onClick={() => setShowSuccess(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>

              <div className="w-24 h-24 bg-primary-teal/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} className="text-primary-teal" />
              </div>

              <h3 className="text-2xl font-black text-[#549E9E] uppercase tracking-tight mb-4">{t('contact_page.success_title')}</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10">
                {t('contact_page.success_desc')}
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-[#549E9E] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-teal/20"
              >
                {t('contact_page.got_it')}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
