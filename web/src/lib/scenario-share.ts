export type ScenarioTool = 'trade' | 'free-agent' | 'injury' | 'lineup';

export interface TradeScenarioShareState {
  tool: 'trade';
  leftTeamId: number;
  rightTeamId: number;
  leftOutgoingPlayerIds: string[];
  rightOutgoingPlayerIds: string[];
  leftOutgoingPickNotes: string[];
  rightOutgoingPickNotes: string[];
  leftSendsCash: boolean;
  rightSendsCash: boolean;
}

export interface FreeAgentScenarioShareState {
  tool: 'free-agent';
  teamId: number;
  playerName: string;
  projectedBoxPlusMinus: number;
  projectedMinutesShare: number;
  annualSalaryCents: number;
  contractYears: number;
  annualRaiseRate: number;
  exceptionCode:
    | 'room_mid_level'
    | 'non_taxpayer_mid_level'
    | 'taxpayer_mid_level'
    | 'bi_annual_exception'
    | 'veteran_minimum';
}

export interface InjuryScenarioShareState {
  tool: 'injury';
  teamId: number;
  playerId: string;
  projectedGamesMissed: number;
}

export interface LineupScenarioShareState {
  tool: 'lineup';
  teamId: number;
  changeLabel: string;
  netRatingAdjustment: number;
}

export type ScenarioShareState =
  | TradeScenarioShareState
  | FreeAgentScenarioShareState
  | InjuryScenarioShareState
  | LineupScenarioShareState;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function encodeBase64Url(value: string): string {
  const encoded =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa(value)
      : Buffer.from(value, 'utf8').toString('base64');

  return encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    return typeof globalThis.atob === 'function'
      ? globalThis.atob(normalized)
      : Buffer.from(normalized, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function isScenarioTool(value: unknown): value is ScenarioTool {
  return (
    value === 'trade' ||
    value === 'free-agent' ||
    value === 'injury' ||
    value === 'lineup'
  );
}

function parseTradeState(value: Record<string, unknown>): TradeScenarioShareState | null {
  if (
    typeof value.leftTeamId !== 'number' ||
    typeof value.rightTeamId !== 'number' ||
    !Array.isArray(value.leftOutgoingPlayerIds) ||
    !Array.isArray(value.rightOutgoingPlayerIds) ||
    !Array.isArray(value.leftOutgoingPickNotes) ||
    !Array.isArray(value.rightOutgoingPickNotes) ||
    typeof value.leftSendsCash !== 'boolean' ||
    typeof value.rightSendsCash !== 'boolean'
  ) {
    return null;
  }

  return {
    tool: 'trade',
    leftTeamId: value.leftTeamId,
    rightTeamId: value.rightTeamId,
    leftOutgoingPlayerIds: value.leftOutgoingPlayerIds.filter(
      (item): item is string => typeof item === 'string',
    ),
    rightOutgoingPlayerIds: value.rightOutgoingPlayerIds.filter(
      (item): item is string => typeof item === 'string',
    ),
    leftOutgoingPickNotes: value.leftOutgoingPickNotes.filter(
      (item): item is string => typeof item === 'string',
    ),
    rightOutgoingPickNotes: value.rightOutgoingPickNotes.filter(
      (item): item is string => typeof item === 'string',
    ),
    leftSendsCash: value.leftSendsCash,
    rightSendsCash: value.rightSendsCash,
  };
}

function parseFreeAgentState(
  value: Record<string, unknown>,
): FreeAgentScenarioShareState | null {
  if (
    typeof value.teamId !== 'number' ||
    typeof value.playerName !== 'string' ||
    typeof value.projectedBoxPlusMinus !== 'number' ||
    typeof value.projectedMinutesShare !== 'number' ||
    typeof value.annualSalaryCents !== 'number' ||
    typeof value.contractYears !== 'number' ||
    typeof value.annualRaiseRate !== 'number' ||
    typeof value.exceptionCode !== 'string'
  ) {
    return null;
  }

  return {
    tool: 'free-agent',
    teamId: value.teamId,
    playerName: value.playerName,
    projectedBoxPlusMinus: value.projectedBoxPlusMinus,
    projectedMinutesShare: value.projectedMinutesShare,
    annualSalaryCents: value.annualSalaryCents,
    contractYears: value.contractYears,
    annualRaiseRate: value.annualRaiseRate,
    exceptionCode:
      value.exceptionCode as FreeAgentScenarioShareState['exceptionCode'],
  };
}

function parseInjuryState(
  value: Record<string, unknown>,
): InjuryScenarioShareState | null {
  if (
    typeof value.teamId !== 'number' ||
    typeof value.playerId !== 'string' ||
    typeof value.projectedGamesMissed !== 'number'
  ) {
    return null;
  }

  return {
    tool: 'injury',
    teamId: value.teamId,
    playerId: value.playerId,
    projectedGamesMissed: value.projectedGamesMissed,
  };
}

function parseLineupState(
  value: Record<string, unknown>,
): LineupScenarioShareState | null {
  if (
    typeof value.teamId !== 'number' ||
    typeof value.changeLabel !== 'string' ||
    typeof value.netRatingAdjustment !== 'number'
  ) {
    return null;
  }

  return {
    tool: 'lineup',
    teamId: value.teamId,
    changeLabel: value.changeLabel,
    netRatingAdjustment: value.netRatingAdjustment,
  };
}

export function normalizeScenarioTool(
  value: string | string[] | undefined,
): ScenarioTool {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isScenarioTool(candidate) ? candidate : 'trade';
}

export function encodeScenarioShareState(state: ScenarioShareState): string {
  return encodeBase64Url(JSON.stringify(state));
}

export function decodeScenarioShareState(
  value: string | string[] | undefined,
): ScenarioShareState | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) {
    return null;
  }

  const decoded = decodeBase64Url(candidate);
  if (!decoded) {
    return null;
  }

  try {
    const payload = JSON.parse(decoded) as unknown;
    if (!isRecord(payload) || !isScenarioTool(payload.tool)) {
      return null;
    }

    switch (payload.tool) {
      case 'trade':
        return parseTradeState(payload);
      case 'free-agent':
        return parseFreeAgentState(payload);
      case 'injury':
        return parseInjuryState(payload);
      case 'lineup':
        return parseLineupState(payload);
    }
  } catch {
    return null;
  }
}

export function primaryTeamIdForScenarioState(
  state: ScenarioShareState,
): number {
  switch (state.tool) {
    case 'trade':
      return state.leftTeamId;
    case 'free-agent':
    case 'injury':
    case 'lineup':
      return state.teamId;
  }
}
