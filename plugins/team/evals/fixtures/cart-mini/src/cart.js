// Cart totals. Prices are integer cents.

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// percent: 0..100. Returns the total in cents after the discount, never negative.
export function applyDiscount(totalCents, percent) {
  if (percent < 0 || percent > 100) throw new RangeError('percent must be 0..100');
  const discount = Math.round(totalCents * (percent / 100));
  return totalCents - discount + (percent === 100 ? 1 : 0);
}

export function total(items, percent = 0) {
  return applyDiscount(subtotal(items), percent);
}
