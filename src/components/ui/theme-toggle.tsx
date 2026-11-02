import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { getThemePreference, setThemePreference, ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Three-way segmented control: follow the system, or force light or dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemePreference>("system");

  useEffect(() => setTheme(getThemePreference()), []);

  const choose = (value: ThemePreference) => {
    setTheme(value);
    setThemePreference(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("inline-flex rounded-lg border bg-muted/60 p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-md transition-[background-color,color,box-shadow] duration-150",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
