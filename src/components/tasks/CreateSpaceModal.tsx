import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, Plus, X, ChevronRight, ChevronLeft, Check, Copy, Link2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';

type Step = 'details' | 'invite' | 'done';
type Role = 'editor' | 'viewer';

interface Invitee {
  email: string;
  role: Role;
  id: string;
}

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    invitees: { email: string; role: Role }[]
  ) => Promise<{ data?: { id: string } | null; error: Error | null }>;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function CreateSpaceModal({ isOpen, onClose, onCreate }: CreateSpaceModalProps) {
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<Role>('editor');
  const [emailError, setEmailError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdSpaceId, setCreatedSpaceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setStep('details');
    setName('');
    setDescription('');
    setInvitees([]);
    setEmailInput('');
    setRoleInput('editor');
    setEmailError('');
    setCreating(false);
    setCreatedSpaceId(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function addInvitee() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); return; }
    if (invitees.find((i) => i.email === email)) { setEmailError('Already added'); return; }
    setInvitees((prev) => [...prev, { email, role: roleInput, id: crypto.randomUUID() }]);
    setEmailInput('');
    setEmailError('');
  }

  function removeInvitee(id: string) {
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  }

  function handleEmailKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addInvitee(); }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const result = await onCreate(
      name.trim(),
      description.trim(),
      invitees.map(({ email, role }) => ({ email, role }))
    );
    setCreating(false);
    if (!result?.error && result?.data) {
      setCreatedSpaceId(result.data.id);
      setStep('done');
    }
  }

  function copyLink() {
    if (!createdSpaceId) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${createdSpaceId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const roleOptions = [
    { value: 'editor', label: 'Editor — can add & edit tasks' },
    { value: 'viewer', label: 'Viewer — read only' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      {/* ── Step indicator ── */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-5">
          {(['details', 'invite'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? 'bg-accent-purple text-white shadow-glow'
                  : i < (['details', 'invite'] as Step[]).indexOf(step)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-white/10 text-white/40'
              }`}>
                {i < (['details', 'invite'] as Step[]).indexOf(step) ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-medium capitalize ${step === s ? 'text-white' : 'text-white/35'}`}>
                {s === 'details' ? 'Space details' : 'Invite people'}
              </span>
              {i < 1 && <ChevronRight size={14} className="text-white/20" />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── Step 1: Details ── */}
        {step === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/20">
              <div className="w-9 h-9 rounded-xl bg-btn-primary flex items-center justify-center shadow-glow flex-shrink-0">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Create a shared space</p>
                <p className="text-xs text-white/50">Invite collaborators to add and manage tasks together</p>
              </div>
            </div>

            <Input
              label="Space name"
              placeholder="e.g. Team Project, Sprint Tasks, Family Chores"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Textarea
              label="Description (optional)"
              placeholder="What is this space for?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button
                onClick={() => setStep('invite')}
                disabled={!name.trim()}
                className="flex-1"
              >
                Next — Invite people
                <ChevronRight size={15} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Invite ── */}
        {step === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-base font-semibold text-white mb-0.5">Invite collaborators</h2>
              <p className="text-xs text-white/45">
                They'll receive an email invite. If they don't have an account, they can sign up with the same email.
              </p>
            </div>

            {/* Email input row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="colleague@example.com"
                  icon={<Mail size={15} />}
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                  onKeyDown={handleEmailKeyDown}
                  error={emailError}
                />
              </div>
              <div className="w-28 flex-shrink-0">
                <Select
                  label="Role"
                  options={roleOptions}
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as Role)}
                />
              </div>
              <button
                onClick={addInvitee}
                className="mb-0.5 p-2.5 rounded-xl bg-accent-purple/20 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/30 transition-all flex-shrink-0"
                title="Add invitee"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Invitee chips */}
            <AnimatePresence>
              {invitees.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 max-h-48 overflow-y-auto pr-1"
                >
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                    {invitees.length} {invitees.length === 1 ? 'person' : 'people'} will be invited
                  </p>
                  {invitees.map((inv) => (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10, scale: 0.9 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl glass-card"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-accent-purple uppercase">
                          {inv.email[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 truncate">{inv.email}</p>
                        <p className="text-xs text-white/35 capitalize">{inv.role}</p>
                      </div>
                      <button
                        onClick={() => removeInvitee(inv.id)}
                        className="p-1 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {invitees.length === 0 && (
              <p className="text-center text-white/25 text-xs py-4">
                No invitees yet — you can also skip and invite later from inside the space.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={() => setStep('details')} className="flex-shrink-0 gap-1">
                <ChevronLeft size={15} />
                Back
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                {creating ? 'Creating…' : `Create space${invitees.length > 0 ? ` & invite ${invitees.length}` : ''}`}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <Check size={30} className="text-green-400" />
            </motion.div>

            <h2 className="text-lg font-bold text-white mb-1">Space created!</h2>
            <p className="text-white/50 text-sm mb-1">
              <span className="text-white font-medium">{name}</span> is ready.
            </p>

            {invitees.length > 0 ? (
              <p className="text-white/40 text-xs mb-5">
                Invites sent to {invitees.length} {invitees.length === 1 ? 'person' : 'people'}.
                They'll get an email with a link to join.
              </p>
            ) : (
              <p className="text-white/40 text-xs mb-5">
                You can invite people any time from inside the space.
              </p>
            )}

            {/* Invite link */}
            {createdSpaceId && (
              <div className="mb-5">
                <p className="text-xs text-white/40 mb-2 font-medium">Share this invite link</p>
                <div className="flex items-center gap-2 p-2.5 glass-card rounded-xl text-left">
                  <Link2 size={14} className="text-accent-purple flex-shrink-0" />
                  <p className="text-xs text-white/60 truncate flex-1">
                    {window.location.origin}/invite/{createdSpaceId}
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

            <Button onClick={handleClose} className="w-full">
              Open space
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  );
}
