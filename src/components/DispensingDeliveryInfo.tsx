import React from 'react';
import { PackageCheck, Truck } from 'lucide-react';
import { resolveDispensingDelivery } from '../utils/dispensingDelivery';

export default function DispensingDeliveryInfo({ sources, lang = 'en', compact = false }: {
  sources: any[];
  lang?: 'en' | 'hi';
  compact?: boolean;
}) {
  const delivery = resolveDispensingDelivery(...sources);
  const isHi = lang === 'hi';
  const label = (en: string, hi: string) => isHi ? hi : en;
  const isCourier = delivery.mode === 'COURIER';
  const title = delivery.status === 'NOT_DISPENSED'
    ? label('Medicine not dispensed yet', 'दवा अभी डिस्पेंस नहीं हुई')
    : delivery.status === 'NOT_RECORDED'
      ? label('Delivery mode not recorded', 'डिलीवरी का तरीका दर्ज नहीं है')
      : isCourier
        ? label('Dispensed via Courier', 'कूरियर से डिस्पेंस')
        : label('Dispensed via Hand Delivery', 'हाथ से डिस्पेंस');

  return <div className={`flex items-start gap-2 border ${delivery.status === 'DISPENSED' ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800' : 'border-amber-200 bg-amber-50/70 text-amber-800'} ${compact ? 'rounded-md px-2 py-1.5 text-[9px]' : 'rounded-lg px-3 py-2 text-[10px]'} page-break-inside-avoid`}>
    {isCourier ? <Truck size={compact ? 12 : 14} className="mt-0.5 shrink-0" /> : <PackageCheck size={compact ? 12 : 14} className="mt-0.5 shrink-0" />}
    <div className="min-w-0">
      <p className="font-black uppercase tracking-wider">{title}</p>
      {isCourier && delivery.address && <p className="mt-0.5 font-bold text-gray-600">{delivery.address}</p>}
      {isCourier && delivery.trackingNo && <p className="font-bold text-gray-600">{label('Tracking', 'ट्रैकिंग')}: {delivery.trackingNo}</p>}
    </div>
  </div>;
}
