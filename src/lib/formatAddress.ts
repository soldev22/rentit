export function formatAddress(address: { line1?: string; city?: string; postcode?: string }, fallback?: string) {
  if (address?.line1) {
    return `${address.line1}, ${address.city ?? ""} ${address.postcode ?? ""}`.trim();
  }
  return fallback ?? "Property";
}
