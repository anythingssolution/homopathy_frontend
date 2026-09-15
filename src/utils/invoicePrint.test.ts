import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInvoiceModel, amountInWords } from './invoicePrint';
const paid = {payment_id:1,bill_id:10,status:'SUCCESS',payment_mode:'CASH',amount:100};
const old = {payment_id:2,bill_id:9,bill_number:'OLD-9',status:'SUCCESS',payment_mode:'CASH',amount:50};
const bill = {bill_id:10,bill_number:'B10',bill_type:'MEDICATION',appointment_id:4,total_amount:150,paid_amount:100,pending_amount:50,items:[{item_name:'Medicine',quantity:1,unit_price:150,amount:150}],payments:[paid],previous_pending_settlements:[old]};
test('invoice excludes old dues from current totals and deduplicates receipt allocations',()=>{
 const model=buildInvoiceModel([{...bill,payments:[paid,paid],previous_pending_settlements:[old,old]}]);
 assert.equal(model.total,150);assert.equal(model.paid,100);assert.equal(model.pending,50);assert.equal(model.recovered.length,1);assert.match(model.modes,/100/);
});
test('multi-bill serials are continuous and internal remarks never enter the print model',()=>{
 const model=buildInvoiceModel([bill,{...bill,bill_id:11,bill_type:'CONSULTATION',remark:'Doctor entered initial pricing'}]);
 assert.deepEqual(model.sections.map(s=>s.items[0].serial),[1,2]);assert.equal(model.sections[1].category,'Consultation');assert.ok(!JSON.stringify(model).includes('initial pricing'));
});
test('direct and repeat are distinct; missing item data does not invent quantity/rate',()=>{
 const direct=buildInvoiceModel([{...bill,appointment_id:null,consultation_id:null,items:[]}]);
 assert.equal(direct.sections[0].category,'Direct Medicine');assert.equal(direct.sections[0].items[0].quantity,undefined);
 assert.equal(buildInvoiceModel([{...bill,appointment_id:null,consultation_id:2}]).sections[0].category,'Repeat Medicine');
});
test('payment modes excluded when incomplete; failed receipts do not appear',()=>{
 const model=buildInvoiceModel([{...bill,payments:[{...paid,status:'FAILED'}]}]);assert.equal(model.modes,'');
});
test('amount in words preserves paise and Indian grouping',()=>{
 assert.equal(amountInWords(1309.96),'One Thousand Three Hundred Nine Rupees and Ninety Six Paise Only');assert.equal(amountInWords(100000),'One Lakh Rupees Only');
});
