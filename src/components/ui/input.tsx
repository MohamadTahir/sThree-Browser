import * as React from "react";

import { cn } from "@/lib/utils";

export const controlClass =
  "h-9 w-full rounded-md border border-border-strong bg-background px-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/15";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
}

/** Text input with optional label, hint, and error, wired for screen readers. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const input = (
      <input
        id={inputId}
        ref={ref}
        className={cn(controlClass, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
    );

    if (!label && !hint && !error) {
      return input;
    }

    return (
      <div className="grid gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        )}
        {input}
        {error ? (
          <p id={errorId} className="text-xs text-danger">
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className="text-xs text-muted-foreground">
              {hint}
            </p>
          )
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
