import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, InputProps } from "./input";

/** Password field with a show/hide toggle. Never autocompleted into forms by the browser unless asked. */
const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className="grid gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            id={inputId}
            ref={ref}
            type={visible ? "text" : "password"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn("pr-9 font-mono", className)}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={visible ? "Hide" : "Show"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          hint && <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
