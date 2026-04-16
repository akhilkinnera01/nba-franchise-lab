import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CapSheetViewer } from '@/components/cap-sheet-viewer';
import {
  MetricTile,
  SignalPill,
  SurfaceIntro,
} from '@/components/control-room-primitives';
import { EmptyStatePanel } from '@/components/empty-state-panel';
import { RosterTable } from '@/components/roster-table';
import { ApiClientError, getTeamCap, getTeamRoster } from '@/lib/api/client';
import type { TeamCapResponse, TeamRosterResponse } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

interface TeamDetailPageProps {
  params: {
    teamId: string;
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const teamId = Number(params.teamId);

  if (!Number.isInteger(teamId)) {
    notFound();
  }

  const [rosterResult, capResult] = await Promise.allSettled([
    getTeamRoster(teamId),
    getTeamCap(teamId),
  ]);

  if (
    rosterResult.status === 'rejected' &&
    rosterResult.reason instanceof ApiClientError &&
    rosterResult.reason.status === 404
  ) {
    notFound();
  }

  const roster =
    rosterResult.status === 'fulfilled'
      ? (rosterResult.value as TeamRosterResponse)
      : null;
  const cap =
    capResult.status === 'fulfilled'
      ? (capResult.value as TeamCapResponse)
      : null;

  if (!roster && !cap) {
    return (
      <EmptyStatePanel
        eyebrow="Team workspace"
        title="This team workspace is ready, but the API is offline."
        body="The detail page is wired against the live roster and cap routes. Once the backend is reachable, this page will render contract context, rotation data, and the three-season cap outlook."
      />
    );
  }

  const identity = roster?.team ?? cap?.team;

  if (!identity) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SurfaceIntro
        eyebrow="Team dossier"
        title={identity.full_name}
        description="Open the franchise context before you start building a move. The roster, cap runway, and next actions live together here so the later scenario builders inherit a real decision surface."
        actions={
          <>
            <Link
              href="/teams"
              className="rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm font-medium text-text transition hover:border-accent-cool/50"
            >
              Back to league scan
            </Link>
            <Link
              href={`/scenarios?primaryTeam=${identity.team_id}`}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              Build scenario
            </Link>
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SignalPill tone="success">roster live</SignalPill>
              <SignalPill tone="cool">cap runway</SignalPill>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <MetricTile
                label="Abbreviation"
                value={<span className="font-mono">{identity.abbreviation}</span>}
              />
              <MetricTile
                label="Conference"
                value={identity.conference ?? 'Unavailable'}
              />
              <MetricTile
                label="Division"
                value={identity.division ?? 'Unavailable'}
              />
              <MetricTile
                label="Season"
                value={
                  <span className="font-mono">
                    {roster?.season ?? cap?.season ?? 'Unavailable'}
                  </span>
                }
              />
            </div>
          </div>
        }
      />

      {roster ? (
        <RosterTable players={roster.players} />
      ) : (
        <EmptyStatePanel
          eyebrow="Roster"
          title="Roster data is unavailable for this team."
          body="The team route exists, but the live roster payload could not be loaded right now."
        />
      )}

      {cap ? (
        <CapSheetViewer current={cap.current} projection={cap.projection} />
      ) : (
        <EmptyStatePanel
          eyebrow="Cap sheet"
          title="Cap data is unavailable for this team."
          body="The roster view loaded, but the cap projection route was unavailable for this request."
        />
      )}
    </div>
  );
}
