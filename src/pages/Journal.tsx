import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useJournal } from '../hooks/useJournal';
import { JournalEditor } from '../components/journal/JournalEditor';
import { TextToSpeechButton } from '../components/journal/TextToSpeechButton';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { EmptyState, LoadingState, ErrorState } from '../components/ui/Card';
import type { JournalEntry } from '../types/database';
import { formatDate, truncate } from '../lib/utils';

export function Journal() {
  const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry } = useJournal();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Journal"
        subtitle="Your thoughts, your space"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            New entry
          </Button>
        }
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={fetchEntries} />}

      {!loading && !error && entries.length === 0 && (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No journal entries"
          description="Start writing your thoughts, feelings, and reflections. Use voice input or type freely."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} />Write first entry</Button>}
        />
      )}

      <AnimatePresence>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card mb-3 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-white/30">{formatDate(entry.entry_date)}</p>
                    {entry.mood && (
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  {entry.title && (
                    <h3 className="text-sm font-semibold text-white/90 mb-1">{entry.title}</h3>
                  )}
                  <p className="text-sm text-white/60 leading-relaxed">
                    {expandedId === entry.id ? entry.content : truncate(entry.content, 120)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TextToSpeechButton text={entry.content} />
                  <button
                    onClick={() => setEditEntry(entry)}
                    className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {entry.content.length > 120 && (
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-accent-purple hover:underline"
                >
                  {expandedId === entry.id ? (
                    <><ChevronUp size={12} />Show less</>
                  ) : (
                    <><ChevronDown size={12} />Read more</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New journal entry" size="lg">
        <JournalEditor
          onSubmit={async (data) => { await createEntry(data); setCreateOpen(false); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal isOpen={!!editEntry} onClose={() => setEditEntry(null)} title="Edit entry" size="lg">
        {editEntry && (
          <JournalEditor
            initialData={editEntry}
            onSubmit={async (data) => { await updateEntry(editEntry.id, data); setEditEntry(null); }}
            onCancel={() => setEditEntry(null)}
            submitLabel="Update entry"
          />
        )}
      </Modal>
    </div>
  );
}
