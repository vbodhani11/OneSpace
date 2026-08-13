import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from './TaskCard';

const task = {
  id: 'bbd3c844-e91b-4bd6-9632-fe52671cceef',
  title: 'Bring apples',
  description: 'Grocery list',
  status: 'active' as const,
  priority: 'medium' as const,
  due_date: '2026-08-14',
};

describe('TaskCard', () => {
  it('lets a user complete, edit, and delete a task', async () => {
    const onToggleComplete = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <TaskCard
        task={task}
        onToggleComplete={onToggleComplete}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Complete Bring apples' }));
    expect(onToggleComplete).toHaveBeenCalledWith(task.id);

    await user.click(screen.getByRole('button', { name: 'Edit Bring apples' }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Bring grapes');
    await user.click(screen.getByRole('button', { name: 'Update task' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ title: 'Bring grapes' }),
    ));

    await user.click(screen.getByRole('button', { name: 'Delete Bring apples' }));
    expect(onDelete).toHaveBeenCalledWith(task.id);
  });

  it('keeps the edit form open and explains a failed update', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={task}
        onUpdate={vi.fn().mockRejectedValue(new Error('Could not save changes'))}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit Bring apples' }));
    await user.click(screen.getByRole('button', { name: 'Update task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save changes');
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  });
});
