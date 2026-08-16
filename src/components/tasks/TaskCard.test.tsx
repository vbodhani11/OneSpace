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
  it('opens a read-only popup with the complete task details', async () => {
    const user = userEvent.setup();
    const longDescription = 'Walmart groceries '.repeat(12).trim();

    render(
      <TaskCard
        task={{ ...task, description: longDescription }}
        showActions={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'View Bring apples details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Bring apples' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Bring apples details' }));

    const dialog = screen.getByRole('dialog', { name: 'Task details' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(longDescription);
    expect(dialog).toHaveTextContent('medium');
    expect(dialog).toHaveTextContent('Aug 14, 2026');

    await user.click(screen.getByRole('button', { name: 'Close Task details' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Task details' })).not.toBeInTheDocument());
  });

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
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Delete Bring apples' }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(task.id));
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
