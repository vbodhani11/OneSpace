import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { SpeechToTextButton } from './SpeechToTextButton';
import { TextToSpeechButton } from './TextToSpeechButton';
import type { JournalEntry } from '../../types/database';
import { toLocalDateKey } from '../../lib/utils';

const journalSchema = z.object({
  title: z.string().max(120, 'Title is too long').optional(),
  content: z.string().min(1, 'Write something...').max(20_000, 'Entry is too long'),
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
  const [submitError, setSubmitError] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState(() => navigator.language || 'en-US');
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      mood: initialData?.mood || '',
      entry_date: initialData?.entry_date || toLocalDateKey(new Date()),
    },
  });

  const content = useWatch({ control, name: 'content' });

  function handleSpeechResult(text: string) {
    const current = content || '';
    setValue('content', current + (current ? ' ' : '') + text);
  }

  async function submitForm(data: JournalFormData) {
    setSubmitError('');
    try {
      await onSubmit(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The journal entry could not be saved.');
    }
  }

  const moodOptions = [{ value: '', label: 'Select mood (optional)' }, ...moods.map((m) => ({ value: m, label: m }))];

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(submitForm)}
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
          <label htmlFor="journal-content" className="text-sm font-medium text-white/70">Journal entry</label>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="speech-language">Voice language</label>
            <select
              id="speech-language"
              value={speechLanguage}
              onChange={(event) => setSpeechLanguage(event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/60"
              title="Voice language"
            >
              <option value="en-US" className="bg-space-800">English</option>
              <option value="hi-IN" className="bg-space-800">Hindi</option>
              <option value="te-IN" className="bg-space-800">Telugu</option>
            </select>
            <SpeechToTextButton onResult={handleSpeechResult} language={speechLanguage} />
            <TextToSpeechButton text={content || ''} />
          </div>
        </div>
        <Textarea
          id="journal-content"
          placeholder="What's on your mind today?..."
          rows={10}
          error={errors.content?.message}
          className="text-sm leading-relaxed"
          {...register('content')}
        />
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-400">{submitError}</p>
      )}

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
