interface EmptyStatePanelProps {
  eyebrow: string;
  title: string;
  body: string;
}

export function EmptyStatePanel({
  eyebrow,
  title,
  body,
}: EmptyStatePanelProps) {
  return (
    <section className="surface-band">
      <div className="max-w-3xl">
        <div className="surface-eyebrow">{eyebrow}</div>
        <h2 className="mt-3 surface-subtitle">{title}</h2>
        <p className="mt-4 surface-copy">{body}</p>
      </div>
    </section>
  );
}
