export function cn(...classes: (string | undefined | null | false | 0 | 0n)[]): string {
  return classes.filter(Boolean).join(' ');
}

function parseDisplayDate(date: string | Date): Date {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  const d = parseDisplayDate(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateKey(date: string | Date): string {
  const value = new Date(date);
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join('-');
}

export function toDateTimeLocalValue(date: string | Date): string {
  const value = new Date(date);
  return `${toLocalDateKey(value)}T${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;
}

export function toUtcISOString(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export function eventOccursOnLocalDate(event: CalendarEvent, date: string): boolean {
  const dayStart = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return false;

  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time || event.start_time);
  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;

  return eventStart < nextDayStart && eventEnd >= dayStart;
}

export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function isPast(date: string | Date): boolean {
  return new Date(date) < new Date();
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function generateStarPositions(count: number): Array<{ x: number; y: number; size: number; delay: number }> {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 5,
  }));
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'priority-high';
    case 'low':
      return 'priority-low';
    default:
      return 'priority-medium';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}
import type { CalendarEvent } from '../types/database';
