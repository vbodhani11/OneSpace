import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
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

        if (_event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
        if (_event === 'SIGNED_OUT') setIsPasswordRecovery(false);

        if (_event === 'SIGNED_IN' && session?.user) {
          void ensureProfile(session.user);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
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
    if (!error) setIsPasswordRecovery(false);
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
