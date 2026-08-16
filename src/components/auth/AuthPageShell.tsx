import { motion } from 'framer-motion';
import { SpaceBackground } from '../dashboard/SpaceBackground';

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-8">
      <SpaceBackground />
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8 text-center"
      >
        <p className="font-brand text-gradient text-[2.6rem] leading-none">OneAbyss</p>
        <p className="text-white/40 text-sm mt-3">Your all-in-one personal space</p>
      </motion.div>
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm glass-card p-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
