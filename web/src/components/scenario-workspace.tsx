'use client';

import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { SignalPill } from '@/components/control-room-primitives';
import { FreeAgentScenarioTool } from '@/components/free-agent-scenario-tool';
import { InjuryScenarioTool } from '@/components/injury-scenario-tool';
import { LineupScenarioTool } from '@/components/lineup-scenario-tool';
import { ScenarioRouteFrame } from '@/components/scenario-route-frame';
import { TradeBuilder } from '@/components/trade-builder';
import {
  saveScenarioToLibrary,
  storeBrowserFreeAgentScenario,
  storeBrowserInjuryScenario,
  storeBrowserLineupScenario,
  storeBrowserTradeScenario,
} from '@/lib/api/client';
import type {
  ScenarioEnvelope,
  TeamHealthSummary,
} from '@/lib/api/types';
import {
  decodeScenarioShareState,
  encodeScenarioShareState,
  normalizeScenarioTool,
  primaryTeamIdForScenarioState,
  type FreeAgentScenarioShareState,
  type InjuryScenarioShareState,
  type LineupScenarioShareState,
  type ScenarioShareState,
  type ScenarioTool,
  type TradeScenarioShareState,
} from '@/lib/scenario-share';

interface ScenarioWorkspaceProps {
  initialTeams: readonly TeamHealthSummary[];
  initialPrimaryTeamId?: number;
  initialTool?: string | string[];
  initialEncodedState?: string | string[];
}

type StoreStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; envelope: ScenarioEnvelope; savedToLibrary: boolean }
  | { state: 'error'; message: string };

const TOOL_OPTIONS: ReadonlyArray<{
  value: ScenarioTool;
  label: string;
}> = [
  { value: 'trade', label: 'Trade' },
  { value: 'free-agent', label: 'Free agent' },
  { value: 'injury', label: 'Injury' },
  { value: 'lineup', label: 'Lineup' },
];

function buildDefaultTradeState(
  teams: readonly TeamHealthSummary[],
  initialPrimaryTeamId?: number,
): TradeScenarioShareState {
  const leftTeam =
    teams.find((team) => team.team_id === initialPrimaryTeamId) ?? teams[0];
  const rightTeam =
    teams.find((team) => team.team_id !== leftTeam?.team_id) ?? teams[1] ?? leftTeam;

  return {
    tool: 'trade',
    leftTeamId: leftTeam?.team_id ?? 0,
    rightTeamId: rightTeam?.team_id ?? 0,
    leftOutgoingPlayerIds: [],
    rightOutgoingPlayerIds: [],
    leftOutgoingPickNotes: [],
    rightOutgoingPickNotes: [],
    leftSendsCash: false,
    rightSendsCash: false,
  };
}

function buildDefaultFreeAgentState(
  teams: readonly TeamHealthSummary[],
  initialPrimaryTeamId?: number,
): FreeAgentScenarioShareState {
  return {
    tool: 'free-agent',
    teamId:
      teams.find((team) => team.team_id === initialPrimaryTeamId)?.team_id ??
      teams[0]?.team_id ??
      0,
    playerName: '',
    projectedBoxPlusMinus: 1.8,
    projectedMinutesShare: 0.24,
    annualSalaryCents: 1_200_000_000,
    contractYears: 2,
    annualRaiseRate: 0.05,
    exceptionCode: 'non_taxpayer_mid_level',
  };
}

function buildDefaultInjuryState(
  teams: readonly TeamHealthSummary[],
  initialPrimaryTeamId?: number,
): InjuryScenarioShareState {
  return {
    tool: 'injury',
    teamId:
      teams.find((team) => team.team_id === initialPrimaryTeamId)?.team_id ??
      teams[0]?.team_id ??
      0,
    playerId: '',
    projectedGamesMissed: 18,
  };
}

function buildDefaultLineupState(
  teams: readonly TeamHealthSummary[],
  initialPrimaryTeamId?: number,
): LineupScenarioShareState {
  return {
    tool: 'lineup',
    teamId:
      teams.find((team) => team.team_id === initialPrimaryTeamId)?.team_id ??
      teams[0]?.team_id ??
      0,
    changeLabel: '',
    netRatingAdjustment: 1.5,
  };
}

