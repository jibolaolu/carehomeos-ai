import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import MARChart from "../../components/mar/MARChart";

export default async function MarPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?returnTo=/mar");
    return (
        <section className="stack">
            <div className="hero">
                <span className="badge danger">Medication safety</span>
                <h2 className="pageTitle">Medication administration</h2>
                <p className="pageLead">Track due, administered, and omitted medication rounds with audit-ready recording.</p>
            </div>
            <MARChart />
        </section>
    );
}
