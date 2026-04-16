'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { setApiAuthToken } from '@/lib/api/auth';
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from '@/lib/supabase/client';

export type AuthStatusKind =
  | 'loading'
  | 'signed-in'
  | 'signed-out'
  | 'unavailable';

export type LegacyAuthStatusKind =
  | 'loading'
  | 'authenticated'
  | 'anonymous'
  | 'disabled'
  | 'error';

interface AuthContextValue {
  client: SupabaseClient | null;
  status: AuthStatusKind;
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  error: string | null;
  isConfigured: boolean;
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error: string | null }>;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFromSession(session: Session | null): AuthStatusKind {
  return session ? 'signed-in' : 'signed-out';
}

function readUserMetadataString(user: User | null, key: string): string | null {
  const value = user?.user_metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseBrowserClient();
  const isConfigured = hasSupabaseBrowserConfig();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatusKind>(() =>
    client ? 'loading' : 'unavailable',
  );
  const [error, setError] = useState<string | null>(() =>
    client
      ? null
      : 'Account sync is unavailable in this local environment.',
  );

  useEffect(() => {
    setApiAuthToken(session?.access_token ?? null);
  }, [session]);

  useEffect(() => {
    if (!client) {
      return;
    }
    const activeClient: SupabaseClient = client;

    let cancelled = false;

    async function loadSession() {
      const { data, error: sessionError } =
        await activeClient.auth.getSession();

      if (cancelled) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
      }

      setSession(data.session);
      setStatus(statusFromSession(data.session));
    }

    void loadSession();

    const { data } = activeClient.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setStatus(statusFromSession(nextSession));
        setError(null);
      },
    );

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [client]);

  async function signInWithEmail(email: string) {
    if (!client) {
      return {
        ok: false,
        error: 'Account sign-in is unavailable in this local environment.',
      };
    }

    const { error: signInError } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/saved`
            : undefined,
      },
    });

    if (signInError) {
      return { ok: false, error: signInError.message };
    }

    return { ok: true, error: null };
  }

  async function signInWithOtp(email: string) {
    const result = await signInWithEmail(email);
    if (!result.ok) {
      throw new Error(result.error ?? 'Unable to send sign-in link.');
    }
  }

  async function signOut() {
    if (!client) {
      return;
    }

    await client.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        client,
        status,
        session,
        user: session?.user ?? null,
        accessToken: session?.access_token ?? null,
        email: session?.user.email ?? null,
        displayName:
          readUserMetadataString(session?.user ?? null, 'display_name') ??
          readUserMetadataString(session?.user ?? null, 'full_name') ??
          readUserMetadataString(session?.user ?? null, 'name'),
        avatarUrl:
          readUserMetadataString(session?.user ?? null, 'avatar_url') ??
          readUserMetadataString(session?.user ?? null, 'picture'),
        error,
        isConfigured,
        signInWithEmail,
        signInWithOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStatus() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthStatus must be used within AuthProvider.');
  }

  return context;
}

export function useAuth() {
  const auth = useAuthStatus();

  return {
    status:
      auth.status === 'loading'
        ? 'loading'
        : auth.status === 'signed-in'
          ? 'authenticated'
          : auth.status === 'signed-out'
            ? 'anonymous'
            : auth.status === 'unavailable'
              ? 'disabled'
              : 'error',
    session: auth.session,
    user: auth.user,
    accessToken: auth.accessToken,
    email: auth.email,
    displayName: auth.displayName ?? auth.email ?? null,
    avatarUrl: auth.avatarUrl,
    error: auth.error,
    signOut: auth.signOut,
    signInWithOtp: auth.signInWithOtp,
    signInWithEmail: auth.signInWithEmail,
    isConfigured: auth.isConfigured,
    client: auth.client,
  };
}

export function AuthStatusSurface() {
  const auth = useAuthStatus();

  const label =
    auth.status === 'signed-in'
      ? 'Signed in'
      : auth.status === 'signed-out'
        ? 'Guest mode'
      : auth.status === 'loading'
          ? 'Checking auth'
          : 'Auth unavailable';

  const detail =
    auth.status === 'signed-in'
      ? auth.email ?? 'Connected account'
      : auth.status === 'signed-out'
        ? 'Browser session is not connected'
      : auth.status === 'loading'
          ? 'Syncing Supabase session'
          : auth.error ?? 'Account sync is unavailable in this environment.';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-2xl border border-line/70 bg-surface px-4 py-3">
        <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
          {label}
        </div>
        <div className="mt-1 max-w-[220px] truncate text-sm font-medium text-text">
          {detail}
        </div>
      </div>

      {auth.status === 'signed-in' ? (
        <button
          type="button"
          onClick={() => {
            void auth.signOut();
          }}
          className="rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm font-medium text-text transition hover:border-accent-cool/50"
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/saved"
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
        >
          Open Saved
        </Link>
      )}
    </div>
  );
}
