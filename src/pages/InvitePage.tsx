import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Check, LogIn, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { SpaceBackground } from '../components/dashboard/SpaceBackground';

type State = 'loading' | 'not-logged-in' | 'joining' | 'joined' | 'not-found' | 'error';

interface InvitePreview {
  space_id: string;
  space_name: string;
  description: string | null;
  role: 'editor' | 'viewer';
  status: 'invited' | 'accepted';
  expires_at: string | null;
}

export function InvitePage() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadInvite = useCallback(async () => {
    if (!inviteToken) {
      setState('not-found');
      return;
    }

    setState('loading');
    setErrorMsg('');
    sessionStorage.setItem('pending-invite', inviteToken);

    const { data, error } = await supabase
      .rpc('get_space_invite_preview', { p_invite_token: inviteToken })
      .maybeSingle();

    if (error) {
      setErrorMsg('The invitation service is unavailable. Please try again.');
      setState('error');
      return;
    }

    if (!data) {
      sessionStorage.removeItem('pending-invite');
      setState('not-found');
      return;
    }

    setInvite(data as InvitePreview);
    setState(user ? 'joining' : 'not-logged-in');
  }, [inviteToken, user]);

  useEffect(() => {
    if (authLoading) return;
    // Fetching is intentionally tied to the route token and resolved auth state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInvite();
  }, [authLoading, loadInvite]);

  async function acceptInvite() {
    if (!user || !inviteToken) return;

    setState('loading');
    setErrorMsg('');
    const { error } = await supabase.rpc('accept_space_invite', {
      p_invite_token: inviteToken,
    });

    if (error) {
      setErrorMsg(error.message || 'The invitation could not be accepted.');
      setState('error');
      return;
    }

    sessionStorage.removeItem('pending-invite');
    setState('joined');
  }

  function retry() {
    if (user && invite) {
      setState('joining');
      return;
    }
    void loadInvite();
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <SpaceBackground />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-0 right-0 flex justify-center"
      >
        <span className="font-brand text-gradient" style={{ fontSize: '1.6rem' }}>OneAbyss</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm glass-card p-8 text-center"
      >
        {state === 'loading' && (
          <div className="py-6">
            <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Checking invitation…</p>
          </div>
        )}

        {state === 'not-found' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Invitation not found</h2>
            <p className="text-white/40 text-sm mb-5">This invitation is invalid or has been revoked.</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">Go to app</Button>
          </div>
        )}

        {state === 'not-logged-in' && invite && (
          <div className="py-2">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-btn-primary flex items-center justify-center mx-auto mb-5 shadow-glow"
            >
              <Users size={28} className="text-white" />
            </motion.div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">You're invited to</p>
            <h2 className="text-2xl font-bold text-white mb-1">{invite.space_name}</h2>
            {invite.description && <p className="text-white/50 text-sm mb-3">{invite.description}</p>}
            <p className="text-white/35 text-xs mb-5">Invitation role: <span className="capitalize text-accent-cyan">{invite.role}</span></p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate(`/login?invite=${inviteToken}`)} className="w-full">
                <LogIn size={16} />
                Sign in to accept
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/signup?invite=${inviteToken}`)}
                className="w-full"
              >
                <Sparkles size={16} />
                Create account &amp; accept
              </Button>
            </div>
          </div>
        )}

        {state === 'joining' && invite && (
          <div className="py-2">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-btn-primary flex items-center justify-center mx-auto mb-5 shadow-glow"
            >
              <Users size={28} className="text-white" />
            </motion.div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Accept invitation</p>
            <h2 className="text-2xl font-bold text-white mb-2">{invite.space_name}</h2>
            {invite.description && <p className="text-white/50 text-sm mb-1">{invite.description}</p>}
            <p className="text-white/30 text-xs mb-6">
              Continue as <span className="text-accent-cyan">{user?.email}</span> · <span className="capitalize">{invite.role}</span>
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

        {state === 'joined' && invite && (
          <div className="py-4">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <Check size={28} className="text-green-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Invitation accepted</h2>
            <p className="text-white/50 text-sm mb-5">
              You joined <span className="text-white font-medium">{invite.space_name}</span> as a {invite.role}.
            </p>
            <Button onClick={() => navigate('/tasks', { replace: true })} className="w-full">
              Open shared spaces
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Invitation not accepted</h2>
            <p className="text-white/40 text-sm mb-5">{errorMsg || 'Please try again.'}</p>
            <Button onClick={retry} className="w-full">Try again</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
