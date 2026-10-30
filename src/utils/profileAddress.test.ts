import test from 'node:test';
import assert from 'node:assert/strict';
import {profileAreaValue} from './profileAddress';
test('profile address prefills structured area, preserves free text and strips only known suffixes',()=>{
  assert.equal(profileAreaValue({address:'Mowa, Ward 4, Raipur North, 492001, Raipur, Chhattisgarh',state_name:'Chhattisgarh',ward_no:'4',vidhan_sabha:'Raipur North',city:'Raipur',pincode:'492001'}),'Mowa');
  assert.equal(profileAreaValue({area_name:'Mowa',address:'Mowa, 492001, Raipur'}),'Mowa');
  assert.equal(profileAreaValue({address:'Mowa, Ward 4, Raipur North, 492001, Raipur',ward_no:'4',vidhan_sabha:'Raipur North',city:'Raipur',pincode:'492001'}),'Mowa');
  assert.equal(profileAreaValue({address:'House 42, Near Mandir'}),'House 42, Near Mandir');
  assert.equal(profileAreaValue({address:'Raipur',city:'Raipur'}),'');
});
