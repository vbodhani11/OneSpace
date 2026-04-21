import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="app-header fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
      style={{
        background: 'var(--header-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-center relative">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles size={16} className="text-accent-purple" />
          </motion.div>
          <span className="text-gradient font-bold text-lg tracking-tight">OneSpace</span>
          <motion.div
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles size={16} className="text-accent-cyan" />
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
