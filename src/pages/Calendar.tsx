import { useState } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useCalendar } from '../hooks/useCalendar';
import { CalendarView } from '../components/calendar/CalendarView';
import { EventForm } from '../components/calendar/EventForm';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState } from '../components/ui/Card';
import type { CalendarEvent } from '../types/database';
import { toLocalDateKey } from '../lib/utils';

export function Calendar() {
  const { events, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent, getEventsForDate } = useCalendar();
  const today = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Plan your time"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            Event
          </Button>
        }
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={fetchEvents} />}

      {!loading && !error && (
        <div>
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={setEditEvent}
          />

          {getEventsForDate(selectedDate).length === 0 && (
            <div className="text-center py-8">
              <CalendarIcon size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No events on this day</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-2 text-accent-purple text-sm hover:underline"
              >
                Add an event
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New event">
        <EventForm
          defaultDate={selectedDate}
          onSubmit={async (data) => {
            const result = await createEvent({ ...data, end_time: data.end_time || undefined });
            if (result.error) throw result.error;
            setCreateOpen(false);
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal isOpen={!!editEvent} onClose={() => setEditEvent(null)} title="Edit event">
        {editEvent && (
          <EventForm
            initialData={editEvent}
            onSubmit={async (data) => {
              const result = await updateEvent(editEvent.id, { ...data, end_time: data.end_time || null });
              if (result.error) throw result.error;
              setEditEvent(null);
            }}
            onCancel={() => setEditEvent(null)}
            onDelete={async () => {
              const result = await deleteEvent(editEvent.id);
              if (result.error) throw result.error;
              setEditEvent(null);
            }}
            submitLabel="Update event"
          />
        )}
      </Modal>
    </div>
  );
}
