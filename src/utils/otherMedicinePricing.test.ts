import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  calculateOtherMedicineAmount,
  deriveManualUnitPrice,
  resolveOtherMedicineUnitPrice,
} from "./otherMedicinePricing";

test("uses a positive fallback price when MRP is zero", () => {
  assert.equal(resolveOtherMedicineUnitPrice({
    mrp_rate: "0.00",
    price_max: "210.00",
    price_min: "210.00",
  }), 210);
});

test("uses a consistent historical unit price when every master price is missing", () => {
  assert.equal(resolveOtherMedicineUnitPrice({
    mrp_rate: "0.00",
    price_max: null,
    price_min: null,
    historical_unit_price: "120.00",
  }), 120);
});

test("keeps an adjusted per-unit price when quantity changes", () => {
  const adjustedUnitPrice = deriveManualUnitPrice("475.00", 2);
  assert.equal(adjustedUnitPrice, 237.5);
  assert.equal(calculateOtherMedicineAmount(adjustedUnitPrice, 3), "712.50");
});
