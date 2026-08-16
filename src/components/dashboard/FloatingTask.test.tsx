import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { FloatingTask } from './FloatingTask';
import type { Task } from '../../types/database';

const task: Task = {
  id: 'bbd3c844-e91b-4bd6-9632-fe52671cceef',
  user_id: 'user-1',
  title: 'Water the plants',
  description: null,
  status: 'active',
  priority: 'high',
  due_date: null,
  position_x: 0,
  position_y: 0,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

describe('FloatingTask', () => {
  it('marks the draggable wrapper touch-action: none so mobile drags cannot trigger a page refresh', () => {
    render(
      <DndContext>
        <FloatingTask task={task} index={0} />
      </DndContext>,
    );

    const card = screen.getByText('Water the plants');
    let draggableWrapper: HTMLElement | null = card.parentElement;
    while (draggableWrapper && draggableWrapper.style.touchAction !== 'none') {
      draggableWrapper = draggableWrapper.parentElement;
    }
    expect(draggableWrapper?.style.touchAction).toBe('none');
  });
});
