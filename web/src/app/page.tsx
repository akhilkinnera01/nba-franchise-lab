import Link from 'next/link';

import {
  DiscoveryCard,
  MetricTile,
  SignalPill,
  SurfaceIntro,
} from '@/components/control-room-primitives';
import { EmptyStatePanel } from '@/components/empty-state-panel';
import { FranchiseHeatMap } from '@/components/franchise-heat-map';
import { ProofStrip } from '@/components/proof-strip';
import { listTeamHealthSummaries } from '@/lib/api/client';
import type { TeamListResponse } from '@/lib/api/types';
import { formatSignedNumber } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

function getLeaguePulse(payload: TeamListResponse) {
  const positiveNetTeams = payload.teams.filter(
    (team) => (team.net_rating ?? 0) > 0,
  ).length;
  const capFlexibleTeams = payload.teams.filter(
    (team) => (team.second_apron_room_cents ?? 0) > 0,
  ).length;
  const bestNetRating = payload.teams.reduce<number | null>((best, team) => {
    if (team.net_rating === null) {
      return best;
    }
    if (best === null || team.net_rating > best) {
      return team.net_rating;
    }
    return best;
  }, null);

  return {
    positiveNetTeams,
    capFlexibleTeams,
    bestNetRating,
  };
}

export default async function HomePage() {
  let payload: TeamListResponse | null = null;

  try {
    payload = await listTeamHealthSummaries();
  } catch {
    payload = null;
  }

  const pulse = payload ? getLeaguePulse(payload) : null;

  return (
    <div className="space-y-6">
      <SurfaceIntro
        eyebrow="Home"
        title="A public-facing franchise command center built for real basketball decisions."
        description="Start with league context, move straight into a franchise, and test a scenario without crossing through a sports feed. This homepage exists to answer what to look at, what to try next, and why the result is worth trusting."
        actions={
          <>
            <Link
              href="/teams"
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              Open the league ledger
            </Link>
            <Link
              href="/scenarios"
              className="rounded-2xl border border-line/70 bg-surface px-5 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
            >
              Build a scenario
            </Link>
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SignalPill tone="success">teams + cap live</SignalPill>
              <SignalPill tone="cool">shareable scenarios</SignalPill>
            </div>
            <div>
              <div className="surface-eyebrow">League pulse</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-text">
                Decision context before takes, feeds, or debate.
              </div>
            </div>
            {payload && pulse ? (
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <MetricTile
                  label="Teams above water"
                  value={
                    <span className="font-mono">{pulse.positiveNetTeams}</span>
                  }
                />
                <MetricTile
                  label="Below 2nd apron"
                  value={
                    <span className="font-mono">{pulse.capFlexibleTeams}</span>
                  }
                />
                <MetricTile
                  label="Best live net"
                  value={
                    <span className="font-mono">
                      {formatSignedNumber(pulse.bestNetRating)}
                    </span>
                  }
                  tone="cool"
                />
              </div>
            ) : (
              <div className="surface-panel rounded-[1.5rem] bg-surface">
                <div className="surface-eyebrow">API status</div>
                <p className="mt-3 text-sm leading-7 text-muted">
                  The live API is offline right now. The command center stays
                  intact, and the pulse rail will populate again as soon as the
                  backend responds.
                </p>
              </div>
            )}
          </div>
        }
      />

      {payload ? (
        <>
          <ProofStrip
            season={payload.season}
            teamCount={payload.teams.length}
          />
          <FranchiseHeatMap
            teams={payload.teams}
            season={payload.season}
            meta={payload.meta}
          />
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="surface-panel">
              <div className="surface-eyebrow">Next actions</div>
              <h2 className="mt-3 surface-subtitle">
                Fastest routes from curiosity to an actual decision.
              </h2>
              <div className="mt-6 grid gap-3">
                <DiscoveryCard
                  href="/teams"
                  kicker="League scan"
                  title="Read the entire league before you choose a team."
                  detail="Scan all 30 franchises with record, cap room, apron pressure, and immediate entry into a dossier."
                  meta="Teams · ledger"
                />
                <DiscoveryCard
                  href="/scenarios"
                  kicker="Move builder"
                  title="Pressure-test trades, signings, injuries, and lineup shifts."
                  detail="Stay in one consistent workspace while the legality, outcome range, and evidence rails update around the move."
                  meta="Scenarios · verdicts"
                />
                <DiscoveryCard
                  href="/methodology"
                  kicker="Trust surface"
                  title="Audit the formulas, assumptions, and caveats."
                  detail="Explainability stays in the product instead of hiding in docs. Read how the model thinks before you share the result."
                  meta="Methodology · explainability"
                />
              </div>
            </div>

            <div className="surface-panel">
              <div className="surface-eyebrow">Why this beats the feed-first sites</div>
              <h2 className="mt-3 surface-subtitle">
                Every surface is tuned for the next move, not the next scroll.
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-7 text-muted">
                <p>
                  Fanspo is the right baseline for immediacy, but the target
                  here is calmer hierarchy, better trust rails, and denser
                  legibility under real data.
                </p>
                <p>
                  The product direction favors calm cap context, dense tables,
                  and explainable modeling without leaning on feed-first
                  clutter or borrowed source-brand credibility.
                </p>
                <p>
                  The result should feel fast enough for fans and serious enough
                  for an executive review without collapsing into a sterile
                  enterprise dashboard.
                </p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <EmptyStatePanel
          eyebrow="Home"
          title="The control-room homepage is live, but the data feed is offline."
          body="The new shell, navigation model, and typed web client are in place. When the FastAPI service is reachable at NEXT_PUBLIC_API_URL, this homepage will render the real franchise heat map and proof surfaces directly from live team summaries."
        />
      )}
    </div>
  );
}
