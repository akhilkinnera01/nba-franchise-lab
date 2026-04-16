'use client';

import type { ReactNode } from 'react';

import type {
  ScenarioPreviewDeltaSummary,
  ScenarioPreviewOutcomeSnapshot,
} from '@/lib/api/types';
import { formatCurrencyShort, formatSignedNumber } from '@/lib/formatters';

export type ScenarioPreviewState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; response: T };

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

function buildScenarioBand(
  baseline: ScenarioPreviewOutcomeSnapshot,
  scenario: ScenarioPreviewOutcomeSnapshot,
  delta: ScenarioPreviewDeltaSummary,
) {
  const volatility = Math.max(
    baseline.win_standard_deviation,
    scenario.win_standard_deviation,
  );
  const winSwing = volatility * 0.5 + Math.abs(delta.wins_delta) * 0.25;
  const playoffSwing = Math.min(
    0.2,
    Math.abs(delta.playoff_probability_delta) * 0.35 + 0.05,
  );
  const titleSwing = Math.min(
    0.12,
    Math.abs(delta.championship_probability_delta) * 0.35 + 0.02,
  );

  return {
    expected: scenario,
    upside: {
      wins: scenario.expected_wins + winSwing,
      playoffProbability: clampProbability(
        scenario.playoff_probability + playoffSwing,
      ),
      championshipProbability: clampProbability(
        scenario.championship_probability + titleSwing,
      ),
      averageSeed: Math.max(1, scenario.average_seed - 0.6),
    },
    downside: {
      wins: Math.max(0, scenario.expected_wins - winSwing),
      playoffProbability: clampProbability(
        scenario.playoff_probability - playoffSwing,
      ),
      championshipProbability: clampProbability(
        scenario.championship_probability - titleSwing,
      ),
      averageSeed: scenario.average_seed + 0.6,
    },
  };
}

function OutcomeCell({
  label,
  wins,
  playoffProbability,
  championshipProbability,
  averageSeed,
}: {
  label: string;
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
    </div>
  );
}

function OutcomeSnapshotCard({
  label,
  snapshot,
}: {
  label: string;
  snapshot: ScenarioPreviewOutcomeSnapshot;
}) {
  return (
    <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-4">
      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-text">
        {snapshot.expected_wins.toFixed(1)} wins
      </div>
      <div className="mt-2 space-y-1 text-sm text-muted">
        <div>{formatPercent(snapshot.playoff_probability)} playoff odds</div>
        <div>{formatPercent(snapshot.championship_probability)} title odds</div>
        <div>{formatSeed(snapshot.average_seed)}</div>
      </div>
    </div>
  );
}

function CapSeasonRow({
  season,
  baseline,
  scenario,
}: {
  season: string;
  baseline: number | null | undefined;
  scenario: number | null | undefined;
}) {
  const delta =
    baseline !== null &&
    baseline !== undefined &&
    scenario !== null &&
    scenario !== undefined
      ? scenario - baseline
      : null;

  return (
    <tr className="border-t border-line/70 text-sm text-text">
      <td className="px-4 py-4 font-mono text-[0.78rem] text-muted">
        {season}
      </td>
      <td className="px-4 py-4 font-mono">{formatCurrencyShort(baseline ?? null)}</td>
      <td className="px-4 py-4 font-mono">{formatCurrencyShort(scenario ?? null)}</td>
      <td className="px-4 py-4 font-mono">{formatCurrencyShort(delta)}</td>
    </tr>
  );
}

interface ScenarioPreviewPayload {
  simulation_scope_note: string;
  baseline: ScenarioPreviewOutcomeSnapshot;
  scenario: ScenarioPreviewOutcomeSnapshot;
  delta: ScenarioPreviewDeltaSummary;
}

interface ScenarioPreviewPanelProps<T extends ScenarioPreviewPayload> {
  eyebrow: string;
  title: string;
  description: string;
  idleMessage: string;
  loadingMessage: string;
  preview: ScenarioPreviewState<T>;
  canRunPreview: boolean;
  runLabel: string;
  onRunPreview: () => void;
  detailSlot?: (response: T) => ReactNode;
}

