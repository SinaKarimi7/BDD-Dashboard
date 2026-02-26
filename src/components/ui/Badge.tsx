import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "default" | "outline";
  className?: string;
  onRemove?: () => void;
}

export function Badge({
  children,
  color,
  variant = "default",
  className,
  onRemove,
}: BadgeProps) {
  const style = color
    ? { backgroundColor: `${color}20`, color, borderColor: `${color}40` }
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" && !color && "bg-primary/10 text-primary",
        variant === "outline" &&
          !color &&
          "border border-border text-muted-foreground",
        className,
      )}
      style={style}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M7.5 3.2L6.8 2.5 5 4.3 3.2 2.5 2.5 3.2 4.3 5 2.5 6.8 3.2 7.5 5 5.7 6.8 7.5 7.5 6.8 5.7 5z" />
          </svg>
        </button>
      )}
    </span>
  );
}
