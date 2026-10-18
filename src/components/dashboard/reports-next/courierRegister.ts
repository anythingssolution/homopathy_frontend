type Amount = number | string;

export const courierRegisterAmounts = (row: {
  medicine_gross: Amount; medicine_discount: Amount;
  courier_gross: Amount; courier_discount: Amount;
}) => {
  const medicineGross = Number(row.medicine_gross) || 0;
  const deliveryGross = Number(row.courier_gross) || 0;
  const medicineNet = Math.max(0, medicineGross - (Number(row.medicine_discount) || 0));
  const deliveryNet = Math.max(0, deliveryGross - (Number(row.courier_discount) || 0));
  const gross = medicineGross + deliveryGross;
  const net = medicineNet + deliveryNet;
  return { gross, discount: gross - net, net };
};
