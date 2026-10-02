type ProductPriceFields = {
  mrp_rate?: string | number | null;
  price_max?: string | number | null;
  price_min?: string | number | null;
  historical_unit_price?: string | number | null;
};

const toPositivePrice = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveOtherMedicineUnitPrice = (
  product: ProductPriceFields,
): number => {
  for (const value of [
    product.mrp_rate,
    product.price_max,
    product.price_min,
    product.historical_unit_price,
  ]) {
    const price = toPositivePrice(value);
    if (price !== null) return price;
  }

  return 0;
};

export const deriveManualUnitPrice = (
  amount: string | number,
  quantity: string | number,
): number | null => {
  if (amount === "") return null;

  const parsedAmount = Number(amount);
  const parsedQuantity = Math.max(1, parseInt(String(quantity || 1), 10) || 1);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return null;

  return Number((parsedAmount / parsedQuantity).toFixed(2));
};

export const calculateOtherMedicineAmount = (
  unitPrice: string | number | null | undefined,
  quantity: string | number,
): string | null => {
  const parsedUnitPrice = Number(unitPrice);
  const parsedQuantity = Math.max(1, parseInt(String(quantity || 1), 10) || 1);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) return null;

  return (parsedUnitPrice * parsedQuantity).toFixed(2);
};
