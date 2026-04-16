'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioEnvelopeCard } from '@/components/scenario-envelope-card';
import { ScenarioRouteFrame } from '@/components/scenario-route-frame';
import { getScenario, listSavedScenarios } from '@/lib/api/client';
import type { SavedScenarioSummary, ScenarioEnvelope } from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatters';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

function summarizeKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort();
}

function buildDiffSummary(
  left: ScenarioEnvelope,
  right: ScenarioEnvelope,
): Array<{ label: string; left: string; right: string }> {
  const leftRequestKeys = summarizeKeys(left.request);
  const rightRequestKeys = summarizeKeys(right.request);
  const leftResultKeys = summarizeKeys(left.result);
  const rightResultKeys = summarizeKeys(right.result);

  return [
    {
      label: 'Type',
      left: left.scenario_type,
      right: right.scenario_type,
    },
    {
      label: 'Created',
      left: formatDateTime(left.created_at),
      right: formatDateTime(right.created_at),
    },
    {
      label: 'Request keys',
      left: `${leftRequestKeys.length} total`,
      right: `${rightRequestKeys.length} total`,
    },
    {
      label: 'Result keys',
      left: `${leftResultKeys.length} total`,
      right: `${rightResultKeys.length} total`,
    },
    {
      label: 'Shared request keys',
      left: leftRequestKeys.filter((key) => rightRequestKeys.includes(key)).join(', ') || 'None',
      right:
        rightRequestKeys.filter((key) => leftRequestKeys.includes(key)).join(', ') ||
        'None',
    },
    {
      label: 'Shared result keys',
      left: leftResultKeys.filter((key) => rightResultKeys.includes(key)).join(', ') || 'None',
      right:
        rightResultKeys.filter((key) => leftResultKeys.includes(key)).join(', ') ||
        'None',
    },
  ];
}

interface ScenarioCompareWorkspaceProps {
  initialLeftScenarioId?: string | null;
  initialRightScenarioId?: string | null;
}

