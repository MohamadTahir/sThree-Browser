import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useConfig } from "@/context/config";
import { Group } from "@/models/types";
import { cn, errorMessage } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const GROUP_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#16a34a" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Grey", value: "#6b7280" },
];

export default function GroupDialog({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: Group | null;
  onClose: () => void;
}) {
  const { saveGroup } = useConfig();
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setColor(group?.color ?? GROUP_COLORS[0].value);
    setError(null);
  }, [open, group]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the group a name.");
      return;
    }
    setSaving(true);
    try {
      await saveGroup({
        id: group?.id ?? crypto.randomUUID(),
        name: name.trim(),
        color,
        active: group?.active ?? true,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{group ? "Edit group" : "New group"}</DialogTitle>
            <DialogDescription>Groups organise connections in the sidebar.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input
              label="Name"
              placeholder="Production"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
              autoFocus
            />
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    aria-label={c.name}
                    aria-pressed={color === c.value}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
                      color === c.value && "ring-2 ring-foreground/70",
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {color === c.value && <Check className="size-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </fieldset>
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {group ? "Save" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
