import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateStarPositions } from '../../lib/utils';

export function SpaceBackground() {
  const stars = useMemo(() => generateStarPositions(80), []);
  const nebulas = useMemo(() => [
    { x: 15, y: 20, size: 200, color: 'rgba(139, 92, 246, 0.06)' },
    { x: 75, y: 60, size: 250, color: 'rgba(59, 130, 246, 0.05)' },
    { x: 45, y: 80, size: 180, color: 'rgba(6, 182, 212, 0.04)' },
    { x: 85, y: 15, size: 150, color: 'rgba(236, 72, 153, 0.04)' },
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {nebulas.map((nebula, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${nebula.x}%`,
            top: `${nebula.y}%`,
            width: nebula.size,
            height: nebula.size,
            background: nebula.color,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.8, 0.2, 0.8] }}
          transition={{
            duration: 2 + star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
}
