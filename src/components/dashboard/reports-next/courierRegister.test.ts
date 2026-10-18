import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courierRegisterAmounts } from './courierRegister';

test('courier register combines medicine and delivery after category discounts, excluding tests', () => {
  // A bill of 1180 includes tests of 200; the courier amount must be 980.
  const amounts = courierRegisterAmounts({ medicine_gross: '1000', medicine_discount: '100', courier_gross: '100', courier_discount: '20' });
  assert.deepEqual(amounts, { gross: 1100, discount: 120, net: 980 });
  assert.equal(amounts.net + 200, 1180);
});

test('free delivery and fully discounted medicines preserve their separate category amounts', () => {
  assert.deepEqual(courierRegisterAmounts({ medicine_gross: 500, medicine_discount: 50, courier_gross: 0, courier_discount: 0 }), { gross: 500, discount: 50, net: 450 });
  assert.deepEqual(courierRegisterAmounts({ medicine_gross: 100, medicine_discount: 100, courier_gross: 50, courier_discount: 0 }), { gross: 150, discount: 100, net: 50 });
  assert.deepEqual(courierRegisterAmounts({ medicine_gross: 0, medicine_discount: 0, courier_gross: 0, courier_discount: 0 }), { gross: 0, discount: 0, net: 0 });
});
