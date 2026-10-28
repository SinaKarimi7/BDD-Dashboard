import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { dropdownTransition, dropdownVariants } from "@/lib/motion";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  // Extra classes for this option in the list and in the trigger
  className?: string;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  error?: string;
  id?: string;
  // "inline" is a compact trigger without a box, e.g. a step keyword
  variant?: "default" | "inline";
  // Shows a filter box; meant for long lists
  searchable?: boolean;
  icon?: ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}

const MAX_LIST_HEIGHT = 288;
const GAP = 4;

interface Position {
  left: number;
  minWidth: number;
  maxWidth: number;
  top?: number;
  bottom?: number;
  placement: "below" | "above";
}

// The list is rendered in a portal with fixed positioning so cards with
// overflow-hidden and modals don't clip it.
function measure(trigger: HTMLElement): Position {
  const rect = trigger.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  const above = rect.top;
  const placement =
    below < Math.min(MAX_LIST_HEIGHT, 200) && above > below ? "above" : "below";
  return {
    left: rect.left,
    minWidth: rect.width,
    maxWidth: window.innerWidth - rect.left - 8,
    placement,
    ...(placement === "below"
      ? { top: rect.bottom + GAP }
      : { bottom: window.innerHeight - rect.top + GAP }),
  };
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  label,
  error,
  id,
  variant = "default",
  searchable = false,
  icon,
  className,
  title,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-option-${i}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);

  const selected = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const openList = useCallback(() => {
    if (!triggerRef.current) return;
    setPosition(measure(triggerRef.current));
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = (option: SelectOption<T> | undefined) => {
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    close();
  };

  // Focus the filter box or the list once it is open
  useLayoutEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus({
      preventScroll: true,
    });
  }, [open, searchable]);

  // Keep the active option visible
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${autoId}-option-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, visible, autoId]);

  // Follow the trigger on scroll and resize; close on outside clicks
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) setPosition(measure(triggerRef.current));
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !listRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close(false);
      }
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    const last = visible.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(last);
        return;
      case "Enter":
        e.preventDefault();
        choose(visible[active]);
        return;
      case "Escape":
        // Don't let a surrounding modal close too
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case "Tab":
        close(false);
        return;
    }
    // Type to jump to an option when there's no filter box
    if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 600 ? e.key : t.text + e.key;
      t.at = now;
      const match = visible.findIndex((o) =>
        o.label.toLowerCase().startsWith(t.text.toLowerCase()),
      );
      if (match >= 0) setActive(match);
    }
  };

  const listStyle: CSSProperties | undefined = position
    ? {
        position: "fixed",
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        minWidth: position.minWidth,
        maxWidth: position.maxWidth,
        transformOrigin: position.placement === "below" ? "top" : "bottom",
      }
    : undefined;

  const inline = variant === "inline";

  return (
    <div className={cn(!inline && "space-y-2", inline && "inline-flex")}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        title={title}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "cursor-pointer text-left focus-visible:outline-none",
          inline
            ? "inline-flex items-center gap-0.5 rounded bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
            : "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          error && "border-destructive",
          selected?.className,
          className,
        )}
      >
        {icon}
        <span className="flex-1 truncate">{selected?.label ?? value}</span>
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            inline ? "w-3 h-3" : "w-4 h-4",
            open && "rotate-180",
          )}
        />
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.div
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={triggerId}
              aria-activedescendant={
                visible[active] ? optionId(active) : undefined
              }
              onKeyDown={onListKeyDown}
              style={listStyle}
              variants={dropdownVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={dropdownTransition}
              className="z-[60] flex flex-col rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
            >
              {searchable && (
                <div className="relative mb-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onListKeyDown}
                    placeholder="Search…"
                    aria-label="Filter options"
                    aria-controls={listId}
                    className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: MAX_LIST_HEIGHT }}
              >
                {visible.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No matches
                  </div>
                )}
                {visible.map((option, i) => {
                  const isSelected = option.value === value;
                  return (
                    <div
                      key={option.value}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSelected}
                      onMouseMove={() => setActive(i)}
                      // Keep focus in the list while clicking
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(option)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                        i === active && "bg-accent",
                        option.className,
                      )}
                    >
                      <span className="flex-1">{option.label}</span>
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isSelected ? "text-primary" : "invisible",
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
