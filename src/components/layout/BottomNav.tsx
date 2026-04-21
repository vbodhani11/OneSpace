import { NavLink } from 'react-router-dom';
import { Home, Calendar, BookOpen, CheckSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Home',     path: '/dashboard', icon: Home        },
  { label: 'Calendar', path: '/calendar',  icon: Calendar    },
  { label: 'Journal',  path: '/journal',   icon: BookOpen    },
  { label: 'Tasks',    path: '/tasks',     icon: CheckSquare },
  { label: 'Profile',  path: '/profile',   icon: User        },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-2xl mx-auto px-2">
        <div
          className="rounded-t-2xl border-t px-1 py-2 backdrop-blur-md"
          style={{
            background: 'var(--nav-bg)',
            borderColor: 'var(--card-border)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center justify-around">
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                    isActive ? 'text-accent-purple' : ''
                  }`
                }
                style={({ isActive }) =>
                  isActive ? {} : { color: 'var(--nav-inactive)' }
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -inset-1.5 bg-accent-purple/15 rounded-lg -z-10"
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium truncate">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
