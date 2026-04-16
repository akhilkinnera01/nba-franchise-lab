'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'authenticated':
      return 'Account';
    case 'anonymous':
      return 'Account';
    case 'disabled':
      return 'Local mode';
    case 'error':
      return 'Account issue';
    case 'loading':
    default:
      return 'Checking auth';
  }
}

function getStatusDetail(status: string, displayName: string | null, email: string | null) {
  switch (status) {
    case 'authenticated':
      return displayName ?? email ?? 'Account ready';
    case 'anonymous':
      return 'Saved scenarios and profile tools live here.';
    case 'disabled':
      return 'Saved scenarios unlock when browser auth is connected.';
    case 'error':
      return 'Account sync needs attention.';
    case 'loading':
    default:
      return 'Checking account access';
  }
}

export function AuthStatusPill() {
  const { status, displayName, email, signOut } = useAuth();
  const statusLabel = getStatusLabel(status);
  const detail = getStatusDetail(status, displayName, email);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface px-3 py-2">
      <div className="h-2.5 w-2.5 rounded-full bg-accent-cool" />
      <div className="min-w-0">
        <div className="text-[0.62rem] uppercase tracking-[0.28em] text-muted">
          {statusLabel}
        </div>
        <div className="truncate text-sm font-semibold text-text">{detail}</div>
      </div>
      {status === 'authenticated' ? (
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted transition hover:border-accent-cool/50 hover:text-text"
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/saved"
          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted transition hover:border-accent-cool/50 hover:text-text"
        >
          Account
        </Link>
      )}
    </div>
  );
}
