import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { cycleIndex, getFocusable } from "@/lib/focus";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Set when the menu is opened from the keyboard so the first item gets focus
  const focusFirst = useRef(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && focusFirst.current && menuRef.current) {
      getFocusable(menuRef.current)[0]?.focus();
    }
    focusFirst.current = false;
  }, [open]);

  const focusTrigger = () => {
    if (triggerRef.current) getFocusable(triggerRef.current)[0]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && open) {
      // Don't let a surrounding modal close too
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      focusTrigger();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) {
      focusFirst.current = true;
      setOpen(true);
      return;
    }
    if (!menuRef.current) return;
    const items = getFocusable(menuRef.current);
    const current = items.indexOf(document.activeElement as HTMLElement);
    items[cycleIndex(current, items.length, e.key === "ArrowUp")]?.focus();
  };

  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (open && !ref.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <div
        ref={triggerRef}
        onClickCapture={(e) => {
          e.stopPropagation();
          // detail is 0 for clicks from Enter/Space
          if (!open && e.detail === 0) focusFirst.current = true;
          setOpen((o) => !o);
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            className={cn(
              "absolute z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-popover p-1 shadow-lg",
              align === "right" ? "right-0" : "left-0",
            )}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              // Don't leave focus on an item that's about to disappear
              focusTrigger();
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  className,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer focus-visible:outline-none",
        destructive
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "text-popover-foreground hover:bg-accent focus-visible:bg-accent",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
