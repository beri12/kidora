export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(date: Date = new Date()): DayPart {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
