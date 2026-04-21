import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail, Link2, Copy, Check } from 'lucide-react';
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
  onInvite: (email: string, role: 'editor' | 'viewer') => Promise<void>;
  spaceId?: string;
  spaceName?: string;
}

export function InviteMemberModal({ isOpen, onClose, onInvite, spaceId, spaceName }: InviteMemberModalProps) {
  const [copied, setCopied] = useState(false);
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
      await onInvite(data.email, data.role);
      reset();
      onClose();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  }

  function copyLink() {
    if (!spaceId) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${spaceId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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

      {spaceId && (
        <div className="mt-4 pt-4 border-t border-white/8">
          <p className="text-xs text-white/35 mb-2 font-medium flex items-center gap-1.5">
            <Link2 size={12} />
            Or share invite link
          </p>
          <div className="flex items-center gap-2 p-2.5 glass-card rounded-xl">
            <p className="text-xs text-white/50 truncate flex-1">
              {window.location.origin}/invite/{spaceId}
            </p>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
