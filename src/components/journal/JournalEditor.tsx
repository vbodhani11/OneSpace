import { } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { SpeechToTextButton } from './SpeechToTextButton';
import { TextToSpeechButton } from './TextToSpeechButton';
import type { JournalEntry } from '../../types/database';

const journalSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Write something...'),
  mood: z.string().optional(),
  entry_date: z.string(),
});

type JournalFormData = z.infer<typeof journalSchema>;

const moods = ['😊 Happy', '😔 Sad', '😤 Frustrated', '😌 Calm', '🤩 Excited', '😰 Anxious', '🥰 Grateful', '😑 Neutral'];

interface JournalEditorProps {
  initialData?: Partial<JournalEntry>;
  onSubmit: (data: JournalFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function JournalEditor({ initialData, onSubmit, onCancel, submitLabel = 'Save entry' }: JournalEditorProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      mood: initialData?.mood || '',
      entry_date: initialData?.entry_date || new Date().toISOString().split('T')[0],
    },
  });

  const content = watch('content');

  function handleSpeechResult(text: string) {
    const current = content || '';
    setValue('content', current + (current ? ' ' : '') + text);
  }

  const moodOptions = [{ value: '', label: 'Select mood (optional)' }, ...moods.map((m) => ({ value: m, label: m }))];

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Title (optional)"
          placeholder="Entry title..."
          {...register('title')}
        />
        <Input
          label="Date"
          type="date"
          {...register('entry_date')}
        />
      </div>

      <Select
        label="Mood"
        options={moodOptions}
        {...register('mood')}
      />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-white/70">Journal entry</label>
          <div className="flex items-center gap-2">
            <SpeechToTextButton onResult={handleSpeechResult} />
            <TextToSpeechButton text={content || ''} />
          </div>
        </div>
        <Textarea
          placeholder="What's on your mind today?..."
          rows={10}
          error={errors.content?.message}
          className="text-sm leading-relaxed"
          {...register('content')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  );
}
