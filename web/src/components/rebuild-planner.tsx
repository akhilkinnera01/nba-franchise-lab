'use client';

import { startTransition, useEffect, useState } from 'react';

import { Phase5LabShell } from '@/components/phase5-lab-shell';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatWinLoss } from '@/lib/formatters';
import { buildRebuildPlanLab } from '@/lib/phase5-labs';

const RESET_OPTIONS = ['Soft reset', 'Targeted reset', 'Full teardown'] as const;

interface RebuildPlannerProps {
  teams: readonly TeamHealthSummary[];
  initialTeamId?: number;
}

export function RebuildPlanner({ teams, initialTeamId }: RebuildPlannerProps) {
  const initialTeam =
    teams.find((team) => team.team_id === initialTeamId) ?? teams[0] ?? null;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    initialTeam?.team_id ?? 0,
  );
  const [resetStyle, setResetStyle] =
    useState<(typeof RESET_OPTIONS)[number]>('Targeted reset');
  const [horizon, setHorizon] = useState(3);

  useEffect(() => {
    if (selectedTeamId || teams.length === 0) {
      return;
    }

    setSelectedTeamId(teams[0]?.team_id ?? 0);
  }, [selectedTeamId, teams]);

  const selectedTeam =
    teams.find((team) => team.team_id === selectedTeamId) ?? teams[0] ?? null;
  const lab = selectedTeam
    ? buildRebuildPlanLab(selectedTeam, resetStyle, String(horizon))
    : null;

  return (
    <Phase5LabShell
      eyebrow="Rebuild Planner"
      title="Map the reset before the roster tells you it already happened."
      description="The planner breaks the rebuild into phases so the front office can keep the asset base, cap flexibility, and future timeline aligned instead of improvising through the season."
      stats={[
        {
          label: 'Selected team',
          value: selectedTeam?.full_name ?? 'Unavailable',
          detail: selectedTeam
            ? formatWinLoss(selectedTeam.wins, selectedTeam.losses)
            : 'No live team loaded',
        },
        {
          label: 'Reset style',
          value: resetStyle,
          detail: lab?.thesis ?? 'Choose the rebuild style',
        },
        {
          label: 'Horizon',
          value: `${horizon} seasons`,
          detail: lab?.note ?? 'Waiting for a team',
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
                Reset style
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={resetStyle}
                onChange={(event) =>
                  startTransition(() =>
                    setResetStyle(event.target.value as (typeof RESET_OPTIONS)[number]),
                  )
                }
              >
                {RESET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Horizon
              </span>
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                className="mt-4 w-full accent-[var(--color-accent)]"
                value={horizon}
                onChange={(event) =>
                  startTransition(() => setHorizon(Number(event.target.value)))
                }
              />
              <div className="mt-2 text-sm text-muted">{horizon} seasons</div>
            </label>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Lab note
            </div>
            <p className="mt-2">
              A rebuild is only credible when the phases are visible. If the
              plan cannot explain what to stop doing, it is not a plan yet.
            </p>
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Timeline
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {lab?.teamName ?? 'Select a team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {lab?.thesis ?? 'Choose a team and reset style to reveal the rebuild path.'}
            </p>
          </div>

          <div className="grid gap-3">
            {lab?.phases.map((phase) => (
              <article
                key={phase.title}
                className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4"
              >
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  {phase.title}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-text">
                  {phase.move}
                </div>
                <div className="mt-3 text-sm leading-7 text-muted">
                  Guardrail: {phase.guardrail}
                </div>
              </article>
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
