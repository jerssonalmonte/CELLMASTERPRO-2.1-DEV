export function formatCurrency(amount: number): string {
  return `RD$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
