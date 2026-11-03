import * as React from "react";

import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
  className?: string;
}

/**
 * Side-by-side option cards for a choice that changes what the rest of the
 * form asks for. A radio group: Tab reaches the checked card, arrows move.
 */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  choices,
  className,
}: ChoiceGroupProps<T>) {
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + choices.length) % choices.length;
    onChange(choices[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice, index) => {
          const checked = choice.value === value;
          return (
            <button
              key={choice.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-describedby={`${id}-${index}-desc`}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(choice.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left shadow-xs transition-[background-color,border-color,box-shadow] duration-150",
                checked
                  ? "border-primary bg-primary-subtle/60 ring-1 ring-primary"
                  : "border-border-strong bg-background hover:border-muted-foreground/40 hover:bg-subtle",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                  checked ? "border-primary bg-primary" : "border-border-strong bg-background",
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-primary-foreground transition-transform duration-150",
                    checked ? "scale-100" : "scale-0",
                  )}
                />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
                  {choice.icon}
                  {choice.label}
                </span>
                <span id={`${id}-${index}-desc`} className="mt-0.5 block text-xs text-muted-foreground">
                  {choice.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
