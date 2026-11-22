import assert from 'node:assert/strict';
import {test} from 'node:test';
import {groupLocationPatients,csvCell,type LocationPatient} from './locationPatients';
const row=(id:number,extra:Partial<LocationPatient>):LocationPatient=>({subject_key:`PAT:${id}`,patient_id:id,patient_uuid:`REG${id}`,patient_full_name:'Patient',consultations:1,address_inherited:false,...extra});
test('city grouping normalizes casing/spacing, retains missing addresses and reconciles counts',()=>{
  const patients=[row(1,{city:' Raipur ',consultations:3}),row(2,{city:'RAIPUR',consultations:2}),row(3,{city:''}),row(4,{city:'null'})];
  const groups=groupLocationPatients(patients,'city');
  assert.equal(groups.length,2);assert.equal(groups.find(g=>g.name.toLowerCase()==='raipur')?.patients.length,2);assert.equal(groups.find(g=>g.name.toLowerCase()==='raipur')?.consultations,5);
  assert.equal(groups.reduce((s,g)=>s+g.patients.length,0),patients.length);
  assert.equal(groups.find(g=>!g.name)?.patients.length,2);
});
test('ward and area names in different cities remain separate',()=>{
  const patients=[row(1,{city:'Raipur',ward_no:'5',area_name:'Central'}),row(2,{city:'Durg',ward_no:'5',area_name:'Central'})];
  assert.equal(groupLocationPatients(patients,'ward_no').length,2);
  assert.equal(groupLocationPatients(patients,'area_name').length,2);
});
test('CSV export escapes quotes and spreadsheet formulas',()=>{
  assert.equal(csvCell('=SUM(1,2)'),`"'=SUM(1,2)"`);
  assert.equal(csvCell('Patient "A"'),'"Patient ""A"""');
});
test('state aliases combine known spellings without losing subjects or changing source addresses',()=>{
  const variants=['CHHATTISGARH','CHHATISHGARH','CHATTISGARH','CHHATISGARH','CHHATTISHGARH','CHHATISHGAR','CHHATTISGHARH','CHHATTISGARG','CHHATTISGARH4','CHHATTISGAR','CHAATISHGARH','CHATISGARH','cg'];
  const patients=variants.map((state_name,i)=>row(i+1,{state_name}));
  patients.push(row(100,{state_name:'UP'}),row(101,{state_name:'Utter pradesh'}),row(102,{state_name:'HYDERABAD'}),row(103,{state_name:'EUROPE'}),row(104,{state_name:null as any}));
  const before=JSON.stringify(patients);
  const groups=groupLocationPatients(patients,'state_name');
  assert.equal(groups.find(g=>g.name==='Chhattisgarh')?.patients.length,variants.length);
  assert.equal(groups.find(g=>g.name==='Uttar Pradesh')?.patients.length,2);
  assert.equal(groups.find(g=>g.name==='HYDERABAD')?.patients.length,1);
  assert.equal(groups.find(g=>g.name==='EUROPE')?.patients.length,1);
  assert.equal(groups.find(g=>!g.name)?.patients.length,1);
  assert.equal(groups.reduce((sum,g)=>sum+g.patients.length,0),patients.length);
  assert.equal(JSON.stringify(patients),before);
});
