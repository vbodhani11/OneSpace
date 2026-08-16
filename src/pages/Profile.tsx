import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Mail, Calendar, Edit2, Check, X, LogOut,
  Moon, Sun, Monitor, Bell, Volume2, Trash2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useTheme } from '../contexts/useTheme';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import type { Profile as ProfileType } from '../types/database';
import type { ElementType } from 'react';

type Theme = 'dark' | 'light' | 'system';

const themeOptions: { value: Theme; label: string; icon: ElementType; desc: string }[] = [
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Space theme'   },
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Bright theme'  },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Follows OS'    },
];

export function Profile() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setActionStatus('Signing out…');
    const result = await signOut();
    if (result.error) {
      setActionStatus(result.error.message || 'Sign out failed. Please try again.');
      setSigningOut(false);
      return;
    }
    navigate('/login', { replace: true });
  }

  const [profile, setProfile]   = useState<ProfileType | null>(null);
  const [editing, setEditing]   = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving]     = useState(false);

  const [clearingTasks, setClearingTasks] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setActionStatus(error.message || 'Your profile could not be loaded.');
          return;
        }
        if (data) {
          const p: ProfileType = data;
          setProfile(p);
          setFullName(p.full_name || '');
        } else {
          setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        }
      });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    const normalizedName = fullName.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setActionStatus('Name must be between 2 and 80 characters.');
      return;
    }

    setSaving(true);
    setActionStatus('Saving profile…');
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || null,
        full_name: normalizedName,
        avatar_url: user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();
    if (error || !data) {
      setActionStatus(error?.message || 'Your profile could not be saved.');
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: normalizedName } });
    setProfile(data);
    setFullName(normalizedName);
    setSaving(false);
    setEditing(false);
    setActionStatus(authError ? 'Profile saved, but the dashboard name will refresh after your next sign-in.' : 'Profile saved.');
  }

  async function clearCompletedTasks() {
    if (!user) return;
    setClearingTasks(true);
    setActionStatus('Clearing completed tasks…');
    const { error } = await supabase.from('tasks').delete().eq('user_id', user.id).eq('status', 'completed');
    setClearingTasks(false);
    setConfirmClear(false);
    setActionStatus(error ? error.message : 'Completed tasks were removed.');
  }

  async function changeTheme(value: Theme) {
    // Theme switches instantly with no confirmation message; only surface a
    // message if persisting the choice actually fails.
    const result = await setTheme(value);
    if (result.error) setActionStatus(result.error.message);
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || '';
  const initials    = (displayName || user?.email || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" subtitle="Your account" />

      {actionStatus && (
        <p
          role={/failed|could not|must be|error/i.test(actionStatus) ? 'alert' : 'status'}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
        >
          {actionStatus}
        </p>
      )}

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
                <button onClick={saveProfile} disabled={saving} aria-label="Save profile name"
                  className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all flex-shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={() => { setEditing(false); setFullName(profile?.full_name || ''); }} aria-label="Cancel editing profile name"
                  className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-all flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white truncate">
                  {displayName || 'No name set'}
                </h2>
                <button onClick={() => setEditing(true)} aria-label="Edit profile name"
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
              onClick={() => { void changeTheme(value); }}
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
                <p className="text-sm font-medium text-white/90">Task reminders</p>
                <p className="text-xs text-white/35">Background notifications require the upcoming reminder service</p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Coming soon</span>
          </div>
          <div className="border-t" style={{ borderColor: 'var(--divider)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Volume2 size={14} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Sound effects</p>
                <p className="text-xs text-white/35">Audio feedback will arrive with reminders</p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">Coming soon</span>
          </div>
        </div>
      </motion.div>

      {/* ── Data ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="glass-card p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Data</h2>
        <button
          onClick={() => setConfirmClear(true)}
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

      <Modal isOpen={confirmClear} onClose={() => setConfirmClear(false)} title="Clear completed tasks?" size="sm">
        <p className="text-sm text-white/60 mb-5">This permanently removes every completed personal task. Active tasks will not be changed.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setConfirmClear(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" loading={clearingTasks} onClick={() => { void clearCompletedTasks(); }} className="flex-1">Clear tasks</Button>
        </div>
      </Modal>

      {/* ── Sign out ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Button variant="danger" onClick={handleSignOut} loading={signingOut} className="w-full">
          <LogOut size={16} />
          Sign out
        </Button>
      </motion.div>

    </div>
  );
}
