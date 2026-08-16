import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trash2, Edit2, CheckCircle, Circle, Eye } from 'lucide-react';
import type { Task } from '../../types/database';
import { formatDate, truncate } from '../../lib/utils';
import { PriorityBadge } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { TaskForm } from './TaskForm';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TaskCardProps {
  task: Pick<Task, 'id' | 'title' | 'description' | 'status' | 'priority' | 'due_date'>;
  onToggleComplete?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'due_date'>>) => Promise<void>;
  showActions?: boolean;
}

export function TaskCard({ task, onToggleComplete, onDelete, onUpdate, showActions = true }: TaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleEdit(data: Partial<Task>) {
    if (onUpdate) {
      await onUpdate(task.id, data);
      setEditOpen(false);
    }
  }

  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setActionError('');
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallbackMessage);
      return false;
    }
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        className="glass-card p-4 hover:bg-white/8 transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          {onToggleComplete && (
            <button
              type="button"
              onClick={() => void runAction(
                () => onToggleComplete(task.id),
                'The task status could not be changed.',
              )}
              aria-label={task.status === 'completed' ? `Mark ${task.title} active` : `Complete ${task.title}`}
              className="mt-0.5 text-white/30 hover:text-green-400 transition-colors flex-shrink-0"
            >
              {task.status === 'completed' ? (
                <CheckCircle size={18} className="text-green-400" />
              ) : (
                <Circle size={18} />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white/90'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-white/40 mt-1 leading-relaxed">
                {truncate(task.description, 80)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <PriorityBadge priority={task.priority} />
              {task.due_date && (
                <span className="flex items-center gap-1 text-[11px] text-white/35">
                  <Calendar size={11} />
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              aria-label={`View ${task.title} details`}
              className="p-1.5 text-white/30 hover:text-accent-cyan hover:bg-white/10 rounded-lg transition-all"
            >
              <Eye size={14} />
            </button>
            {showActions && onUpdate && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label={`Edit ${task.title}`}
                className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded-lg transition-all"
              >
                <Edit2 size={14} />
              </button>
            )}
            {showActions && onDelete && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label={`Delete ${task.title}`}
                className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mt-3 text-sm text-red-400">{actionError}</p>
        )}
      </motion.div>

      <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="Task details" size="lg">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/35 mb-1.5">Title</p>
            <p className="text-base font-semibold text-white/90 break-words">{task.title}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/35 mb-1.5">Description</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap break-words">
                {task.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-2">Status</p>
              <p className="text-sm font-medium text-white/80 capitalize">{task.status}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-2">Priority</p>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/35 mb-2">Due date</p>
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                {task.due_date ? (
                  <>
                    <Calendar size={13} className="text-white/40" />
                    {formatDate(task.due_date)}
                  </>
                ) : (
                  'No due date'
                )}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit task">
        <TaskForm
          initialData={task}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          submitLabel="Update task"
        />
      </Modal>
      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete task?"
        message={`“${task.title}” will be permanently removed.`}
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!onDelete) return;
          setDeleting(true);
          void runAction(() => onDelete(task.id), 'The task could not be deleted.')
            .then((succeeded) => { if (succeeded) setDeleteOpen(false); })
            .finally(() => setDeleting(false));
        }}
      />
    </>
  );
}
