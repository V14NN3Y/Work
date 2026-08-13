export function formatFCFA(amount: string | number): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
}
