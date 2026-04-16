'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { AuthStatusPill } from '@/components/auth-status-pill';
import { SignalPill } from '@/components/control-room-primitives';
import {
  featuredTeamShortcuts,
  primaryNavigation,
  secondaryNavigation,
  type NavigationItem,
} from '@/lib/navigation';
import { ShellAuthStatus } from '@/components/shell-auth-status';

interface AppShellProps {
  children: ReactNode;
}

function getActiveFrame(pathname: string) {
  if (pathname.startsWith('/teams/')) {
    return {
      label: 'Franchise dossier',
      detail: 'Roster, cap, and next-move context.',
    };
  }
  if (pathname.startsWith('/teams')) {
    return {
      label: 'League ledger',
      detail: 'Scan the league before you touch a move.',
    };
  }
  if (pathname.startsWith('/scenarios')) {
    return {
      label: 'Scenario workspace',
      detail: 'Trade, free-agent, injury, and lineup tools.',
    };
  }
  if (pathname.startsWith('/compare')) {
    return {
      label: 'Comparison desk',
      detail: 'Read scenario deltas without leaving the shell.',
    };
  }
  if (pathname.startsWith('/saved')) {
    return {
      label: 'Scenario library',
      detail: 'Saved envelopes, reactions, and community context.',
    };
  }
  if (pathname.startsWith('/labs')) {
    return {
      label: 'Experiment suite',
      detail: 'Draft, alternate-universe, and rebuild labs.',
    };
  }
  if (pathname.startsWith('/methodology')) {
    return {
      label: 'Trust surface',
      detail: 'Model assumptions, formulas, and caveats.',
    };
  }
  return {
    label: 'League command center',
    detail: 'Pick a franchise, test a move, and read the consequences.',
  };
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group block rounded-[1.4rem] border px-3 py-3 transition ${
        active
          ? 'border-accent-cool/30 bg-surface-strong text-text shadow-panel'
          : 'border-transparent text-muted hover:border-line/70 hover:bg-surface hover:text-text'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{item.label}</div>
          <div className="mt-1 text-xs leading-5 text-muted">
            {item.description}
          </div>
        </div>
        <div
          className={`mt-0.5 h-2.5 w-2.5 rounded-full transition ${
            active ? 'bg-accent' : 'bg-line/60 group-hover:bg-accent-cool/70'
          }`}
        />
      </div>
    </Link>
  );
}

function SidebarContent({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="surface-panel transition hover:border-accent/50"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SignalPill tone="cool">league live</SignalPill>
          <SignalPill tone="accent">trade ready</SignalPill>
        </div>
        <div className="mt-4 text-[0.68rem] uppercase tracking-[0.32em] text-muted">
          NBA Franchise Lab
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-text">
          Franchise Intelligence
        </div>
        <div className="mt-2 text-sm leading-7 text-muted">
          A quiet control room for trade legality, cap context, and franchise
          futures.
        </div>
      </Link>

      <div className="mt-6 space-y-2">
        {primaryNavigation.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={
              item.href === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.href)
            }
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-line/70 pt-4">
        <div className="px-3 text-[0.68rem] uppercase tracking-[0.3em] text-muted">
          Trust and archive
        </div>
        <div className="mt-2 space-y-2">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={currentPath.startsWith(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-4 rounded-[1.9rem] border border-line/70 bg-bg px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[0.68rem] uppercase tracking-[0.3em] text-muted">
            Fast entry
          </div>
          <SignalPill tone="success">2 clicks</SignalPill>
        </div>
        <div className="space-y-2">
          {featuredTeamShortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              onClick={onNavigate}
              className="block rounded-[1.2rem] border border-transparent px-3 py-2 text-sm text-text transition hover:border-line/80 hover:bg-surface"
            >
              {shortcut.label}
            </Link>
          ))}
        </div>
        <div className="rounded-[1.3rem] border border-line/70 bg-surface px-3 py-3 text-sm leading-6 text-muted">
          Jump to any team, lab, or saved scenario, then stay in one consistent
          shell while the detail changes.
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeFrame = getActiveFrame(pathname);

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex min-h-screen">
        <aside className="hidden w-[304px] shrink-0 border-r border-line/70 bg-bg/90 px-5 py-5 lg:block">
          <SidebarContent currentPath={pathname} />
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/65"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-[86vw] max-w-[336px] border-r border-line/70 bg-bg px-5 py-5 shadow-panel">
              <SidebarContent
                currentPath={pathname}
                onNavigate={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-2xl border border-line/70 bg-surface px-4 text-sm font-medium text-text lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                Menu
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="hidden text-[0.68rem] uppercase tracking-[0.32em] text-muted sm:block">
                    {activeFrame.label}
                  </div>
                  <div className="hidden lg:ml-auto lg:block">
                    <ShellAuthStatus />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
                  <button type="button" className="surface-command flex-1 text-left">
                    <span className="surface-kbd">/</span>
                    <span className="truncate">
                      Jump to any team, lab, or saved scenario
                    </span>
                    <span className="ml-auto hidden font-mono text-[0.72rem] uppercase tracking-[0.24em] text-muted sm:inline">
                      {activeFrame.detail}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
                    <Link
                      href="/teams"
                      className="rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm font-medium text-text transition hover:border-accent-cool/55"
                    >
                      League ledger
                    </Link>
                    <Link
                      href="/scenarios"
                      className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
                    >
                      Build scenario
                    </Link>
                    <div className="lg:hidden">
                      <AuthStatusPill />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
