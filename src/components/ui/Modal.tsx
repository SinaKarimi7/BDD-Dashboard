import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFocusable, trapFocusIndex } from "@/lib/focus";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

// Popups like the Select list live in a portal outside the dialog; focus
// there is fine and shouldn't be pulled back.
function inPopup(el: Element | null) {
  return !!el?.closest("[role=listbox]");
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Move focus in on open, keep Tab inside, and give focus back on close
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;

    // Leave focus alone if a field inside already took it (autoFocus)
    if (!dialog.contains(document.activeElement)) {
      (getFocusable(dialog)[0] ?? dialog).focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || inPopup(e.target as Element)) return;
      const items = getFocusable(dialog);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = trapFocusIndex(current, items.length, e.shiftKey);
      if (next !== null) {
        e.preventDefault();
        items[next].focus();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (!target || dialog.contains(target) || inPopup(target)) return;
      (getFocusable(dialog)[0] ?? dialog).focus();
    };

    document.addEventListener("keydown", handleTab);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleTab);
      document.removeEventListener("focusin", handleFocusIn);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            ref={overlayRef}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "relative z-50 w-full rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none",
              size === "sm" && "max-w-md",
              size === "md" && "max-w-lg",
              size === "lg" && "max-w-2xl",
              size === "xl" && "max-w-5xl",
              className,
            )}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
