import Link from 'next/link';

import type { TeamHealthSummary, TeamListMeta } from '@/lib/api/types';
import {
  formatCurrencyShort,
  formatSignedNumber,
  formatWinLoss,
} from '@/lib/formatters';

interface FranchiseHeatMapProps {
  teams: readonly TeamHealthSummary[];
  season: string;
  meta?: TeamListMeta;
  compact?: boolean;
}

function formatSnapshot(asOf: string | null | undefined): string | null {
  if (!asOf) {
    return null;
  }
  const parsed = new Date(asOf);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(parsed);
}

function getSignalLabel(team: TeamHealthSummary): {
  toneClass: string;
  label: string;
} {
  const net = team.net_rating ?? 0;
  const secondApronRoom = team.second_apron_room_cents ?? 0;

  if (net >= 4 && secondApronRoom >= 0) {
    return {
      toneClass: 'border-mint/45 bg-mint/10 text-mint',
      label: 'Stable upside',
    };
  }

  if (net >= 1) {
    return {
      toneClass: 'border-accent-cool/45 bg-accent-cool/10 text-accent-cool',
      label: 'Competitive',
    };
  }

  if (secondApronRoom < 0) {
    return {
      toneClass: 'border-danger/45 bg-danger/10 text-danger',
      label: 'Cap pressure',
    };
  }

  return {
    toneClass: 'border-line/80 bg-surface-strong text-muted',
    label: 'Flexible reset',
  };
}

function sortTeams(teams: readonly TeamHealthSummary[]): TeamHealthSummary[] {
  return [...teams].sort((left, right) => {
    const netGap = (right.net_rating ?? -999) - (left.net_rating ?? -999);
    if (netGap !== 0) {
      return netGap;
    }

    return (right.wins ?? 0) - (left.wins ?? 0);
  });
}

export function FranchiseHeatMap({
  teams,
  season,
  meta,
  compact = false,
}: FranchiseHeatMapProps) {
  if (teams.length === 0) {
    return (
      <section className="surface-band">
        <div className="surface-eyebrow">Franchise map</div>
        <h2 className="mt-3 surface-subtitle">
          Live team data is not available yet.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          The shell is ready for the Phase 3 API. Once the backend is reachable,
          this surface will render 30 franchise states from the live team
          summary route.
        </p>
      </section>
    );
  }

  const groupedTeams = {
    East: sortTeams(teams.filter((team) => team.conference === 'East')),
    West: sortTeams(teams.filter((team) => team.conference === 'West')),
    Other: sortTeams(
      teams.filter(
        (team) => team.conference !== 'East' && team.conference !== 'West',
      ),
    ),
  };

  const sections = Object.entries(groupedTeams).filter(
    ([, conferenceTeams]) => conferenceTeams.length > 0,
  );
  const snapshot = formatSnapshot(meta?.as_of);

  return (
    <section className="surface-band">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="surface-eyebrow">Franchise heat map</div>
          <h2 className="mt-3 surface-subtitle">
            Which teams have room to move right now
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Every tile exposes record, on-court signal, and apron pressure
            without collapsing the league into one fake score.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-3 text-right">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
            Season {season}
          </div>
          {meta ? (
            <div className="mt-2 space-y-1">
              <div className="text-[0.68rem] uppercase tracking-[0.24em] text-text">
                {meta.source_status}
                {snapshot ? ` · ${snapshot}` : ''}
              </div>
              {meta.missing_fields.length > 0 ? (
                <div className="max-w-[16rem] text-[0.68rem] uppercase tracking-[0.18em] text-muted">
                  Missing: {meta.missing_fields.join(', ')}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {sections.map(([conference, conferenceTeams]) => (
          <div key={conference}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-[0.72rem] uppercase tracking-[0.3em] text-muted">
                {conference} conference
              </div>
              <div className="text-xs text-muted">
                {conferenceTeams.length} franchises
              </div>
            </div>
            <div
              className={`grid gap-3 ${
                compact
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5'
              }`}
            >
              {conferenceTeams.map((team) => {
                const signal = getSignalLabel(team);

                return (
                  <Link
                    key={team.team_id}
                    href={`/teams/${team.team_id}`}
                  className="rounded-[1.65rem] border border-line/70 bg-bg px-4 py-4 transition hover:-translate-y-0.5 hover:border-accent-cool/50 hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-muted">
                          {team.abbreviation}
                        </div>
                        <div className="mt-2 text-lg font-semibold tracking-tight text-text">
                          {team.full_name}
                        </div>
                      </div>
                      <div
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.24em] ${signal.toneClass}`}
                      >
                        {signal.label}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
                          Record
                        </div>
                        <div className="mt-2 text-base font-semibold text-text">
                          {formatWinLoss(team.wins, team.losses)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
                          Net
                        </div>
                        <div className="mt-2 font-mono text-base font-semibold text-text">
                          {formatSignedNumber(team.net_rating)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
                          Cap room
                        </div>
                        <div className="mt-2 font-mono text-base font-semibold text-text">
                          {formatCurrencyShort(team.cap_room_cents)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-[0.26em] text-muted">
                          2nd apron
                        </div>
                        <div className="mt-2 font-mono text-base font-semibold text-text">
                          {formatCurrencyShort(team.second_apron_room_cents)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4">
                      <div className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">
                        Open dossier
                      </div>
                      <div className="text-sm font-semibold text-text">View team</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
