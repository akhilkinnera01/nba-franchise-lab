import Link from 'next/link';
import type { ReactNode } from 'react';

type Tone = 'default' | 'accent' | 'cool' | 'success' | 'danger';

const toneClasses: Record<Tone, string> = {
  default: 'border-line/70 bg-surface text-text',
  accent: 'border-accent/35 bg-accent/10 text-accent',
  cool: 'border-accent-cool/35 bg-accent-cool/10 text-accent-cool',
  success: 'border-mint/35 bg-mint/10 text-mint',
  danger: 'border-danger/35 bg-danger/10 text-danger',
};

interface SignalPillProps {
  children: ReactNode;
  tone?: Tone;
}

export function SignalPill({
  children,
  tone = 'default',
}: SignalPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

interface MetricTileProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
}

export function MetricTile({
  label,
  value,
  detail,
  tone = 'default',
}: MetricTileProps) {
  return (
    <article
      className={`rounded-[1.6rem] border px-4 py-4 shadow-panel ${toneClasses[tone]}`}
    >
      <div className="text-[0.64rem] uppercase tracking-[0.28em] text-muted">
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold tracking-tight">{value}</div>
      {detail ? (
        <div className="mt-2 text-sm leading-6 text-muted">{detail}</div>
      ) : null}
    </article>
  );
}

interface SurfaceIntroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}

export function SurfaceIntro({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: SurfaceIntroProps) {
  return (
    <section className="surface-band grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="surface-eyebrow">{eyebrow}</div>
        <div className="space-y-4">
          <h1 className="surface-title">{title}</h1>
          <div className="surface-copy max-w-3xl">{description}</div>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {aside ? <aside className="surface-panel-strong">{aside}</aside> : null}
    </section>
  );
}

interface DiscoveryCardProps {
  href: string;
  kicker: string;
  title: string;
  detail: string;
  meta?: string;
}

export function DiscoveryCard({
  href,
  kicker,
  title,
  detail,
  meta,
}: DiscoveryCardProps) {
  return (
    <Link href={href} className="surface-link-card">
      <div className="surface-eyebrow">{kicker}</div>
      <div className="mt-4 text-xl font-semibold tracking-tight text-text">
        {title}
      </div>
      <p className="mt-2 text-sm leading-7 text-muted">{detail}</p>
      {meta ? (
        <div className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-muted">
          {meta}
        </div>
      ) : null}
    </Link>
  );
}
