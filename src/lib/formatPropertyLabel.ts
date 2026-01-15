export type PropertyLabelAddress = {
  line1?: string | null;
  city?: string | null;
  postcode?: string | null;
};

export type PropertyLabelInput = {
  title?: string | null;
  address?: PropertyLabelAddress | null;
};

/**
 * Formats a human-friendly property label.
 *
 * Preference order:
 *  1) address (line1, city, postcode)
 *  2) title
 *  3) "your property"
 */
export function formatPropertyLabel(property: PropertyLabelInput | null | undefined): string {
  const line1 = property?.address?.line1?.toString().trim();
  const city = property?.address?.city?.toString().trim();
  const postcode = property?.address?.postcode?.toString().trim();

  const parts = [line1, city, postcode].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );

  if (parts.length > 0) return parts.join(", ");

  const title = property?.title?.toString().trim();
  if (title) return title;

  return "your property";
}
