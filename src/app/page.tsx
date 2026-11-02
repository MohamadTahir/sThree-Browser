"use client";

import { Slide, ToastContainer } from "react-toastify";
import { ContextProvider, useConfig } from "@/context/config";
import VaultGate from "@/components/VaultGate";
import AppShell from "@/components/AppShell";

function Root() {
  const { status } = useConfig();
  if (status === "loading") {
    return null;
  }
  return status === "unlocked" ? <AppShell /> : <VaultGate />;
}

export default function Home() {
  return (
    <ContextProvider>
      <Root />
      <ToastContainer
        limit={4}
        position="bottom-right"
        autoClose={4000}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        transition={Slide}
      />
    </ContextProvider>
  );
}
