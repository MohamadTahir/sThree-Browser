import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import FileExplorer from "./FileExplorer";

/** Unlocked layout: sidebar plus explorer. Below md the sidebar becomes a drawer. */
export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

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
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] transition-transform duration-200 ease-out md:static md:z-auto md:w-[272px] md:translate-x-0",
          navOpen ? "translate-x-0 shadow-dialog" : "-translate-x-full",
        )}
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </div>
      <FileExplorer onOpenNav={() => setNavOpen(true)} />
    </div>
  );
}
