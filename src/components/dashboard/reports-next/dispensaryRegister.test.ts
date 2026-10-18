import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterDispensingRows, type DispensingRow } from './dispensaryRegister';

test('dispensary filters combine type, payment and patient search without changing totals', () => {
  const rows = [
    {patient_full_name:'Primary',patient_uuid:'REG1',display_token_display:'M-27',medicine_type:'REGULAR',paid_amount:400,pending_amount:150},
    {patient_full_name:'Direct',patient_uuid:'REG2',medicine_type:'DIRECT',paid_amount:100,pending_amount:0},
    {patient_full_name:'Family',patient_uuid:'REG1',medicine_type:'REPEAT',paid_amount:0,pending_amount:150},
  ] as DispensingRow[];
  assert.equal(filterDispensingRows(rows,'').length,3);
  assert.equal(filterDispensingRows(rows,'reg1','all','pending').length,2);
  assert.equal(filterDispensingRows(rows,'','DIRECT','paid').length,1);
  assert.equal(filterDispensingRows(rows,'','REPEAT','paid').length,0);
  assert.equal(filterDispensingRows(rows,' m-27 ')[0].patient_full_name,'Primary');
  assert.equal(filterDispensingRows(rows,'','all','paid').length,2);
  assert.equal(rows.length,3);
});
