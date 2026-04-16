'use client';

import { startTransition, useDeferredValue, useEffect, useState } from 'react';

import { Phase5LabShell } from '@/components/phase5-lab-shell';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatSignedNumber, formatWinLoss } from '@/lib/formatters';
import { buildDraftProspectLab } from '@/lib/phase5-labs';

const FOCUS_OPTIONS = ['Win-now', 'Balanced', 'Upside'] as const;

interface DraftProspectLabProps {
  teams: readonly TeamHealthSummary[];
  initialTeamId?: number;
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
      <div className="text-[0.65rem] uppercase tracking-[0.24em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight text-text">
        {value}
      </div>
    </div>
  );
}

export function DraftProspectLab({
  teams,
  initialTeamId,
}: DraftProspectLabProps) {
  const initialTeam =
    teams.find((team) => team.team_id === initialTeamId) ?? teams[0] ?? null;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    initialTeam?.team_id ?? 0,
  );
  const [focus, setFocus] =
    useState<(typeof FOCUS_OPTIONS)[number]>('Balanced');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (selectedTeamId || teams.length === 0) {
      return;
    }

    setSelectedTeamId(teams[0]?.team_id ?? 0);
  }, [selectedTeamId, teams]);

  const selectedTeam =
    teams.find((team) => team.team_id === selectedTeamId) ?? teams[0] ?? null;
  const lab = selectedTeam
    ? buildDraftProspectLab(selectedTeam, focus, deferredSearch)
    : null;
  const topProspect = lab?.prospects[0] ?? null;

  return (
    <Phase5LabShell
      eyebrow="Draft Prospect Lab"
      title="Rank prospect archetypes against a live franchise without losing the cap context."
      description="Use the control column to pick a team and a board bias, then read the archetype board on the right. The lab is front-end only, but it still respects the current roster shape and cap pressure."
      stats={[
        {
          label: 'Selected team',
          value: selectedTeam?.full_name ?? 'Unavailable',
          detail: selectedTeam
            ? formatWinLoss(selectedTeam.wins, selectedTeam.losses)
            : 'No live team loaded',
        },
        {
          label: 'Focus',
          value: focus,
          detail: lab?.thesis ?? 'Waiting for a selection',
        },
        {
          label: 'Top fit',
          value: topProspect ? `${topProspect.fitScore}/100` : 'Unavailable',
          detail: topProspect?.label ?? 'No prospect board ready',
        },
      ]}
      left={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Control column
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Franchise
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={selectedTeamId}
                onChange={(event) =>
                  startTransition(() =>
                    setSelectedTeamId(Number(event.target.value)),
                  )
                }
              >
                {teams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.full_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Board bias
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      startTransition(() => setFocus(option));
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      focus === option
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line/70 bg-bg text-text hover:border-accent-cool/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Search archetypes
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={search}
                onChange={(event) =>
                  startTransition(() => setSearch(event.target.value))
                }
                placeholder="Wing, guard, big, upside..."
              />
            </label>

            <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Lab note
              </div>
              <p className="mt-2">
                This lab is archetype-based by design. It helps the front office
                describe the kind of prospect it wants before it argues about
                individual names.
              </p>
            </div>
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
                Prospect board
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                {lab?.teamName ?? 'Select a team'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                {lab?.thesis ?? 'Pick a franchise on the left to build the board.'}
              </p>
            </div>
            {topProspect ? (
              <div className="rounded-2xl border border-line/70 bg-bg px-4 py-3 text-right">
                <div className="text-[0.65rem] uppercase tracking-[0.24em] text-muted">
                  Top fit
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-text">
                  {topProspect.fitScore}/100
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {lab?.prospects.length ? (
              lab.prospects.map((prospect) => (
                <article
                  key={prospect.label}
                  className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                        {prospect.archetype}
                      </div>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-text">
                        {prospect.label}
                      </h3>
                    </div>
                    <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
                      {prospect.fitScore}/100
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatBadge label="Ceiling" value={prospect.ceiling} />
                    <StatBadge label="Floor" value={prospect.floor} />
                    <StatBadge label="Timeline" value={prospect.timeline} />
                    <StatBadge
                      label="Fit momentum"
                      value={formatSignedNumber(prospect.fitScore - 75, 0)}
                    />
                  </div>

                  <p className="mt-4 text-sm leading-7 text-muted">
                    {prospect.rationale}
                  </p>
                  <div className="mt-3 text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                    Risk note: {prospect.risk}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-5 text-sm leading-7 text-muted">
                No prospect archetypes matched that search.
              </div>
            )}
          </div>

          {lab ? (
            <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Front-office read
              </div>
              <p className="mt-2">{lab.note}</p>
            </div>
          ) : null}
        </section>
      }
    />
  );
}
