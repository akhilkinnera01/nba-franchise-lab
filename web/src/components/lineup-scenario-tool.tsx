'use client';

import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioPreviewPanel, type ScenarioPreviewState } from '@/components/scenario-preview-panel';
import { ScenarioPersistencePanel } from '@/components/scenario-persistence-panel';
import {
  ApiClientError,
  createBrowserLineupScenario,
  previewLineupScenario,
  saveScenarioToLibrary,
} from '@/lib/api/client';
import type {
  LineupPreviewResponse,
  ScenarioEnvelope,
  TeamHealthSummary,
} from '@/lib/api/types';
import type { LineupScenarioShareState } from '@/lib/scenario-share';
import { formatSignedNumber } from '@/lib/formatters';

interface LineupScenarioToolProps {
  teams: readonly TeamHealthSummary[];
  initialState: LineupScenarioShareState;
  onStateChange: (state: LineupScenarioShareState) => void;
}

function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.detail;
  }
  return error instanceof Error ? error.message : 'Unknown API failure.';
}

export function LineupScenarioTool({
  teams,
  initialState,
  onStateChange,
}: LineupScenarioToolProps) {
  const { accessToken, status: authStatus } = useAuth();
  const [form, setForm] = useState<LineupScenarioShareState>(initialState);
  const [preview, setPreview] = useState<
    ScenarioPreviewState<LineupPreviewResponse>
  >({ status: 'idle' });
  const [storedScenario, setStoredScenario] = useState<ScenarioEnvelope | null>(
    null,
  );
  const [storeStatus, setStoreStatus] = useState<
    'idle' | 'storing' | 'stored' | 'error'
  >('idle');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onStateChange(form);
  }, [form, onStateChange]);

  function updateForm(
    patch:
      | Partial<LineupScenarioShareState>
      | ((current: LineupScenarioShareState) => LineupScenarioShareState),
  ) {
    startTransition(() => {
      setForm((current) =>
        typeof patch === 'function' ? patch(current) : { ...current, ...patch },
      );
      setPreview({ status: 'idle' });
      setStoredScenario(null);
      setStoreStatus('idle');
      setSaveStatus('idle');
      setPersistenceMessage(null);
    });
  }

  async function runPreview() {
    setPreview({ status: 'loading' });

    try {
      const response = await previewLineupScenario({
        team_id: form.teamId,
        change_label: form.changeLabel,
        net_rating_adjustment: form.netRatingAdjustment,
      });

      setPreview({ status: 'ready', response });
    } catch (error) {
      setPreview({
        status: 'error',
        message: formatApiErrorMessage(error),
      });
    }
  }

  async function storeBrowserScenario() {
    if (!form.teamId || !form.changeLabel.trim()) {
      setStoreStatus('error');
      setPersistenceMessage('Choose a team and a lineup change before storing it.');
      return;
    }

    setStoreStatus('storing');
    setPersistenceMessage(null);

    try {
      const response = await createBrowserLineupScenario({
        team_id: form.teamId,
        change_label: form.changeLabel,
        net_rating_adjustment: form.netRatingAdjustment,
      });
      setStoredScenario(response);
      setStoreStatus('stored');
      setSaveStatus('idle');
      setPersistenceMessage('Stored scenario is ready for the saved library.');
    } catch (error) {
      setStoreStatus('error');
      setPersistenceMessage(formatApiErrorMessage(error));
    }
  }

  async function saveBrowserScenario() {
    if (!storedScenario || !accessToken) {
      setPersistenceMessage('Store the scenario first, then sign in to save it.');
      return;
    }

    setSaveStatus('saving');
    setPersistenceMessage(null);

    try {
      await saveScenarioToLibrary(accessToken, storedScenario.scenario_id);
      setSaveStatus('saved');
      setPersistenceMessage('Scenario saved to the library.');
    } catch (error) {
      setSaveStatus('error');
      setPersistenceMessage(formatApiErrorMessage(error));
    }
  }

  const canRunPreview = form.teamId > 0 && form.changeLabel.trim().length > 0;
  const canStoreScenario = canRunPreview;
  const canSaveScenario = authStatus === 'signed-in' && Boolean(accessToken);
  const selectedTeam = teams.find((team) => team.team_id === form.teamId);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Lineup tool
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            Stress-test one rotation idea before you chase it
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Apply a direct net-rating adjustment to the current team baseline for
            lineup changes, spacing tweaks, or role reassignments.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Team
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.teamId}
              onChange={(event) =>
                updateForm({ teamId: Number(event.target.value) })
              }
            >
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Change label
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.changeLabel}
              onChange={(event) =>
                updateForm({ changeLabel: event.target.value })
              }
              placeholder="Start shooting-heavy bench unit"
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Net rating adjustment
            </span>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              className="mt-4 w-full accent-[var(--color-accent)]"
              value={form.netRatingAdjustment}
              onChange={(event) =>
                updateForm({
                  netRatingAdjustment: Number(event.target.value),
                })
              }
            />
            <div className="mt-2 text-sm text-muted">
              {formatSignedNumber(form.netRatingAdjustment, 1)} net rating
            </div>
          </label>
        </div>

        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-6 text-muted">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Rotation framing
          </div>
          <div className="mt-2 font-semibold text-text">
            {selectedTeam?.full_name ?? 'Selected team'}
          </div>
          <p className="mt-2">
            Use positive values for better spacing, fit, or bench coherence. Use
            negative values for thin rotation nights or problematic combinations.
          </p>
        </div>
      </section>

      <ScenarioPreviewPanel
        eyebrow="Lineup preview"
        title="Outcome workspace"
        description="Measure how one lineup-level change bends wins, playoff odds, and the upper and lower end of the season band."
        idleMessage="Choose a team, describe the lineup move, and run the preview to see the range of outcomes."
        loadingMessage="Computing the lineup preview and season outcome band..."
        preview={preview}
        canRunPreview={canRunPreview}
        runLabel="Run lineup preview"
        onRunPreview={() => {
          void runPreview();
        }}
        detailSlot={(response) => (
          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Change summary
            </div>
            <div className="mt-2 text-lg font-semibold text-text">
              {response.change_label}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              The preview applies the requested net-rating swing directly to the
              selected team&apos;s baseline to frame how much this lineup idea matters.
            </p>
          </div>
        )}
      />

      <ScenarioPersistencePanel
        scenarioLabel="lineup"
        storedScenario={storedScenario}
        storeStatus={storeStatus}
        saveStatus={saveStatus}
        canStore={canStoreScenario}
        canSave={canSaveScenario}
        message={persistenceMessage}
        onStore={() => {
          void storeBrowserScenario();
        }}
        onSave={() => {
          void saveBrowserScenario();
        }}
      />
    </div>
  );
}
