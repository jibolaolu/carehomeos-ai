import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import RotaClient from "./RotaClient";

export default async function RotaPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?returnTo=/rota");
    return <RotaClient />;
}
