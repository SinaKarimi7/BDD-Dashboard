import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Tags, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterTag {
  id: string;
  name: string;
  color: string;
}

interface TagFilterMultiselectProps {
  tags: FilterTag[];
  filterTags: Set<string>;
  setFilterTags: React.Dispatch<React.SetStateAction<Set<string>>>;
  placeholder?: string;
}

export function TagFilterMultiselect({
  tags,
  filterTags,
  setFilterTags,
  placeholder = "Filter by tags…",
}: TagFilterMultiselectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = useMemo(
    () => tags.filter((t) => filterTags.has(t.name)),
    [tags, filterTags],
  );

  const dropdownTags = useMemo(
    () =>
      tags.filter(
        (t) =>
          !filterTags.has(t.name) &&
          t.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [tags, filterTags, query],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTag = useCallback(
    (name: string) => {
      setFilterTags((prev) => new Set(prev).add(name));
      setQuery("");
      inputRef.current?.focus();
    },
    [setFilterTags],
  );

  const removeTag = useCallback(
    (name: string) => {
      setFilterTags((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    },
    [setFilterTags],
  );

  const clearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFilterTags(new Set());
    },
    [setFilterTags],
  );

  if (tags.length === 0) return null;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input box */}
      <div
        className="flex items-center gap-1.5 flex-wrap min-h-[34px] px-2.5 py-1 rounded-md border border-input bg-background cursor-text focus-within:ring-2 focus-within:ring-ring transition-shadow"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        <Tags className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

        {/* Chips for selected tags */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            @{tag.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag.name);
              }}
              className="hover:opacity-70 cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Search input */}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && selectedTags.length > 0) {
              removeTag(selectedTags[selectedTags.length - 1].name);
            }
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={selectedTags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />

        {/* Clear all */}
        {filterTags.size > 0 && (
          <button
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            title="Clear all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && dropdownTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg"
          >
            {dropdownTags.map((tag) => (
              <button
                key={tag.id}
                onMouseDown={(e) => {
                  // Use mousedown so it fires before the input's blur
                  e.preventDefault();
                  addTag(tag.name);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer text-left"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span>@{tag.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
