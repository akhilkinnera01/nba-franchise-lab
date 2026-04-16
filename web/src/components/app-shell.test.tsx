import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/app-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/teams',
}));

vi.mock('@/components/auth-status-pill', () => ({
  AuthStatusPill: () => <div>Auth pill</div>,
}));

vi.mock('@/components/shell-auth-status', () => ({
  ShellAuthStatus: () => <div>Shell auth</div>,
}));

describe('AppShell', () => {
  it('renders the shared navigation, quick actions, and page content', () => {
    render(
      <AppShell>
        <div>Page body</div>
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(
      screen.getByText('League ledger, filters, and franchise dossiers.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Scenarios/i })).toBeInTheDocument();
    expect(screen.getByText('Jump to any team, lab, or saved scenario')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'League ledger' })).toBeInTheDocument();
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });
});
