import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Monitor,
  Moon,
  Settings2,
  LockKeyhole,
  Sun,
} from "lucide-react";
import { useConfig } from "@/context/config";
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
    <div className="flex h-14 shrink-0 items-center gap-1 border-t pl-4 pr-2">
      <VaultStatus />
      <Button
        size="sm"
        variant="quiet"
        className="h-8 gap-1.5 px-2.5"
        onClick={() => lock()}
        title="Lock now and clear decrypted keys from memory"
      >
        <Lock className="!size-3.5" /> Lock
      </Button>
      <Menu onOpenChange={(open) => open && setTheme(getThemePreference())}>
        <MenuTrigger asChild>
          <Button variant="quiet" size="icon-sm" aria-label="Settings" title="Settings">
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
        </MenuContent>
      </Menu>
    </div>
  );
}

function VaultStatus() {
  const { getLockDeadline } = useConfig();
  const [minutes, setMinutes] = useState<number | null>(null);

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
      className="flex min-w-0 flex-1 items-center gap-2.5"
      title="Your vault is unlocked. It locks itself after 15 minutes without activity."
    >
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-success" />
        <span className="absolute -inset-1 rounded-full bg-success/20" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-medium">Vault unlocked</p>
        <p className="truncate text-xs text-muted-foreground tabular">
          {minutes !== null ? `Locks in ${minutes} min` : "Encrypted on this device"}
        </p>
      </div>
    </div>
  );
}
