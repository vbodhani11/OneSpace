import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus, Sparkles, Rocket, Mic } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useJournal } from '../hooks/useJournal';
import { FloatingTask } from '../components/dashboard/FloatingTask';
import { TaskBin } from '../components/dashboard/TaskBin';
import { Modal } from '../components/ui/Modal';
import { TaskForm } from '../components/tasks/TaskForm';
import { JournalEditor } from '../components/journal/JournalEditor';
import { Button } from '../components/ui/Button';
import { LoadingState, ErrorState } from '../components/ui/Card';

export function Dashboard() {
  const { user } = useAuth();
  const { tasks, loading, error, fetchTasks, toggleTask, createTask } = useTasks('active');
  const { createEntry } = useJournal();
  const [isDragging, setIsDragging] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [voiceJournalOpen, setVoiceJournalOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(): void {
    setIsDragging(true);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    const { active, over } = event;
    if (over?.id === 'task-bin') {
      setActionError('');
      const result = await toggleTask(active.id as string);
      if (result.error) setActionError(result.error.message);
    }
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] || 'Explorer';

  const timeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen">

      {/* ── 3-column header: name | OneAbyss | button ── */}
      <div className="grid grid-cols-3 items-center mb-7">

        {/* Left — greeting + name */}
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
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus size={15} />
            New task
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
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTasks} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
            >
              <motion.div
                animate={{ y: [-8, 8], rotate: [-5, 5] }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
                className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-6"
              >
                <Rocket size={36} className="text-accent-purple" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Your space is clear</h2>
              <p className="text-white/40 text-sm max-w-xs mb-6">
                Add tasks and watch them float in your personal space. Drag completed ones into the bin.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Launch first task
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 flex items-center gap-2"
              >
                <Sparkles size={13} className="text-accent-purple" />
                <p className="text-white/40 text-xs">
                  {tasks.length} active task{tasks.length !== 1 ? 's' : ''} · drag or use the keyboard to complete
                </p>
              </motion.div>

              <div className="relative min-h-[65vh]">
                <div className="flex flex-wrap gap-4 justify-start items-start">
                  <AnimatePresence>
                    {tasks.map((task, index) => (
                      <FloatingTask key={task.id} task={task} index={index} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}

          <TaskBin isDragging={isDragging} />
        </DndContext>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <TaskForm
          onSubmit={async (data) => {
            const result = await createTask(data);
            if (result.error) throw result.error;
            setCreateOpen(false);
          }}
          onCancel={() => setCreateOpen(false)}
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
    </div>
  );
}
