import { Badge } from "@/components/ui/badge";
import type { ResolutionItem } from "@/lib/consignments/schema";
import { cn } from "@/lib/utils";

const OUTCOME: Record<ResolutionItem["outcome"], { label: string; className: string }> = {
  changed: { label: "Changed", className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  added: { label: "Added", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  removed: { label: "Removed", className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200" },
  unchanged: { label: "Kept as is", className: "bg-muted text-muted-foreground" },
  unresolved: { label: "Still open", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
};

/** One line per settled point, with the comments it came from. Used by both sides. */
export function ResolutionList({
  items,
  commentText,
}: {
  items: ResolutionItem[];
  commentText: Record<string, { author: string; body: string }>;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No discussed points to report.</p>;
  const order: ResolutionItem["outcome"][] = ["unresolved", "changed", "added", "removed", "unchanged"];
  const sorted = [...items].sort((a, b) => order.indexOf(a.outcome) - order.indexOf(b.outcome));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((r, i) => (
        <li
          key={`${r.key}-${i}`}
          className={cn("rounded-lg border p-3 text-sm", r.outcome === "unresolved" && "border-amber-300 dark:border-amber-900")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.label}</span>
            <Badge variant="outline" className={cn("border-transparent", OUTCOME[r.outcome].className)}>
              {OUTCOME[r.outcome].label}
            </Badge>
            {r.outcome !== "unresolved" && (
              <span
                className={cn(
                  "text-xs",
                  r.basis === "brand_decision" ? "font-medium text-violet-700 dark:text-violet-300" : "text-muted-foreground",
                )}
              >
                {r.basis === "brand_decision" ? "Brand's decision" : "Agreed in discussion"}
              </span>
            )}
          </div>
          <p className="mt-1">{r.summary}</p>
          {r.sourceCommentIds.some((id) => commentText[id]) && (
            <div className="mt-2 flex flex-col gap-1 border-l-2 pl-3 text-xs text-muted-foreground">
              {r.sourceCommentIds
                .filter((id) => commentText[id])
                .map((id) => (
                  <p key={id}>
                    <span className="font-medium text-foreground">{commentText[id].author}:</span> &ldquo;{commentText[id].body}&rdquo;
                  </p>
                ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
