import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import type { CalendarEvent } from '../../types/database';
import { toDateTimeLocalValue } from '../../lib/utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  event_type: z.enum(['personal', 'work', 'health', 'social', 'other']),
}).refine(
  (data) => !data.end_time || new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after the start time', path: ['end_time'] },
);

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  initialData?: Partial<CalendarEvent>;
  defaultDate?: string;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
}

export function EventForm({ initialData, defaultDate, onSubmit, onCancel, onDelete, submitLabel = 'Create event' }: EventFormProps) {
  const [submitError, setSubmitError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const defaultStartTime = initialData?.start_time
    ? toDateTimeLocalValue(initialData.start_time)
    : defaultDate
      ? `${defaultDate}T09:00`
      : toDateTimeLocalValue(new Date());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      start_time: defaultStartTime,
      end_time: initialData?.end_time ? toDateTimeLocalValue(initialData.end_time) : '',
      event_type: initialData?.event_type || 'personal',
    },
  });

  async function submitForm(data: EventFormData) {
    setSubmitError('');
    try {
      await onSubmit(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The event could not be saved.');
    }
  }

  async function deleteEvent() {
    if (!onDelete) return;
    setSubmitError('');
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The event could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-4">
      <Input
        label="Title"
        placeholder="Event title"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Description (optional)"
        placeholder="Add details..."
        rows={3}
        {...register('description')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Start time"
          type="datetime-local"
          error={errors.start_time?.message}
          {...register('start_time')}
        />
        <Input
          label="End time"
          type="datetime-local"
          error={errors.end_time?.message}
          {...register('end_time')}
        />
      </div>
      <Select
        label="Event type"
        options={[
          { value: 'personal', label: 'Personal' },
          { value: 'work', label: 'Work' },
          { value: 'health', label: 'Health' },
          { value: 'social', label: 'Social' },
          { value: 'other', label: 'Other' },
        ]}
        {...register('event_type')}
      />

      {submitError && (
        <p role="alert" className="text-sm text-red-400">{submitError}</p>
      )}

      <div className="flex gap-3 pt-2">
        {onDelete && (
          <Button type="button" variant="danger" onClick={deleteEvent} loading={isDeleting} size="sm">
            Delete
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
