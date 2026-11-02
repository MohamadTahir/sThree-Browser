import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Custom checkbox: a real button with role="checkbox", label included. */
export function Checkbox({ checked, onCheckedChange, label, description, disabled }: CheckboxProps) {
  const id = React.useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border shadow-xs transition-[background-color,border-color] duration-150 disabled:opacity-50",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-strong bg-background hover:border-muted-foreground/50",
        )}
      >
        <Check
          className={cn("size-3.5 transition-transform duration-150", checked ? "scale-100" : "scale-0")}
          strokeWidth={3}
          aria-hidden
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none text-sm">
        <span className="font-medium">{label}</span>
        {description && (
          <span id={`${id}-desc`} className="block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </label>
    </div>
  );
}
