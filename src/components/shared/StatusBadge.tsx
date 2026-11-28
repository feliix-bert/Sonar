import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  XCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { ProcessingStatus, ReviewStatus } from "@/types/database";

type StatusKind = ReviewStatus | ProcessingStatus | "verified_block" | "ai_draft";

const STATUS_MAP: Record<
  StatusKind,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  verified: {
    label: "Verified by Reviewer",
    className:
      "border-success/35 bg-success/12 text-success dark:border-success/45 dark:bg-success/18",
    icon: CheckCircle2,
  },
  verified_block: {
    label: "Verified",
    className:
      "border-success/35 bg-success/12 text-success dark:border-success/45 dark:bg-success/18",
    icon: CheckCircle2,
  },
  unreviewed: {
    label: "AI Draft (Unverified)",
    className:
      "border-warning/40 bg-warning/12 text-warning dark:border-warning/45 dark:bg-warning/18",
    icon: Sparkles,
  },
  ai_draft: {
    label: "Auto-Generated (Unverified)",
    className:
      "border-warning/40 bg-warning/12 text-warning dark:border-warning/45 dark:bg-warning/18",
    icon: Sparkles,
  },
  in_review: {
    label: "In Volunteer Review",
    className:
      "border-info/40 bg-info/12 text-info dark:border-info/45 dark:bg-info/18",
    icon: Eye,
  },
  needs_revision: {
    label: "Needs Revision",
    className:
      "border-warning/50 bg-warning/15 text-warning dark:border-warning/55 dark:bg-warning/20",
    icon: AlertTriangle,
  },
  queued: {
    label: "Queued",
    className: "border-border bg-muted text-foreground",
    icon: Clock,
  },
  extracting: {
    label: "Extracting PDF",
    className: "border-info/40 bg-info/12 text-info",
    icon: Clock,
  },
  ocr: {
    label: "Running OCR",
    className: "border-info/40 bg-info/12 text-info",
    icon: Clock,
  },
  structuring: {
    label: "Structuring Blocks",
    className: "border-info/40 bg-info/12 text-info",
    icon: Clock,
  },
  enriching: {
    label: "Narrating Math & Figures",
    className: "border-info/40 bg-info/12 text-info",
    icon: Sparkles,
  },
  embedding: {
    label: "Indexing for Q&A",
    className: "border-info/40 bg-info/12 text-info",
    icon: Clock,
  },
  completed: {
    label: "Ready",
    className: "border-success/35 bg-success/12 text-success",
    icon: CheckCircle2,
  },
  failed: {
    label: "Conversion Failed",
    className: "border-destructive/40 bg-destructive/12 text-destructive",
    icon: XCircle,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKind;
  className?: string;
}) {
  const config = STATUS_MAP[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
