import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { AuthPageShell } from '../components/auth/AuthPageShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const schema = z.object({ email: z.string().email('Please enter a valid email') });
type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: FormData) {
    setError('');
    const result = await requestPasswordReset(email);
    if (result.error) {
      setError(result.error.message || 'The reset email could not be sent.');
      return;
    }
    setSent(true);
  }

  return (
    <AuthPageShell>
      <h1 className="text-xl font-bold text-white mb-1">Reset your password</h1>
      <p className="text-white/45 text-sm mb-6">
        Enter your email and we’ll send a secure reset link.
      </p>

      {sent ? (
        <div role="status" className="space-y-5">
          <div className="rounded-xl border border-green-500/30 bg-green-500/15 p-4 text-sm text-green-200">
            If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-accent-cyan hover:underline">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            Send reset link
          </Button>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </form>
      )}
    </AuthPageShell>
  );
}
