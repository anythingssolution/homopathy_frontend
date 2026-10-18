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
