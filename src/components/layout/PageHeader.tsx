import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="grid grid-cols-3 items-center mb-6">

      {/* Left — page title */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
      </motion.div>

      {/* Center — OneSpace brand */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex flex-col items-center"
      >
        <div className="flex items-center gap-1 mb-0.5">
          <motion.span className="w-1 h-1 rounded-full bg-accent-purple"
            animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
          <motion.span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"
            animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
          <motion.span className="w-1 h-1 rounded-full bg-accent-purple"
            animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
        </div>
        <span
          className="font-brand text-gradient leading-none select-none"
          style={{ fontSize: '1.25rem' }}
        >
          OneSpace
        </span>
        <motion.div
          className="h-px w-14 mt-0.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)' }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </motion.div>

      {/* Right — optional action */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-end"
      >
        {action}
      </motion.div>

    </div>
  );
}
