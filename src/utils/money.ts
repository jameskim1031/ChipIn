export function formatMoney(amountCents: number, currency: string) {
  const amount = (amountCents / 100).toFixed(2);
  return `${currency.toUpperCase()} $${amount}`;
}
