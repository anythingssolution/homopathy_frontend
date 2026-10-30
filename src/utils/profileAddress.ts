type AddressFields = {area_name?: string | null; address?: string | null; city?: string | null; pincode?: string | null; ward_no?: string | null; state_name?: string | null; vidhan_sabha?: string | null};
// Preserve free-text legacy addresses without guessing a city or pincode.
export function profileAreaValue(user: AddressFields) {
  if (user.area_name?.trim()) return user.area_name.trim();
  let area = user.address?.trim() || '';
  for (const part of [user.state_name, user.city, user.pincode, user.vidhan_sabha, user.ward_no ? `Ward ${user.ward_no}` : null]) {
    const suffix = part?.trim();
    if (!suffix) continue;
    if (area.toLowerCase() === suffix.toLowerCase()) area = '';
    else if (area.toLowerCase().endsWith(`, ${suffix}`.toLowerCase())) area = area.slice(0, -(suffix.length + 2)).trim();
  }
  return area;
}
