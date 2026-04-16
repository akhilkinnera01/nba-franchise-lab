import { render, screen } from '@testing-library/react';

import { CapSheetViewer } from '@/components/cap-sheet-viewer';

describe('CapSheetViewer', () => {
  it('renders the current cap metrics and projection seasons', () => {
    render(
      <CapSheetViewer
        current={{
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
          standard_contract_count: 14,
          expiring_player_ids: [],
          expiring_salary_cents: 0,
        }}
        projection={[
          {
            season: '2025-26',
            committed_salary_cents: 6_100_000_000,
            cap_hold_cents: 0,
            total_team_salary_cents: 6_100_000_000,
            salary_cap_cents: 15_000_000_000,
            luxury_tax_cents: 18_100_000_000,
            first_apron_cents: 18_700_000_000,
            second_apron_cents: 19_500_000_000,
            cap_room_cents: 8_900_000_000,
            tax_room_cents: 12_000_000_000,
            first_apron_room_cents: 12_600_000_000,
            second_apron_room_cents: 13_400_000_000,
            standard_contract_count: 12,
            expiring_player_ids: [],
            expiring_salary_cents: 0,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: /current salary pressure and projection runway/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('2024-25')).toBeInTheDocument();
    expect(screen.getByText('2025-26')).toBeInTheDocument();
  });
});
