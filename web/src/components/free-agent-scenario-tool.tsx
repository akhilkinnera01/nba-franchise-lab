'use client';

import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioPreviewPanel, type ScenarioPreviewState } from '@/components/scenario-preview-panel';
import { ScenarioPersistencePanel } from '@/components/scenario-persistence-panel';
import {
  ApiClientError,
  createBrowserFreeAgentScenario,
  getTeamCap,
  previewFreeAgentScenario,
  saveScenarioToLibrary,
} from '@/lib/api/client';
import type {
  FreeAgentPreviewResponse,
  ScenarioEnvelope,
  TeamCapResponse,
  TeamHealthSummary,
} from '@/lib/api/types';
import type { FreeAgentScenarioShareState } from '@/lib/scenario-share';
import { formatCurrencyShort } from '@/lib/formatters';

interface FreeAgentScenarioToolProps {
  teams: readonly TeamHealthSummary[];
  initialState: FreeAgentScenarioShareState;
  onStateChange: (state: FreeAgentScenarioShareState) => void;
}

function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.detail;
  }
  return error instanceof Error ? error.message : 'Unknown API failure.';
}

export function FreeAgentScenarioTool({
  teams,
  initialState,
  onStateChange,
}: FreeAgentScenarioToolProps) {
  const { accessToken, status: authStatus } = useAuth();
  const [form, setForm] = useState<FreeAgentScenarioShareState>(initialState);
  const [cap, setCap] = useState<TeamCapResponse | null>(null);
  const [capError, setCapError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    ScenarioPreviewState<FreeAgentPreviewResponse>
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

  const selectedTeam = teams.find((team) => team.team_id === form.teamId) ?? teams[0];

  useEffect(() => {
    onStateChange(form);
  }, [form, onStateChange]);

  useEffect(() => {
    let cancelled = false;

    async function loadCap() {
      setCapError(null);

      try {
        const nextCap = await getTeamCap(form.teamId);
        if (!cancelled) {
          setCap(nextCap);
        }
      } catch (error) {
        if (!cancelled) {
          setCap(null);
          setCapError(formatApiErrorMessage(error));
        }
      }
    }

    void loadCap();

    return () => {
      cancelled = true;
    };
  }, [form.teamId]);

  function updateForm(
    patch:
      | Partial<FreeAgentScenarioShareState>
      | ((current: FreeAgentScenarioShareState) => FreeAgentScenarioShareState),
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
      const response = await previewFreeAgentScenario({
        team_id: form.teamId,
        player_name: form.playerName,
        projected_box_plus_minus: form.projectedBoxPlusMinus,
        projected_minutes_share: form.projectedMinutesShare,
        annual_salary_cents: form.annualSalaryCents,
        contract_years: form.contractYears,
        annual_raise_rate: form.annualRaiseRate,
        exception_code: form.exceptionCode,
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
    if (!form.playerName.trim() || form.teamId <= 0) {
      setStoreStatus('error');
      setPersistenceMessage('Set the team and player before storing the scenario.');
      return;
    }

    setStoreStatus('storing');
    setPersistenceMessage(null);

    try {
      const response = await createBrowserFreeAgentScenario({
        team_id: form.teamId,
        player_name: form.playerName,
        projected_box_plus_minus: form.projectedBoxPlusMinus,
        projected_minutes_share: form.projectedMinutesShare,
        annual_salary_cents: form.annualSalaryCents,
        contract_years: form.contractYears,
        annual_raise_rate: form.annualRaiseRate,
        exception_code: form.exceptionCode,
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

  const canRunPreview = form.playerName.trim().length > 0 && form.teamId > 0;
  const canStoreScenario = canRunPreview;
  const canSaveScenario = authStatus === 'signed-in' && Boolean(accessToken);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Free-agent tool
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            Price one signing before it hits the cap sheet
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Use a projected BPM, minutes share, and exception path to pressure-test
            one signing without leaving the scenario route.
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
              Player
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.playerName}
              onChange={(event) => updateForm({ playerName: event.target.value })}
              placeholder="Tyus Jones"
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Projected BPM
            </span>
            <input
              type="number"
              step="0.1"
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.projectedBoxPlusMinus}
              onChange={(event) =>
                updateForm({
                  projectedBoxPlusMinus: Number(event.target.value),
                })
              }
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Minutes share
            </span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.projectedMinutesShare}
              onChange={(event) =>
                updateForm({
                  projectedMinutesShare: Number(event.target.value),
                })
              }
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Annual salary (M)
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.annualSalaryCents / 100_000_000}
              onChange={(event) =>
                updateForm({
                  annualSalaryCents:
                    Number(event.target.value) * 100_000_000,
                })
              }
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Contract years
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.contractYears}
              onChange={(event) =>
                updateForm({ contractYears: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4].map((years) => (
                <option key={years} value={years}>
                  {years} year{years > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Raise rate
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="0.08"
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.annualRaiseRate}
              onChange={(event) =>
                updateForm({ annualRaiseRate: Number(event.target.value) })
              }
            />
          </label>

          <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Exception path
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={form.exceptionCode}
              onChange={(event) =>
                updateForm({
                  exceptionCode:
                    event.target.value as FreeAgentScenarioShareState['exceptionCode'],
                })
              }
            >
              <option value="room_mid_level">Room mid-level</option>
              <option value="non_taxpayer_mid_level">Non-taxpayer MLE</option>
              <option value="taxpayer_mid_level">Taxpayer MLE</option>
              <option value="bi_annual_exception">Bi-annual exception</option>
              <option value="veteran_minimum">Veteran minimum</option>
            </select>
          </label>
        </div>

        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-6 text-muted">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Current context
          </div>
          <div className="mt-2 font-semibold text-text">{selectedTeam?.full_name}</div>
          <div className="mt-2">
            Current cap room:{' '}
            <span className="font-mono text-text">
              {formatCurrencyShort(
                cap?.current.cap_room_cents ?? selectedTeam?.cap_room_cents ?? null,
              )}
            </span>
          </div>
          <div className="mt-1">
            First apron room:{' '}
            <span className="font-mono text-text">
              {formatCurrencyShort(
                cap?.current.first_apron_room_cents ??
                  selectedTeam?.first_apron_room_cents ??
                  null,
              )}
            </span>
          </div>
          {capError ? <div className="mt-3 text-danger">{capError}</div> : null}
        </div>
      </section>

      <ScenarioPreviewPanel
        eyebrow="Signing preview"
        title="Outcome workspace"
        description="Run the signing through the current cap context and deterministic preview stack before you commit it to the larger strategy."
        idleMessage="Set the player, contract, and exception path, then run the preview to see the on-court and cap impact."
        loadingMessage="Computing the signing preview, cap window, and playoff deltas..."
        preview={preview}
        canRunPreview={canRunPreview}
        runLabel="Run signing preview"
        onRunPreview={() => {
          void runPreview();
        }}
        detailSlot={(response) => (
          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Exception verdict
                </div>
                <div className="mt-2 text-lg font-semibold text-text">
                  {response.exception_available
                    ? `${response.team_name} can use ${response.exception_code.replaceAll(
                        '_',
                        ' ',
                      )}.`
                    : `${response.team_name} cannot use ${response.exception_code.replaceAll(
                        '_',
                        ' ',
                      )} right now.`}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {response.exception_reason}
                </p>
              </div>
              <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-text">
                {formatCurrencyShort(response.exception_amount_cents ?? null)}
              </div>
            </div>
          </div>
        )}
      />

      <ScenarioPersistencePanel
        scenarioLabel="free-agent"
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
