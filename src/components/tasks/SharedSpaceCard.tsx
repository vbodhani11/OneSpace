
import { motion } from 'framer-motion';
import { Users, ChevronRight, Trash2, Crown } from 'lucide-react';
import type { TaskSpace } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';

interface SharedSpaceCardProps {
  space: TaskSpace;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export function SharedSpaceCard({ space, onClick, onDelete }: SharedSpaceCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === space.owner_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 hover:bg-white/8 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-btn-primary flex items-center justify-center flex-shrink-0 shadow-glow">
          <Users size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white/90 truncate">{space.name}</p>
            {isOwner && <Crown size={12} className="text-yellow-400 flex-shrink-0" />}
          </div>
          {space.description && (
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed line-clamp-2">{space.description}</p>
          )}
          <p className="text-[11px] text-white/25 mt-1.5">{formatDate(space.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOwner && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(space.id); }}
              className="p-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
          <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
