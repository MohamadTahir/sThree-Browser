import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { controlClass, InputProps } from "./input";

/**
 * Password field with an attached show/hide button. The button sits outside
 * the text box so password managers have room for their own icon inside it.
 * Warns while Caps Lock is on.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, onKeyDown, onKeyUp, onBlur, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const [capsLock, setCapsLock] = React.useState(false);
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const capsId = capsLock ? `${inputId}-caps` : undefined;

    const readCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) =>
      setCapsLock(event.getModifierState?.("CapsLock") ?? false);

    return (
      <div className="grid gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        )}
        <div className="flex rounded-md shadow-xs">
          <input
            id={inputId}
            ref={ref}
            type={visible ? "text" : "password"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn(
              controlClass,
              "relative min-w-0 flex-1 rounded-r-none font-mono shadow-none focus-visible:z-10",
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, capsId, hintId].filter(Boolean).join(" ") || undefined}
            onKeyDown={(event) => {
              readCapsLock(event);
              onKeyDown?.(event);
            }}
            onKeyUp={(event) => {
              readCapsLock(event);
              onKeyUp?.(event);
            }}
            onBlur={(event) => {
              setCapsLock(false);
              onBlur?.(event);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="-ml-px flex w-10 shrink-0 items-center justify-center rounded-r-md border border-border-strong bg-background text-muted-foreground transition-colors duration-150 hover:bg-subtle hover:text-foreground focus-visible:z-10 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={inputId}
            title={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        {capsLock && (
          <p id={capsId} className="text-xs font-medium text-warning">
            Caps Lock is on.
          </p>
        )}
        {hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
