import { render, screen } from '@testing-library/react';

import { RosterTable } from '@/components/roster-table';

describe('RosterTable', () => {
  it('renders live roster rows with salary and contract context', () => {
    render(
      <RosterTable
        players={[
          {
            player_id: 'player:1629027',
            display_name: 'Trae Young',
            position: 'G',
            jersey_number: '11',
            roster_status: 'Active',
            birth_date: '1998-09-19',
            minutes_per_game: 35.5,
            points_per_game: 26.4,
            rebounds_per_game: 2.8,
            assists_per_game: 10.8,
            steals_per_game: 1.3,
            blocks_per_game: 0.2,
            turnovers_per_game: 4.4,
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
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: /rotation, production, and contract context in one table/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Trae Young')).toBeInTheDocument();
    expect(screen.getByText('designated_veteran')).toBeInTheDocument();
  });
});
