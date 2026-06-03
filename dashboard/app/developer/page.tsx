import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAuthSession } from "../../lib/auth-session";
import DeveloperClient from "./DeveloperClient";

export const metadata: Metadata = {
  title: "Developer Portal — CareHomeOS",
};

export default async function DeveloperPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/developer");
  if (session.role !== "super_admin") redirect("/dashboard");
  return <DeveloperClient />;
}
