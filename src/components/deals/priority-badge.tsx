import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABEL, type Priority } from "@/lib/consignments/schema";
import { cn } from "@/lib/utils";

const STYLE: Record<Priority, string> = {
  mandatory: "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  negotiable: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  preferred: "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STYLE[priority], className)}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
