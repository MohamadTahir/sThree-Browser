import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import FileExplorer from "./FileExplorer";

const WIDTH_KEY = "sthree-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

const clamp = (width: number) => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));

function savedWidth(): number {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return value ? clamp(value) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function saveWidth(width: number) {
  try {
    if (width === DEFAULT_WIDTH) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    /* storage unavailable: the width lasts for this session only */
  }
}

/** Unlocked layout: resizable sidebar plus explorer. Below md the sidebar becomes a drawer. */
export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [width, setWidth] = useState(savedWidth);

  const resize = (next: number) => {
    const value = clamp(next);
    setWidth(value);
    saveWidth(value);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 md:hidden",
          navOpen ? "block" : "hidden",
        )}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />
      <div
        style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] transition-transform duration-200 ease-out md:relative md:z-auto md:w-(--sidebar-width) md:shrink-0 md:translate-x-0",
          navOpen ? "translate-x-0 shadow-dialog" : "-translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
        <ResizeHandle width={width} onResize={resize} />
      </div>
      <FileExplorer onOpenNav={() => setNavOpen(true)} />
    </div>
  );
}

/** Drag, arrow keys (Shift for bigger steps), Home/End; double-click resets. */
function ResizeHandle({ width, onResize }: { width: number; onResize: (width: number) => void }) {
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;
    setDragging(true);
    window.getSelection()?.removeAllRanges();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (move: PointerEvent) => onResize(startWidth + move.clientX - startX);
    const onUp = () => {
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 48 : 16;
    const next =
      event.key === "ArrowLeft" ? width - step
      : event.key === "ArrowRight" ? width + step
      : event.key === "Home" ? MIN_WIDTH
      : event.key === "End" ? MAX_WIDTH
      : null;
    if (next === null) return;
    event.preventDefault();
    onResize(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown}
      onMouseDown={(event) => event.preventDefault()}
      onDoubleClick={() => onResize(DEFAULT_WIDTH)}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-hidden md:block"
    >
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors duration-150",
          dragging
            ? "bg-primary"
            : "bg-transparent group-hover:bg-border-strong group-focus-visible:bg-primary",
        )}
      />
    </div>
  );
}
