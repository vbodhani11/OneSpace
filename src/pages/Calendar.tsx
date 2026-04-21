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

export function Calendar() {
  const { events, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent } = useCalendar();
  const today = new Date().toISOString().split('T')[0];
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
          />

          {events.filter((e) => e.start_time.startsWith(selectedDate)).length === 0 && (
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
            await createEvent({ ...data, start_time: data.start_time, end_time: data.end_time || undefined });
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
              await updateEvent(editEvent.id, { ...data, start_time: data.start_time, end_time: data.end_time || undefined });
              setEditEvent(null);
            }}
            onCancel={() => setEditEvent(null)}
            onDelete={async () => { await deleteEvent(editEvent.id); setEditEvent(null); }}
            submitLabel="Update event"
          />
        )}
      </Modal>
    </div>
  );
}
