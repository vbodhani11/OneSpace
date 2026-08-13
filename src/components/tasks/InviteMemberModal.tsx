import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['editor', 'viewer']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: 'editor' | 'viewer',
  ) => Promise<{ error: Error | null }>;
  spaceName?: string;
}

export function InviteMemberModal({ isOpen, onClose, onInvite, spaceName }: InviteMemberModalProps) {
  const [inviteError, setInviteError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'editor' },
  });

  async function onSubmit(data: InviteFormData) {
    setInviteError('');
    try {
      const result = await onInvite(data.email, data.role);
      if (result.error) {
        setInviteError(result.error.message);
        return;
      }
      reset();
      onClose();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); setInviteError(''); onClose(); }} title="Invite member">
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/20">
        <UserPlus size={18} className="text-accent-purple flex-shrink-0" />
        <p className="text-sm text-white/70">
          Invite someone by email to collaborate in <span className="text-white">{spaceName || 'this space'}</span>.
          They'll receive an email with a join link.
        </p>
      </div>

      {inviteError && (
        <p className="mb-3 text-sm text-red-400 px-1">{inviteError}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="collaborator@example.com"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Select
          label="Role"
          options={[
            { value: 'editor', label: 'Editor — can add and edit tasks' },
            { value: 'viewer', label: 'Viewer — can only view tasks' },
          ]}
          {...register('role')}
        />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
