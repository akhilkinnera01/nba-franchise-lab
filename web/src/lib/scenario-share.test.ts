import { describe, expect, it } from 'vitest';

import {
  decodeScenarioShareState,
  encodeScenarioShareState,
  normalizeScenarioTool,
  primaryTeamIdForScenarioState,
} from '@/lib/scenario-share';

describe('scenario-share', () => {
  it('round-trips a trade scenario state payload', () => {
    const encoded = encodeScenarioShareState({
      tool: 'trade',
      leftTeamId: 1610612737,
      rightTeamId: 1610612738,
      leftOutgoingPlayerIds: ['player:1629027'],
      rightOutgoingPlayerIds: ['player:1628369'],
      leftOutgoingPickNotes: ['Manual 1st-round pick'],
      rightOutgoingPickNotes: [],
      leftSendsCash: false,
      rightSendsCash: true,
    });

    expect(decodeScenarioShareState(encoded)).toEqual({
      tool: 'trade',
      leftTeamId: 1610612737,
      rightTeamId: 1610612738,
      leftOutgoingPlayerIds: ['player:1629027'],
      rightOutgoingPlayerIds: ['player:1628369'],
      leftOutgoingPickNotes: ['Manual 1st-round pick'],
      rightOutgoingPickNotes: [],
      leftSendsCash: false,
      rightSendsCash: true,
    });
  });

  it('returns the primary team id for single-team scenario states', () => {
    expect(
      primaryTeamIdForScenarioState({
        tool: 'free-agent',
        teamId: 1610612744,
        playerName: 'Example Wing',
        projectedBoxPlusMinus: 1.5,
        projectedMinutesShare: 0.25,
        annualSalaryCents: 1_200_000_000,
        contractYears: 2,
        annualRaiseRate: 0.05,
        exceptionCode: 'non_taxpayer_mid_level',
      }),
    ).toBe(1610612744);
  });

  it('falls back to trade when the requested tool is unknown', () => {
    expect(normalizeScenarioTool('unknown-tool')).toBe('trade');
  });
});
