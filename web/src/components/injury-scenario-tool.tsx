'use client';

import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioPreviewPanel, type ScenarioPreviewState } from '@/components/scenario-preview-panel';
import { ScenarioPersistencePanel } from '@/components/scenario-persistence-panel';
import {
  ApiClientError,
  createBrowserInjuryScenario,
  getTeamRoster,
  previewInjuryScenario,
  saveScenarioToLibrary,
} from '@/lib/api/client';
import type {
  InjuryPreviewResponse,
  ScenarioEnvelope,
  TeamHealthSummary,
  TeamRosterResponse,
} from '@/lib/api/types';
import type { InjuryScenarioShareState } from '@/lib/scenario-share';

interface InjuryScenarioToolProps {
  teams: readonly TeamHealthSummary[];
  initialState: InjuryScenarioShareState;
  onStateChange: (state: InjuryScenarioShareState) => void;
}

function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.detail;
  }
  return error instanceof Error ? error.message : 'Unknown API failure.';
}

export function InjuryScenarioTool({
  teams,
  initialState,
  onStateChange,
}: InjuryScenarioToolProps) {
  const { accessToken, status: authStatus } = useAuth();
  const [form, setForm] = useState<InjuryScenarioShareState>(initialState);
  const [roster, setRoster] = useState<TeamRosterResponse | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    ScenarioPreviewState<InjuryPreviewResponse>
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

  useEffect(() => {
    let cancelled = false;

    async function loadRoster() {
      setRosterError(null);
      try {
        const nextRoster = await getTeamRoster(form.teamId);
        if (!cancelled) {
          setRoster(nextRoster);
        }
      } catch (error) {
        if (!cancelled) {
          setRoster(null);
          setRosterError(formatApiErrorMessage(error));
        }
      }
    }

    void loadRoster();

    return () => {
      cancelled = true;
    };
  }, [form.teamId]);

  useEffect(() => {
    if (!roster) {
      return;
    }

    const selectedPlayer = roster.players.find(
      (player) => player.player_id === form.playerId,
    );
    if (!selectedPlayer && roster.players[0]) {
      setForm((current) => ({
        ...current,
        playerId: roster.players[0]?.player_id ?? '',
      }));
    }
  }, [form.playerId, roster]);

  function updateForm(
    patch:
      | Partial<InjuryScenarioShareState>
      | ((current: InjuryScenarioShareState) => InjuryScenarioShareState),
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
      const response = await previewInjuryScenario({
        team_id: form.teamId,
        player_id: form.playerId,
        projected_games_missed: form.projectedGamesMissed,
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
    if (!form.teamId || !form.playerId.trim()) {
      setStoreStatus('error');
      setPersistenceMessage('Choose a team and player before storing the scenario.');
      return;
    }

    setStoreStatus('storing');
    setPersistenceMessage(null);

    try {
      const response = await createBrowserInjuryScenario({
        team_id: form.teamId,
        player_id: form.playerId,
        projected_games_missed: form.projectedGamesMissed,
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

  const canRunPreview = form.teamId > 0 && form.playerId.length > 0;
  const canStoreScenario = canRunPreview;
  const canSaveScenario = authStatus === 'signed-in' && Boolean(accessToken);
  const selectedPlayer =
    roster?.players.find((player) => player.player_id === form.playerId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Injury tool
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            Remove one player and see the season bend
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Estimate the cost of missed time using current-season on/off and rotation
            context rather than a generic headline.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Team
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.teamId}
              onChange={(event) =>
                updateForm({ teamId: Number(event.target.value), playerId: '' })
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
              Player
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.playerId}
              onChange={(event) => updateForm({ playerId: event.target.value })}
              disabled={!roster}
            >
              <option value="">Select a player</option>
              {roster?.players.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.display_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Projected games missed
            </span>
            <input
              type="range"
              min="0"
              max="82"
              step="1"
              className="mt-4 w-full accent-[var(--color-accent)]"
              value={form.projectedGamesMissed}
              onChange={(event) =>
                updateForm({
                  projectedGamesMissed: Number(event.target.value),
                })
              }
            />
            <div className="mt-2 text-sm text-muted">
              {form.projectedGamesMissed} games missed
            </div>
          </label>
        </div>

        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-6 text-muted">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Rotation context
          </div>
          {selectedPlayer ? (
            <div className="mt-2">
              <div className="font-semibold text-text">{selectedPlayer.display_name}</div>
              <div className="mt-1">
                {selectedPlayer.position ?? 'Position unavailable'} ·{' '}
                {selectedPlayer.minutes_per_game?.toFixed(1) ?? '0.0'} MPG
              </div>
            </div>
          ) : (
            <div className="mt-2">Choose a player to load the injury preview context.</div>
          )}
          {rosterError ? <div className="mt-3 text-danger">{rosterError}</div> : null}
        </div>
      </section>

      <ScenarioPreviewPanel
        eyebrow="Injury preview"
        title="Outcome workspace"
        description="Run one player-availability shock through the current team baseline before it becomes a talking-point shortcut."
        idleMessage="Choose a team, player, and missed-games estimate, then run the preview to see the season and playoff impact."
        loadingMessage="Computing the injury impact preview and updated playoff range..."
        preview={preview}
        canRunPreview={canRunPreview}
        runLabel="Run injury preview"
        onRunPreview={() => {
          void runPreview();
        }}
        detailSlot={(response) => (
          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Selected injury
            </div>
            <div className="mt-2 text-lg font-semibold text-text">
              {response.player_name} misses {response.projected_games_missed} games
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              The preview removes a weighted slice of the player&apos;s current contribution
              from the team baseline and reruns the deterministic season stack.
            </p>
          </div>
        )}
      />

      <ScenarioPersistencePanel
        scenarioLabel="injury"
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
