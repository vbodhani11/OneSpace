import { Modal } from '../ui/Modal';
import { TextToSpeechButton } from './TextToSpeechButton';
import type { JournalEntry } from '../../types/database';
import { formatDate } from '../../lib/utils';

interface JournalEntryDetailsModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

export function JournalEntryDetailsModal({ entry, onClose }: JournalEntryDetailsModalProps) {
  return (
    <Modal isOpen={!!entry} onClose={onClose} title="Journal entry" size="lg">
      {entry && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40">{formatDate(entry.entry_date)}</span>
            {entry.mood && (
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">{entry.mood}</span>
            )}
          </div>

          {entry.title && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/35 mb-1.5">Title</p>
              <p className="text-base font-semibold text-white/90 break-words">{entry.title}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-white/35">Entry</p>
              <TextToSpeechButton text={entry.content} />
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap break-words">
                {entry.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
