import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TradeResultsPanel,
  type TradePreviewState,
} from '@/components/trade-validation-panel';

const readyPreview: TradePreviewState = {
  status: 'ready',
  response: {
    season: '2024-25',
    simulation_scope_note:
      'Preview results use current-season team net ratings plus weighted on/off player impact over a deterministic balanced league schedule.',
    validation: {
      season: '2024-25',
      valid: true,
      validation_scope_note:
        'Salary matching, roster limits, and active apron restrictions are validated here.',
      violations: [],
      team_results: [],
    },
    team_results: [
      {
        team_id: 1610612737,
        team_name: 'Atlanta Hawks',
        baseline: {
          expected_wins: 44,
          win_standard_deviation: 4,
          playoff_probability: 0.72,
          championship_probability: 0.08,
          average_seed: 4.5,
          seed_probabilities: { 4: 0.6, 5: 0.4 },
          current_cap_room_cents: 8_258_800_000,
          current_tax_room_cents: 11_281_400_000,
          cap_room_cents_by_season: {},
          tax_room_cents_by_season: {},
        },
        scenario: {
          expected_wins: 48,
          win_standard_deviation: 4.1,
          playoff_probability: 0.86,
          championship_probability: 0.13,
          average_seed: 3.2,
          seed_probabilities: { 3: 0.6, 4: 0.4 },
          current_cap_room_cents: 7_758_800_000,
          current_tax_room_cents: 10_781_400_000,
          cap_room_cents_by_season: {},
          tax_room_cents_by_season: {},
        },
        delta: {
          trade_valid: true,
          wins_delta: 4,
          playoff_probability_delta: 0.14,
          championship_probability_delta: 0.05,
          net_rating_delta: 1.5,
          current_cap_room_delta_cents: -500_000_000,
          current_tax_room_delta_cents: -500_000_000,
          cap_room_delta_cents_by_season: {},
          tax_room_delta_cents_by_season: {},
        },
      },
      {
        team_id: 1610612738,
        team_name: 'Boston Celtics',
        baseline: {
          expected_wins: 60,
          win_standard_deviation: 4.2,
          playoff_probability: 0.91,
          championship_probability: 0.21,
          average_seed: 2,
          seed_probabilities: { 1: 0.2, 2: 0.8 },
          current_cap_room_cents: 9_258_800_000,
          current_tax_room_cents: 12_281_400_000,
          cap_room_cents_by_season: {},
          tax_room_cents_by_season: {},
        },
        scenario: {
          expected_wins: 56,
          win_standard_deviation: 4.5,
          playoff_probability: 0.82,
          championship_probability: 0.16,
          average_seed: 3,
          seed_probabilities: { 2: 0.2, 3: 0.8 },
          current_cap_room_cents: 9_258_800_000,
          current_tax_room_cents: 12_281_400_000,
          cap_room_cents_by_season: {},
          tax_room_cents_by_season: {},
        },
        delta: {
          trade_valid: false,
          wins_delta: -4,
          playoff_probability_delta: -0.09,
          championship_probability_delta: -0.05,
          net_rating_delta: -0.9,
          current_cap_room_delta_cents: 0,
          current_tax_room_delta_cents: 0,
          cap_room_delta_cents_by_season: {},
          tax_room_delta_cents_by_season: {},
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
  },
};

describe('TradeResultsPanel', () => {
  it('renders the summary cards and comparable highlight for a ready preview', () => {
    render(
      <TradeResultsPanel
        preview={readyPreview}
        canRunPreview
        onRunPreview={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /outcome workspace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh preview/i }),
    ).toBeEnabled();
    expect(screen.getAllByText('48.0 wins')).toHaveLength(2);
    expect(screen.getAllByText('+4.0').length).toBeGreaterThan(0);
    expect(screen.getByText('Closest comparable')).toBeInTheDocument();
    expect(screen.getAllByText('Atlanta Hawks').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        'Atlanta sends a star guard for cap relief and a wing return.',
      ),
    ).toHaveLength(2);
  });
});
