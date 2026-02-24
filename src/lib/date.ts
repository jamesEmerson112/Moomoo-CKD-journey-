export function parseRangeToDays(range: string | null | undefined): 7 | 30 | 90 {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDateOnly(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function startDateForRange(days: number): Date {
  const current = new Date();
  current.setUTCHours(0, 0, 0, 0);
  current.setUTCDate(current.getUTCDate() - (days - 1));
  return current;
}
