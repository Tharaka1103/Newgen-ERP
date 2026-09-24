import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  name: string;
  colorToken?: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | string;
  type?: "EXPENSE" | "INCOME" | string;
  className?: string;
}

export function CategoryBadge({
  name,
  colorToken = "chart-1",
  className,
}: CategoryBadgeProps) {
  const tokenClassMap: Record<string, string> = {
    "chart-1": "bg-chart-1 text-foreground",
    "chart-2": "bg-chart-2 text-foreground",
    "chart-3": "bg-chart-3 text-foreground",
    "chart-4": "bg-chart-4 text-foreground",
    "chart-5": "bg-chart-5 text-foreground",
  };

  const dotClassMap: Record<string, string> = {
    "chart-1": "bg-chart-1",
    "chart-2": "bg-chart-2",
    "chart-3": "bg-chart-3",
    "chart-4": "bg-chart-4",
    "chart-5": "bg-chart-5",
  };

  const bgDot = dotClassMap[colorToken] || "bg-chart-1";

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 font-medium border-border/80 bg-card/60 max-w-full min-w-0 shrink overflow-hidden ${className || ""}`}
      title={name}
    >
      <span className={`size-2 shrink-0 rounded-full ${bgDot}`} />
      <span className="truncate min-w-0 flex-1">{name}</span>
    </Badge>
  );
}

export function ColorSwatchSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const swatches = [
    { token: "chart-1", label: "Chart 1" },
    { token: "chart-2", label: "Chart 2" },
    { token: "chart-3", label: "Chart 3" },
    { token: "chart-4", label: "Chart 4" },
    { token: "chart-5", label: "Chart 5" },
  ];

  const swatchClasses: Record<string, string> = {
    "chart-1": "bg-chart-1",
    "chart-2": "bg-chart-2",
    "chart-3": "bg-chart-3",
    "chart-4": "bg-chart-4",
    "chart-5": "bg-chart-5",
  };

  return (
    <div className="flex items-center gap-3">
      {swatches.map((s) => {
        const isSelected = value === s.token;
        return (
          <button
            key={s.token}
            type="button"
            onClick={() => onChange(s.token)}
            className={`group relative flex size-8 items-center justify-center rounded-full border-2 transition-all ${
              isSelected ? "border-primary scale-110 shadow-sm" : "border-border hover:scale-105"
            }`}
            title={s.label}
          >
            <span className={`size-5 rounded-full ${swatchClasses[s.token]}`} />
          </button>
        );
      })}
    </div>
  );
}
