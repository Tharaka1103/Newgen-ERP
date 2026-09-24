import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";

interface StatusBadgeProps {
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge
          variant="outline"
          className={`border-chart-2/40 bg-chart-2/15 text-foreground font-semibold inline-flex items-center gap-1 ${className || ""}`}
        >
          <CheckCircle2Icon className="size-3 text-chart-2" />
          <span>Approved</span>
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge
          variant="destructive"
          className={`inline-flex items-center gap-1 font-semibold ${className || ""}`}
        >
          <XCircleIcon className="size-3" />
          <span>Rejected</span>
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge
          variant="secondary"
          className={`inline-flex items-center gap-1 font-medium ${className || ""}`}
        >
          <ClockIcon className="size-3 text-muted-foreground" />
          <span>Pending</span>
        </Badge>
      );
  }
}
