import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/onboarding");
  if (session.role !== "super_admin") redirect("/dashboard");
  return <OnboardingClient />;
}
