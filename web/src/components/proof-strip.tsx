import { MetricTile } from '@/components/control-room-primitives';

interface ProofStripProps {
  season: string;
  teamCount: number;
}

const trustSignals = [
  {
    label: 'Source status',
    value: 'Live route family',
    detail:
      'Teams, roster, cap, and stored scenario surfaces all resolve from the shipped API contract.',
  },
  {
    label: 'Legal framing',
    value: 'Apron aware',
    detail:
      'Trade and cap logic stay explicit about salary pressure, rule state, and exception context.',
  },
  {
    label: 'Output style',
    value: 'Shareable',
    detail:
      'Stored IDs, compare routes, and scenario persistence keep results reproducible instead of disposable.',
  },
] as const;

export function ProofStrip({ season, teamCount }: ProofStripProps) {
  return (
    <section className="grid gap-3 xl:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))]">
      <MetricTile
        label="League proof"
        value={
          <>
            <span className="font-mono">{teamCount}</span> live franchises in
            the {` ${season} `}window
          </>
        }
        detail="This product starts from the live franchise layer, not from a generic sports homepage. The scan, dossier, and scenario surfaces all inherit the same command-center logic."
        tone="cool"
      />

      {trustSignals.map((signal, index) => (
        <MetricTile
          key={signal.label}
          label={signal.label}
          value={
            <span className="font-mono text-sm uppercase tracking-[0.24em]">
              {signal.value}
            </span>
          }
          detail={signal.detail}
          tone={index === 1 ? 'accent' : 'default'}
        />
      ))}
    </section>
  );
}
