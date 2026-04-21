import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, Users, ArrowLeft, UserPlus, Trash2, Copy, Check as CheckIcon } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useTasks } from '../hooks/useTasks';
import { useTaskSpaces, useSpaceDetails } from '../hooks/useTaskSpaces';
import { useAuth } from '../contexts/AuthContext';
import { TaskCard } from '../components/tasks/TaskCard';
import { SharedSpaceCard } from '../components/tasks/SharedSpaceCard';
import { InviteMemberModal } from '../components/tasks/InviteMemberModal';
import { CreateSpaceModal } from '../components/tasks/CreateSpaceModal';
import { TaskForm } from '../components/tasks/TaskForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { EmptyState, LoadingState, ErrorState, PriorityBadge } from '../components/ui/Card';
import type { Task } from '../types/database';
import { formatDate, truncate } from '../lib/utils';

type Tab = 'personal' | 'spaces';
type StatusFilter = 'all' | 'active' | 'completed';

export function Tasks() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Manage your work" />

      <div className="flex gap-2 mb-5 p-1 glass-card rounded-xl">
        {([['personal', CheckSquare, 'Personal'], ['spaces', Users, 'Shared Spaces']] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-btn-primary text-white shadow-glow'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'personal' ? (
          <motion.div key="personal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <PersonalTasksTab />
          </motion.div>
        ) : (
          <motion.div key="spaces" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <SharedSpacesTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PersonalTasksTab() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, completeTask, deleteTask } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = tasks.filter((t) => statusFilter === 'all' || t.status === statusFilter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 flex-1">
          {(['all', 'active', 'completed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === s
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={15} />
          Add
        </Button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={fetchTasks} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<CheckSquare size={28} />}
          title={statusFilter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          description={statusFilter === 'active' ? 'All clear! Add a task to get started.' : 'Add your first task and stay productive.'}
          action={statusFilter !== 'completed' ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} />Add task</Button> : undefined}
        />
      )}

      <AnimatePresence>
        {!loading && filtered.map((task) => (
          <div key={task.id} className="mb-2">
            <TaskCard
              task={task}
              onComplete={async (id) => { await completeTask(id); }}
              onDelete={async (id) => { await deleteTask(id); }}
              onUpdate={async (id, data) => { await updateTask(id, data as Partial<Task>); }}
            />
          </div>
        ))}
      </AnimatePresence>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <TaskForm
          onSubmit={async (data) => { await createTask(data); setCreateOpen(false); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}

function SharedSpacesTab() {
  const { spaces, loading, error, fetchSpaces, createSpace, deleteSpace } = useTaskSpaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  if (selectedSpaceId) {
    const space = spaces.find((s) => s.id === selectedSpaceId);
    return (
      <SpaceDetailView
        spaceId={selectedSpaceId}
        spaceName={space?.name || ''}
        spaceOwnerId={space?.owner_id || ''}
        onBack={() => setSelectedSpaceId(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={15} />
          New space
        </Button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={fetchSpaces} />}

      {!loading && spaces.length === 0 && (
        <EmptyState
          icon={<Users size={28} />}
          title="No shared spaces"
          description="Create a space, invite teammates by email, and collaborate on tasks together."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} />Create space</Button>}
        />
      )}

      <AnimatePresence>
        {spaces.map((space) => (
          <div key={space.id} className="mb-2">
            <SharedSpaceCard
              space={space}
              onClick={() => setSelectedSpaceId(space.id)}
              onDelete={async (id) => await deleteSpace(id)}
            />
          </div>
        ))}
      </AnimatePresence>

      <CreateSpaceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, desc, invitees) => {
          const result = await createSpace(name, desc, invitees);
          return result;
        }}
      />
    </div>
  );
}

function SpaceDetailView({ spaceId, spaceName, spaceOwnerId, onBack }: {
  spaceId: string;
  spaceName: string;
  spaceOwnerId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const {
    members, tasks, loading, error, userRole,
    fetchDetails, inviteMember, removeMember,
    createSharedTask, updateSharedTask, deleteSharedTask,
  } = useSpaceDetails(spaceId);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isOwner = user?.id === spaceOwnerId;
  const canEdit = userRole === 'owner' || userRole === 'editor';

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${spaceId}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-white/60 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{spaceName}</h2>
          <p className="text-xs text-white/40 capitalize">{userRole} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyInviteLink}
            title="Copy invite link"
            className={`p-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1 ${
              linkCopied
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {linkCopied ? <CheckIcon size={14} /> : <Copy size={14} />}
          </button>
          <Button size="sm" variant="secondary" onClick={() => setShowMembers((v) => !v)}>
            <Users size={14} />
          </Button>
          {isOwner && (
            <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} />
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
              <Plus size={14} />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 glass-card p-3 overflow-hidden"
          >
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Members</p>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white/80">{m.email}</p>
                  <p className="text-xs text-white/30 capitalize">{m.role} · {m.status}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={fetchDetails} />}

      {!loading && tasks.length === 0 && (
        <EmptyState
          icon={<CheckSquare size={28} />}
          title="No tasks yet"
          description={canEdit ? 'Add the first task for this space.' : 'No tasks have been added yet.'}
          action={canEdit ? <Button size="sm" onClick={() => setCreateTaskOpen(true)}><Plus size={14} />Add task</Button> : undefined}
        />
      )}

      <AnimatePresence>
        {tasks.map((task) => (
          <div key={task.id} className="mb-2">
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-4 hover:bg-white/8 transition-all"
            >
              <div className="flex items-start gap-3">
                {canEdit && (
                  <button
                    onClick={() => updateSharedTask(task.id, { status: task.status === 'completed' ? 'active' : 'completed' })}
                    className={`mt-0.5 flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-400' : 'text-white/30 hover:text-green-400'}`}
                  >
                    {task.status === 'completed' ? '✓' : '○'}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white/90'}`}>
                    {task.title}
                  </p>
                  {task.description && <p className="text-xs text-white/40 mt-0.5">{truncate(task.description, 80)}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && <span className="text-[11px] text-white/30">{formatDate(task.due_date)}</span>}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => deleteSharedTask(task.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        ))}
      </AnimatePresence>

      <Modal isOpen={createTaskOpen} onClose={() => setCreateTaskOpen(false)} title="Add task">
        <TaskForm
          onSubmit={async (data) => { await createSharedTask(data); setCreateTaskOpen(false); }}
          onCancel={() => setCreateTaskOpen(false)}
        />
      </Modal>

      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={async (email, role) => { await inviteMember(email, role, spaceName); }}
        spaceId={spaceId}
        spaceName={spaceName}
      />
    </div>
  );
}
