import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?returnTo=/staff");
    return <StaffClient />;
}
