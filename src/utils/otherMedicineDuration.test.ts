import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOtherMedicineDurationQuantity, isDurationQuantitySelection } from './medicationDuration';
import { calculateOtherMedicineAmount } from './otherMedicinePricing';

test('tablets use the 15-day quantity rule regardless of packing', () => {
  for (const product of [
    { category: 'TABLET', packing: '20 gm' },
    { product_type: 'Tablets', packing: '100' },
    { medicine_name: 'BIO TAB', label: '60 tablets' },
    { category: 'TAB', packing: 'N/A' },
  ]) assert.equal(isDurationQuantitySelection(product), true);
  for (const [duration, qty] of [['7', 1], ['15', 1], ['30', 2], ['45', 3], ['2M', 4], ['3M', 6], ['6M', 12]] as const) {
    assert.equal(getOtherMedicineDurationQuantity(duration), qty);
    assert.equal(calculateOtherMedicineAmount(150, qty), (150 * qty).toFixed(2));
  }
});

test('existing 30 ml drops still scale while other products remain excluded', () => {
  assert.equal(isDurationQuantitySelection({ category: 'DROPS', packing: '30 ml' }), true);
  assert.equal(isDurationQuantitySelection({ category: 'DROPS', packing: '100 ml' }), false);
  assert.equal(isDurationQuantitySelection({ category: 'SYRUP', packing: '100 ml' }), false);
  assert.equal(isDurationQuantitySelection({ category: 'POWDER', packing: '30 gm' }), false);
  assert.equal(isDurationQuantitySelection({ medicine_name: 'STABILIZER' }), false);
  assert.equal(isDurationQuantitySelection(null), false);
});
