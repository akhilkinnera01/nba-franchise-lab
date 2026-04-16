'use client';

import { startTransition, useEffect, useState } from 'react';

import { Phase5LabShell } from '@/components/phase5-lab-shell';
import type { TeamHealthSummary } from '@/lib/api/types';
import { formatWinLoss } from '@/lib/formatters';
import { buildShockEventLab } from '@/lib/phase5-labs';

const EVENT_OPTIONS = [
  'Star injury',
  'Cap spike',
  'Rotation collapse',
  'Unexpected breakout',
] as const;

interface ShockEventSimulatorProps {
  teams: readonly TeamHealthSummary[];
  initialTeamId?: number;
}

export function ShockEventSimulator({
  teams,
  initialTeamId,
}: ShockEventSimulatorProps) {
  const initialTeam =
    teams.find((team) => team.team_id === initialTeamId) ?? teams[0] ?? null;
  const [selectedTeamId, setSelectedTeamId] = useState<number>(
    initialTeam?.team_id ?? 0,
  );
  const [event, setEvent] = useState<(typeof EVENT_OPTIONS)[number]>(
    'Star injury',
  );
  const [severity, setSeverity] = useState(2);

  useEffect(() => {
    if (selectedTeamId || teams.length === 0) {
      return;
    }

    setSelectedTeamId(teams[0]?.team_id ?? 0);
  }, [selectedTeamId, teams]);

  const selectedTeam =
    teams.find((team) => team.team_id === selectedTeamId) ?? teams[0] ?? null;
  const lab = selectedTeam
    ? buildShockEventLab(selectedTeam, event, String(severity))
    : null;

  return (
    <Phase5LabShell
      eyebrow="Shock Event Simulator"
      title="Stress-test the roster when the plan stops behaving the way you expected."
      description="Use this lab for injury shocks, cap surprises, or a rotation swing that changes the shape of the season. The value is in the response window, not the headline."
      stats={[
        {
          label: 'Selected team',
          value: selectedTeam?.full_name ?? 'Unavailable',
          detail: selectedTeam
            ? formatWinLoss(selectedTeam.wins, selectedTeam.losses)
            : 'No live team loaded',
        },
        {
          label: 'Event',
          value: event,
          detail: lab?.thesis ?? 'Choose a shock type',
        },
        {
          label: 'Severity',
          value: `${severity}/3`,
          detail: lab?.severityLabel ?? 'Waiting for an event',
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
                Event type
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={event}
                onChange={(event) =>
                  startTransition(() =>
                    setEvent(event.target.value as (typeof EVENT_OPTIONS)[number]),
                  )
                }
              >
                {EVENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Severity
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                className="mt-4 w-full accent-[var(--color-accent)]"
                value={severity}
                onChange={(event) =>
                  startTransition(() => setSeverity(Number(event.target.value)))
                }
              />
              <div className="mt-2 text-sm text-muted">
                {['Low', 'Medium', 'High'][severity - 1] ?? 'Medium'}
              </div>
            </label>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Lab note
            </div>
            <p className="mt-2">
              The immediate response usually matters more than the shock itself.
              That&apos;s why this lab is built around time windows.
            </p>
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Response rail
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {lab?.teamName ?? 'Select a team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {lab?.thesis ?? 'Choose a team and shock event to reveal the response windows.'}
            </p>
          </div>

          <div className="grid gap-3">
            {lab?.steps.map((step) => (
              <article
                key={step.window}
                className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4"
              >
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  {step.window}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-text">
                  {step.priority}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">{step.response}</p>
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
