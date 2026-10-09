import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildManualWhatsAppLink, buildManualWhatsAppText } from '../utils/whatsappManualShare';
import { useLenisNestedScroll } from '../hooks/useLenisNestedScroll';
import { X, MessageCircle, RefreshCcw, LoaderCircle, Download, Copy, ExternalLink } from 'lucide-react';

type Props = {
  token: string; billId: number; paymentIds: number[]; initialKind: 'BILL' | 'RECEIPT';
  onClose: () => void; onStatus: (status: string, simulated: boolean) => void;
};

export default function DispensaryWhatsAppModal({ token, billId, paymentIds, initialKind, onClose, onStatus }: Props) {
  const bindPreviewScroll = useLenisNestedScroll();
  const bindOptionsScroll = useLenisNestedScroll();
  const bindModalScroll = useLenisNestedScroll();
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [kind, setKind] = useState(initialKind);
  const [preview, setPreview] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [copyNote, setCopyNote] = useState('');
  const [revision, setRevision] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const priorFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new Event('lenis:stop'));
    modalRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; window.dispatchEvent(new Event('lenis:start')); priorFocus?.focus(); };
  }, []);
  const readResponse = async (response: Response) => {
    try { return await response.json(); } catch { throw new Error('Clinic server se connection nahi ho paya. Dobara try karein.'); }
  };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = '';
    setLoading(true); setError(''); setPreview(null); setManualNote(''); setCopyNote('');
    fetch(`/api/v1/whatsapp/dispensary/${billId}/preview`, {
      method: 'POST', headers, signal: abort.signal,
      body: JSON.stringify({ kind, language, payment_ids: kind === 'RECEIPT' ? paymentIds : [] }),
    }).then(async response => {
      const body = await readResponse(response);
      if (!response.ok || !body.success) throw new Error(body.message || 'Unable to prepare document');
      if (abort.signal.aborted) return;
      const data = body.data;
      const bytes = Uint8Array.from(atob(data.pdf_base64), char => char.charCodeAt(0));
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setPdfUrl(objectUrl); setPreview(data);
      setPhone(previous => previous || String(data.recipients?.[0]?.phone || ''));
      setMessage(buildManualWhatsAppText(data.document));
    }).catch(err => { if (!abort.signal.aborted) setError(err.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [billId, token, kind, language, revision]);

  const blocked = preview?.consent === 'OPTED_OUT';
  let chatLink = '';
  try { chatLink = buildManualWhatsAppLink(phone, message); } catch { /* Show validation when the action is selected. */ }

  const openManualChat = () => {
    if (!preview || !pdfUrl || blocked) return;
    setError('');
    try {
      const link = buildManualWhatsAppLink(phone, message);
      // Open synchronously during the click, before starting the PDF download.
      const chat = window.open('about:blank', '_blank');
      const download = document.createElement('a');
      download.href = pdfUrl; download.download = preview.filename;
      document.body.appendChild(download); download.click(); download.remove();
      if (!chat) {
        setError('PDF download shuru hua. Chat popup block hua hai; neeche Open patient chat use karein.');
        return;
      }
      chat.opener = null;
      chat.location.replace(link);
      setManualNote('Chat ready hai. Downloaded PDF attach karke WhatsApp mein Send karein.');
      onStatus('Chat prepared', false);
    } catch (err: any) { setError(err.message || 'WhatsApp chat open nahi ho paya.'); }
  };
  const copyMessage = async () => {
    try { await navigator.clipboard.writeText(message); setCopyNote('Text copied'); }
    catch { setCopyNote('Text select karke manually copy kar lein.'); }
  };

  return createPortal(<div className="fixed inset-0 z-[10010] flex items-center justify-center bg-gray-900/70 p-3 backdrop-blur-sm no-print">
    <div ref={modalRef} tabIndex={-1} onKeyDown={event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') || []);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} role="dialog" aria-modal="true" aria-labelledby="whatsapp-share-heading" className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div><h3 id="whatsapp-share-heading" className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#2d8789]"><MessageCircle size={18} /> Send on WhatsApp</h3><p className="mt-1 text-xs text-gray-500">Recipient aur document check karke send karein.</p></div>
        <button aria-label="Close WhatsApp preview" onClick={onClose} className="rounded-full bg-gray-100 p-2 text-gray-500 disabled:opacity-40"><X size={20} /></button>
      </div>
      <div ref={bindModalScroll} data-lenis-prevent className="grid min-h-0 flex-1 grid-cols-1 overflow-auto md:overflow-hidden md:grid-cols-[1fr_300px]">
        <div ref={bindPreviewScroll} data-lenis-prevent className="min-h-[320px] overflow-y-auto bg-gray-100 p-3 md:h-full md:min-h-0">
          {loading ? <div className="flex h-full items-center justify-center text-[#549E9E]"><LoaderCircle className="animate-spin" /> Preparing PDF...</div> : preview ? <div aria-label="WhatsApp document preview" className="mx-auto min-h-full max-w-2xl rounded-xl bg-white p-6 shadow-sm">
            <h4 className="text-xl font-black text-[#2d8789]">Dr. Trivedi’s Homeopathy Clinic</h4>
            <p className="mt-1 text-xs text-gray-500">{preview.document.branch_name}</p><p className="text-xs text-gray-500">{preview.document.branch_address}</p>
            <h5 className="mt-6 text-sm font-black uppercase text-gray-800">{preview.document.labels.title}</h5>
            <p className="mt-2 text-xs text-gray-600">{preview.document.labels.bill}: {preview.document.bill_number} · {preview.document.date}</p>
            <p className="mt-2 text-sm font-bold text-gray-800">{preview.document.patient_name} <span className="text-[#2d8789]">{preview.document.patient_uuid}</span></p>
            <table className="mt-5 w-full text-left text-xs"><thead className="bg-[#549E9E]/10 text-[#2d8789]"><tr><th className="p-3">{preview.document.labels.item}</th><th className="p-3">{preview.document.labels.qty}</th><th className="p-3 text-right">{preview.document.labels.amount}</th></tr></thead><tbody>{preview.document.lines.map((line: any, index: number) => <tr key={index} className="border-b border-gray-100"><td className={`p-3 font-bold ${line.type === 'TEST' ? 'text-amber-700' : 'text-gray-700'}`}>{line.name}</td><td className="p-3 text-gray-600">{line.quantity ?? line.mode}</td><td className="whitespace-nowrap p-3 text-right font-bold text-gray-700">₹ {Number(line.amount || 0).toFixed(2)}</td></tr>)}</tbody></table>
            <div className="mt-5 space-y-2">{preview.document.totals.map(([label, value]: [string, number]) => <div key={label} className={`flex justify-between gap-3 text-sm ${['Net bill', 'Total received', 'शुद्ध बिल', 'कुल प्राप्त राशि'].includes(label) ? 'font-black text-[#2d8789]' : 'text-gray-600'}`}><span>{label}</span><span>₹ {Number(value || 0).toFixed(2)}</span></div>)}</div>
            <p className="mt-6 text-[10px] text-gray-400">Saved clinic record. No new bill or consultation is created.</p>
          </div> : <div className="p-5 text-sm text-gray-500">Document preview unavailable.</div>}
        </div>
        <div className="flex min-h-0 flex-col bg-white">
        <div ref={bindOptionsScroll} data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div className="rounded-xl bg-[#549E9E]/5 p-3"><p className="font-bold text-gray-800">{preview?.patient_name || 'Patient'}</p><p className="mt-1 text-xs font-bold text-[#2d8789]">{preview?.patient_uuid}</p>{preview?.family_name && <p className="mt-2 text-xs text-gray-500">Family patient: {preview.family_name}. Saved number is the primary patient’s contact.</p>}</div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">{(['en', 'hi'] as const).map(value => <button key={value} disabled={loading} onClick={() => setLanguage(value)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${language === value ? 'bg-[#549E9E] text-white' : 'text-gray-600'}`}>{value === 'en' ? 'English' : 'हिंदी'}</button>)}</div>
          <label className="text-xs font-bold text-gray-600">Document<select aria-label="WhatsApp document" disabled={loading} value={kind} onChange={event => setKind(event.target.value as 'BILL' | 'RECEIPT')} className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"><option value="BILL">Current bill (medicines / tests)</option><option value="RECEIPT" disabled={!paymentIds.length}>Payment receipt</option></select></label>
          {preview?.recipients?.length > 1 && <label className="text-xs font-bold text-gray-600">Recipient<select aria-label="WhatsApp recipient" disabled={loading} onChange={event => setPhone(event.target.value)} value={phone} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm">{preview.recipients.map((recipient: any, i: number) => <option key={i} value={recipient.phone || ''}>{recipient.name} ({recipient.type === 'FAMILY' ? 'Family' : 'Patient'})</option>)}{!preview.recipients.some((r: any) => r.phone === phone) && <option value={phone}>Entered number</option>}</select></label>}
          <label className="text-xs font-bold text-gray-600">WhatsApp number<input aria-label="WhatsApp number" inputMode="tel" value={phone} disabled={loading} onChange={event => setPhone(event.target.value)} placeholder="10 digit number or +91..." className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm font-bold" /></label>
          <p className="text-xs leading-relaxed text-gray-500">Is patient ka chat ready text ke saath khulega. Final Send WhatsApp mein aap karenge.</p>
          <div className="rounded-xl bg-[#549E9E]/5 p-3 text-xs leading-relaxed text-gray-600"><p className="font-bold text-[#2d8789]">Manual WhatsApp sharing</p><p className="mt-1">WhatsApp mein jis account se login hain, usi se send hoga.</p><p className="mt-2">1. PDF download hoga.<br />2. Patient chat mein text ready hoga.<br />3. Downloaded PDF attach karke Send karein.</p></div>
          <label className="text-xs font-bold text-gray-600">WhatsApp text<textarea aria-label="WhatsApp text" value={message} onChange={event => setMessage(event.target.value)} rows={5} disabled={loading} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-xs font-normal leading-relaxed" /></label>
          <button type="button" disabled={loading || !message.trim()} onClick={copyMessage} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600"><Copy size={14} /> {copyNote || 'Copy text'}</button>
          {preview?.consent === 'OPTED_OUT' && <p className="text-xs font-bold text-amber-700">Patient ne WhatsApp messages opt out kiye hain.</p>}
          {manualNote && <p role="status" className="rounded-xl bg-[#549E9E]/10 p-3 text-xs font-bold text-[#2d8789]">{manualNote}</p>}
          {error && <p role="alert" className="text-xs font-bold text-red-600">{error === 'Failed to fetch' ? 'Connection lost. Preview dobara load karein.' : error}</p>}
          {preview && chatLink && !blocked && <a href={chatLink} target="_blank" rel="noopener noreferrer" onClick={() => { setManualNote('PDF attach karke WhatsApp mein Send karein.'); onStatus('Chat prepared', false); }} className="flex items-center justify-center gap-2 rounded-xl border border-[#549E9E]/30 px-3 py-2 text-xs font-bold text-[#2d8789]"><ExternalLink size={14} /> Open patient chat</a>}
          {preview && <a href={pdfUrl} download={preview.filename} className="flex items-center justify-center gap-2 rounded-xl border border-[#549E9E]/30 px-3 py-2 text-xs font-bold text-[#2d8789]"><Download size={14} /> Download PDF</a>}
          {<button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600"><RefreshCcw size={14} /> Reload preview</button>}
        </div>
        <div className="shrink-0 border-t border-gray-100 bg-white p-4">
          <button type="button" onClick={openManualChat} disabled={loading || !preview || !phone.trim() || !message.trim() || blocked} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#549E9E] px-4 py-3 text-xs font-black text-white hover:bg-[#458b8b] disabled:opacity-40"><MessageCircle size={16} /> Download PDF &amp; Open WhatsApp</button>
        </div>
        </div>
      </div>
    </div>
  </div>, document.body);
}
