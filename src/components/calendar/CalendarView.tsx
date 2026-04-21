import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { CalendarEvent } from '../../types/database';
import { getDaysInMonth, getFirstDayOfMonth, formatTime } from '../../lib/utils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const eventTypeColors: Record<string, string> = {
  personal: 'bg-accent-purple/70',
  work: 'bg-blue-500/70',
  health: 'bg-green-500/70',
  social: 'bg-pink-500/70',
  other: 'bg-gray-500/70',
};

interface CalendarViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function CalendarView({ events, selectedDate, onSelectDate }: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function getDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function hasEvent(day: number) {
    const dateStr = getDateStr(day);
    return events.some((e) => e.start_time.startsWith(dateStr));
  }

  function isToday(day: number) {
    return getDateStr(day) === today.toISOString().split('T')[0];
  }

  function isSelected(day: number) {
    return getDateStr(day) === selectedDate;
  }

  const selectedEvents = events.filter((e) => e.start_time.startsWith(selectedDate));

  return (
    <div>
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-white">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-white/30 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <motion.button
              key={day}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectDate(getDateStr(day))}
              className={`
                relative flex items-center justify-center h-9 text-sm rounded-xl transition-all duration-200
                ${isSelected(day)
                  ? 'bg-accent-purple text-white font-semibold shadow-glow'
                  : isToday(day)
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {day}
              {hasEvent(day) && !isSelected(day) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-cyan" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {selectedDate && selectedEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1">
            Events on {selectedDate}
          </p>
          {selectedEvents.map((event) => (
            <div key={event.id} className="glass-card p-3 flex items-start gap-3">
              <div className={`w-1 self-stretch rounded-full ${eventTypeColors[event.event_type] || 'bg-white/20'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90">{event.title}</p>
                {event.description && <p className="text-xs text-white/40 mt-0.5">{event.description}</p>}
                <div className="flex items-center gap-1 mt-1 text-[11px] text-white/30">
                  <Clock size={11} />
                  <span>{formatTime(event.start_time)}</span>
                  {event.end_time && <span>— {formatTime(event.end_time)}</span>}
                  <span className="ml-1 capitalize text-white/20">· {event.event_type}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
