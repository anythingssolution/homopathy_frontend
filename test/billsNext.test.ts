import test from 'node:test';
import assert from 'node:assert/strict';
import { groupVisits, filterVisits, fetchBillRows, billCategory, paymentSource, isOlderDuePayment } from '../src/components/dashboard/bills-next/lib.ts';

const bill = (id: number, extra: any = {}) => ({bill_id:id, appointment_id:id, bill_type:'CONSULTATION', appointment_date:'2026-09-08', total_amount:300, paid_amount:300, pending_amount:0, payment_status:'PAID', ...extra});

test('highest POS first even when completion, token and bill order disagree', () => {
 const rows = groupVisits([
  bill(1, {queue_position:7, token_number:20, consultation_completed_at:'2026-09-08 11:00:00', created_at:'2026-09-08 15:00:00'}),
  bill(2, {queue_position:8, token_number:3, consultation_completed_at:'2026-09-08 10:30:00'}),
  bill(3, {appointment_id:2,bill_type:'MEDICATION',queue_position:8,consultation_completed_at:'2026-09-08 10:30:00'}),
  bill(4, {appointment_id:null, bill_type:'MEDICATION', consultation_completed_at:'2026-09-08 16:00:00',queue_position:99}),
 ]);
 assert.deepEqual(rows.map(r=>r.appointment_id),[2,1,null]);
 assert.deepEqual(rows.map(r=>r.queue_position),[8,7,null]);
 assert.equal(rows[0].bills.length,2);
 assert.equal(groupVisits([bill(2,{queue_position:8})])[0].queue_position,8);
});

test('zero-amount free follow-up stays PAID and medicine, tests, courier reconcile', () => {
 const free=groupVisits([bill(1,{total_amount:0,paid_amount:0,payment_settlement_type:'FOLLOW_UP'})])[0];
 assert.equal(free.overall_payment_status,'PAID');
 const medication=groupVisits([bill(2,{bill_type:'MEDICATION',total_amount:1000,test_amount:150,courier_amount:50})])[0];
 assert.equal(medication.medicine_total,800);
 assert.equal(medication.test_total+medication.courier_total+medication.medicine_total,medication.grand_total);
 assert.equal(billCategory({bill_type:'MEDICATION',appointment_id:null,consultation_id:2,remark:'Repeat Medicine - Medical Only'}),'medical_only');
});

test('all pages are loaded and a later page failure is never shown as a complete total', async (t) => {
 const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
 const requests: URL[]=[];
 globalThis.fetch=async (input:any)=>{const url=new URL(String(input),'http://test');requests.push(url);return new Response(JSON.stringify({success:true,data:[{bill_id:Number(url.searchParams.get('page'))}],meta:{total_pages:2}}));};
 assert.deepEqual((await fetchBillRows('test',{})).map(r=>r.bill_id),[1,2]);
 assert.ok(requests.every(url=>url.searchParams.get('billing_scope')==='branch'));
 globalThis.fetch=async (input:any)=>new Response(JSON.stringify({success:new URL(String(input),'http://test').searchParams.get('page')==='1',data:[],meta:{total_pages:2},message:'Page unavailable'}));
 await assert.rejects(fetchBillRows('test',{}),/Page unavailable/);
});

test('receipt source distinguishes token medicines, prescription repeats and medical-only sales', () => {
 assert.equal(paymentSource({bill_type:'CONSULTATION', appointment_id:1}), 'consultation');
 assert.equal(paymentSource({bill_type:'MEDICATION', appointment_id:1}), 'token_medicine');
 assert.equal(paymentSource({bill_type:'MEDICATION', consultation_id:2, bill_remark:'Repeat Medicine'}), 'repeat');
 assert.equal(paymentSource({bill_type:'MEDICATION', consultation_id:2, bill_remark:'Repeat Medicine - Medical Only'}), 'medical_only');
 assert.equal(paymentSource({bill_type:'MEDICATION', remark:'Repeat Medicine'}), 'medical_only');
 assert.equal(isOlderDuePayment({allocation_kind:'PREVIOUS'}), true);
 assert.equal(isOlderDuePayment({allocation_kind:'CURRENT',original_bill_date:'2026-09-07',collected_at:'2026-09-08 10:00:00'}), true);
 assert.equal(isOlderDuePayment({allocation_kind:'CURRENT',original_bill_date:'2026-09-08',collected_at:'2026-09-08 10:00:00',pending_before:100}), false);
});

test('every Visits category preserves POS ordering and numbering across pages and search', () => {
 for (const category of ['consultation', 'follow_up', 'medication', 'courier']) {
  const extra = category === 'follow_up' ? {payment_settlement_type:'FOLLOW_UP'}
   : category === 'consultation' ? {} : {bill_type:'MEDICATION', delivery_mode:category === 'courier' ? 'COURIER' : 'HAND'};
  const visits = groupVisits(Array.from({length:23}, (_, i) => bill(i+1, {
   ...extra, appointment_status:'Completed', queue_position:(i+1)*2, start_time:'18:00:00', patient_full_name:'Match',
  })));
  for (const menu of ['all', category === 'follow_up' ? 'consultation' : category]) {
   const rows = filterVisits(visits, menu, 'match');
   assert.deepEqual(rows.map(r=>r.queue_position), Array.from({length:23},(_,i)=>(23-i)*2));
   assert.equal(rows.slice(10,20)[0].queue_position,26);
   assert.equal(rows.slice(20)[0].queue_position,6);
  }
 }
 const medical = groupVisits([
  bill(1,{appointment_id:null,bill_type:'MEDICATION',consultation_id:4,created_at:'2026-09-08 10:00:00'}),
  bill(2,{appointment_id:null,bill_type:'MEDICATION',consultation_id:4,created_at:'2026-09-08 11:00:00'}),
  bill(3,{appointment_id:null,bill_type:'MEDICATION',created_at:'2026-09-08 12:00:00'}),
 ]);
 assert.deepEqual(filterVisits(medical,'repeat').map(r=>r.group_key),['bill-2','bill-1']);
 assert.deepEqual(filterVisits(medical,'medical_only').map(r=>r.group_key),['bill-3']);
 assert.ok(medical.every(r=>r.queue_position === null));
});

test('Consultation includes eligible follow-ups and hides only incomplete zero-fee follow-ups; All retains them', () => {
 const visits = groupVisits([
  bill(1,{total_amount:0,appointment_status:'Confirmed',payment_settlement_type:'FOLLOW_UP'}),
  bill(2,{total_amount:200,paid_amount:0,appointment_status:'Confirmed',payment_settlement_type:'FOLLOW_UP'}),
  bill(3,{total_amount:0,appointment_status:'Completed',payment_settlement_type:'FOLLOW_UP'}),
  bill(4,{total_amount:0,appointment_status:'Confirmed',payment_settlement_type:'FOLLOW_UP',consultation_completed_at:'2026-09-08 10:00:00'}),
  bill(5,{total_amount:0,appointment_status:'Confirmed'}),
  bill(6,{total_amount:0,actual_completed_at:'2026-09-08 11:00:00',payment_settlement_type:'FOLLOW_UP'}),
 ]);
 assert.equal(filterVisits(visits,'all').length,6);
 assert.deepEqual(filterVisits(visits,'follow_up').map(r=>r.group_key).sort(),['apt-2','apt-3','apt-6']);
 assert.deepEqual(filterVisits(visits,'consultation').map(r=>r.group_key).sort(),['apt-2','apt-3','apt-5','apt-6']);
 assert.equal(visits.length,6);
});
