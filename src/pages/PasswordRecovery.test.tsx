import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPassword } from './ForgotPassword';
import { Login } from './Login';
import { ResetPassword } from './ResetPassword';

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/useAuth', () => ({ useAuth: useAuthMock }));

describe('password recovery', () => {
  const requestPasswordReset = vi.fn();
  const updatePassword = vi.fn();
  const signOut = vi.fn();

  beforeEach(() => {
    requestPasswordReset.mockReset().mockResolvedValue({ error: null });
    updatePassword.mockReset().mockResolvedValue({ error: null });
    signOut.mockReset().mockResolvedValue({ error: null });
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
      signOut,
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
      signOut,
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('New password'), 'Grapes!42');
    await user.type(screen.getByLabelText('Confirm new password'), 'Grapes!42');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('Grapes!42'));
    expect(signOut).toHaveBeenCalledOnce();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows reset confirmation on the login page', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isPasswordRecovery: false,
      loading: false,
      postLoginRedirect: () => '/dashboard',
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendConfirmation: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { passwordReset: true } }]}>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Password updated. Sign in with your new password.',
    );
  });

  it('does not send a recovery session to the dashboard', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'recovery-user' },
      isPasswordRecovery: true,
      loading: false,
      postLoginRedirect: () => '/dashboard',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<p>Reset password page</p>} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Reset password page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });
});
