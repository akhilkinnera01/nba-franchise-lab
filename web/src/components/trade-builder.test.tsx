import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TradeBuilder } from '@/components/trade-builder';
import { useAuth } from '@/components/auth-provider';
import type {
  TeamCapResponse,
  TeamHealthSummary,
  TeamRosterResponse,
} from '@/lib/api/types';

const apiClient = vi.hoisted(() => ({
  getTeamCap: vi.fn(),
  getTeamRoster: vi.fn(),
  previewTradeProposal: vi.fn(),
}));

vi.mock('@/lib/api/client', () => apiClient);
vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

const sampleTeams: TeamHealthSummary[] = [
  {
    team_id: 1610612737,
    abbreviation: 'ATL',
    full_name: 'Atlanta Hawks',
    conference: 'East',
    division: 'Southeast',
    season: '2024-25',
    wins: 41,
    losses: 41,
    net_rating: 1.5,
    offensive_rating: 116.2,
    defensive_rating: 114.7,
    pace: 100.1,
    roster_count: 2,
    standard_contract_count: 2,
    committed_salary_cents: 5_800_000_000,
    cap_room_cents: 8_258_800_000,
    tax_room_cents: 11_281_400_000,
    first_apron_room_cents: 12_013_200_000,
    second_apron_room_cents: 13_093_100_000,
  },
  {
    team_id: 1610612738,
    abbreviation: 'BOS',
    full_name: 'Boston Celtics',
    conference: 'East',
    division: 'Atlantic',
    season: '2024-25',
    wins: 60,
    losses: 22,
    net_rating: 8.9,
    offensive_rating: 121.4,
    defensive_rating: 112.5,
    pace: 98.5,
    roster_count: 1,
    standard_contract_count: 1,
    committed_salary_cents: 4_800_000_000,
    cap_room_cents: 9_258_800_000,
    tax_room_cents: 12_281_400_000,
    first_apron_room_cents: 13_013_200_000,
    second_apron_room_cents: 14_093_100_000,
  },
];

const atlRoster: TeamRosterResponse = {
  team: {
    team_id: 1610612737,
    abbreviation: 'ATL',
    full_name: 'Atlanta Hawks',
    conference: 'East',
    division: 'Southeast',
  },
  season: '2024-25',
  roster_count: 2,
  players: [
    {
      player_id: 'player:1629027',
      display_name: 'Trae Young',
      position: 'PG',
      jersey_number: '11',
      roster_status: 'Active',
      birth_date: '1998-09-19',
      minutes_per_game: 36,
      points_per_game: 28,
      rebounds_per_game: 3,
      assists_per_game: 10.8,
      steals_per_game: 1.3,
      blocks_per_game: 0.2,
      turnovers_per_game: 4.1,
      contract: {
        current_salary_cents: 4_300_000_000,
        contract_type: 'designated_veteran',
        contract_start_year: 2022,
        contract_end_year: 2026,
        annual_salary_cents: {
          '2024-25': 4_300_000_000,
        },
      },
    },
    {
      player_id: 'player:1630552',
      display_name: 'Jalen Johnson',
      position: 'F',
      jersey_number: '1',
      roster_status: 'Active',
      birth_date: '2001-12-18',
      minutes_per_game: 31.4,
      points_per_game: 16.8,
      rebounds_per_game: 8.7,
      assists_per_game: 3.6,
      steals_per_game: 1.1,
      blocks_per_game: 0.8,
      turnovers_per_game: 1.9,
      contract: {
        current_salary_cents: 1_500_000_000,
        contract_type: 'rookie_scale_extension',
        contract_start_year: 2024,
        contract_end_year: 2027,
        annual_salary_cents: {
          '2024-25': 1_500_000_000,
        },
      },
    },
  ],
};

const bosRoster: TeamRosterResponse = {
  team: {
    team_id: 1610612738,
    abbreviation: 'BOS',
    full_name: 'Boston Celtics',
    conference: 'East',
    division: 'Atlantic',
  },
  season: '2024-25',
  roster_count: 1,
  players: [
    {
      player_id: 'player:1628369',
      display_name: 'Jayson Tatum',
      position: 'F',
      jersey_number: '0',
      roster_status: 'Active',
      birth_date: '1998-03-03',
      minutes_per_game: 35.2,
      points_per_game: 27.1,
      rebounds_per_game: 8.4,
      assists_per_game: 4.9,
      steals_per_game: 1,
      blocks_per_game: 0.7,
      turnovers_per_game: 2.8,
      contract: {
        current_salary_cents: 4_800_000_000,
        contract_type: 'designated_veteran',
        contract_start_year: 2021,
        contract_end_year: 2026,
        annual_salary_cents: {
          '2024-25': 4_800_000_000,
        },
      },
    },
  ],
};

