import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventForm } from './EventForm';

describe('EventForm', () => {
  it('rejects an end time before the start time', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventForm
        defaultDate="2026-08-13"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Title'), 'Team review');
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '2026-08-13T09:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2026-08-13T08:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));

    expect(await screen.findByText('End time must be after the start time')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2026-08-13T10:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  });
});
