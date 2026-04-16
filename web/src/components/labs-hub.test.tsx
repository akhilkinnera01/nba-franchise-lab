import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LabsHub } from '@/components/labs-hub';
import type { TeamHealthSummary } from '@/lib/api/types';

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

describe('LabsHub', () => {
  it('renders the new Phase 5 lab suite and filters cards', async () => {
    const user = userEvent.setup();

    render(
      <LabsHub
        teams={[
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
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: /draft prospect lab/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /daily challenge/i }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Draft, rebuild, shock, compare...'),
      'shock',
    );

    expect(
      screen.getByRole('link', { name: /shock event simulator/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /draft prospect lab/i }),
    ).not.toBeInTheDocument();
  });
});
