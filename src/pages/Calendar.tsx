import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar as CalendarIcon, CheckSquare, BookOpen } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useCalendar } from '../hooks/useCalendar';
import { useTasks } from '../hooks/useTasks';
import { useJournal } from '../hooks/useJournal';
import { useSharedTasksForCalendar } from '../hooks/useTaskSpaces';
import { CalendarView } from '../components/calendar/CalendarView';
import { EventForm } from '../components/calendar/EventForm';
import { TaskCard } from '../components/tasks/TaskCard';
import { JournalEntryDetailsModal } from '../components/journal/JournalEntryDetailsModal';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState } from '../components/ui/Card';
import type { CalendarEvent, JournalEntry, Task } from '../types/database';
import { formatDate, toLocalDateKey } from '../lib/utils';

export function Calendar() {
  const { events, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent, getEventsForDate } = useCalendar();
  const {
    tasks: personalTasks,
    error: personalTasksError,
    updateTask: updatePersonalTask,
    toggleTask: togglePersonalTask,
    deleteTask: deletePersonalTask,
  } = useTasks();
  const {
    tasks: sharedTasks,
    error: sharedTasksError,
    toggleSharedTask,
    updateSharedTask,
    deleteSharedTask,
  } = useSharedTasksForCalendar();
  const { entries: journalEntries, error: journalError } = useJournal();

  const today = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [viewJournalEntry, setViewJournalEntry] = useState<JournalEntry | null>(null);

  // Tasks and journal entries are never duplicated into calendar_events — the
  // calendar just reads their existing due_date/entry_date fields, so editing
  // or deleting a task/entry anywhere in the app is automatically reflected
  // here on next fetch (or immediately, since these hooks share React state
  // with whatever mutated them within this page).
  const taskDueDates = new Set<string>();
  for (const task of personalTasks) if (task.due_date) taskDueDates.add(task.due_date);
  for (const task of sharedTasks) if (task.due_date) taskDueDates.add(task.due_date);

  const journalDates = new Set(journalEntries.map((entry) => entry.entry_date));

  const personalTasksForDate = personalTasks.filter((task) => task.due_date === selectedDate);
  const sharedTasksForDate = sharedTasks.filter((task) => task.due_date === selectedDate);
  const journalEntriesForDate = journalEntries.filter((entry) => entry.entry_date === selectedDate);
  const hasAnyTaskForDate = personalTasksForDate.length > 0 || sharedTasksForDate.length > 0;

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
        <div className="space-y-5">
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={setEditEvent}
            taskDueDates={taskDueDates}
            journalDates={journalDates}
          />

          {getEventsForDate(selectedDate).length === 0 && (
            <div className="text-center py-6">
              <CalendarIcon size={28} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No events on this day</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 text-accent-purple text-sm hover:underline"
              >
                Add an event
              </button>
            </div>
          )}

          {/* ── Tasks on this date ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <CheckSquare size={12} />
              Tasks on {formatDate(selectedDate)}
            </p>

            {personalTasksError && (
              <p role="alert" className="px-1 text-xs text-red-400">{personalTasksError}</p>
            )}
            {sharedTasksError && (
              <p role="alert" className="px-1 text-xs text-red-400">{sharedTasksError}</p>
            )}

            {!hasAnyTaskForDate ? (
              <p className="text-white/30 text-sm px-1">No tasks due this day</p>
            ) : (
              <div className="space-y-2">
                {personalTasksForDate.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={async (id) => {
                      const result = await togglePersonalTask(id);
                      if (result.error) throw result.error;
                    }}
                    onUpdate={async (id, data) => {
                      const result = await updatePersonalTask(id, data as Partial<Task>);
                      if (result.error) throw result.error;
                    }}
                    onDelete={async (id) => {
                      const result = await deletePersonalTask(id);
                      if (result.error) throw result.error;
                    }}
                  />
                ))}
                {sharedTasksForDate.map((task) => (
                  <div key={task.id}>
                    <p className="text-[11px] text-white/30 mb-1 px-1">{task.space_name}</p>
                    <TaskCard
                      task={task}
                      showActions={task.canEdit}
                      onToggleComplete={task.canEdit ? async (id) => {
                        const result = await toggleSharedTask(id);
                        if (result.error) throw result.error;
                      } : undefined}
                      onUpdate={task.canEdit ? async (id, data) => {
                        const result = await updateSharedTask(id, data);
                        if (result.error) throw result.error;
                      } : undefined}
                      onDelete={task.canEdit ? async (id) => {
                        const result = await deleteSharedTask(id);
                        if (result.error) throw result.error;
                      } : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Journal on this date ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <BookOpen size={12} />
              Journal on {formatDate(selectedDate)}
            </p>

            {journalError && (
              <p role="alert" className="px-1 text-xs text-red-400">{journalError}</p>
            )}

            {journalEntriesForDate.length === 0 ? (
              <p className="text-white/30 text-sm px-1">No journal entry for this day</p>
            ) : (
              journalEntriesForDate.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setViewJournalEntry(entry)}
                  aria-label={`View ${entry.title || 'journal entry'} details`}
                  className="glass-card p-3 flex items-start gap-3 w-full text-left hover:bg-white/8 transition-colors"
                >
                  <div className="w-1 self-stretch rounded-full bg-pink-400/70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90">{entry.title || 'Untitled entry'}</p>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{entry.content}</p>
                    {entry.mood && (
                      <span className="inline-block mt-1 text-[11px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </motion.div>
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

      <JournalEntryDetailsModal entry={viewJournalEntry} onClose={() => setViewJournalEntry(null)} />
    </div>
  );
}
