'use client';

import type {
  ComparableTradeMatch,
  TradePreviewResponse,
  TradePreviewTeamResult,
} from '@/lib/api/types';
import { formatCurrencyShort, formatSignedNumber } from '@/lib/formatters';

export type TradePreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; response: TradePreviewResponse };

interface TradeResultsPanelProps {
  preview: TradePreviewState;
  canRunPreview: boolean;
  onRunPreview: () => void;
}

const PERCENT_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

function formatPercent(value: number): string {
  return PERCENT_FORMAT.format(value);
}

function clampProbability(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function formatSeed(value: number): string {
  return value <= 0 ? 'Unavailable' : `Seed ${value.toFixed(1)}`;
}

function previewActionLabel(preview: TradePreviewState): string {
  if (preview.status === 'loading') {
    return 'Computing preview...';
  }

  if (preview.status === 'ready') {
    return 'Refresh preview';
  }

  return 'Run trade preview';
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-bg px-3 py-3">
      <div className="text-[0.62rem] uppercase tracking-[0.24em] text-muted">
        {label}
      </div>
      <div className="mt-2 font-mono text-base font-semibold text-text">
        {value}
      </div>
    </div>
  );
}

function TeamSnapshotCard({
  teamResult,
}: {
  teamResult: TradePreviewTeamResult;
}) {
  return (
    <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            {teamResult.team_name}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-text">
            {teamResult.scenario.expected_wins.toFixed(1)} wins
          </div>
          <div className="mt-1 text-sm text-muted">
            Baseline {teamResult.baseline.expected_wins.toFixed(1)} wins
          </div>
        </div>
        <div
          className={`rounded-full border px-3 py-1 font-mono text-[0.72rem] ${
            teamResult.delta.trade_valid
              ? 'border-accent-cool/30 bg-accent-cool/10 text-accent-cool'
              : 'border-accent/30 bg-accent/10 text-accent'
          }`}
        >
          {teamResult.delta.trade_valid ? 'Compliant' : 'Needs work'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryMetric
          label="Win delta"
          value={formatSignedNumber(teamResult.delta.wins_delta, 1)}
        />
        <SummaryMetric
          label="Playoff delta"
          value={`${formatSignedNumber(
            teamResult.delta.playoff_probability_delta * 100,
            1,
          )} pts`}
        />
        <SummaryMetric
          label="Title delta"
          value={`${formatSignedNumber(
            teamResult.delta.championship_probability_delta * 100,
            1,
          )} pts`}
        />
        <SummaryMetric
          label="Cap room delta"
          value={formatCurrencyShort(
            teamResult.delta.current_cap_room_delta_cents,
          )}
        />
      </div>
    </div>
  );
}

function OutcomeCell({
  label,
  teamResult,
  wins,
  playoffProbability,
  championshipProbability,
  averageSeed,
}: {
  label: string;
  teamResult: TradePreviewTeamResult;
  wins: number;
  playoffProbability: number;
  championshipProbability: number;
  averageSeed: number;
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
        {label}
      </div>
      <div className="font-mono text-2xl font-semibold tracking-tight text-text">
        {wins.toFixed(1)} wins
      </div>
      <div className="space-y-1 text-sm text-muted">
        <div>{formatPercent(playoffProbability)} playoff odds</div>
        <div>{formatPercent(championshipProbability)} title odds</div>
        <div>{formatSeed(averageSeed)}</div>
      </div>
      <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted">
        {teamResult.team_name}
      </div>
    </div>
  );
}

function buildScenarioBand(teamResult: TradePreviewTeamResult) {
  const volatility = Math.max(
    teamResult.baseline.win_standard_deviation,
    teamResult.scenario.win_standard_deviation,
  );
  const winSwing =
    volatility * 0.5 + Math.abs(teamResult.delta.wins_delta) * 0.25;
  const playoffSwing = Math.min(
    0.2,
    Math.abs(teamResult.delta.playoff_probability_delta) * 0.35 + 0.05,
  );
  const titleSwing = Math.min(
    0.12,
    Math.abs(teamResult.delta.championship_probability_delta) * 0.35 + 0.02,
  );

  return {
    expected: teamResult.scenario,
    upside: {
      wins: teamResult.scenario.expected_wins + winSwing,
      playoffProbability: clampProbability(
        teamResult.scenario.playoff_probability + playoffSwing,
      ),
      championshipProbability: clampProbability(
        teamResult.scenario.championship_probability + titleSwing,
      ),
      averageSeed: Math.max(1, teamResult.scenario.average_seed - 0.6),
    },
    downside: {
      wins: Math.max(0, teamResult.scenario.expected_wins - winSwing),
      playoffProbability: clampProbability(
        teamResult.scenario.playoff_probability - playoffSwing,
      ),
      championshipProbability: clampProbability(
        teamResult.scenario.championship_probability - titleSwing,
      ),
      averageSeed: teamResult.scenario.average_seed + 0.6,
    },
  };
}

function TeamComparisonRow({
  teamResult,
}: {
  teamResult: TradePreviewTeamResult;
}) {
  return (
    <tr className="border-t border-line/70 text-sm text-text">
      <td className="px-4 py-4">
        <div className="font-semibold">{teamResult.team_name}</div>
        <div className="mt-1 text-[0.65rem] uppercase tracking-[0.22em] text-muted">
          {teamResult.delta.trade_valid ? 'Trade valid' : 'Trade has issues'}
        </div>
      </td>
      <td className="px-4 py-4 font-mono">
        {teamResult.baseline.expected_wins.toFixed(1)}
      </td>
      <td className="px-4 py-4 font-mono">
        {teamResult.scenario.expected_wins.toFixed(1)}
      </td>
      <td className="px-4 py-4 font-mono">
        {formatSignedNumber(teamResult.delta.wins_delta, 1)}
      </td>
      <td className="px-4 py-4 font-mono">
        {formatSignedNumber(
          teamResult.delta.playoff_probability_delta * 100,
          1,
        )}{' '}
        pts
      </td>
      <td className="px-4 py-4 font-mono">
        {formatSignedNumber(
          teamResult.delta.championship_probability_delta * 100,
          1,
        )}{' '}
        pts
      </td>
      <td className="px-4 py-4 font-mono">
        {formatCurrencyShort(teamResult.delta.current_cap_room_delta_cents)}
      </td>
    </tr>
  );
}

function ComparableRow({
  tradeId,
  season,
  description,
  similarityScore,
}: {
  tradeId: string;
  season: string;
  description: string;
  similarityScore: number;
}) {
  return (
    <tr className="border-t border-line/70 text-sm text-text">
      <td className="px-4 py-4 font-mono text-[0.78rem] text-muted">
        {season}
      </td>
      <td className="px-4 py-4">
        <div className="font-semibold">{description}</div>
        <div className="mt-1 text-[0.65rem] uppercase tracking-[0.22em] text-muted">
          {tradeId}
        </div>
      </td>
      <td className="px-4 py-4 font-mono">
        {PERCENT_FORMAT.format(similarityScore)}
      </td>
    </tr>
  );
}

function ComparableHighlight({ match }: { match: ComparableTradeMatch }) {
  return (
    <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-4">
      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
        Closest comparable
      </div>
      <div className="mt-3 text-lg font-semibold tracking-tight text-text">
        {match.description}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{match.season}</span>
        <span className="rounded-full border border-line/70 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-text">
          {PERCENT_FORMAT.format(match.similarity_score)} similarity
        </span>
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em]">
          {match.trade_id}
        </span>
      </div>
    </div>
  );
}

