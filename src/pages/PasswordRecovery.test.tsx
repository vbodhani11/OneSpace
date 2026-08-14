import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/useAuth', () => ({ useAuth: useAuthMock }));

describe('password recovery', () => {
  const requestPasswordReset = vi.fn();
  const updatePassword = vi.fn();

  beforeEach(() => {
    requestPasswordReset.mockReset().mockResolvedValue({ error: null });
    updatePassword.mockReset().mockResolvedValue({ error: null });
  });

  it('requests a reset without revealing whether the account exists', async () => {
    useAuthMock.mockReturnValue({ requestPasswordReset });
    const user = userEvent.setup();
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com'));
    expect(screen.getByRole('status')).toHaveTextContent('If an account exists');
  });

  it('does not treat an ordinary signed-in session as a recovery link', () => {
    useAuthMock.mockReturnValue({
      session: { access_token: 'ordinary-session' },
      isPasswordRecovery: false,
      loading: false,
      updatePassword,
    });

    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Reset link unavailable' })).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('updates the password only during a recovery session', async () => {
    useAuthMock.mockReturnValue({
      session: { access_token: 'recovery-session' },
      isPasswordRecovery: true,
      loading: false,
      updatePassword,
    });
    const user = userEvent.setup();
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);

    await user.type(screen.getByLabelText('New password'), 'Grapes!42');
    await user.type(screen.getByLabelText('Confirm new password'), 'Grapes!42');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('Grapes!42'));
    expect(screen.getByRole('status')).toHaveTextContent('updated successfully');
  });
});
