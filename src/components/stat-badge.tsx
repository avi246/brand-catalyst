import { BadgeCheck, PenLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Source = "self" | "verified" | "owner";

const COPY: Record<Source, { label: string; tip: string; icon: typeof PenLine }> = {
  self: {
    label: "Self-reported",
    tip: "Entered by the creator. Not checked by Brand Catalyst.",
    icon: PenLine,
  },
  verified: {
    label: "Verified",
    tip: "Fetched by Brand Catalyst from the platform's official API.",
    icon: BadgeCheck,
  },
  owner: {
    label: "Owner-connected",
    tip: "The creator connected their account; includes private analytics.",
    icon: ShieldCheck,
  },
};

/** Shown next to every stat so nobody mistakes a typed number for a checked one. */
export function StatSourceBadge({ source, syncedAt }: { source: Source; syncedAt?: Date | null }) {
  const { label, tip, icon: Icon } = COPY[source];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant={source === "self" ? "outline" : "secondary"} className="cursor-default">
            <Icon data-icon="inline-start" />
            {label}
          </Badge>
        }
      />
      <TooltipContent>
        {tip}
        {syncedAt ? ` Synced ${syncedAt.toLocaleString()}.` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