const atlCap: TeamCapResponse = {
  team: atlRoster.team,
  season: '2024-25',
  current: {
    season: '2024-25',
    committed_salary_cents: 5_800_000_000,
    cap_hold_cents: 0,
    total_team_salary_cents: 5_800_000_000,
    salary_cap_cents: 14_058_800_000,
    luxury_tax_cents: 17_081_400_000,
    first_apron_cents: 17_813_200_000,
    second_apron_cents: 18_893_100_000,
    cap_room_cents: 8_258_800_000,
    tax_room_cents: 11_281_400_000,
    first_apron_room_cents: 12_013_200_000,
    second_apron_room_cents: 13_093_100_000,
    standard_contract_count: 2,
    expiring_player_ids: [],
    expiring_salary_cents: 0,
  },
  projection: [],
};

const bosCap: TeamCapResponse = {
  team: bosRoster.team,
  season: '2024-25',
  current: {
    season: '2024-25',
    committed_salary_cents: 4_800_000_000,
    cap_hold_cents: 0,
    total_team_salary_cents: 4_800_000_000,
    salary_cap_cents: 14_058_800_000,
    luxury_tax_cents: 17_081_400_000,
    first_apron_cents: 17_813_200_000,
    second_apron_cents: 18_893_100_000,
    cap_room_cents: 9_258_800_000,
    tax_room_cents: 12_281_400_000,
    first_apron_room_cents: 13_013_200_000,
    second_apron_room_cents: 14_093_100_000,
    standard_contract_count: 1,
    expiring_player_ids: [],
    expiring_salary_cents: 0,
  },
  projection: [],
};