export function ScenarioCompareWorkspace({
  initialLeftScenarioId = null,
  initialRightScenarioId = null,
}: ScenarioCompareWorkspaceProps) {
  const { accessToken } = useAuth();
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>(
    [],
  );
  const [leftScenarioId, setLeftScenarioId] = useState(
    initialLeftScenarioId ?? '',
  );
  const [rightScenarioId, setRightScenarioId] = useState(
    initialRightScenarioId ?? '',
  );
  const [leftScenario, setLeftScenario] = useState<ScenarioEnvelope | null>(
    null,
  );
  const [rightScenario, setRightScenario] = useState<ScenarioEnvelope | null>(
    null,
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(
    initialLeftScenarioId && initialRightScenarioId ? 'loading' : 'idle',
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const authToken = accessToken ?? '';
    if (!authToken) {
      setSavedScenarios([]);
      return;
    }

    let cancelled = false;

    async function loadSavedScenarios() {
      const payload = await listSavedScenarios(authToken);
      if (!cancelled) {
        setSavedScenarios(payload.items);
      }
    }

    void loadSavedScenarios();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (leftScenarioId) {
      query.set('left', leftScenarioId);
    } else {
      query.delete('left');
    }
    if (rightScenarioId) {
      query.set('right', rightScenarioId);
    } else {
      query.delete('right');
    }
    const nextUrl = `${window.location.pathname}${
      query.toString() ? `?${query.toString()}` : ''
    }`;
    window.history.replaceState({}, '', nextUrl);
  }, [leftScenarioId, rightScenarioId]);

  const selectedSavedScenarios = useMemo(
    () =>
      savedScenarios.filter(
        (item) =>
          item.scenario_id === leftScenarioId ||
          item.scenario_id === rightScenarioId,
      ),
    [leftScenarioId, rightScenarioId, savedScenarios],
  );

  async function runComparison(
    nextLeftScenarioId = leftScenarioId,
    nextRightScenarioId = rightScenarioId,
  ) {
    const trimmedLeft = nextLeftScenarioId.trim();
    const trimmedRight = nextRightScenarioId.trim();
    if (!trimmedLeft || !trimmedRight) {
      setLoadStatus('idle');
      setLoadError('Enter two stored scenario IDs to compare them.');
      return;
    }

    setLoadStatus('loading');
    setLoadError(null);

    try {
      const [leftResult, rightResult] = await Promise.all([
        getScenario(trimmedLeft),
        getScenario(trimmedRight),
      ]);

      setLeftScenario(leftResult);
      setRightScenario(rightResult);
      setLoadStatus('ready');
    } catch (error) {
      setLoadStatus('error');
      setLoadError(error instanceof Error ? error.message : 'Unable to load scenarios.');
      setLeftScenario(null);
      setRightScenario(null);
    }
  }

  useEffect(() => {
    if (initialLeftScenarioId && initialRightScenarioId) {
      void runComparison(initialLeftScenarioId, initialRightScenarioId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function swapSides() {
    startTransition(() => {
      setLeftScenarioId(rightScenarioId);
      setRightScenarioId(leftScenarioId);
    });
  }

  const diffSummary =
    leftScenario && rightScenario
      ? buildDiffSummary(leftScenario, rightScenario)
      : [];
  const activeScenarioType =
    leftScenario?.scenario_type ?? rightScenario?.scenario_type;

  return (
    <ScenarioRouteFrame
      eyebrow="Compare"
      title="Read two stored scenarios as one decision diff."
      description="Load any two saved scenario IDs, inspect the immutable envelopes, and scan the differences without bouncing between tabs or raw JSON dumps."
      introSlot={
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Left scenario ID
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={leftScenarioId}
                onChange={(event) =>
                  startTransition(() => setLeftScenarioId(event.target.value))
                }
                placeholder="scn_left..."
              />
            </label>
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Right scenario ID
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={rightScenarioId}
                onChange={(event) =>
                  startTransition(() => setRightScenarioId(event.target.value))
                }
                placeholder="scn_right..."
              />
            </label>
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  void runComparison();
                }}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
              >
                {loadStatus === 'loading' ? 'Comparing...' : 'Load comparison'}
              </button>
              <button
                type="button"
                onClick={swapSides}
                className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
              >
                Swap
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
              {loadError}
            </div>
          ) : null}
        </div>
      }
      rail={
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="surface-eyebrow">Saved shortcuts</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-text">
                {savedScenarios.length} library entries
              </div>
            </div>
            <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
              {loadStatus}
            </div>
          </div>
          <div className="space-y-2">
            {selectedSavedScenarios.length > 0 ? (
              selectedSavedScenarios.map((item) => (
                <div
                  key={item.scenario_id}
                  className="rounded-2xl border border-line/70 bg-surface px-4 py-3"
                >
                  <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                    {item.scenario_type}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-text">
                    {item.title ?? item.scenario_id}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    Saved {formatDateTime(item.saved_at)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() =>
                          setLeftScenarioId(item.scenario_id),
                        )
                      }
                      className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
                    >
                      Use left
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() =>
                          setRightScenarioId(item.scenario_id),
                        )
                      }
                      className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
                    >
                      Use right
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-line/70 bg-surface px-4 py-4 text-sm leading-7 text-muted">
                When you are signed in, saved scenarios appear here as quick
                compare sources.
              </div>
            )}
          </div>
          {accessToken ? null : (
            <div className="rounded-2xl border border-line/70 bg-surface px-4 py-4 text-sm leading-7 text-muted">
              Sign in on the saved workspace to unlock quick-pick scenarios here.
            </div>
          )}
        </div>
      }
    >

      {leftScenario && rightScenario ? (
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <ScenarioEnvelopeCard
              scenario={leftScenario}
              title="Left scenario"
            />
            <ScenarioEnvelopeCard
              scenario={rightScenario}
              title="Right scenario"
            />
          </section>

          <section className="rounded-[2rem] border border-line/70 bg-surface px-6 py-6 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
                  Comparison matrix
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                  Structural differences and overlap
                </h2>
              </div>
              <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
                {activeScenarioType ?? 'mixed'} scenarios
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-line/70">
              <table className="min-w-full border-collapse">
                <thead className="bg-surface-strong">
                  <tr className="text-left text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                    <th className="px-4 py-4 font-medium">Field</th>
                    <th className="px-4 py-4 font-medium">Left</th>
                    <th className="px-4 py-4 font-medium">Right</th>
                  </tr>
                </thead>
                <tbody>
                  {diffSummary.map((item) => (
                    <tr key={item.label} className="border-t border-line/70 bg-bg text-sm text-text">
                      <td className="px-4 py-4 font-semibold">{item.label}</td>
                      <td className="px-4 py-4 text-muted">{item.left}</td>
                      <td className="px-4 py-4 text-muted">{item.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[2rem] border border-line/70 bg-surface px-6 py-8 shadow-panel">
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Comparison detail
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            Load two stored scenario IDs to inspect them side by side
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            This workspace is built directly on `getScenario`, so it can compare
            any stored scenario IDs without inventing another data model.
          </p>
        </section>
      )}
    </ScenarioRouteFrame>
  );
}
