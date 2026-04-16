import { render, screen } from '@testing-library/react';

import { FranchiseHeatMap } from '@/components/franchise-heat-map';
import type { TeamHealthSummary, TeamListMeta } from '@/lib/api/types';

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
    roster_count: 15,
    standard_contract_count: 14,
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
    wins: 57,
    losses: 25,
    net_rating: 6.8,
    offensive_rating: 119.2,
    defensive_rating: 112.4,
    pace: 99.2,
    roster_count: 15,
    standard_contract_count: 14,
    committed_salary_cents: 18_100_000_000,
    cap_room_cents: -4_000_000_000,
    tax_room_cents: -1_200_000_000,
    first_apron_room_cents: -500_000_000,
    second_apron_room_cents: 700_000_000,
  },
];

const sampleMeta: TeamListMeta = {
  as_of: '2026-04-14T12:15:00Z',
  source_status: 'complete',
  missing_fields: [],
};

describe('FranchiseHeatMap', () => {
  it('renders live franchise tiles without inventing a single summary score', () => {
    render(
      <FranchiseHeatMap
        teams={sampleTeams}
        season="2024-25"
        meta={sampleMeta}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: /which teams have room to move right now/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /atlanta hawks/i }),
    ).toHaveAttribute('href', '/teams/1610612737');
    expect(screen.getByText('Stable upside')).toBeInTheDocument();
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText(/complete · apr/i)).toBeInTheDocument();
  });

  it('renders a resilient empty state when live data is unavailable', () => {
    render(<FranchiseHeatMap teams={[]} season="2024-25" />);

    expect(
      screen.getByText(/live team data is not available yet/i),
    ).toBeInTheDocument();
  });

  it('surfaces missing franchise-context fields when metadata is partial', () => {
    render(
      <FranchiseHeatMap
        teams={sampleTeams}
        season="2024-25"
        meta={{
          as_of: '2026-04-14T12:15:00Z',
          source_status: 'partial',
          missing_fields: ['conference', 'team_count'],
        }}
      />,
    );

    expect(screen.getByText(/missing: conference, team_count/i)).toBeInTheDocument();
  });
});