describe('TradeBuilder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-out',
      session: null,
      user: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      accessToken: null,
      error: null,
      isConfigured: false,
      signInWithEmail: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it('loads live team context and renders preview results for selected packages', async () => {
    const user = userEvent.setup();
    apiClient.getTeamRoster.mockImplementation(async (teamId: number) =>
      teamId === 1610612737 ? atlRoster : bosRoster,
    );
    apiClient.getTeamCap.mockImplementation(async (teamId: number) =>
      teamId === 1610612737 ? atlCap : bosCap,
    );
    apiClient.previewTradeProposal.mockResolvedValue({
      season: '2024-25',
      simulation_scope_note:
        'Preview results use current-season team net ratings plus weighted on/off player impact over a deterministic balanced league schedule.',
      validation: {
        season: '2024-25',
        valid: false,
        validation_scope_note:
          'Salary matching, roster limits, and active apron restrictions are validated here.',
        violations: ['Boston must send matching salary.'],
        team_results: [
          {
            team_id: 1610612737,
            team_name: 'Atlanta Hawks',
            apron_status: 'below_first_apron',
            outgoing_salary_cents: 4_300_000_000,
            incoming_salary_cents: 4_800_000_000,
            maximum_incoming_salary_cents: 5_475_000_000,
            post_trade_standard_contract_count: 2,
            valid: true,
            matched_rule_description: '125% plus $250,000',
            violations: [],
            outgoing_players: [
              {
                player_id: 'player:1629027',
                player_name: 'Trae Young',
                salary_cents: 4_300_000_000,
              },
            ],
            incoming_players: [],
            outgoing_pick_notes: [],
            incoming_pick_notes: [],
          },
          {
            team_id: 1610612738,
            team_name: 'Boston Celtics',
            apron_status: 'below_first_apron',
            outgoing_salary_cents: 0,
            incoming_salary_cents: 4_300_000_000,
            maximum_incoming_salary_cents: 250_000,
            post_trade_standard_contract_count: 2,
            valid: false,
            matched_rule_description: '125% plus $250,000',
            violations: ['Boston must send matching salary.'],
            outgoing_players: [],
            incoming_players: [
              {
                player_id: 'player:1629027',
                player_name: 'Trae Young',
                salary_cents: 4_300_000_000,
              },
            ],
            outgoing_pick_notes: [],
            incoming_pick_notes: [],
          },
        ],
      },
      team_results: [
        {
          team_id: 1610612737,
          team_name: 'Atlanta Hawks',
          baseline: {
            expected_wins: 44.0,
            win_standard_deviation: 4.0,
            playoff_probability: 0.72,
            championship_probability: 0.08,
            average_seed: 4.5,
            seed_probabilities: { 4: 0.6, 5: 0.4 },
            current_cap_room_cents: 8_258_800_000,
            current_tax_room_cents: 11_281_400_000,
            cap_room_cents_by_season: {
              '2024-25': 8_258_800_000,
              '2025-26': 7_100_000_000,
            },
            tax_room_cents_by_season: {
              '2024-25': 11_281_400_000,
              '2025-26': 10_700_000_000,
            },
          },
          scenario: {
            expected_wins: 48.0,
            win_standard_deviation: 4.1,
            playoff_probability: 0.86,
            championship_probability: 0.13,
            average_seed: 3.2,
            seed_probabilities: { 3: 0.6, 4: 0.4 },
            current_cap_room_cents: 7_758_800_000,
            current_tax_room_cents: 10_781_400_000,
            cap_room_cents_by_season: {
              '2024-25': 7_758_800_000,
              '2025-26': 6_600_000_000,
            },
            tax_room_cents_by_season: {
              '2024-25': 10_781_400_000,
              '2025-26': 10_200_000_000,
            },
          },
          delta: {
            trade_valid: true,
            wins_delta: 4.0,
            playoff_probability_delta: 0.14,
            championship_probability_delta: 0.05,
            net_rating_delta: 1.5,
            current_cap_room_delta_cents: -500_000_000,
            current_tax_room_delta_cents: -500_000_000,
            cap_room_delta_cents_by_season: {
              '2024-25': -500_000_000,
              '2025-26': -500_000_000,
            },
            tax_room_delta_cents_by_season: {
              '2024-25': -500_000_000,
              '2025-26': -500_000_000,
            },
          },
        },
        {
          team_id: 1610612738,
          team_name: 'Boston Celtics',
          baseline: {
            expected_wins: 60.0,
            win_standard_deviation: 4.2,
            playoff_probability: 0.91,
            championship_probability: 0.21,
            average_seed: 2.0,
            seed_probabilities: { 1: 0.2, 2: 0.8 },
            current_cap_room_cents: 9_258_800_000,
            current_tax_room_cents: 12_281_400_000,
            cap_room_cents_by_season: {
              '2024-25': 9_258_800_000,
              '2025-26': 8_700_000_000,
            },
            tax_room_cents_by_season: {
              '2024-25': 12_281_400_000,
              '2025-26': 11_700_000_000,
            },
          },
          scenario: {
            expected_wins: 56.0,
            win_standard_deviation: 4.5,
            playoff_probability: 0.82,
            championship_probability: 0.16,
            average_seed: 3.0,
            seed_probabilities: { 2: 0.2, 3: 0.8 },
            current_cap_room_cents: 9_258_800_000,
            current_tax_room_cents: 12_281_400_000,
            cap_room_cents_by_season: {
              '2024-25': 9_258_800_000,
              '2025-26': 8_700_000_000,
            },
            tax_room_cents_by_season: {
              '2024-25': 12_281_400_000,
              '2025-26': 11_700_000_000,
            },
          },
          delta: {
            trade_valid: false,
            wins_delta: -4.0,
            playoff_probability_delta: -0.09,
            championship_probability_delta: -0.05,
            net_rating_delta: -0.9,
            current_cap_room_delta_cents: 0,
            current_tax_room_delta_cents: 0,
            cap_room_delta_cents_by_season: {
              '2024-25': 0,
              '2025-26': 0,
            },
            tax_room_delta_cents_by_season: {
              '2024-25': 0,
              '2025-26': 0,
            },
          },
        },
      ],
      comparable_trades: [
        {
          trade_id: 'txn_123',
          description:
            'Atlanta sends a star guard for cap relief and a wing return.',
          season: '2024-25',
          similarity_score: 0.84,
        },
      ],
    });

    render(<TradeBuilder initialTeams={sampleTeams} />);

    expect(
      await screen.findByRole('heading', { name: /trade machine/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Trae Young')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send trae young/i }));

    expect(
      await screen.findByRole('button', { name: /run trade preview/i }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole('button', { name: /run trade preview/i }),
    );

    await waitFor(() => {
      expect(apiClient.previewTradeProposal).toHaveBeenCalledWith({
        season: '2024-25',
        teams: [
          {
            team_id: 1610612737,
            outgoing_player_ids: ['player:1629027'],
            outgoing_pick_notes: [],
            sends_cash: false,
          },
          {
            team_id: 1610612738,
            outgoing_player_ids: [],
            outgoing_pick_notes: [],
            sends_cash: false,
          },
        ],
      });
    });

    expect(await screen.findByText(/outcome workspace/i)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /trade needs more work before it clears the rules/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Atlanta sends a star guard for cap relief and a wing return.',
      ),
    ).toHaveLength(2);
  });
});
