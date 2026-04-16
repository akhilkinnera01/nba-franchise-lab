import {
  createBrowserFreeAgentScenario,
  createBrowserInjuryScenario,
  createBrowserLineupScenario,
  createBrowserTradeScenario,
} from '@/lib/api/client';
import type {
  FreeAgentPreviewRequest,
  InjuryPreviewRequest,
  LineupPreviewRequest,
  ScenarioEnvelope,
  TeamHealthSummary,
  TradeValidationRequest,
} from '@/lib/api/types';
import type {
  FreeAgentScenarioShareState,
  InjuryScenarioShareState,
  LineupScenarioShareState,
  ScenarioShareState,
  TradeScenarioShareState,
} from '@/lib/scenario-share';

function teamName(
  teams: readonly TeamHealthSummary[],
  teamId: number,
  fallback: string,
): string {
  return teams.find((team) => team.team_id === teamId)?.full_name ?? fallback;
}

function currentSeason(teams: readonly TeamHealthSummary[]): string {
  return teams[0]?.season ?? '2024-25';
}

export function buildScenarioTitle(
  state: ScenarioShareState,
  teams: readonly TeamHealthSummary[],
): string {
  switch (state.tool) {
    case 'trade':
      return `${teamName(teams, state.leftTeamId, 'Team A')} / ${teamName(
        teams,
        state.rightTeamId,
        'Team B',
      )} trade`;
    case 'free-agent':
      return `${state.playerName.trim() || 'Free agent'} for ${teamName(
        teams,
        state.teamId,
        'Selected team',
      )}`;
    case 'injury':
      return `Injury shock for ${teamName(
        teams,
        state.teamId,
        'Selected team',
      )}`;
    case 'lineup':
      return `${state.changeLabel.trim() || 'Lineup change'} for ${teamName(
        teams,
        state.teamId,
        'Selected team',
      )}`;
  }
}

export function buildScenarioNotes(
  state: ScenarioShareState,
  teams: readonly TeamHealthSummary[],
): string {
  switch (state.tool) {
    case 'trade':
      return `Browser-built trade scenario stored from the ${teamName(
        teams,
        state.leftTeamId,
        'NBA Franchise Lab',
      )} control room.`;
    case 'free-agent':
    case 'injury':
    case 'lineup':
      return `Browser-built ${state.tool} scenario stored from the ${teamName(
        teams,
        state.teamId,
        'NBA Franchise Lab',
      )} control room.`;
  }
}

function buildTradeRequest(
  state: TradeScenarioShareState,
  teams: readonly TeamHealthSummary[],
): TradeValidationRequest {
  return {
    season: currentSeason(teams),
    teams: [
      {
        team_id: state.leftTeamId,
        outgoing_player_ids: state.leftOutgoingPlayerIds,
        outgoing_pick_notes: state.leftOutgoingPickNotes,
        sends_cash: state.leftSendsCash,
      },
      {
        team_id: state.rightTeamId,
        outgoing_player_ids: state.rightOutgoingPlayerIds,
        outgoing_pick_notes: state.rightOutgoingPickNotes,
        sends_cash: state.rightSendsCash,
      },
    ],
  };
}

function buildFreeAgentRequest(
  state: FreeAgentScenarioShareState,
  teams: readonly TeamHealthSummary[],
): FreeAgentPreviewRequest {
  return {
    season: currentSeason(teams),
    team_id: state.teamId,
    player_name: state.playerName,
    projected_box_plus_minus: state.projectedBoxPlusMinus,
    projected_minutes_share: state.projectedMinutesShare,
    annual_salary_cents: state.annualSalaryCents,
    contract_years: state.contractYears,
    annual_raise_rate: state.annualRaiseRate,
    exception_code: state.exceptionCode,
  };
}

function buildInjuryRequest(
  state: InjuryScenarioShareState,
  teams: readonly TeamHealthSummary[],
): InjuryPreviewRequest {
  return {
    season: currentSeason(teams),
    team_id: state.teamId,
    player_id: state.playerId,
    projected_games_missed: state.projectedGamesMissed,
  };
}

function buildLineupRequest(
  state: LineupScenarioShareState,
  teams: readonly TeamHealthSummary[],
): LineupPreviewRequest {
  return {
    season: currentSeason(teams),
    team_id: state.teamId,
    change_label: state.changeLabel,
    net_rating_adjustment: state.netRatingAdjustment,
  };
}

export async function createBrowserScenarioFromState(
  state: ScenarioShareState,
  teams: readonly TeamHealthSummary[],
): Promise<ScenarioEnvelope> {
  switch (state.tool) {
    case 'trade':
      return createBrowserTradeScenario(buildTradeRequest(state, teams));
    case 'free-agent':
      return createBrowserFreeAgentScenario(buildFreeAgentRequest(state, teams));
    case 'injury':
      return createBrowserInjuryScenario(buildInjuryRequest(state, teams));
    case 'lineup':
      return createBrowserLineupScenario(buildLineupRequest(state, teams));
  }
}
