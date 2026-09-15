export const invoiceMoney = (value: unknown) => Number(value || 0).toLocaleString('en-IN', { style:'currency', currency:'INR', minimumFractionDigits:2 });
export const invoiceDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value).includes('T') ? String(value) : String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'});
};
export function buildInvoiceModel(bills: any[]) {
  let serial = 0;
  const ids = new Set(bills.map(b => Number(b.bill_id)));
  const successful = (rows: any[]) => rows.filter(p => String(p.status || '').toUpperCase() === 'SUCCESS');
  const unique = (rows: any[]) => [...new Map(rows.map(p => [p.payment_id, p])).values()];
  const payments = unique(successful(bills.flatMap(b => b.payments || [])));
  const recovered = unique(successful(bills.flatMap(b => b.previous_pending_settlements || []))).filter(p => !ids.has(Number(p.bill_id)));
  const total = bills.reduce((sum,b) => sum + Number(b.total_amount || 0),0);
  const paid = bills.reduce((sum,b) => sum + Number(b.paid_amount || 0),0);
  const pending = bills.reduce((sum,b) => sum + Number(b.pending_amount || 0),0);
  const modes = new Map<string,number>();
  payments.forEach(p => modes.set(p.payment_mode, (modes.get(p.payment_mode) || 0) + Number(p.amount || 0)));
  const modeSum = [...modes.values()].reduce((a,b)=>a+b,0);
  return {total,paid,pending,recovered,
    modes: Math.abs(modeSum-paid) < 0.01 ? [...modes].filter(([,v])=>v>0).map(([k,v])=>`${k} ${invoiceMoney(v)}`).join(' · ') : '',
    sections: bills.map(b => {
      let delivery: any = {};
      try { delivery = typeof b.delivery_details_json === 'string' ? JSON.parse(b.delivery_details_json) : b.delivery_details_json || {}; } catch {}
      return {id:b.bill_id, number:b.bill_number, date:b.created_at, total:Number(b.total_amount || 0),
        category:b.bill_type === 'CONSULTATION' ? 'Consultation' : b.appointment_id ? 'Medicines / Tests' : (!b.consultation_id || /Medical Only/i.test(b.remark || '')) ? 'Direct Medicine' : 'Repeat Medicine',
        delivery: b.delivery_mode === 'COURIER' ? ['Courier',delivery.courier_address,delivery.tracking_no && `Tracking: ${delivery.tracking_no}`].filter(Boolean).join(' · ') : '',
        items: (b.items?.length ? b.items : [{item_name:b.bill_type === 'CONSULTATION' ? 'Consultation fee' : 'Item details unavailable',amount:b.total_amount}]).map((item:any) => ({serial:++serial,name:item.item_name,quantity:item.quantity,rate:item.unit_price,amount:Number(item.amount || 0),kind:item.item_type === 'TEST' ? 'Test / Investigation' : ''})),
      };
    })};
}

export function amountInWords(value: number): string {
  const small = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const spell = (n: number): string => {
    if (n < 20) return small[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+small[n%10] : '');
    for (const [size, name] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']] as const) {
      if (n >= size) return spell(Math.floor(n/size))+' '+name+(n%size ? ' '+spell(n%size) : '');
    }
    return '';
  };
  if (!Number.isFinite(value) || value < 0) return '';
  const cents = Math.round(value*100);
  return spell(Math.floor(cents/100))+' Rupees'+(cents%100 ? ' and '+spell(cents%100)+' Paise' : '')+' Only';
}
