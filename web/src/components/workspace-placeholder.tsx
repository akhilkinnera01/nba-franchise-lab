import Link from 'next/link';

interface WorkspacePlaceholderProps {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel?: string;
  primaryHref?: string;
}

export function WorkspacePlaceholder({
  eyebrow,
  title,
  body,
  primaryLabel,
  primaryHref,
}: WorkspacePlaceholderProps) {
  return (
    <div className="surface-band">
      <div className="max-w-3xl">
        <div className="surface-eyebrow">{eyebrow}</div>
        <h1 className="mt-3 surface-subtitle">{title}</h1>
        <p className="mt-4 surface-copy">{body}</p>
      </div>
      {primaryHref && primaryLabel ? (
        <Link
          href={primaryHref}
          className="mt-6 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
        >
          {primaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
