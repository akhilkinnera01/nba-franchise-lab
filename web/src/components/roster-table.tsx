import type { TeamRosterPlayer } from '@/lib/api/types';
import { formatCurrencyShort } from '@/lib/formatters';

interface RosterTableProps {
  players: readonly TeamRosterPlayer[];
}

function formatContractWindow(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
): string {
  if (!startYear || !endYear) {
    return 'Unavailable';
  }

  return `${startYear}-${String(endYear).slice(-2)}`;
}

export function RosterTable({ players }: RosterTableProps) {
  return (
    <section className="surface-table-shell">
      <div className="border-b border-line/70 px-6 py-5">
        <div className="surface-eyebrow">Roster viewer</div>
        <h2 className="mt-3 surface-subtitle">
          Rotation, production, and contract context in one table
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="surface-table-head">
            <tr>
              <th className="px-4 py-4 font-medium">Player</th>
              <th className="px-4 py-4 font-medium">Pos</th>
              <th className="px-4 py-4 font-medium">MPG</th>
              <th className="px-4 py-4 font-medium">PTS</th>
              <th className="px-4 py-4 font-medium">REB</th>
              <th className="px-4 py-4 font-medium">AST</th>
              <th className="px-4 py-4 font-medium">Salary</th>
              <th className="px-4 py-4 font-medium">Type</th>
              <th className="px-4 py-4 font-medium">Window</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.player_id} className="surface-table-row">
                <td className="px-4 py-4">
                  <div className="font-semibold">{player.display_name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.24em] text-muted">
                    {player.jersey_number
                      ? `#${player.jersey_number}`
                      : 'Roster'}
                  </div>
                </td>
                <td className="px-4 py-4">{player.position ?? '-'}</td>
                <td className="px-4 py-4 font-mono">
                  {player.minutes_per_game?.toFixed(1) ?? '-'}
                </td>
                <td className="px-4 py-4 font-mono">
                  {player.points_per_game?.toFixed(1) ?? '-'}
                </td>
                <td className="px-4 py-4 font-mono">
                  {player.rebounds_per_game?.toFixed(1) ?? '-'}
                </td>
                <td className="px-4 py-4 font-mono">
                  {player.assists_per_game?.toFixed(1) ?? '-'}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(
                    player.contract?.current_salary_cents ?? null,
                  )}
                </td>
                <td className="px-4 py-4">
                  {player.contract?.contract_type ?? 'Unspecified'}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatContractWindow(
                    player.contract?.contract_start_year,
                    player.contract?.contract_end_year,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
