import MARChart from "../../components/mar/MARChart";

export default function MarPage() {
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
