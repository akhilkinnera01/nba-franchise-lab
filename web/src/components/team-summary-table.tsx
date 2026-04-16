import Link from 'next/link';

import type { TeamHealthSummary } from '@/lib/api/types';
import {
  formatCurrencyShort,
  formatSignedNumber,
  formatWinLoss,
} from '@/lib/formatters';

interface TeamSummaryTableProps {
  teams: readonly TeamHealthSummary[];
}

export function TeamSummaryTable({ teams }: TeamSummaryTableProps) {
  return (
    <section className="surface-table-shell">
      <div className="border-b border-line/70 px-6 py-5">
        <div className="surface-eyebrow">League ledger</div>
        <h2 className="mt-3 surface-subtitle">
          Franchise scan
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="surface-table-head">
            <tr>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-4 py-4 font-medium">Record</th>
              <th className="px-4 py-4 font-medium">Net</th>
              <th className="px-4 py-4 font-medium">Cap room</th>
              <th className="px-4 py-4 font-medium">1st apron</th>
              <th className="px-4 py-4 font-medium">2nd apron</th>
              <th className="px-4 py-4 font-medium">Contracts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              return (
                <tr key={team.team_id} className="surface-table-row">
                  <td className="px-6 py-4">
                    <Link
                      href={`/teams/${team.team_id}`}
                      className="block rounded-xl transition hover:text-accent-cool"
                    >
                      <div className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                        {team.abbreviation}
                      </div>
                      <div className="mt-2 text-base font-semibold text-text">
                        {team.full_name}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-text">
                    {formatWinLoss(team.wins, team.losses)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-text">
                    {formatSignedNumber(team.net_rating)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-text">
                    {formatCurrencyShort(team.cap_room_cents)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-text">
                    {formatCurrencyShort(team.first_apron_room_cents)}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-text">
                    {formatCurrencyShort(team.second_apron_room_cents)}
                  </td>
                  <td className="px-4 py-4 text-sm text-text">
                    {team.standard_contract_count}/{team.roster_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
