import { useEffect, useRef } from "react";
import { drawer, hub, padlock, relay, sieve } from "@lucasmarkes/hairline";

// Line figures for empty states (hairline). Colours come from the theme
// tokens in index.css (.empty-figure), so they follow light and dark.
//
// This mounts the plain-DOM functions rather than using the package's React
// entry: that entry builds all thirty-three components when it loads, so a
// bundle that imports it carries every figure. These five tree-shake.
const figures = {
  hub, // no connections yet
  relay, // pick a connection
  padlock, // no credential
  sieve, // filter matched nothing
  drawer, // empty folder
} as const;

export type EmptyFigureName = keyof typeof figures;

/** A decorative figure: the heading under it says the same thing. */
export default function EmptyFigure({ name }: { name: EmptyFigureName }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    // Touch screens have no hover, so there the figure acts out its answer
    // on its own (it rests under prefers-reduced-motion).
    const play = window.matchMedia("(hover: none)").matches;
    const figure = figures[name](host.current, { intensity: 0.6, play });
    return () => figure.destroy();
  }, [name]);

  return <div ref={host} aria-hidden="true" className="empty-figure aspect-[5/4] w-64 max-w-full sm:w-80" />;
}
