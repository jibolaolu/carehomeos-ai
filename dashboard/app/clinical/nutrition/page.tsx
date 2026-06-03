import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import NutritionClient from "./NutritionClient";

export default async function NutritionPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/nutrition");
  return <NutritionClient />;
}
