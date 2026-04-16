import type { ReactNode } from 'react';

interface ScenarioRouteFrameProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  introSlot?: ReactNode;
  rail: ReactNode;
  railClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function ScenarioRouteFrame({
  eyebrow,
  title,
  description,
  introSlot,
  rail,
  railClassName,
  footer,
  children,
}: ScenarioRouteFrameProps) {
  return (
    <div className="space-y-6">
      <section className="surface-band grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-5">
          <div className="surface-eyebrow">{eyebrow}</div>
          <div className="space-y-4">
            <h1 className="surface-title max-w-4xl text-4xl sm:text-5xl xl:text-5xl">
              {title}
            </h1>
            <div className="max-w-3xl surface-copy">{description}</div>
          </div>
          {introSlot ? <div>{introSlot}</div> : null}
        </div>

        <aside className={`surface-panel-strong ${railClassName ?? ''}`}>
          {rail}
        </aside>

        {footer ? <div className="xl:col-span-2">{footer}</div> : null}
      </section>

      {children}
    </div>
  );
}
