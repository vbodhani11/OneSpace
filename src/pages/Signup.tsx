import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { SignupForm } from '../components/auth/SignupForm';
import { SpaceBackground } from '../components/dashboard/SpaceBackground';

export function Signup() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-8">
      <SpaceBackground />

      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center mb-8"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <motion.span className="w-1.5 h-1.5 rounded-full bg-accent-purple"
            animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
          <motion.span className="w-2 h-2 rounded-full bg-accent-cyan"
            animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
          <motion.span className="w-1.5 h-1.5 rounded-full bg-accent-purple"
            animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
        </div>

        <h1
          className="font-brand text-gradient leading-none"
          style={{ fontSize: '2.6rem' }}
        >
          OneSpace
        </h1>

        <motion.div
          className="h-px w-24 mt-2 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-sm mt-3"
        >
          Your all-in-one personal space
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="glass-card p-8">
          <SignupForm />
        </div>
      </motion.div>
    </div>
  );
}
