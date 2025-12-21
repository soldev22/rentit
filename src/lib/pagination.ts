/**
 * Returns an array of page numbers (and ellipsis) for pagination controls.
 * @param current Current page number
 * @param total Total number of pages
 */
export function getPageNumbers(current: number, total: number): (number | "…")[] {
  const pages: (number | "…")[] = [];

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  pages.push(1);

  if (current > 4) pages.push("…");

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 3) pages.push("…");

  pages.push(total);

  return pages;
}
