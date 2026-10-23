import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MessageCircle, X } from 'lucide-react';
import { buildManualWhatsAppLink } from '../utils/whatsappManualShare';
import { buildDispenseEstimateText, type DispenseEstimate } from '../utils/dispenseEstimate';

export default function DispenseEstimateWhatsAppModal({ estimate, initialLanguage, onClose }: {
  estimate: DispenseEstimate; initialLanguage: 'en' | 'hi'; onClose: () => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [phone, setPhone] = useState(estimate.phone);
  const [message, setMessage] = useState(() => buildDispenseEstimateText(estimate, initialLanguage));
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const hi = language === 'hi';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)') || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  const openChat = () => {
    try {
      const link = buildManualWhatsAppLink(phone, message);
      const chat = window.open('about:blank', '_blank');
      if (!chat) throw new Error('WhatsApp popup was blocked. Allow popups or copy the message.');
      chat.opener = null; chat.location.replace(link);
      setError(''); setNote(hi ? 'चैट तैयार है। अंतिम Send WhatsApp में करें।' : 'Chat prepared. Review and press Send in WhatsApp.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open WhatsApp.'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setNote(hi ? 'मैसेज कॉपी हो गया।' : 'Message copied.'); }
    catch { setError('Please select the message and copy it manually.'); }
  };
  return createPortal(<div className="fixed inset-0 z-[10020] flex items-center justify-center bg-gray-900/60 p-3 backdrop-blur-sm no-print">
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dispense-estimate-title" tabIndex={-1} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl outline-none">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-[#549e9e]/5 px-5 py-4"><div><h3 id="dispense-estimate-title" className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#2d8789]"><MessageCircle size={18}/>{hi ? 'WhatsApp पर अनुमान' : 'WhatsApp Estimate'}</h3><p className="mt-1 text-xs text-gray-500">{hi ? 'वर्तमान ड्राफ्ट का अनुमान। कोई बिल या डिस्पेंस सेव नहीं हुआ।' : 'Current draft estimate. No bill or dispensing is saved by sharing.'}</p></div><button type="button" onClick={onClose} aria-label="Close estimate" className="rounded-full bg-white p-2 text-gray-500 hover:bg-gray-100"><X size={19}/></button></header>
      <div data-lenis-prevent className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-5">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#549e9e]/15 bg-[#549e9e]/5 p-4"><div className="min-w-0"><p className="break-words text-sm font-black text-gray-800">{estimate.patientName}</p><p className="mt-1 text-xs font-bold text-[#2d8789]">Reg No.: {estimate.regNo || '—'}</p></div><div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{hi ? 'अनुमानित कुल' : 'Draft approx. total'}</p><p className="mt-1 text-xl font-black text-[#2d8789]">₹{estimate.net.toFixed(2)}</p></div></div>
        {estimate.familyContact && <p className="text-xs text-gray-500">{hi ? 'फैमिली मरीज के लिए मुख्य मरीज का सेव किया हुआ संपर्क नंबर है।' : 'For this family member, the saved contact is the primary patient’s number.'}</p>}
        <div className="flex gap-2">{(['en', 'hi'] as const).map(value => <button type="button" key={value} onClick={() => { setLanguage(value); setMessage(buildDispenseEstimateText(estimate, value)); setNote(''); setError(''); }} className={`rounded-full border px-4 py-2 text-xs font-bold ${language === value ? 'border-[#549e9e] bg-[#549e9e] text-white' : 'border-gray-200 text-gray-600'}`}>{value === 'en' ? 'English' : 'हिंदी'}</button>)}</div>
        <label className="block text-xs font-bold text-gray-600">{hi ? 'WhatsApp नंबर' : 'WhatsApp number'}<input aria-label="Estimate WhatsApp number" type="tel" inputMode="tel" value={phone} onChange={event => { setPhone(event.target.value); setError(''); }} placeholder="10 digit number or +91…" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-800 outline-none focus:border-[#549e9e]"/></label>
        <label className="block text-xs font-bold text-gray-600">{hi ? 'मैसेज देखें / बदलें' : 'Review / edit message'}<textarea aria-label="Estimate WhatsApp message" rows={11} value={message} onChange={event => { setMessage(event.target.value); setNote(''); }} className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs font-normal leading-relaxed text-gray-700 outline-none focus:border-[#549e9e]"/></label>
        <p className="text-xs leading-relaxed text-gray-500">{hi ? 'यह अंतिम बिल नहीं है। WhatsApp चैट में Send आपको करना होगा। ड्राफ्ट बदलने के लिए इसे बंद करके Estimate दोबारा खोलें।' : 'This is not a final bill. You will press Send in WhatsApp. To include draft changes, close this preview and open Estimate again.'}</p>
        {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}{note && <p role="status" className="text-xs font-bold text-[#2d8789]">{note}</p>}
      </div>
      <footer className="flex shrink-0 gap-2 border-t border-gray-100 bg-white p-4"><button type="button" onClick={copy} disabled={!message.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-600 disabled:opacity-40"><Copy size={14}/>{hi ? 'कॉपी करें' : 'Copy text'}</button><button type="button" onClick={openChat} disabled={!phone.trim() || !message.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#549e9e] px-4 py-3 text-xs font-black text-white hover:bg-[#468686] disabled:opacity-40"><MessageCircle size={16}/>{hi ? 'WhatsApp चैट खोलें' : 'Open WhatsApp Chat'}</button></footer>
    </div>
  </div>, document.body);
}
