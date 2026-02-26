import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  return (
    <div className={cn("group relative inline-flex", className)}>
      {children}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50">
        <div className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background whitespace-nowrap shadow-lg">
          {content}
        </div>
      </div>
    </div>
  );
}
