import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { AuthPageShell } from '../components/auth/AuthPageShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { passwordSchema } from '../lib/validation';
import {
  clearPasswordRecovery,
  hasPasswordRecoveryCallbackError,
} from '../lib/passwordRecovery';

const schema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const { session, isPasswordRecovery, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [callbackError] = useState(hasPasswordRecoveryCallbackError);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit({ password }: FormData) {
    setError('');
    const result = await updatePassword(password);
    if (result.error) {
      setError(result.error.message || 'Your password could not be updated.');
      return;
    }

    const signOutResult = await signOut();
    if (signOutResult.error) {
      setError('Your password was saved, but we could not safely end the reset session. Please try again.');
      return;
    }

    navigate('/login', { replace: true, state: { passwordReset: true } });
  }

  if (loading) {
    return <AuthPageShell><p role="status" className="text-white/60 text-sm">Checking reset link…</p></AuthPageShell>;
  }

  if (callbackError || !session || !isPasswordRecovery) {
    return (
      <AuthPageShell>
        <h1 className="text-xl font-bold text-white mb-2">Reset link unavailable</h1>
        <p className="text-white/45 text-sm mb-5">
          This link is invalid, expired, or was already used. Request one new link and use only the newest email.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            clearPasswordRecovery();
            navigate('/forgot-password');
          }}
        >
          Request a new link
        </Button>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <h1 className="text-xl font-bold text-white mb-1">Choose a new password</h1>
      <p className="text-white/45 text-sm mb-6">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          icon={<Lock size={16} />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">Save new password</Button>
      </form>
    </AuthPageShell>
  );
}
