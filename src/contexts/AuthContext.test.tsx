import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
  },
}));

function AuthProbe() {
  const { isPasswordRecovery, loading } = useAuth();
  const location = useLocation();

  return (
    <>
      <p data-testid="path">{location.pathname}</p>
      <p data-testid="recovery">{String(isPasswordRecovery)}</p>
      <p data-testid="loading">{String(loading)}</p>
    </>
  );
}

describe('AuthProvider password recovery routing', () => {
  let authCallback: ((event: string, session: unknown) => void) | undefined;

  beforeEach(() => {
    authCallback = undefined;
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
    mocks.unsubscribe.mockReset();
    mocks.onAuthStateChange.mockReset().mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    );
  });

  it('routes a recovery auth event to the new-password page', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(authCallback).toBeTypeOf('function');

    await act(async () => {
      authCallback?.('PASSWORD_RECOVERY', {
        access_token: 'recovery-token',
        user: { id: 'recovery-user' },
      });
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/reset-password');
    expect(screen.getByTestId('recovery')).toHaveTextContent('true');
    expect(sessionStorage.getItem('onespace-password-recovery')).toBe('true');
  });

  it('recovers the flow when Supabase returns to the site root', async () => {
    sessionStorage.setItem('onespace-password-recovery', 'true');
    mocks.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'recovery-token',
          user: { id: 'recovery-user' },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/reset-password');
    });
    expect(screen.getByTestId('recovery')).toHaveTextContent('true');
  });
});
