import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Check, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { SpaceBackground } from '../components/dashboard/SpaceBackground';

type State = 'loading' | 'not-logged-in' | 'joining' | 'already-member' | 'joined' | 'not-found' | 'error';

interface SpaceInfo {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
}

export function InvitePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<State>('loading');
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [errorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!spaceId) { setState('not-found'); return; }

    // Save invite intent so we can pick it up after login/signup
    sessionStorage.setItem('pending-invite', spaceId);

    loadSpace();
  }, [spaceId, authLoading]);

  async function loadSpace() {
    if (!spaceId) return;

    const { data, error } = await supabase
      .from('task_spaces')
      .select('id, name, description, owner_id')
      .eq('id', spaceId)
      .single();

    if (error || !data) {
      setState('not-found');
      return;
    }

    setSpace(data as SpaceInfo);

    if (!user) {
      setState('not-logged-in');
      return;
    }

    // Already owner?
    if (data.owner_id === user.id) {
      sessionStorage.removeItem('pending-invite');
      navigate('/tasks', { replace: true });
      return;
    }

    // Already a member?
    const { data: existing } = await supabase
      .from('task_space_members')
      .select('id, status')
      .eq('space_id', spaceId)
      .eq('email', user.email || '')
      .single();

    if (existing && existing.status !== 'removed') {
      setState('already-member');
      return;
    }

    setState('joining');
  }

  async function acceptInvite() {
    if (!user || !spaceId) return;
    setState('loading');

    // Upsert: update existing 'invited' row or insert new one
    const { data: existing } = await supabase
      .from('task_space_members')
      .select('id')
      .eq('space_id', spaceId)
      .eq('email', user.email || '')
      .single();

    if (existing) {
      await supabase
        .from('task_space_members')
        .update({ status: 'accepted', user_id: user.id } as never)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('task_space_members')
        .insert({
          space_id: spaceId,
          user_id: user.id,
          email: user.email || '',
          role: 'editor',
          status: 'accepted',
        } as never);
    }

    sessionStorage.removeItem('pending-invite');
    setState('joined');
  }

  function goToTasks() {
    navigate('/tasks', { replace: true });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <SpaceBackground />

      {/* OneSpace brand */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-0 right-0 flex justify-center"
      >
        <span className="font-brand text-gradient" style={{ fontSize: '1.6rem' }}>OneSpace</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm glass-card p-8 text-center"
      >

        {/* Loading */}
        {(state === 'loading') && (
          <div className="py-6">
            <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Loading invite…</p>
          </div>
        )}

        {/* Not found */}
        {state === 'not-found' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Invite not found</h2>
            <p className="text-white/40 text-sm mb-5">This invite link is invalid or has expired.</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">Go to app</Button>
          </div>
        )}

        {/* Not logged in */}
        {state === 'not-logged-in' && space && (
          <div className="py-2">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-btn-primary flex items-center justify-center mx-auto mb-5 shadow-glow"
            >
              <Users size={28} className="text-white" />
            </motion.div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">You're invited to</p>
            <h2 className="text-2xl font-bold text-white mb-1">{space.name}</h2>
            {space.description && (
              <p className="text-white/50 text-sm mb-5">{space.description}</p>
            )}
            <div className="flex flex-col gap-3 mt-5">
              <Button
                onClick={() => navigate(`/login?invite=${spaceId}`)}
                className="w-full"
              >
                <LogIn size={16} />
                Sign in to join
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/signup?invite=${spaceId}`)}
                className="w-full"
              >
                <Sparkles size={16} />
                Create account &amp; join
              </Button>
            </div>
          </div>
        )}

        {/* Joining confirm */}
        {state === 'joining' && space && (
          <div className="py-2">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-btn-primary flex items-center justify-center mx-auto mb-5 shadow-glow"
            >
              <Users size={28} className="text-white" />
            </motion.div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Join shared space</p>
            <h2 className="text-2xl font-bold text-white mb-2">{space.name}</h2>
            {space.description && (
              <p className="text-white/50 text-sm mb-1">{space.description}</p>
            )}
            <p className="text-white/30 text-xs mb-6">
              Joining as <span className="text-accent-cyan">{user?.email}</span>
            </p>
            <Button onClick={acceptInvite} className="w-full mb-3">
              <Check size={16} />
              Accept &amp; join space
            </Button>
            <Button variant="secondary" onClick={() => navigate('/tasks')} className="w-full">
              Maybe later
            </Button>
          </div>
        )}

        {/* Already member */}
        {state === 'already-member' && space && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center mx-auto mb-4">
              <Check size={26} className="text-accent-purple" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Already a member</h2>
            <p className="text-white/40 text-sm mb-5">
              You're already in <span className="text-white">{space.name}</span>.
            </p>
            <Button onClick={goToTasks} className="w-full">Open Tasks</Button>
          </div>
        )}

        {/* Joined success */}
        {state === 'joined' && space && (
          <div className="py-4">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <Check size={28} className="text-green-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">You're in!</h2>
            <p className="text-white/50 text-sm mb-5">
              You've joined <span className="text-white font-medium">{space.name}</span>.
              Start adding and editing tasks with your team.
            </p>
            <Button onClick={goToTasks} className="w-full">
              Open shared space
            </Button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-white/40 text-sm mb-5">{errorMsg || 'Please try again.'}</p>
            <Button onClick={() => setState('joining')} className="w-full">Retry</Button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
