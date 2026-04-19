"use client";

import { ContextProvider } from "@/context/config";
import { AuthGuard } from "@/context/authGuard";
import dynamic from "next/dynamic";
import { StrictMode } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Flip, ToastContainer } from "react-toastify";
import FileExplorer from "@/components/FileExplorer";
import Sidebar from "@/components/Sidebar";



export default function Home() {
  return <>
    <StrictMode>
      <HelmetProvider>

        <Helmet>
          <title>Backup Management System for different applications</title>
          <meta name="description" content="Backup Management System for different applications" />
        </Helmet>

        <AuthGuard>
          <ContextProvider>
            <div className="flex h-screen overflow-hidden bg-background relative">
              <Sidebar/>
              <FileExplorer />
            </div>
          </ContextProvider>
        </AuthGuard>

        <ToastContainer
          limit={3}
          pauseOnFocusLoss={false}
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick={true}
          rtl={false}
          draggable={true}
          pauseOnHover={false}
          theme="dark"
          transition={Flip}
          className="font-sans"
        />

      </HelmetProvider>
    </StrictMode>
  </>
}
