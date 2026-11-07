import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Monitor,
  Moon,
  Settings2,
  LockKeyhole,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useConfig } from "@/context/config";
import { openExternal, PRIVACY_URL } from "@/lib/tauri";
import { getThemePreference, setThemePreference, ThemePreference } from "@/lib/theme";
import { Button } from "../ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";

type Action = "import" | "export" | "password";

/** Vault status and Lock on the left, everything rarely used behind Settings. */
export default function SidebarFooter({ onAction }: { onAction: (action: Action) => void }) {
  const { configs, lock } = useConfig();
  const hasConnections = Object.keys(configs.buckets).length > 0;
  const [theme, setTheme] = useState<ThemePreference>("system");

  return (
    <div className="m-2.5 flex shrink-0 items-center gap-1 rounded-2xl border bg-raised gloss py-2.5 pl-2.5 pr-1">
      <VaultStatus />
      <Button
        size="sm"
        variant="secondary"
        className="h-[30px] gap-1.5 px-2"
        onClick={() => lock()}
        title="Lock now and clear decrypted keys from memory"
      >
        <Lock className="size-3.5!" /> Lock
      </Button>
      <Menu onOpenChange={(open) => open && setTheme(getThemePreference())}>
        <MenuTrigger asChild>
          <Button variant="quiet" size="icon-sm" className="size-7" aria-label="Settings" title="Settings">
            <Settings2 />
          </Button>
        </MenuTrigger>
        <MenuContent side="top" align="end" className="w-[232px]">
          <MenuItem onSelect={() => onAction("password")}>
            <LockKeyhole /> Change master password…
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => onAction("import")}>
            <ArrowDownToLine /> Import settings…
          </MenuItem>
          <MenuItem disabled={!hasConnections} onSelect={() => onAction("export")}>
            <ArrowUpFromLine /> Export settings…
          </MenuItem>
          <MenuSeparator />
          <MenuLabel>Theme</MenuLabel>
          <MenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              const next = value as ThemePreference;
              setTheme(next);
              setThemePreference(next);
            }}
          >
            <MenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>
              <Monitor /> System
            </MenuRadioItem>
            <MenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>
              <Sun /> Light
            </MenuRadioItem>
            <MenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>
              <Moon /> Dark
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem onSelect={() => void openExternal(PRIVACY_URL)}>
            <ShieldCheck /> Privacy &amp; terms
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function VaultStatus() {
  const { getLockDeadline } = useConfig();
  const [minutes, setMinutes] = useState<number | null>(null);
  // How much of the idle window is left, for the ring (the timer is 15 min).
  const left = minutes === null ? 1 : Math.min(1, minutes / 15);
  const circumference = 2 * Math.PI * 14;

  useEffect(() => {
    const tick = () => {
      const deadline = getLockDeadline();
      setMinutes(deadline ? Math.max(1, Math.ceil((deadline - Date.now()) / 60000)) : null);
    };
    // First tick after the auto-lock timer (armed in a parent effect) has started.
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 10_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [getLockDeadline]);

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-1.5"
      title="Your vault is unlocked. It locks itself after 15 minutes without activity."
    >
      <svg viewBox="0 0 34 34" className="size-[30px] shrink-0" aria-hidden>
        <circle cx="17" cy="17" r="14" fill="none" strokeWidth="3.5" className="stroke-muted" />
        <circle
          cx="17"
          cy="17"
          r="14"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - left)}
          transform="rotate(-90 17 17)"
          className="stroke-success transition-[stroke-dashoffset] duration-700"
        />
        <g fill="none" strokeWidth="1.8" className="stroke-muted-foreground">
          <rect x="12" y="16" width="10" height="8" rx="2" />
          <path d="M14 16v-2a3 3 0 0 1 6 0v2" />
        </g>
      </svg>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold">Vault unlocked</p>
        <p className="truncate text-xs text-muted-foreground tabular">
          {minutes !== null ? `Locks in ${minutes} min` : "Encrypted on this device"}
        </p>
      </div>
    </div>
  );
}
