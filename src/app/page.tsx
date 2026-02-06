"use client";

import dynamic from "next/dynamic";

// Dynamically import App to ensure it's client-side only
const App = dynamic(() => import("../App"), { ssr: false });

export default function Home() {
  return <App />;
}
