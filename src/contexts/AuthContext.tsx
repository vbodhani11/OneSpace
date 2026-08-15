import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  clearPasswordRecovery,
  hasPendingPasswordRecovery,
  rememberPasswordRecovery,
} from '../lib/passwordRecovery';
import { AuthContext } from './useAuth';

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

      if (session && hasPendingPasswordRecovery()) {
        setIsPasswordRecovery(true);
        navigate('/reset-password', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          rememberPasswordRecovery();
          setIsPasswordRecovery(true);
          navigate('/reset-password', { replace: true });
        }

        if (event === 'SIGNED_OUT') {
          clearPasswordRecovery();
          setIsPasswordRecovery(false);
        }

        if (event === 'SIGNED_IN' && session?.user) {
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
    clearPasswordRecovery();
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
    clearPasswordRecovery();
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
      clearPasswordRecovery();
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
