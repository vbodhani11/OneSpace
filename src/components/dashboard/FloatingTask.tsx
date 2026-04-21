
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { Calendar } from 'lucide-react';
import type { Task } from '../../types/database';
import { formatDate, truncate } from '../../lib/utils';

interface FloatingTaskProps {
  task: Task;
  index: number;
}

const priorityColors = {
  high: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#f87171', dot: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', dot: '#f59e0b' },
  low: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#4ade80', dot: '#22c55e' },
};

const floatVariants = [
  { duration: 5, y: [-8, 8] },
  { duration: 6.5, y: [-6, 10] },
  { duration: 4.5, y: [-10, 6] },
  { duration: 7, y: [-5, 9] },
  { duration: 5.5, y: [-9, 7] },
];

export function FloatingTask({ task, index }: FloatingTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const colors = priorityColors[task.priority] || priorityColors.medium;
  const float = floatVariants[index % floatVariants.length];

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        background: `linear-gradient(135deg, ${colors.bg}, rgba(255,255,255,0.03))`,
        borderColor: colors.border,
      }}
      {...attributes}
      {...listeners}
      animate={isDragging ? { scale: 1.05, zIndex: 50 } : { y: float.y }}
      transition={isDragging ? {} : {
        y: {
          duration: float.duration,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          delay: index * 0.4,
        }
      }}
      className={`
        relative cursor-grab active:cursor-grabbing select-none
        rounded-2xl p-4 w-44 max-w-[11rem]
        border backdrop-blur-md
        ${isDragging ? 'shadow-glow z-50 opacity-95' : 'shadow-glass hover:shadow-glass-hover'}
        transition-shadow duration-200
      `}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
        <p className="text-white/90 text-sm font-semibold leading-tight">
          {truncate(task.title, 30)}
        </p>
      </div>

      {task.description && (
        <p className="text-white/40 text-xs leading-snug mb-2 ml-4">
          {truncate(task.description, 50)}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 ml-4">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
          style={{ color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
        >
          {task.priority}
        </span>

        {task.due_date && (
          <span className="text-[10px] text-white/30 flex items-center gap-0.5">
            <Calendar size={8} />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
