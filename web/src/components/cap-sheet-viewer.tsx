import type { TeamCapProjectionSeason } from '@/lib/api/types';
import { formatCurrencyShort } from '@/lib/formatters';
import { MetricTile } from '@/components/control-room-primitives';

interface CapSheetViewerProps {
  current: TeamCapProjectionSeason;
  projection: readonly TeamCapProjectionSeason[];
}

function CapMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <MetricTile
      label={label}
      value={<span className="font-mono">{formatCurrencyShort(value)}</span>}
    />
  );
}

export function CapSheetViewer({ current, projection }: CapSheetViewerProps) {
  return (
    <section className="surface-panel space-y-6">
      <div>
        <div className="surface-eyebrow">Cap sheet</div>
        <h2 className="mt-3 surface-subtitle">
          Current salary pressure and projection runway
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CapMetric
          label="Committed salary"
          value={current.committed_salary_cents}
        />
        <CapMetric label="Cap room" value={current.cap_room_cents} />
        <CapMetric
          label="1st apron room"
          value={current.first_apron_room_cents}
        />
        <CapMetric
          label="2nd apron room"
          value={current.second_apron_room_cents}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="surface-table-head">
            <tr>
              <th className="px-4 py-4 font-medium">Season</th>
              <th className="px-4 py-4 font-medium">Team salary</th>
              <th className="px-4 py-4 font-medium">Cap room</th>
              <th className="px-4 py-4 font-medium">Tax room</th>
              <th className="px-4 py-4 font-medium">1st apron</th>
              <th className="px-4 py-4 font-medium">2nd apron</th>
              <th className="px-4 py-4 font-medium">Contracts</th>
            </tr>
          </thead>
          <tbody>
            {[current, ...projection].map((seasonRow) => (
              <tr key={seasonRow.season} className="surface-table-row">
                <td className="px-4 py-4 font-mono">{seasonRow.season}</td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(seasonRow.total_team_salary_cents)}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(seasonRow.cap_room_cents)}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(seasonRow.tax_room_cents)}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(seasonRow.first_apron_room_cents)}
                </td>
                <td className="px-4 py-4 font-mono">
                  {formatCurrencyShort(seasonRow.second_apron_room_cents)}
                </td>
                <td className="px-4 py-4">
                  {seasonRow.standard_contract_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
