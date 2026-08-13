import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitePage } from './InvitePage';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock('../contexts/useAuth', () => ({
  useAuth: mocks.useAuth,
}));

const token = '2b7209ae-13aa-4527-a15f-92e677d47eab';
const preview = {
  space_id: '1893be91-a30e-4331-8846-230e1aa8c07a',
  space_name: 'Product team',
  description: 'Shared launch work',
  role: 'editor',
  status: 'invited',
  expires_at: '2026-08-20T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <Routes>
        <Route path="/invite/:inviteToken" element={<InvitePage />} />
        <Route path="/tasks" element={<p>Tasks screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InvitePage', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.useAuth.mockReset();
  });

  it('shows safe invitation metadata before sign-in', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    mocks.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: preview, error: null }),
    });

    renderPage();

    expect(await screen.findByText('Product team')).toBeInTheDocument();
    expect(screen.getByText('Invitation role:')).toHaveTextContent('editor');
    expect(sessionStorage.getItem('pending-invite')).toBe(token);
  });

  it('accepts through the email-checking RPC', async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'dff3974f-1960-407f-bf55-f16820900d68', email: 'member@example.com' },
      loading: false,
    });
    mocks.rpc.mockImplementation((functionName: string) => {
      if (functionName === 'get_space_invite_preview') {
        return { maybeSingle: vi.fn().mockResolvedValue({ data: preview, error: null }) };
      }
      return Promise.resolve({ data: preview.space_id, error: null });
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Accept & join space' }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('accept_space_invite', { p_invite_token: token });
    });
    expect(await screen.findByText('Invitation accepted')).toBeInTheDocument();
  });
});
