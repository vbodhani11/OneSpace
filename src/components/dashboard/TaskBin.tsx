
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, CheckCircle } from 'lucide-react';

interface TaskBinProps {
  isDragging: boolean;
}

export function TaskBin({ isDragging }: TaskBinProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'task-bin' });

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
        >
          <div
            ref={setNodeRef}
            className={`
              flex flex-col items-center justify-center gap-2
              w-36 h-20 rounded-2xl border-2 transition-all duration-200
              ${isOver
                ? 'bg-green-500/25 border-green-400/60 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                : 'bg-red-500/15 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              }
            `}
          >
            <motion.div
              animate={isOver ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {isOver ? (
                <CheckCircle size={26} className="text-green-400" />
              ) : (
                <Trash2 size={24} className="text-red-400" />
              )}
            </motion.div>
            <span className={`text-xs font-semibold ${isOver ? 'text-green-400' : 'text-red-400'}`}>
              {isOver ? 'Complete!' : 'Drop to complete'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
