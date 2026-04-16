import Link from 'next/link';

import {
  SignalPill,
  SurfaceIntro,
} from '@/components/control-room-primitives';
import { EmptyStatePanel } from '@/components/empty-state-panel';
import { FranchiseHeatMap } from '@/components/franchise-heat-map';
import { TeamSummaryTable } from '@/components/team-summary-table';
import { listTeamHealthSummaries } from '@/lib/api/client';
import type { TeamListResponse } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  let payload: TeamListResponse | null = null;

  try {
    payload = await listTeamHealthSummaries();
  } catch {
    payload = null;
  }

  return (
    <div className="space-y-6">
      <SurfaceIntro
        eyebrow="Teams"
        title="Scan the whole league before you commit to a move."
        description="This is the league ledger: the fastest way to read franchise posture, identify cap pressure, and choose the next team worth opening. Heat map for pattern recognition. Table for precision."
        actions={
          <>
            <Link
              href="/scenarios"
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              Go to scenarios
            </Link>
            <Link
              href="/labs"
              className="rounded-2xl border border-line/70 bg-surface px-5 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
            >
              Open labs
            </Link>
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SignalPill tone="success">scan first</SignalPill>
              <SignalPill tone="cool">one-click dossier</SignalPill>
            </div>
            <div>
              <div className="surface-eyebrow">Reading mode</div>
              <p className="mt-3 text-sm leading-7 text-muted">
                Use the heat map to spot clusters of pressure or upside, then
                switch to the ledger when you need exact row-level context.
              </p>
            </div>
          </div>
        }
      />

      {payload ? (
        <>
          <FranchiseHeatMap
            teams={payload.teams}
            season={payload.season}
            meta={payload.meta}
            compact
          />
          <TeamSummaryTable teams={payload.teams} />
        </>
      ) : (
        <EmptyStatePanel
          eyebrow="Teams"
          title="The team dashboard is ready, but the API is offline."
          body="The typed client and live-data surface are in place. Once the FastAPI app is reachable at NEXT_PUBLIC_API_URL, this page will render the 30-team league table and franchise heat map."
        />
      )}
    </div>
  );
}
