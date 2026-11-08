import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const DEAL_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Awaiting creator",
  negotiating: "In discussion",
  awaiting_acceptance: "Final agreement sent",
  final: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Closed",
};

const STYLE: Record<string, string> = {
  sent: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  negotiating: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  awaiting_acceptance: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  final: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  in_progress: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  completed: "bg-muted text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function DealStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STYLE[status])}>
      {DEAL_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
