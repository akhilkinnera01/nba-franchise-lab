'use client';

import { startTransition, useEffect, useState } from 'react';

import { Phase5LabShell } from '@/components/phase5-lab-shell';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatCurrencyShort, formatSignedNumber, formatWinLoss } from '@/lib/formatters';
import { buildStrategyPathLab } from '@/lib/phase5-labs';

const OBJECTIVE_OPTIONS = [
  'Maximize wins',
  'Protect flexibility',
  'Collect picks',
  'Create a second timeline',
] as const;

interface StrategyPathSimulatorProps {
  teams: readonly TeamHealthSummary[];
  initialTeamId?: number;
}

export function StrategyPathSimulator({
  teams,
  initialTeamId,
}: StrategyPathSimulatorProps) {
  const initialTeam =
    teams.find((team) => team.team_id === initialTeamId) ?? teams[0] ?? null;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    initialTeam?.team_id ?? 0,
  );
  const [objective, setObjective] =
    useState<(typeof OBJECTIVE_OPTIONS)[number]>('Maximize wins');
  const [horizon, setHorizon] = useState(2);

  useEffect(() => {
    if (selectedTeamId || teams.length === 0) {
      return;
    }

    setSelectedTeamId(teams[0]?.team_id ?? 0);
  }, [selectedTeamId, teams]);

  const selectedTeam =
    teams.find((team) => team.team_id === selectedTeamId) ?? teams[0] ?? null;
  const lab = selectedTeam
    ? buildStrategyPathLab(selectedTeam, objective, String(horizon))
    : null;

  return (
    <Phase5LabShell
      eyebrow="Strategy Path Simulator"
      title="Compose a multi-step route before the league forces your hand."
      description="The simulator frames a path, not a prediction. Use it when you need to decide what the next two or three moves should protect, unlock, or deliberately sacrifice."
      stats={[
        {
          label: 'Selected team',
          value: selectedTeam?.full_name ?? 'Unavailable',
          detail: selectedTeam
            ? formatWinLoss(selectedTeam.wins, selectedTeam.losses)
            : 'No live team loaded',
        },
        {
          label: 'Objective',
          value: objective,
          detail: lab?.thesis ?? 'Choose the route objective',
        },
        {
          label: 'Horizon',
          value: `${horizon} seasons`,
          detail: selectedTeam
            ? `Net rating ${formatSignedNumber(selectedTeam.net_rating, 1)}`
            : 'Waiting for a team',
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
                Objective
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={objective}
                onChange={(event) =>
                  startTransition(() =>
                    setObjective(event.target.value as (typeof OBJECTIVE_OPTIONS)[number]),
                  )
                }
              >
                {OBJECTIVE_OPTIONS.map((option) => (
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
                min="1"
                max="4"
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
              The route should survive the second move. If it only works when
              the first move is perfect, the plan is too brittle.
            </p>
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Route map
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {lab?.teamName ?? 'Select a team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {lab?.thesis ?? 'Pick a team and objective to reveal the path.'}
            </p>
          </div>

          <div className="grid gap-3">
            {lab?.steps.map((step) => (
              <article
                key={step.title}
                className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                      {step.title}
                    </div>
                    <div className="mt-2 text-xl font-semibold tracking-tight text-text">
                      {step.move}
                    </div>
                  </div>
                  <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
                    {step.risk}
                  </div>
                </div>
                <div className="mt-3 text-sm leading-7 text-muted">
                  {step.payoff}
                </div>
              </article>
            )) ?? null}
          </div>

          {lab ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Team salary
                </div>
                <div className="mt-2 font-mono text-2xl font-semibold text-text">
                  {formatCurrencyShort(selectedTeam?.committed_salary_cents ?? null)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Guardrail
                </div>
                <div className="mt-2 text-sm leading-7 text-muted">
                  {lab.note}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      }
    />
  );
}
