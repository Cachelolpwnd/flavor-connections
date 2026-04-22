import { type ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-5 space-y-4 ${className ?? ""}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {title && (
              <h2 className="font-serif text-base font-semibold tracking-tight" data-testid="text-section-title">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
