'use client';

import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioPersistencePanel } from '@/components/scenario-persistence-panel';
import {
  ApiClientError,
  createBrowserTradeScenario,
  getTeamCap,
  getTeamRoster,
  previewTradeProposal,
  saveScenarioToLibrary,
} from '@/lib/api/client';
import type {
  TeamCapResponse,
  TeamHealthSummary,
  TeamRosterPlayer,
  TeamRosterResponse,
  ScenarioEnvelope,
  TradeValidationRequest,
} from '@/lib/api/types';
import type { TradeScenarioShareState } from '@/lib/scenario-share';

import {
  type TradeDragPayload,
  TradeTeamBoard,
} from '@/components/trade-team-board';
import {
  TradeResultsPanel,
  type TradePreviewState,
} from '@/components/trade-validation-panel';

type BuilderSlot = 'left' | 'right';

type TeamBuilderState = {
  teamId: number;
  outgoingPlayerIds: string[];
  outgoingPickNotes: string[];
  sendsCash: boolean;
};

type TeamContextState = {
  roster: TeamRosterResponse | null;
  cap: TeamCapResponse | null;
  loading: boolean;
  error: string | null;
};

interface TradeBuilderProps {
  initialTeams: readonly TeamHealthSummary[];
  initialPrimaryTeamId?: number;
  initialState?: TradeScenarioShareState;
  onStateChange?: (state: TradeScenarioShareState) => void;
}

function buildInitialTeamState(
  initialTeams: readonly TeamHealthSummary[],
  initialPrimaryTeamId?: number,
  initialState?: TradeScenarioShareState,
): { left: TeamBuilderState; right: TeamBuilderState } {
  if (initialState) {
    return {
      left: {
        teamId: initialState.leftTeamId,
        outgoingPlayerIds: initialState.leftOutgoingPlayerIds,
        outgoingPickNotes: initialState.leftOutgoingPickNotes,
        sendsCash: initialState.leftSendsCash,
      },
      right: {
        teamId: initialState.rightTeamId,
        outgoingPlayerIds: initialState.rightOutgoingPlayerIds,
        outgoingPickNotes: initialState.rightOutgoingPickNotes,
        sendsCash: initialState.rightSendsCash,
      },
    };
  }

  const firstTeam =
    initialTeams.find((team) => team.team_id === initialPrimaryTeamId) ??
    initialTeams[0];
  const secondTeam =
    initialTeams.find((team) => team.team_id !== firstTeam?.team_id) ??
    initialTeams[1] ??
    firstTeam;

  return {
    left: {
      teamId: firstTeam?.team_id ?? 0,
      outgoingPlayerIds: [],
      outgoingPickNotes: [],
      sendsCash: false,
    },
    right: {
      teamId: secondTeam?.team_id ?? 0,
      outgoingPlayerIds: [],
      outgoingPickNotes: [],
      sendsCash: false,
    },
  };
}

function createEmptyTeamContext(): TeamContextState {
  return {
    roster: null,
    cap: null,
    loading: false,
    error: null,
  };
}

function nextPickLabel(
  label: string,
  existingPickNotes: readonly string[],
): string {
  const matchingCount = existingPickNotes.filter((pickNote) =>
    pickNote.startsWith(label),
  ).length;
  if (matchingCount === 0) {
    return label;
  }
  return `${label} ${matchingCount + 1}`;
}

function selectedPlayers(
  roster: TeamRosterResponse | null,
  outgoingPlayerIds: readonly string[],
): TeamRosterPlayer[] {
  if (!roster) {
    return [];
  }
  return roster.players.filter((player) =>
    outgoingPlayerIds.includes(player.player_id),
  );
}

function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.detail;
  }
  return error instanceof Error ? error.message : 'Unknown API failure.';
}

