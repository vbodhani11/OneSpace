import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Mic, Clock, CheckSquare, Users, AlertTriangle, BookOpen,
  Calendar as CalendarIcon, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useCalendar } from '../hooks/useCalendar';
import { useJournal } from '../hooks/useJournal';
import { useSharedTasksForCalendar } from '../hooks/useTaskSpaces';
import { TaskCard } from '../components/tasks/TaskCard';
import { EventForm } from '../components/calendar/EventForm';
import { JournalEditor } from '../components/journal/JournalEditor';
import { JournalEntryDetailsModal } from '../components/journal/JournalEntryDetailsModal';
import { Modal } from '../components/ui/Modal';
import { TaskForm } from '../components/tasks/TaskForm';
import { Button } from '../components/ui/Button';
import { LoadingState, ErrorState } from '../components/ui/Card';
import type { CalendarEvent, JournalEntry, Task } from '../types/database';
import { eventOccursOnLocalDate, formatFullDate, formatTime, toLocalDateKey } from '../lib/utils';

export function Dashboard() {
  const { user } = useAuth();
  const {
    tasks: personalTasks,
    loading: tasksLoading,
    error: personalTasksError,
    fetchTasks,
    toggleTask: togglePersonalTask,
    updateTask: updatePersonalTask,
    deleteTask: deletePersonalTask,
    createTask,
  } = useTasks();
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar();
  const {
    tasks: sharedTasks,
    loading: sharedTasksLoading,
    error: sharedTasksError,
    fetchTasks: fetchSharedTasks,
    toggleSharedTask,
    updateSharedTask,
    deleteSharedTask,
  } = useSharedTasksForCalendar();
  const {
    entries: journalEntries,
    loading: journalLoading,
    error: journalError,
    fetchEntries,
    createEntry,
  } = useJournal();

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [voiceJournalOpen, setVoiceJournalOpen] = useState(false);
  const [writeJournalOpen, setWriteJournalOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [viewJournalEntry, setViewJournalEntry] = useState<JournalEntry | null>(null);
  const [actionError, setActionError] = useState('');

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] || 'Explorer';

  const timeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const today = toLocalDateKey(new Date());
  const now = new Date();

  const todaysEvents = events
    .filter((event) => eventOccursOnLocalDate(event, today))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const nextEvent = todaysEvents.find((event) => new Date(event.end_time || event.start_time) >= now);

  const personalTasksToday = personalTasks.filter((task) => task.due_date === today);
  const sharedTasksToday = sharedTasks.filter((task) => task.due_date === today);

  const overduePersonalTasks = personalTasks.filter(
    (task) => task.status === 'active' && task.due_date !== null && task.due_date < today,
  );
  const overdueSharedTasks = sharedTasks.filter(
    (task) => task.status === 'active' && task.due_date !== null && task.due_date < today,
  );
  const hasOverdue = overduePersonalTasks.length > 0 || overdueSharedTasks.length > 0;

  const todayJournalEntry = journalEntries.find((entry) => entry.entry_date === today);

  const loading = tasksLoading || eventsLoading || sharedTasksLoading || journalLoading;
  const combinedError = personalTasksError || eventsError || sharedTasksError || journalError;

  function retryAll() {
    void fetchTasks();
    void fetchEvents();
    void fetchSharedTasks();
    void fetchEntries();
  }

  return (
    <div className="min-h-screen">

      {/* ── 3-column header: name/date | OneAbyss | actions ── */}
      <div className="grid grid-cols-3 items-center mb-7">

        {/* Left — greeting + name + today's date */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
          <p className="text-white/50 text-xs font-medium">{timeGreeting()}</p>
          <h1 className="text-xl font-bold text-white mt-0.5 flex items-center gap-1.5">
            {firstName}
            <motion.span
              className="text-gradient text-lg"
              animate={{ rotate: [0, 20, -10, 20, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            >
              ✦
            </motion.span>
          </h1>
          <p className="text-white/30 text-xs mt-0.5">{formatFullDate(new Date())}</p>
        </motion.div>

        {/* Center — OneAbyss brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          {/* Decorative dot row */}
          <div className="flex items-center gap-1 mb-0.5">
            <motion.span
              className="w-1 h-1 rounded-full bg-accent-purple"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-accent-cyan"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.span
              className="w-1 h-1 rounded-full bg-accent-purple"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
          </div>

          <span
            className="font-brand text-gradient leading-none select-none"
            style={{ fontSize: '1.35rem', letterSpacing: '0.01em' }}
          >
            OneAbyss
          </span>

          {/* Underline shimmer */}
          <motion.div
            className="h-px w-16 mt-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </motion.div>

        {/* Right — actions */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="flex justify-end items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setVoiceJournalOpen(true)}
            aria-label="Start a quick voice journal entry"
            title="Quick voice journal"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-accent-cyan hover:bg-white/10 transition-all"
          >
            <Mic size={15} />
          </button>
          <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="whitespace-nowrap">
            <Plus size={15} />
            <span className="hidden sm:inline">New task</span>
            <span className="sm:hidden">New</span>
          </Button>
        </motion.div>
      </div>

      {/* ── Content ── */}
      {actionError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-sm text-red-400">
          {actionError}
        </p>
      )}

      {loading ? (
        <LoadingState />
      ) : combinedError ? (
        <ErrorState message={combinedError} onRetry={retryAll} />
      ) : (
        <div className="space-y-6">

          {/* ── Today's events ── */}
          <section>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Clock size={12} />
              Today's events
            </p>
            {todaysEvents.length === 0 ? (
              <div className="glass-card p-4 text-center">
                <CalendarIcon size={20} className="text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No events today</p>
                <button
                  onClick={() => setCreateEventOpen(true)}
                  className="mt-1 text-accent-purple text-sm hover:underline"
                >
                  Add an event
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysEvents.map((event) => {
                  const isNext = event.id === nextEvent?.id;
                  return (
                    <motion.button
                      key={event.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditEvent(event)}
                      aria-label={`Edit ${event.title}`}
                      className={`glass-card p-3 flex items-start gap-3 w-full text-left hover:bg-white/8 transition-colors ${
                        isNext ? 'border-accent-cyan/50 shadow-glow-cyan' : ''
                      }`}
                    >
                      <div className={`w-1 self-stretch rounded-full ${isNext ? 'bg-accent-cyan' : 'bg-white/20'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white/90">{event.title}</p>
                          {isNext && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan uppercase tracking-wide">
                              Next up
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-white/30">
                          <Clock size={11} />
                          <span>{formatTime(event.start_time)}</span>
                          {event.end_time && <span>— {formatTime(event.end_time)}</span>}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Today's tasks ── */}
          <section>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <CheckSquare size={12} />
              Today's tasks
            </p>
            {personalTasksToday.length === 0 ? (
              <div className="glass-card p-4 text-center">
                <p className="text-white/30 text-sm">No personal tasks due today</p>
                <button
                  onClick={() => setCreateTaskOpen(true)}
                  className="mt-1 text-accent-purple text-sm hover:underline"
                >
                  Add a task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {personalTasksToday.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={async (id) => {
                      setActionError('');
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
              </div>
            )}
          </section>

          {/* ── Shared spaces ── */}
          <section>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Users size={12} />
              Shared spaces
            </p>
            {sharedTasksToday.length === 0 ? (
              <div className="glass-card p-4 text-center">
                <p className="text-white/30 text-sm">No shared tasks due today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sharedTasksToday.map((task) => (
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
          </section>

          {/* ── Overdue ── */}
          {hasOverdue && (
            <section>
              <p className="text-xs font-medium text-amber-400/80 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Overdue
              </p>
              <div className="space-y-2">
                {overduePersonalTasks.map((task) => (
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
                {overdueSharedTasks.map((task) => (
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
            </section>
          )}

          {/* ── Journal ── */}
          <section>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <BookOpen size={12} />
              Journal
            </p>
            {todayJournalEntry ? (
              <button
                type="button"
                onClick={() => setViewJournalEntry(todayJournalEntry)}
                aria-label="Open today's journal entry"
                className="glass-card p-3 flex items-start gap-3 w-full text-left hover:bg-white/8 transition-colors"
              >
                <div className="w-1 self-stretch rounded-full bg-pink-400/70" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90">{todayJournalEntry.title || 'Untitled entry'}</p>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{todayJournalEntry.content}</p>
                </div>
              </button>
            ) : (
              <div className="glass-card p-4 text-center">
                <Sparkles size={20} className="text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-sm mb-2">You haven't written anything today</p>
                <Button size="sm" onClick={() => setWriteJournalOpen(true)}>
                  <Plus size={14} />
                  Write about today
                </Button>
              </div>
            )}
          </section>
        </div>
      )}

      <Modal isOpen={createTaskOpen} onClose={() => setCreateTaskOpen(false)} title="New task">
        <TaskForm
          onSubmit={async (data) => {
            const result = await createTask(data);
            if (result.error) throw result.error;
            setCreateTaskOpen(false);
          }}
          onCancel={() => setCreateTaskOpen(false)}
        />
      </Modal>

      <Modal isOpen={voiceJournalOpen} onClose={() => setVoiceJournalOpen(false)} title="Quick voice journal" size="lg">
        {voiceJournalOpen && (
          <JournalEditor
            autoStartRecording
            onSubmit={async (data) => {
              const result = await createEntry(data);
              if (result.error) throw result.error;
              setVoiceJournalOpen(false);
            }}
            onCancel={() => setVoiceJournalOpen(false)}
          />
        )}
      </Modal>

      <Modal isOpen={writeJournalOpen} onClose={() => setWriteJournalOpen(false)} title="Write about today" size="lg">
        {writeJournalOpen && (
          <JournalEditor
            onSubmit={async (data) => {
              const result = await createEntry(data);
              if (result.error) throw result.error;
              setWriteJournalOpen(false);
            }}
            onCancel={() => setWriteJournalOpen(false)}
          />
        )}
      </Modal>

      <Modal isOpen={createEventOpen} onClose={() => setCreateEventOpen(false)} title="New event">
        <EventForm
          defaultDate={today}
          onSubmit={async (data) => {
            const result = await createEvent({ ...data, end_time: data.end_time || undefined });
            if (result.error) throw result.error;
            setCreateEventOpen(false);
          }}
          onCancel={() => setCreateEventOpen(false)}
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
