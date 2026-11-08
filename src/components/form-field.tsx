import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  hint,
  errors,
  className,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {errors?.length ? <p className="text-xs text-destructive">{errors[0]}</p> : null}
    </div>
  );
}

/** A set of toggle chips backed by real checkboxes, so the values post with the form. */
export function CheckboxChips({
  name,
  options,
  defaultValues,
  labels,
}: {
  name: string;
  options: readonly string[];
  defaultValues: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="cursor-pointer rounded-full border px-3 py-1 text-sm capitalize transition-colors hover:border-foreground/30 has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
        >
          <input type="checkbox" name={name} value={opt} defaultChecked={defaultValues.includes(opt)} className="sr-only" />
          {labels?.[opt] ?? opt}
        </label>
      ))}
    </div>
  );
}
