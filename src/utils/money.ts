export function formatMoney(amountCents: number, currency: string) {
  const amount = (amountCents / 100).toFixed(2);
  return `${currency.toUpperCase()} $${amount}`;
}

export function computeEvenSplit(totalCents: number, n: number) {
  const base = Math.floor(totalCents / n);
  const r = totalCents % n;
  return Array.from({ length: n }, (_, i) => base + (i < r ? 1 : 0));
}
