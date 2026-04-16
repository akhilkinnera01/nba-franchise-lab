import { describe, expect, it } from 'vitest';

import type { TeamHealthSummary } from '@/lib/api/types';
import {
  buildDailyChallengeLab,
  buildDraftProspectLab,
  buildLeagueSnapshot,
  buildPhase5LabCards,
} from '@/lib/phase5-labs';

function makeTeam(
  overrides: Partial<TeamHealthSummary> = {},
): TeamHealthSummary {
  return {
    team_id: 1610612738,
    abbreviation: 'BOS',
    full_name: 'Boston Celtics',
    conference: 'East',
    division: 'Atlantic',
    season: '2024-25',
    wins: 60,
    losses: 22,
    net_rating: 8.4,
    offensive_rating: 118.1,
    defensive_rating: 109.7,
    pace: 98.9,
    roster_count: 15,
    standard_contract_count: 14,
    committed_salary_cents: 2_220_000_000,
    cap_room_cents: 210_000_000,
    tax_room_cents: 110_000_000,
    first_apron_room_cents: 75_000_000,
    second_apron_room_cents: 175_000_000,
    ...overrides,
  };
}

describe('phase 5 lab helpers', () => {
  it('builds a six-surface lab index from live team context', () => {
    const snapshot = buildLeagueSnapshot([
      makeTeam(),
      makeTeam({
        team_id: 1610612739,
        abbreviation: 'CLE',
        full_name: 'Cleveland Cavaliers',
        wins: 52,
        losses: 30,
        net_rating: 4.2,
        cap_room_cents: 410_000_000,
        first_apron_room_cents: 55_000_000,
        second_apron_room_cents: 150_000_000,
      }),
    ]);

    const cards = buildPhase5LabCards([
      makeTeam(),
      makeTeam({
        team_id: 1610612739,
        abbreviation: 'CLE',
        full_name: 'Cleveland Cavaliers',
        wins: 52,
        losses: 30,
        net_rating: 4.2,
        cap_room_cents: 410_000_000,
        first_apron_room_cents: 55_000_000,
        second_apron_room_cents: 150_000_000,
      }),
    ]);

    expect(snapshot.totalTeams).toBe(2);
    expect(snapshot.strongestTeam?.full_name).toBe('Boston Celtics');
    expect(cards).toHaveLength(6);
    expect(cards[0]?.href).toBe('/labs/draft-prospect');
    expect(cards[5]?.label).toBe('Daily Challenge');
  });

  it('filters draft archetypes by search term', () => {
    const board = buildDraftProspectLab(
      makeTeam(),
      'Balanced',
      'defensive connector',
    );

    expect(board.teamName).toBe('Boston Celtics');
    expect(board.prospects).toHaveLength(1);
    expect(board.prospects[0]?.label).toBe('Two-way wing');
  });

  it('generates a stable daily challenge from the current date and league context', () => {
    const challenge = buildDailyChallengeLab(
      [
        makeTeam(),
        makeTeam({
          team_id: 1610612737,
          abbreviation: 'ATL',
          full_name: 'Atlanta Hawks',
          wins: 41,
          losses: 41,
          net_rating: 0.8,
          cap_room_cents: 510_000_000,
          first_apron_room_cents: 95_000_000,
          second_apron_room_cents: 195_000_000,
        }),
      ],
      '2026-04-14',
    );

    expect(challenge.challengeId).toContain('2026-04-14');
    expect(challenge.prompt).toContain('cap logic');
    expect(challenge.quickFacts).toContain('Week index: 16');
  });
});
