'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useState } from 'react';

import {
  DiscoveryCard,
  MetricTile,
  SignalPill,
  SurfaceIntro,
} from '@/components/control-room-primitives';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatSignedNumber } from '@/lib/formatters';
import {
  buildLeagueSnapshot,
  buildPhase5LabCards,
} from '@/lib/phase5-labs';

interface LabsHubProps {
  teams: readonly TeamHealthSummary[];
}

function HubCard({
  href,
  label,
  summary,
  signal,
  metric,
}: {
  href: string;
  label: string;
  summary: string;
  signal: string;
  metric: string;
}) {
  return (
    <DiscoveryCard
      href={href}
      kicker="Lab surface"
      title={label}
      detail={summary}
      meta={`${signal} · ${metric}`}
    />
  );
}

export function LabsHub({ teams }: LabsHubProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const labCards = buildPhase5LabCards(teams);
  const snapshot = buildLeagueSnapshot(teams);

  const filteredCards = labCards.filter((card) => {
    if (!deferredQuery) {
      return true;
    }

    return [card.label, card.summary, card.signal, card.metric]
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery);
  });

  return (
    <div className="space-y-6">
      <SurfaceIntro
        eyebrow="Phase 5 labs"
        title="A suite of front-office experiments for drafting, branching, shock tests, and rebuild planning."
        description="These surfaces stay fast and interactive on purpose. They reuse live franchise context where it helps, then layer in the decision framing the product needs when one scenario is not enough."
        actions={
          <>
            <Link
              href="/scenarios"
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              Return to scenario workspace
            </Link>
            <Link
              href="/teams"
              className="rounded-2xl border border-line/70 bg-surface-strong px-5 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
            >
              Inspect live franchises
            </Link>
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SignalPill tone="cool">6 lab families</SignalPill>
              <SignalPill tone="success">live franchise context</SignalPill>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile
                label="Live teams"
                value={<span className="font-mono">{snapshot.totalTeams}</span>}
              />
              <MetricTile
                label="Average net"
                value={
                  <span className="font-mono">
                    {formatSignedNumber(snapshot.averageNetRating, 1)}
                  </span>
                }
                tone="cool"
              />
              <MetricTile
                label="Top team"
                value={snapshot.strongestTeam?.full_name ?? 'Unavailable'}
              />
              <MetricTile
                label="Most pressured"
                value={snapshot.mostPressuredTeam?.full_name ?? 'Unavailable'}
                tone="accent"
              />
            </div>
            <label className="block">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Search labs
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={query}
              onChange={(event) =>
                startTransition(() => setQuery(event.target.value))
              }
                placeholder="Draft, rebuild, shock, compare..."
              />
            </label>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.map((card) => (
          <HubCard key={card.href} {...card} />
        ))}
      </section>

      {filteredCards.length === 0 ? (
        <section className="surface-panel text-sm leading-7 text-muted">
          No lab surfaces matched that search. Try a broader term or clear the
          filter.
        </section>
      ) : null}
    </div>
  );
}