export function TradeResultsPanel({
  preview,
  canRunPreview,
  onRunPreview,
}: TradeResultsPanelProps) {
  const topComparable =
    preview.status === 'ready' ? preview.response.comparable_trades[0] : null;

  return (
    <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Trade results
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            Outcome workspace
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            The panel combines legality, trade impact, and comparable history in
            one workspace so the builder stays readable.
          </p>
        </div>
        <button
          type="button"
          disabled={preview.status === 'loading' || !canRunPreview}
          onClick={onRunPreview}
          className="inline-flex h-11 items-center rounded-2xl border border-line/70 px-4 text-sm font-medium text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewActionLabel(preview)}
        </button>
      </div>

      {preview.status === 'idle' ? (
        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-5 text-sm text-muted">
          {canRunPreview
            ? 'The package is ready. Run preview to compute outcomes, cap deltas, and comparable trades.'
            : 'Select outgoing assets on both sides before running the preview.'}
        </div>
      ) : null}

      {preview.status === 'loading' ? (
        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-5 text-sm text-muted">
          Computing legality, preview ranges, and historical comparables...
        </div>
      ) : null}

      {preview.status === 'error' ? (
        <div className="rounded-[1.75rem] border border-danger/30 bg-danger/10 px-4 py-5 text-sm text-danger">
          <div>{preview.message}</div>
          <button
            type="button"
            onClick={onRunPreview}
            className="mt-4 inline-flex h-10 items-center rounded-2xl border border-danger/30 px-4 text-sm font-medium text-danger transition hover:border-danger/50"
          >
            Retry preview
          </button>
        </div>
      ) : null}

      {preview.status === 'ready' ? (
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Verdict
                </div>
                <div className="mt-2 text-lg font-semibold text-text">
                  {preview.response.validation.valid
                    ? 'Trade is compliant under the active rules.'
                    : 'Trade needs more work before it clears the rules.'}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {preview.response.validation.validation_scope_note}
                </p>
              </div>
              <div
                className={`rounded-full border px-3 py-1 font-mono text-[0.72rem] ${
                  preview.response.validation.valid
                    ? 'border-accent-cool/30 bg-accent-cool/10 text-accent-cool'
                    : 'border-accent/30 bg-accent/10 text-accent'
                }`}
              >
                {preview.response.validation.valid ? 'COMPLIANT' : 'ATTENTION'}
              </div>
            </div>

            {preview.response.validation.violations.length > 0 ? (
              <ul className="mt-4 space-y-2 rounded-2xl border border-line/70 bg-surface px-4 py-4 text-sm leading-6 text-text">
                {preview.response.validation.violations.map((violation) => (
                  <li key={violation}>{violation}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {preview.response.team_results.map((teamResult) => (
              <TeamSnapshotCard
                key={teamResult.team_id}
                teamResult={teamResult}
              />
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg">
            <div className="border-b border-line/70 px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Comparison band
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Baseline versus scenario for each franchise in the deal.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] border-collapse">
                <thead className="bg-surface-strong">
                  <tr className="text-left text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                    <th className="px-4 py-4 font-medium">Team</th>
                    <th className="px-4 py-4 font-medium">Baseline wins</th>
                    <th className="px-4 py-4 font-medium">Scenario wins</th>
                    <th className="px-4 py-4 font-medium">Win delta</th>
                    <th className="px-4 py-4 font-medium">Playoff delta</th>
                    <th className="px-4 py-4 font-medium">Title delta</th>
                    <th className="px-4 py-4 font-medium">Cap room delta</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.response.team_results.map((teamResult) => (
                    <TeamComparisonRow
                      key={teamResult.team_id}
                      teamResult={teamResult}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg">
            <div className="border-b border-line/70 px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Expected, upside, downside
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Directional scenario band derived from the preview output and
                variance guardrails. It is meant to frame the decision, not
                masquerade as a separate simulation.
              </p>
            </div>
            <div className="divide-y divide-line/70">
              {preview.response.team_results.map((teamResult) => {
                const band = buildScenarioBand(teamResult);
                return (
                  <div key={teamResult.team_id} className="px-4 py-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                          {teamResult.team_name}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted">
                          {teamResult.scenario.expected_wins.toFixed(1)}{' '}
                          expected wins,
                          {` ${formatPercent(teamResult.scenario.playoff_probability)} `}
                          playoff odds, and{' '}
                          {formatPercent(
                            teamResult.scenario.championship_probability,
                          )}{' '}
                          title odds.
                        </div>
                      </div>
                      <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">
                        Seed {teamResult.scenario.average_seed.toFixed(1)}
                      </div>
                    </div>
                    <div className="grid gap-0 overflow-hidden rounded-[1.5rem] border border-line/70 md:grid-cols-3 md:divide-x md:divide-line/70">
                      <OutcomeCell
                        label="Expected"
                        teamResult={teamResult}
                        wins={band.expected.expected_wins}
                        playoffProbability={band.expected.playoff_probability}
                        championshipProbability={
                          band.expected.championship_probability
                        }
                        averageSeed={band.expected.average_seed}
                      />
                      <OutcomeCell
                        label="Upside"
                        teamResult={teamResult}
                        wins={band.upside.wins}
                        playoffProbability={band.upside.playoffProbability}
                        championshipProbability={
                          band.upside.championshipProbability
                        }
                        averageSeed={band.upside.averageSeed}
                      />
                      <OutcomeCell
                        label="Downside"
                        teamResult={teamResult}
                        wins={band.downside.wins}
                        playoffProbability={band.downside.playoffProbability}
                        championshipProbability={
                          band.downside.championshipProbability
                        }
                        averageSeed={band.downside.averageSeed}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg">
            <div className="border-b border-line/70 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                    Comparable historical trades
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Sorted by shape similarity across salary, age, BPM proxy,
                    and trade structure.
                  </p>
                </div>
                <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
                  {preview.response.comparable_trades.length} matches
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              {topComparable ? (
                <ComparableHighlight match={topComparable} />
              ) : (
                <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-4 text-sm text-muted">
                  No comparable trades were found for the current package.
                </div>
              )}

              <div className="overflow-x-auto rounded-[1.5rem] border border-line/70">
                <table className="min-w-[760px] border-collapse">
                  <thead className="bg-surface-strong">
                    <tr className="text-left text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                      <th className="px-4 py-4 font-medium">Season</th>
                      <th className="px-4 py-4 font-medium">
                        Comparable trade
                      </th>
                      <th className="px-4 py-4 font-medium">Similarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.response.comparable_trades.length > 0 ? (
                      preview.response.comparable_trades.map((match) => (
                        <ComparableRow
                          key={match.trade_id}
                          tradeId={match.trade_id}
                          season={match.season}
                          description={match.description}
                          similarityScore={match.similarity_score}
                        />
                      ))
                    ) : (
                      <tr className="border-t border-line/70 text-sm text-muted">
                        <td className="px-4 py-6" colSpan={3}>
                          No comparable trades were found for the current
                          package.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-6 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Preview scope
            </div>
            <p className="mt-2">{preview.response.simulation_scope_note}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { TradeResultsPanel as TradeValidationPanel };