function buildInitialStateMap(
  teams: readonly TeamHealthSummary[],
  initialPrimaryTeamId: number | undefined,
  decodedState: ScenarioShareState | null,
) {
  return {
    trade:
      decodedState?.tool === 'trade'
        ? decodedState
        : buildDefaultTradeState(teams, initialPrimaryTeamId),
    'free-agent':
      decodedState?.tool === 'free-agent'
        ? decodedState
        : buildDefaultFreeAgentState(teams, initialPrimaryTeamId),
    injury:
      decodedState?.tool === 'injury'
        ? decodedState
        : buildDefaultInjuryState(teams, initialPrimaryTeamId),
    lineup:
      decodedState?.tool === 'lineup'
        ? decodedState
        : buildDefaultLineupState(teams, initialPrimaryTeamId),
  };
}

export function ScenarioWorkspace({
  initialTeams,
  initialPrimaryTeamId,
  initialTool,
  initialEncodedState,
}: ScenarioWorkspaceProps) {
  const { accessToken, session } = useAuth();
  const decodedState = decodeScenarioShareState(initialEncodedState);
  const [selectedTool, setSelectedTool] = useState<ScenarioTool>(() =>
    decodedState?.tool ?? normalizeScenarioTool(initialTool),
  );
  const [scenarioStates, setScenarioStates] = useState(() =>
    buildInitialStateMap(initialTeams, initialPrimaryTeamId, decodedState),
  );
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [storeStatus, setStoreStatus] = useState<StoreStatus>({ state: 'idle' });

  const activeState = scenarioStates[selectedTool];

  useEffect(() => {
    const primaryTeamId = primaryTeamIdForScenarioState(activeState);
    const query = new URLSearchParams(window.location.search);

    query.set('tool', selectedTool);
    query.set('state', encodeScenarioShareState(activeState));
    if (primaryTeamId > 0) {
      query.set('primaryTeam', String(primaryTeamId));
    } else {
      query.delete('primaryTeam');
    }

    const nextUrl = `${window.location.pathname}?${query.toString()}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeState, selectedTool]);

  useEffect(() => {
    if (shareStatus === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShareStatus('idle');
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareStatus]);

  useEffect(() => {
    setStoreStatus({ state: 'idle' });
  }, [activeState, selectedTool]);

  function updateScenarioState(nextState: ScenarioShareState) {
    setScenarioStates((current) => ({
      ...current,
      [nextState.tool]: nextState,
    }));
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('copied');
    } catch {
      setShareStatus('error');
    }
  }

  async function storeCurrentScenario() {
    setStoreStatus({ state: 'loading' });

    try {
      let envelope: ScenarioEnvelope | null = null;

      switch (activeState.tool) {
        case 'trade':
          envelope = await storeBrowserTradeScenario({
            teams: [
              {
                team_id: activeState.leftTeamId,
                outgoing_player_ids: activeState.leftOutgoingPlayerIds,
                outgoing_pick_notes: activeState.leftOutgoingPickNotes,
                sends_cash: activeState.leftSendsCash,
              },
              {
                team_id: activeState.rightTeamId,
                outgoing_player_ids: activeState.rightOutgoingPlayerIds,
                outgoing_pick_notes: activeState.rightOutgoingPickNotes,
                sends_cash: activeState.rightSendsCash,
              },
            ],
          });
          break;
        case 'free-agent':
          envelope = await storeBrowserFreeAgentScenario({
            team_id: activeState.teamId,
            player_name: activeState.playerName,
            projected_box_plus_minus: activeState.projectedBoxPlusMinus,
            projected_minutes_share: activeState.projectedMinutesShare,
            annual_salary_cents: activeState.annualSalaryCents,
            contract_years: activeState.contractYears,
            annual_raise_rate: activeState.annualRaiseRate,
            exception_code: activeState.exceptionCode,
          });
          break;
        case 'injury':
          envelope = await storeBrowserInjuryScenario({
            team_id: activeState.teamId,
            player_id: activeState.playerId,
            projected_games_missed: activeState.projectedGamesMissed,
          });
          break;
        case 'lineup':
          envelope = await storeBrowserLineupScenario({
            team_id: activeState.teamId,
            change_label: activeState.changeLabel,
            net_rating_adjustment: activeState.netRatingAdjustment,
          });
          break;
      }

      if (!envelope) {
        throw new Error('Unable to store the current scenario.');
      }

      let savedToLibrary = false;
      if (accessToken) {
        await saveScenarioToLibrary(accessToken, envelope.scenario_id);
        savedToLibrary = true;
      }

      setStoreStatus({
        state: 'ready',
        envelope,
        savedToLibrary,
      });
    } catch (error) {
      setStoreStatus({
        state: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to store scenario.',
      });
    }
  }

  return (
    <ScenarioRouteFrame
      eyebrow="Scenario workspace"
      title="One desk for trades, signings, injuries, and lineup changes."
      description="Move between trade, free-agent, injury, and lineup scenarios without changing mental models. Each mode keeps the same control-room shell: inputs first, verdict second, evidence third."
      rail={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SignalPill tone="success">live URL</SignalPill>
            <SignalPill tone="cool">stored ID</SignalPill>
            <SignalPill tone="accent">4 modes</SignalPill>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="surface-eyebrow">Share state</div>
              <div className="mt-2 text-sm text-muted">
                The current workspace state is encoded into the URL.
              </div>
            </div>
            <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-text">
              Shareable
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void copyShareUrl();
              }}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              Copy live URL
            </button>
            <button
              type="button"
              onClick={() => {
                void storeCurrentScenario();
              }}
              className="rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
            >
              {session ? 'Store and save' : 'Store browser scenario'}
            </button>
            <div className="rounded-2xl border border-line/70 px-4 py-3 text-sm text-muted">
              {shareStatus === 'copied'
                ? 'Link copied.'
                : shareStatus === 'error'
                  ? 'Clipboard unavailable.'
                  : 'Keep editing; the URL updates as you go.'}
            </div>
          </div>
          <div className="rounded-2xl border border-line/70 bg-surface px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Browser store
            </div>
            <div className="mt-2 text-sm leading-6 text-muted">
              {storeStatus.state === 'idle'
                ? 'Store the current browser-built scenario, then save it to your account when signed in.'
                : storeStatus.state === 'loading'
                  ? 'Persisting the current scenario...'
                  : storeStatus.state === 'error'
                    ? storeStatus.message
                    : storeStatus.savedToLibrary
                      ? `Stored as ${storeStatus.envelope.scenario_id} and saved to your library.`
                      : `Stored as ${storeStatus.envelope.scenario_id}. Sign in to save it to your library.`}
            </div>
            {storeStatus.state === 'ready' ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={`/compare?left=${storeStatus.envelope.scenario_id}`}
                  className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
                >
                  Compare this scenario
                </a>
                <div className="rounded-2xl border border-line/70 px-4 py-3 font-mono text-xs text-muted">
                  {storeStatus.envelope.scenario_type}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
      footer={
        <div>
          <div className="sm:hidden">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Tool
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={selectedTool}
                onChange={(event) =>
                  startTransition(() =>
                    setSelectedTool(event.target.value as ScenarioTool),
                  )
                }
              >
                {TOOL_OPTIONS.map((tool) => (
                  <option key={tool.value} value={tool.value}>
                    {tool.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hidden flex-wrap gap-2 sm:flex">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool.value}
                type="button"
                onClick={() =>
                  startTransition(() => setSelectedTool(tool.value))
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  selectedTool === tool.value
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line/70 bg-bg text-text hover:border-accent-cool/50'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {selectedTool === 'trade' ? (
        <TradeBuilder
          initialTeams={initialTeams}
          initialPrimaryTeamId={initialPrimaryTeamId}
          initialState={scenarioStates.trade}
          onStateChange={updateScenarioState}
        />
      ) : null}

      {selectedTool === 'free-agent' ? (
        <FreeAgentScenarioTool
          teams={initialTeams}
          initialState={scenarioStates['free-agent']}
          onStateChange={updateScenarioState}
        />
      ) : null}

      {selectedTool === 'injury' ? (
        <InjuryScenarioTool
          teams={initialTeams}
          initialState={scenarioStates.injury}
          onStateChange={updateScenarioState}
        />
      ) : null}

      {selectedTool === 'lineup' ? (
        <LineupScenarioTool
          teams={initialTeams}
          initialState={scenarioStates.lineup}
          onStateChange={updateScenarioState}
        />
      ) : null}
    </ScenarioRouteFrame>
  );
}