export function TradeBuilder({
  initialTeams,
  initialPrimaryTeamId,
  initialState,
  onStateChange,
}: TradeBuilderProps) {
  const { accessToken, status: authStatus } = useAuth();
  const initialBuilderState = buildInitialTeamState(
    initialTeams,
    initialPrimaryTeamId,
    initialState,
  );
  const [leftTeam, setLeftTeam] = useState<TeamBuilderState>(
    initialBuilderState.left,
  );
  const [rightTeam, setRightTeam] = useState<TeamBuilderState>(
    initialBuilderState.right,
  );
  const [teamContexts, setTeamContexts] = useState<{
    left: TeamContextState;
    right: TeamContextState;
  }>({
    left: createEmptyTeamContext(),
    right: createEmptyTeamContext(),
  });
  const [preview, setPreview] = useState<TradePreviewState>({
    status: 'idle',
  });
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

  const leftSummary = initialTeams.find(
    (team) => team.team_id === leftTeam.teamId,
  );
  const rightSummary = initialTeams.find(
    (team) => team.team_id === rightTeam.teamId,
  );
  const hasSelectedAssets =
    leftTeam.outgoingPlayerIds.length > 0 ||
    rightTeam.outgoingPlayerIds.length > 0 ||
    leftTeam.outgoingPickNotes.length > 0 ||
    rightTeam.outgoingPickNotes.length > 0 ||
    leftTeam.sendsCash ||
    rightTeam.sendsCash;
  const canRunPreview = Boolean(
    teamContexts.left.roster && teamContexts.right.roster && hasSelectedAssets,
  );
  const canStoreScenario = canRunPreview;
  const canSaveScenario = authStatus === 'signed-in' && Boolean(accessToken);

  useEffect(() => {
    if (!onStateChange) {
      return;
    }

    onStateChange({
      tool: 'trade',
      leftTeamId: leftTeam.teamId,
      rightTeamId: rightTeam.teamId,
      leftOutgoingPlayerIds: leftTeam.outgoingPlayerIds,
      rightOutgoingPlayerIds: rightTeam.outgoingPlayerIds,
      leftOutgoingPickNotes: leftTeam.outgoingPickNotes,
      rightOutgoingPickNotes: rightTeam.outgoingPickNotes,
      leftSendsCash: leftTeam.sendsCash,
      rightSendsCash: rightTeam.sendsCash,
    });
  }, [leftTeam, onStateChange, rightTeam]);

  useEffect(() => {
    let cancelled = false;

    async function loadContext(slot: BuilderSlot, teamId: number) {
      if (teamId === 0) {
        return;
      }

      setTeamContexts((current) => ({
        ...current,
        [slot]: {
          ...current[slot],
          loading: true,
          error: null,
        },
      }));

      const [rosterResult, capResult] = await Promise.allSettled([
        getTeamRoster(teamId),
        getTeamCap(teamId),
      ]);

      if (cancelled) {
        return;
      }

      setTeamContexts((current) => ({
        ...current,
        [slot]: {
          roster:
            rosterResult.status === 'fulfilled' ? rosterResult.value : null,
          cap: capResult.status === 'fulfilled' ? capResult.value : null,
          loading: false,
          error:
            rosterResult.status === 'rejected' &&
            capResult.status === 'rejected'
              ? 'Live team context is unavailable right now.'
              : null,
        },
      }));
    }

    void loadContext('left', leftTeam.teamId);
    void loadContext('right', rightTeam.teamId);

    return () => {
      cancelled = true;
    };
  }, [leftTeam.teamId, rightTeam.teamId]);

  if (!leftSummary || !rightSummary) {
    return null;
  }

  const leftOutgoingPlayers = selectedPlayers(
    teamContexts.left.roster,
    leftTeam.outgoingPlayerIds,
  );
  const rightOutgoingPlayers = selectedPlayers(
    teamContexts.right.roster,
    rightTeam.outgoingPlayerIds,
  );
  const leftTeamResult =
    preview.status === 'ready'
      ? preview.response.validation.team_results.find(
          (teamResult) => teamResult.team_id === leftTeam.teamId,
        )
      : undefined;
  const rightTeamResult =
    preview.status === 'ready'
      ? preview.response.validation.team_results.find(
          (teamResult) => teamResult.team_id === rightTeam.teamId,
        )
      : undefined;
  const leftIncomingPlayers = leftTeamResult?.incoming_players ?? [];
  const rightIncomingPlayers = rightTeamResult?.incoming_players ?? [];
  const leftIncomingPickNotes =
    leftTeamResult?.incoming_pick_notes ?? rightTeam.outgoingPickNotes;
  const rightIncomingPickNotes =
    rightTeamResult?.incoming_pick_notes ?? leftTeam.outgoingPickNotes;

  async function runPreview() {
    if (!teamContexts.left.roster || !teamContexts.right.roster) {
      setPreview({ status: 'idle' });
      return;
    }

    if (!hasSelectedAssets) {
      setPreview({ status: 'idle' });
      return;
    }

    setPreview({ status: 'loading' });

    try {
      const response = await previewTradeProposal(buildBrowserTradeRequest());

      setPreview({ status: 'ready', response });
    } catch (error) {
      setPreview({
        status: 'error',
        message: formatApiErrorMessage(error),
      });
    }
  }

  function buildBrowserTradeRequest(): TradeValidationRequest {
    return {
      season: teamContexts.left.roster?.season,
      teams: [
        {
          team_id: leftTeam.teamId,
          outgoing_player_ids: leftTeam.outgoingPlayerIds,
          outgoing_pick_notes: leftTeam.outgoingPickNotes,
          sends_cash: leftTeam.sendsCash,
        },
        {
          team_id: rightTeam.teamId,
          outgoing_player_ids: rightTeam.outgoingPlayerIds,
          outgoing_pick_notes: rightTeam.outgoingPickNotes,
          sends_cash: rightTeam.sendsCash,
        },
      ],
    };
  }

  async function storeBrowserScenario() {
    if (!canStoreScenario) {
      setStoreStatus('error');
      setPersistenceMessage(
        'Load both team contexts and select assets before storing the scenario.',
      );
      return;
    }

    setStoreStatus('storing');
    setPersistenceMessage(null);

    try {
      const response = await createBrowserTradeScenario(
        buildBrowserTradeRequest(),
      );
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
      setPersistenceMessage(
        'Store a scenario first, then sign in to save it to the library.',
      );
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

  function invalidatePreview() {
    setPreview({ status: 'idle' });
    setStoredScenario(null);
    setStoreStatus('idle');
    setSaveStatus('idle');
    setPersistenceMessage(null);
  }

  function replaceTeam(slot: BuilderSlot, teamId: number) {
    startTransition(() => {
      const resetState: TeamBuilderState = {
        teamId,
        outgoingPlayerIds: [],
        outgoingPickNotes: [],
        sendsCash: false,
      };
      if (slot === 'left') {
        setLeftTeam(resetState);
      } else {
        setRightTeam(resetState);
      }
      invalidatePreview();
    });
  }

  function togglePlayer(slot: BuilderSlot, playerId: string) {
    const setState = slot === 'left' ? setLeftTeam : setRightTeam;
    setState((current) => ({
      ...current,
      outgoingPlayerIds: current.outgoingPlayerIds.includes(playerId)
        ? current.outgoingPlayerIds.filter(
            (existingId) => existingId !== playerId,
          )
        : [...current.outgoingPlayerIds, playerId],
    }));
    invalidatePreview();
  }

  function addPick(slot: BuilderSlot, label: string) {
    const setState = slot === 'left' ? setLeftTeam : setRightTeam;
    setState((current) => ({
      ...current,
      outgoingPickNotes: [
        ...current.outgoingPickNotes,
        nextPickLabel(label, current.outgoingPickNotes),
      ],
    }));
    invalidatePreview();
  }

  function removePick(slot: BuilderSlot, label: string) {
    const setState = slot === 'left' ? setLeftTeam : setRightTeam;
    setState((current) => ({
      ...current,
      outgoingPickNotes: current.outgoingPickNotes.filter(
        (pickNote) => pickNote !== label,
      ),
    }));
    invalidatePreview();
  }

  function toggleCash(slot: BuilderSlot) {
    const setState = slot === 'left' ? setLeftTeam : setRightTeam;
    setState((current) => ({
      ...current,
      sendsCash: !current.sendsCash,
    }));
    invalidatePreview();
  }

  function handleDrop(slot: BuilderSlot, payload: TradeDragPayload) {
    if (payload.kind === 'player') {
      togglePlayer(slot, payload.playerId);
      return;
    }
    addPick(slot, payload.label);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[2rem] border border-line/70 bg-surface px-6 py-8 shadow-panel xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Scenario workspace
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
            Trade machine
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            Build a package from live roster and cap data first. This screen is
            intentionally opinionated about legality before simulation so the
            later result layers inherit a trustworthy starting point.
          </p>
        </div>
        <div className="rounded-[1.8rem] border border-line/70 bg-bg px-5 py-5">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            What this tranche does
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Live team selection from the current dashboard feed</li>
            <li>Outgoing player and manual pick construction</li>
            <li>Real-time salary matching, apron, and roster validation</li>
            <li>
              Run preview to compute outcomes, cap deltas, and comparables
            </li>
          </ul>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr_1fr]">
        <TradeTeamBoard
          slotLabel="Team A"
          summary={leftSummary}
          roster={teamContexts.left.roster}
          cap={teamContexts.left.cap}
          loading={teamContexts.left.loading}
          error={teamContexts.left.error}
          outgoingPlayerIds={leftTeam.outgoingPlayerIds}
          outgoingPlayers={leftOutgoingPlayers}
          incomingPlayers={leftIncomingPlayers}
          outgoingPickNotes={leftTeam.outgoingPickNotes}
          incomingPickNotes={leftIncomingPickNotes}
          sendsCash={leftTeam.sendsCash}
          otherTeamName={rightSummary.full_name}
          disabledTeamIds={[rightSummary.team_id]}
          onTeamChange={(teamId) => replaceTeam('left', teamId)}
          onTogglePlayer={(playerId) => togglePlayer('left', playerId)}
          onToggleCash={() => toggleCash('left')}
          onAddPick={(label) => addPick('left', label)}
          onRemovePick={(label) => removePick('left', label)}
          onDropPayload={(payload) => handleDrop('left', payload)}
          teams={initialTeams}
        />

        <TradeResultsPanel
          preview={preview}
          canRunPreview={canRunPreview}
          onRunPreview={() => {
            void runPreview();
          }}
        />

        <TradeTeamBoard
          slotLabel="Team B"
          summary={rightSummary}
          roster={teamContexts.right.roster}
          cap={teamContexts.right.cap}
          loading={teamContexts.right.loading}
          error={teamContexts.right.error}
          outgoingPlayerIds={rightTeam.outgoingPlayerIds}
          outgoingPlayers={rightOutgoingPlayers}
          incomingPlayers={rightIncomingPlayers}
          outgoingPickNotes={rightTeam.outgoingPickNotes}
          incomingPickNotes={rightIncomingPickNotes}
          sendsCash={rightTeam.sendsCash}
          otherTeamName={leftSummary.full_name}
          disabledTeamIds={[leftSummary.team_id]}
          onTeamChange={(teamId) => replaceTeam('right', teamId)}
          onTogglePlayer={(playerId) => togglePlayer('right', playerId)}
          onToggleCash={() => toggleCash('right')}
          onAddPick={(label) => addPick('right', label)}
          onRemovePick={(label) => removePick('right', label)}
          onDropPayload={(payload) => handleDrop('right', payload)}
          teams={initialTeams}
        />
      </div>

      <ScenarioPersistencePanel
        scenarioLabel="trade"
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
