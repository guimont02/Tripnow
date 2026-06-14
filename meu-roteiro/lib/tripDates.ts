export function getLocalDateISO(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayDateISO(startDate: string, day: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDayDate(startDate: string, day: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + day - 1);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function minutesUntil(time: string): number {
  const [h, min] = time.split(':').map(Number);
  const now = new Date();
  return (h * 60 + min) - (now.getHours() * 60 + now.getMinutes());
}

export interface TripDateStatus {
  isActive: boolean;
  tripDay: number;
}

export function getTripDateStatus(startDate: string, duration: number): TripDateStatus {
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tripDay = Math.floor((todayMidnight.getTime() - start.getTime()) / 86400000) + 1;
  const isActive = tripDay >= 1 && tripDay <= duration;
  return { isActive, tripDay };
}
