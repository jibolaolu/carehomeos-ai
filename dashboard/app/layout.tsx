import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "../components/shell/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareHomeOS Dashboard",
  description: "Care home operations, clinical risk, eMAR, finance, and CQC readiness workspace",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