export function ScenarioPreviewPanel<T extends ScenarioPreviewPayload>({
  eyebrow,
  title,
  description,
  idleMessage,
  loadingMessage,
  preview,
  canRunPreview,
  runLabel,
  onRunPreview,
  detailSlot,
}: ScenarioPreviewPanelProps<T>) {
  const readyResponse = preview.status === 'ready' ? preview.response : null;
  const band = readyResponse
    ? buildScenarioBand(
        readyResponse.baseline,
        readyResponse.scenario,
        readyResponse.delta,
      )
    : null;
  const capSeasons = readyResponse
    ? Array.from(
        new Set([
          ...Object.keys(readyResponse.baseline.cap_room_cents_by_season),
          ...Object.keys(readyResponse.scenario.cap_room_cents_by_season),
        ]),
      )
    : [];

  return (
    <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        </div>
        <button
          type="button"
          disabled={preview.status === 'loading' || !canRunPreview}
          onClick={onRunPreview}
          className="inline-flex h-11 items-center rounded-2xl border border-line/70 px-4 text-sm font-medium text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {preview.status === 'loading' ? 'Computing preview...' : runLabel}
        </button>
      </div>

      {preview.status === 'idle' ? (
        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-5 text-sm text-muted">
          {idleMessage}
        </div>
      ) : null}

      {preview.status === 'loading' ? (
        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-5 text-sm text-muted">
          {loadingMessage}
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

      {readyResponse && band ? (
        <div className="space-y-4">
          {detailSlot ? detailSlot(readyResponse) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryMetric
              label="Win delta"
              value={formatSignedNumber(readyResponse.delta.wins_delta, 1)}
            />
            <SummaryMetric
              label="Playoff delta"
              value={`${formatSignedNumber(
                readyResponse.delta.playoff_probability_delta * 100,
                1,
              )} pts`}
            />
            <SummaryMetric
              label="Title delta"
              value={`${formatSignedNumber(
                readyResponse.delta.championship_probability_delta * 100,
                1,
              )} pts`}
            />
            <SummaryMetric
              label="Net rating delta"
              value={formatSignedNumber(readyResponse.delta.net_rating_delta, 1)}
            />
            <SummaryMetric
              label="Cap room delta"
              value={formatCurrencyShort(
                readyResponse.delta.current_cap_room_delta_cents,
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <OutcomeSnapshotCard
              label="Baseline"
              snapshot={readyResponse.baseline}
            />
            <OutcomeSnapshotCard
              label="Scenario"
              snapshot={readyResponse.scenario}
            />
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg">
            <div className="border-b border-line/70 px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Expected, upside, downside
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                The result band uses the preview output plus variance guardrails
                so the decision still reads like a range instead of a single
                point estimate.
              </p>
            </div>
            <div className="grid gap-0 overflow-hidden md:grid-cols-3 md:divide-x md:divide-line/70">
              <OutcomeCell
                label="Expected"
                wins={band.expected.expected_wins}
                playoffProbability={band.expected.playoff_probability}
                championshipProbability={band.expected.championship_probability}
                averageSeed={band.expected.average_seed}
              />
              <OutcomeCell
                label="Upside"
                wins={band.upside.wins}
                playoffProbability={band.upside.playoffProbability}
                championshipProbability={band.upside.championshipProbability}
                averageSeed={band.upside.averageSeed}
              />
              <OutcomeCell
                label="Downside"
                wins={band.downside.wins}
                playoffProbability={band.downside.playoffProbability}
                championshipProbability={band.downside.championshipProbability}
                averageSeed={band.downside.averageSeed}
              />
            </div>
          </div>

          {capSeasons.length > 0 ? (
            <div className="rounded-[1.75rem] border border-line/70 bg-bg">
              <div className="border-b border-line/70 px-4 py-4">
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Cap outlook
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Current and future cap room impact for the selected scenario.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[640px] border-collapse">
                  <thead className="bg-surface-strong">
                    <tr className="text-left text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                      <th className="px-4 py-4 font-medium">Season</th>
                      <th className="px-4 py-4 font-medium">Baseline</th>
                      <th className="px-4 py-4 font-medium">Scenario</th>
                      <th className="px-4 py-4 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capSeasons.map((season) => (
                      <CapSeasonRow
                        key={season}
                        season={season}
                        baseline={
                          readyResponse.baseline.cap_room_cents_by_season[season]
                        }
                        scenario={
                          readyResponse.scenario.cap_room_cents_by_season[season]
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-6 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Preview scope
            </div>
            <p className="mt-2">{readyResponse.simulation_scope_note}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
