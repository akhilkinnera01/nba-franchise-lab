import type { ReactNode } from 'react';

import { MetricTile, SignalPill } from '@/components/control-room-primitives';

export interface LabStat {
  label: string;
  value: string;
  detail: string;
}

interface Phase5LabShellProps {
  eyebrow: string;
  title: string;
  description: string;
  stats: readonly LabStat[];
  left: ReactNode;
  right: ReactNode;
  footer?: ReactNode;
}

function LabStatCard({ stat }: { stat: LabStat }) {
  return <MetricTile label={stat.label} value={stat.value} detail={stat.detail} />;
}

export function Phase5LabShell({
  eyebrow,
  title,
  description,
  stats,
  left,
  right,
  footer,
}: Phase5LabShellProps) {
  return (
    <div className="space-y-6">
      <section className="surface-band overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="surface-eyebrow">
              {eyebrow}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <SignalPill tone="cool">frontend lab</SignalPill>
                <SignalPill tone="success">decision-first</SignalPill>
              </div>
              <h1 className="max-w-4xl surface-title">
                {title}
              </h1>
              <p className="max-w-3xl surface-copy">
                {description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <LabStatCard key={stat.label} stat={stat} />
              ))}
            </div>
          </div>

          <aside className="border-t border-line/70 bg-bg px-6 py-6 xl:border-l xl:border-t-0">
            <div className="surface-eyebrow">
              Control room note
            </div>
            <div className="mt-3 rounded-[1.75rem] border border-line/70 bg-surface px-4 py-4">
              <div className="text-lg font-semibold tracking-tight text-text">
                Structured experiments, not loose playgrounds
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">
                These lab surfaces are intentionally local and interactive. They
                reuse live team context where it helps, then keep the question,
                controls, and consequence rail visible in one place.
              </p>
            </div>
            <div className="mt-4 rounded-[1.75rem] border border-line/70 bg-surface px-4 py-4">
              <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                Workflow
              </div>
              <div className="mt-2 space-y-2 text-sm leading-7 text-muted">
                <p>1. Pick the franchise or prompt.</p>
                <p>2. Shape the branch in the control column.</p>
                <p>3. Read the consequence rail before you commit.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">{left}</div>
        <div className="space-y-6">{right}</div>
      </section>

      {footer ? <div>{footer}</div> : null}
    </div>
  );
}
