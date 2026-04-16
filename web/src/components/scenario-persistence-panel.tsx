'use client';

import Link from 'next/link';

import type { ScenarioEnvelope } from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatters';

interface ScenarioPersistencePanelProps {
  scenarioLabel: string;
  storedScenario: ScenarioEnvelope | null;
  storeStatus: 'idle' | 'storing' | 'stored' | 'error';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canStore: boolean;
  canSave: boolean;
  message: string | null;
  onStore: () => void;
  onSave: () => void;
}

export function ScenarioPersistencePanel({
  scenarioLabel,
  storedScenario,
  storeStatus,
  saveStatus,
  canStore,
  canSave,
  message,
  onStore,
  onSave,
}: ScenarioPersistencePanelProps) {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Library actions
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-text">
            Store and save this {scenarioLabel}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Persist the current browser-built scenario as an immutable record,
            then save that stored ID to the authenticated library.
          </p>
        </div>
        <div className="rounded-2xl border border-line/70 bg-surface px-3 py-2 text-xs uppercase tracking-[0.24em] text-muted">
          {storedScenario ? 'Stored' : 'Not stored'}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStore}
          disabled={!canStore || storeStatus === 'storing'}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {storeStatus === 'storing' ? 'Storing scenario...' : 'Store browser scenario'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || !storedScenario || saveStatus === 'saving'}
          className="rounded-2xl border border-line/70 bg-surface-strong px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save to library'}
        </button>
        <Link
          href="/saved"
          className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-muted transition hover:border-accent-cool/50 hover:text-text"
        >
          Open saved library
        </Link>
      </div>

      {storedScenario ? (
        <div className="rounded-[1.5rem] border border-line/70 bg-surface px-4 py-4">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Stored scenario
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-text">
            {storedScenario.title ?? storedScenario.scenario_type}
          </div>
          <div className="mt-2 text-sm text-muted">
            {storedScenario.scenario_id} · {formatDateTime(storedScenario.created_at)}
          </div>
          <div className="mt-2 text-sm text-muted">{storedScenario.share_url}</div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-line/70 bg-surface px-4 py-4 text-sm leading-7 text-muted">
          No stored scenario yet. Run the browser store action to persist the
          current inputs into the immutable scenario library.
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-muted">
          {message}
        </div>
      ) : null}
    </section>
  );
}
