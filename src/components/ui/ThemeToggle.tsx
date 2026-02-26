import { Sun, Moon, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeStore, type ThemeMode } from "@/store/theme";
import { cn } from "@/lib/utils";
import { easing, duration } from "@/lib/motion";

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export function ThemeToggle({
  collapsed = false,
  className,
}: ThemeToggleProps) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (collapsed) {
    // Cycle through modes on click when sidebar is collapsed
    const cycle = () => {
      const order: ThemeMode[] = ["light", "dark", "system"];
      const next = order[(order.indexOf(mode) + 1) % order.length];
      setMode(next);
    };

    const current = modes.find((m) => m.value === mode)!;
    const Icon = current.icon;

    return (
      <button
        onClick={cycle}
        className={cn(
          "rounded-lg p-2 hover:bg-accent transition-colors text-muted-foreground cursor-pointer",
          className,
        )}
        title={`Theme: ${current.label}`}
      >
        <motion.div
          key={mode}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: duration.normal, ease: easing.spring }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-lg bg-muted p-1 gap-0.5",
        className,
      )}
    >
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={cn(
            "relative flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            mode === value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          title={label}
        >
          {mode === value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 rounded-md bg-background shadow-sm"
              transition={{ duration: duration.normal, ease: easing.apple }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
