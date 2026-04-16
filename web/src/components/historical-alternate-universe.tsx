'use client';

import { startTransition, useEffect, useState } from 'react';

import { Phase5LabShell } from '@/components/phase5-lab-shell';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatSignedNumber, formatWinLoss } from '@/lib/formatters';
import { buildAlternateUniverseLab } from '@/lib/phase5-labs';

const ERA_OPTIONS = ['2011-12', '2015-16', '2019-20', '2023-24'] as const;
const BRANCH_OPTIONS = [
  'Keep the pick',
  'Trade the veteran',
  'Double down on continuity',
  'Reset the timeline',
] as const;

interface HistoricalAlternateUniverseProps {
  teams: readonly TeamHealthSummary[];
  initialTeamId?: number;
}

function TimelineCard({
  title,
  subtitle,
  detail,
}: {
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
        {subtitle}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-text">
        {title}
      </div>
      <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
    </article>
  );
}

export function HistoricalAlternateUniverse({
  teams,
  initialTeamId,
}: HistoricalAlternateUniverseProps) {
  const initialTeam =
    teams.find((team) => team.team_id === initialTeamId) ?? teams[0] ?? null;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    initialTeam?.team_id ?? 0,
  );
  const [era, setEra] = useState<(typeof ERA_OPTIONS)[number]>('2023-24');
  const [branch, setBranch] =
    useState<(typeof BRANCH_OPTIONS)[number]>('Keep the pick');

  useEffect(() => {
    if (selectedTeamId || teams.length === 0) {
      return;
    }

    setSelectedTeamId(teams[0]?.team_id ?? 0);
  }, [selectedTeamId, teams]);

  const selectedTeam =
    teams.find((team) => team.team_id === selectedTeamId) ?? teams[0] ?? null;
  const lab = selectedTeam ? buildAlternateUniverseLab(selectedTeam, era, branch) : null;

  return (
    <Phase5LabShell
      eyebrow="Historical Alternate Universe"
      title="Fork an era, keep the logic, and see what the other branch would have cost."
      description="This lab does not rewrite actual history. It gives the front office a clean, explicit way to reason about the path it did not take and the cap consequences that would have followed."
      stats={[
        {
          label: 'Selected team',
          value: selectedTeam?.full_name ?? 'Unavailable',
          detail: selectedTeam
            ? formatWinLoss(selectedTeam.wins, selectedTeam.losses)
            : 'No live team loaded',
        },
        {
          label: 'Era anchor',
          value: era,
          detail: lab?.thesis ?? 'Pick an era branch',
        },
        {
          label: 'Branch',
          value: branch,
          detail: lab ? formatSignedNumber(selectedTeam?.net_rating ?? null, 1) : 'Awaiting selection',
        },
      ]}
      left={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Control column
          </div>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Era anchor
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={era}
                onChange={(event) =>
                  startTransition(() => setEra(event.target.value as (typeof ERA_OPTIONS)[number]))
                }
              >
                {ERA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Branch
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={branch}
                onChange={(event) =>
                  startTransition(() =>
                    setBranch(event.target.value as (typeof BRANCH_OPTIONS)[number]),
                  )
                }
              >
                {BRANCH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Lab note
            </div>
            <p className="mt-2">
              This is a front-office thinking exercise. It is meant to clarify
              whether a branch changes the second move, not to pretend the
              original timeline never existed.
            </p>
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Counterfactual rail
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {lab?.teamName ?? 'Select a team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {lab?.thesis ?? 'Choose a team and branch to reveal the alternate path.'}
            </p>
          </div>

          <div className="grid gap-3">
            {lab?.steps.map((step) => (
              <TimelineCard key={step.title} {...step} />
            )) ?? null}
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
