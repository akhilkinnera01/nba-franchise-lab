import type { ReactNode } from 'react';

import { formatDateTime } from '@/lib/formatters';
import type { JsonRecord, ScenarioEnvelope } from '@/lib/api/types';

function describeJsonValue(value: JsonRecord[string]): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `array (${value.length})`;
  }

  if (typeof value === 'object') {
    return `object (${Object.keys(value).length})`;
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function summarizeRecord(record: JsonRecord): Array<{ key: string; value: string }> {
  return Object.entries(record)
    .slice(0, 6)
    .map(([key, value]) => ({ key, value: describeJsonValue(value) }));
}

function PayloadPreview({
  label,
  record,
}: {
  label: string;
  record: JsonRecord;
}) {
  const summary = summarizeRecord(record);

  return (
    <section className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-4">
      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
        {label}
      </div>
      <div className="mt-3 grid gap-2">
        {summary.length > 0 ? (
          summary.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-4 rounded-2xl border border-line/70 bg-surface px-3 py-2"
            >
              <div className="text-sm font-medium text-text">{item.key}</div>
              <div className="max-w-[14rem] text-right font-mono text-xs text-muted">
                {item.value}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-line/70 bg-surface px-3 py-3 text-sm text-muted">
            Empty payload
          </div>
        )}
      </div>

      <details className="mt-4 rounded-2xl border border-line/70 bg-surface px-3 py-3">
        <summary className="cursor-pointer text-[0.68rem] uppercase tracking-[0.28em] text-muted">
          Raw payload
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[0.72rem] leading-6 text-text">
          {JSON.stringify(record, null, 2)}
        </pre>
      </details>
    </section>
  );
}

interface ScenarioEnvelopeCardProps {
  scenario: ScenarioEnvelope;
  title?: string;
  footer?: ReactNode;
}

export function ScenarioEnvelopeCard({
  scenario,
  title,
  footer,
}: ScenarioEnvelopeCardProps) {
  return (
    <article className="surface-table-shell">
      <div className="border-b border-line/70 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="surface-eyebrow">
              {title ?? 'Stored scenario'}
            </div>
            <h3 className="mt-3 surface-subtitle">
              {scenario.title ?? 'Untitled scenario'}
            </h3>
            {scenario.notes ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                {scenario.notes}
              </p>
            ) : null}
          </div>
          <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-muted">
            {scenario.scenario_type}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-muted">
            {scenario.scenario_id}
          </span>
          <span>•</span>
          <span>{formatDateTime(scenario.created_at)}</span>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 xl:grid-cols-2">
        <PayloadPreview label="Request" record={scenario.request} />
        <PayloadPreview label="Result" record={scenario.result} />
      </div>

      <div className="border-t border-line/70 px-6 py-4">
        <a
          href={scenario.share_url}
          className="text-sm font-semibold text-accent-cool transition hover:text-accent"
        >
          Open share link
        </a>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </article>
  );
}
