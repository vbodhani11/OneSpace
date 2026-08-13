
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Task } from '../../types/database';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

type TaskFormInitialData = Partial<Pick<Task, 'title' | 'description' | 'priority' | 'due_date'>>;

interface TaskFormProps {
  initialData?: TaskFormInitialData;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function TaskForm({ initialData, onSubmit, onCancel, submitLabel = 'Create task' }: TaskFormProps) {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'medium',
      due_date: initialData?.due_date || '',
    },
  });

  async function submitForm(data: TaskFormData) {
    setSubmitError('');
    try {
      await onSubmit(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The task could not be saved.');
    }
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-4">
      <Input
        label="Title"
        placeholder="What needs to be done?"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Description"
        placeholder="Add more details..."
        rows={3}
        {...register('description')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Priority"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          {...register('priority')}
        />
        <Input
          label="Due Date"
          type="date"
          {...register('due_date')}
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
    </form>
  );
}
