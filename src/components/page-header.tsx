export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  milestone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  milestone?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-background px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <h2 className="font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {milestone && (
        <span className="text-xs text-muted-foreground/80">Coming in {milestone}</span>
      )}
    </div>
  );
}
