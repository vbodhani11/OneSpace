import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './useAuth';

const PASSWORD_RECOVERY_STORAGE_KEY = 'onespace-password-recovery';

function isRecoveryCallbackUrl() {
  if (typeof window === 'undefined') return false;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

function hasPendingPasswordRecovery() {
  if (typeof sessionStorage === 'undefined') return isRecoveryCallbackUrl();

  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true'
      || isRecoveryCallbackUrl();
  } catch {
    return isRecoveryCallbackUrl();
  }
}

function rememberPasswordRecovery(active: boolean) {
  if (typeof sessionStorage === 'undefined') return;

  try {
    if (active) sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, 'true');
    else sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {
    // Recovery routing still works when storage is unavailable.
  }
}

async function ensureProfile(user: User) {
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(hasPendingPasswordRecovery);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (_event === 'PASSWORD_RECOVERY') {
          rememberPasswordRecovery(true);
          setIsPasswordRecovery(true);
          if (window.location.pathname !== '/reset-password') {
            navigate('/reset-password', { replace: true });
          }
        }

        if (_event === 'SIGNED_OUT') {
          rememberPasswordRecovery(false);
          setIsPasswordRecovery(false);
        }

        if (_event === 'SIGNED_IN' && session?.user) {
          void ensureProfile(session.user);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function signIn(email: string, password: string) {
    rememberPasswordRecovery(false);
    setIsPasswordRecovery(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  // Returns the URL the app should navigate to after successful sign-in
  function postLoginRedirect(): string {
    const pendingInvite = sessionStorage.getItem('pending-invite');
    if (pendingInvite) return `/invite/${pendingInvite}`;
    return '/dashboard';
  }

  async function signUp(email: string, password: string, fullName: string) {
    const pendingInvite = sessionStorage.getItem('pending-invite');
    const emailRedirectTo = pendingInvite
      ? `${window.location.origin}/invite/${pendingInvite}`
      : `${window.location.origin}/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });

    // needsConfirmation = signup succeeded but email confirmation is required
    const needsConfirmation =
      !error &&
      data.user &&
      !data.session &&
      (data.user.identities?.length === 0 || !data.user.confirmed_at);

    return { error: error as Error | null, needsConfirmation: !!needsConfirmation };
  }

  async function signInWithGoogle() {
    rememberPasswordRecovery(false);
    setIsPasswordRecovery(false);
    const pendingInvite = sessionStorage.getItem('pending-invite');
    const redirectTo = pendingInvite
      ? `${window.location.origin}/invite/${pendingInvite}`
      : `${window.location.origin}/`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error as Error | null };
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  }

  async function resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    return { error: error as Error | null };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      rememberPasswordRecovery(false);
      setIsPasswordRecovery(false);
      setUser(null);
      setSession(null);
    }
    return { error: error as Error | null };
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isPasswordRecovery,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      requestPasswordReset,
      updatePassword,
      resendConfirmation,
      signOut,
      postLoginRedirect,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
