'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';

export function ShellAuthStatus() {
  const { error, status, session, signOut, displayName, user } = useAuth();

  const label =
    status === 'loading'
      ? 'Checking auth'
      : status === 'disabled'
        ? 'Local mode'
        : session
          ? 'Account'
          : 'Account';
  const detail =
    status === 'loading'
      ? 'Checking account access'
      : status === 'disabled'
        ? error ?? 'Saved scenarios unlock when browser auth is connected.'
        : session
          ? displayName ?? user?.email ?? 'Saved workspace is ready'
          : 'Saved scenarios and profile controls are one click away.';

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-3">
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          status === 'loading'
            ? 'bg-accent-cool'
            : status === 'disabled'
              ? 'bg-muted'
              : session
                ? 'bg-mint'
                : 'bg-muted'
        }`}
      />
      <div className="min-w-0">
        <div className="text-[0.62rem] uppercase tracking-[0.26em] text-muted">
          {label}
        </div>
        <div className="truncate text-sm text-text">{detail}</div>
      </div>
      {session ? (
        <button
          type="button"
          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
          onClick={() => {
            void signOut();
          }}
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/saved"
          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
        >
          Account
        </Link>
      )}
    </div>
  );
}
