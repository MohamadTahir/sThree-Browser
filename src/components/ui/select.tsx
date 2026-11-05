import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { controlClass } from "./input";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading visual, such as a colour dot. */
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const LIST_GAP = 4;
const MAX_LIST_HEIGHT = 264;

/**
 * Custom select (ARIA combobox + listbox). Focus stays on the trigger and
 * the active option is announced through aria-activedescendant, so it works
 * inside modal dialogs. The list renders in a portal, positioned against the
 * trigger, so dialog overflow can't clip it.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  hint,
  error,
  placeholder = "Choose…",
  disabled,
  id,
  className,
}: SelectProps) {
  const autoId = React.useId();
  const triggerId = id ?? autoId;
  const labelId = `${triggerId}-label`;
  const listId = `${triggerId}-list`;
  const noteId = `${triggerId}-note`;

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const typeahead = React.useRef({ text: "", timer: 0 });

  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [position, setPosition] = React.useState<React.CSSProperties>({});

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = Math.min(MAX_LIST_HEIGHT, options.length * 36 + 8);
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const flip = below < height + LIST_GAP && above > below;
    setPosition({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      ...(flip
        ? { bottom: window.innerHeight - rect.top + LIST_GAP }
        : { top: rect.bottom + LIST_GAP }),
      maxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, (flip ? above : below) - 16)),
    });
  }, [options.length]);

  const openList = (index = selectedIndex) => {
    if (disabled) return;
    place();
    setActive(nextEnabled(index < 0 ? 0 : index, 1, true));
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  // Index of the next enabled option from `start` in `step` direction.
  function nextEnabled(start: number, step: 1 | -1, inclusive = false): number {
    for (let i = inclusive ? start : start + step; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) return i;
    }
    return inclusive ? -1 : start;
  }

  // Close on outside press; follow the trigger on scroll and resize.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Keep the active option in view.
  React.useEffect(() => {
    if (open && active >= 0) {
      listRef.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        if (!open) openList();
        else setActive((i) => nextEnabled(i, step));
        break;
      }
      case "Home":
      case "End":
        if (open) {
          event.preventDefault();
          setActive(
            event.key === "Home"
              ? nextEnabled(0, 1, true)
              : nextEnabled(options.length - 1, -1, true),
          );
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Escape":
        if (open) {
          // Close just the list, not the dialog around it.
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
      default:
        // Type to jump to an option by its label.
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          const state = typeahead.current;
          window.clearTimeout(state.timer);
          state.text += event.key.toLowerCase();
          state.timer = window.setTimeout(() => (state.text = ""), 600);
          const match = options.findIndex(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(state.text),
          );
          if (match >= 0) {
            if (open) setActive(match);
            else onChange(options[match].value);
          }
        }
    }
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          controlClass,
          "flex items-center gap-2 pr-2.5 text-left",
          open && "border-primary ring-4 ring-primary/15",
        )}
      >
        {selected?.icon}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground/80")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {(error || hint) && (
        <p id={noteId} className={cn("text-xs", error ? "text-danger" : "text-muted-foreground")}>
          {error ?? hint}
        </p>
      )}

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            data-floating=""
            // Modal dialogs disable pointer events on the page; the list
            // lives outside the dialog, so opt back in.
            style={{ ...position, pointerEvents: "auto" }}
            className="z-70 overflow-y-auto rounded-lg border bg-raised gloss p-1 shadow-popover animate-in fade-in-0 zoom-in-[0.98] duration-100"
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => !option.disabled && setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex h-9 cursor-default select-none items-center gap-2 rounded-md px-2.5 text-sm",
                    index === active && "bg-muted",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="size-4 shrink-0 text-primary-text" aria-hidden />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
