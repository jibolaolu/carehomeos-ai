import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import ResidentsClient from "./ResidentsClient";

export default async function ResidentsPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?returnTo=/residents");
    return <ResidentsClient />;
}
