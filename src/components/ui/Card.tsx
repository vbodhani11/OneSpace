
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card p-4',
        hover && 'glass-card-hover cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const styles = {
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
  };

  return (
    <span className={cn('tag-badge', styles[priority], className)}>
      {priority}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'completed' | 'archived';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    active: 'status-active',
    completed: 'status-completed',
    archived: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };

  return (
    <span className={cn('tag-badge', styles[status], className)}>
      {status}
    </span>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4 text-white/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-white/40 text-sm">Loading...</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl">⚠</span>
      </div>
      <p className="text-red-400 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-accent-purple hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
