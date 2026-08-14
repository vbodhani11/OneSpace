import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="mb-5 text-sm leading-relaxed text-white/60">{message}</p>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">Cancel</Button>
        <Button type="button" variant="danger" onClick={onConfirm} loading={loading} className="flex-1">{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
