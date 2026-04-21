
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import type { CalendarEvent } from '../../types/database';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  event_type: z.string(),
});

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
  const defaultStartTime = defaultDate
    ? `${defaultDate}T09:00`
    : initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);

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
      end_time: initialData?.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : '',
      event_type: initialData?.event_type || 'personal',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      <div className="flex gap-3 pt-2">
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete} size="sm">
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
