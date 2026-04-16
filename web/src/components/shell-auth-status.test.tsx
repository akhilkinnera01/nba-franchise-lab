import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShellAuthStatus } from '@/components/shell-auth-status';
import { useAuth } from '@/components/auth-provider';

vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

describe('ShellAuthStatus', () => {
  it('shows the signed-out state', () => {
    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-out',
      session: null,
      user: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      accessToken: null,
      error: null,
      isConfigured: false,
      signInWithEmail: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    });

    render(<ShellAuthStatus />);

    expect(
      screen.getByText('Saved scenarios and profile controls are one click away.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/saved',
    );
  });
});
