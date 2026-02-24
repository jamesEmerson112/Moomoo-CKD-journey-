import type { Metadata } from "next";

import { ClientErrorMonitor } from "@/components/client-error-monitor";
import { TopNav } from "@/components/top-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Momoo Journey Monitor",
  description: "Public read-only CKD journey dashboard powered by content files"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-display">
        <ClientErrorMonitor />
        <TopNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
