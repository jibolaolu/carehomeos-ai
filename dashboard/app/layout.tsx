import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "../components/shell/AppShell";
import { createSessionSummary, getAuthSession } from "../lib/auth-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareHomeOS Dashboard",
  description: "Care home operations, clinical risk, eMAR, finance, and CQC readiness workspace",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getAuthSession();
  const initialUser = session ? createSessionSummary(session) : null;

  return (
    <html lang="en">
      <body>
        <AppShell initialUser={initialUser}>{children}</AppShell>
      </body>
    </html>
  );
}
