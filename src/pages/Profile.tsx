import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Mail, Calendar, Edit2, Check, X, LogOut,
  Moon, Sun, Monitor, Bell, Volume2, Trash2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDate } from '../lib/utils';
import type { Profile as ProfileType } from '../types/database';
import type { ElementType } from 'react';

type Theme = 'dark' | 'light' | 'system';

const themeOptions: { value: Theme; label: string; icon: ElementType; desc: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Space theme'   },
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Bright theme'  },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Follows OS'    },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
        value ? 'bg-accent-purple' : 'bg-white/15'
      }`}
      aria-checked={value}
      role="switch"
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  );
}

export function Profile() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const [profile, setProfile]   = useState<ProfileType | null>(null);
  const [editing, setEditing]   = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving]     = useState(false);

  const [notifs, setNotifs]         = useState(true);
  const [sound, setSound]           = useState(true);
  const [clearingTasks, setClearingTasks] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          const p = data as unknown as ProfileType;
          setProfile(p);
          setFullName(p.full_name || '');
        }
      });
  }, [user]);

  // Load settings
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setNotifs(data.notifications_enabled ?? true);
          setSound(data.sound_enabled ?? true);
          setSettingsId(data.id ?? null);
        } else {
          // create default row
          supabase
            .from('user_settings')
            .insert({ user_id: user.id } as never)
            .select().single()
            .then(({ data: nd }) => { if (nd) setSettingsId(nd.id); });
        }
      });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { data } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() } as never)
      .eq('id', user.id).select().single();
    if (data) setProfile(data as unknown as ProfileType);
    setSaving(false);
    setEditing(false);
  }

  async function updatePref(key: 'notifications_enabled' | 'sound_enabled', val: boolean) {
    if (!user) return;
    if (settingsId) {
      await supabase.from('user_settings')
        .update({ [key]: val, updated_at: new Date().toISOString() } as never)
        .eq('id', settingsId);
    }
  }

  async function clearCompletedTasks() {
    if (!user) return;
    setClearingTasks(true);
    await supabase.from('tasks').delete().eq('user_id', user.id).eq('status', 'completed');
    setClearingTasks(false);
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || '';
  const initials    = (displayName || user?.email || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" subtitle="Your account" />

      {/* ── Profile card ─────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-[72px] h-[72px] rounded-2xl bg-btn-primary flex items-center justify-center text-white text-2xl font-bold shadow-glow flex-shrink-0"
          >
            {initials}
          </motion.div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="text-sm"
                />
                <button onClick={saveProfile} disabled={saving}
                  className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all flex-shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={() => { setEditing(false); setFullName(profile?.full_name || ''); }}
                  className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-all flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white truncate">
                  {displayName || 'No name set'}
                </h2>
                <button onClick={() => setEditing(true)}
                  className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded-lg transition-all flex-shrink-0">
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <p className="text-white/40 text-sm mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--divider)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--icon-bg)' }}>
              <Mail size={14} className="text-white/50" />
            </div>
            <div>
              <p className="text-xs text-white/30">Email</p>
              <p className="text-sm text-white/80">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--icon-bg)' }}>
              <Calendar size={14} className="text-white/50" />
            </div>
            <div>
              <p className="text-xs text-white/30">Member since</p>
              <p className="text-sm text-white/80">{user?.created_at ? formatDate(user.created_at) : '—'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Appearance ───────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 border ${
                theme === value
                  ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple shadow-glow'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              }`}
              style={theme !== value ? { borderColor: 'var(--card-border)' } : {}}
            >
              <Icon size={20} />
              <span className="text-xs font-semibold">{label}</span>
              <span className={`text-[10px] ${theme === value ? 'text-accent-purple/70' : 'text-white/25'}`}>{desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Preferences ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Notifications</p>
                <p className="text-xs text-white/35">Task reminders</p>
              </div>
            </div>
            <Toggle value={notifs} onChange={(v) => { setNotifs(v); updatePref('notifications_enabled', v); }} />
          </div>
          <div className="border-t" style={{ borderColor: 'var(--divider)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Volume2 size={14} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Sound effects</p>
                <p className="text-xs text-white/35">Audio feedback</p>
              </div>
            </div>
            <Toggle value={sound} onChange={(v) => { setSound(v); updatePref('sound_enabled', v); }} />
          </div>
        </div>
      </motion.div>

      {/* ── Data ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="glass-card p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Data</h2>
        <button
          onClick={clearCompletedTasks}
          disabled={clearingTasks}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Trash2 size={14} className="text-red-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/90">Clear completed tasks</p>
              <p className="text-xs text-white/35">Permanently remove finished tasks</p>
            </div>
          </div>
          {clearingTasks
            ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
            : <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
          }
        </button>
      </motion.div>

      {/* ── Sign out ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Button variant="danger" onClick={handleSignOut} className="w-full">
          <LogOut size={16} />
          Sign out
        </Button>
      </motion.div>

    </div>
  );
}
