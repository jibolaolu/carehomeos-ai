import { finance } from "../../lib/demo-data";

export default function FinancePage() {
    return (
        <section className="stack">
            <div className="hero">
                <span className="badge">Finance operations</span>
                <h2 className="pageTitle">Occupancy, invoicing, and payroll exports</h2>
                <p className="pageLead">Monitor occupancy economics, invoice batches, self-funder payments, and month-end payroll readiness.</p>
            </div>
            <section className="metrics">
                <div className="metricTile"><p className="metricLabel">Occupancy</p><div className="metricValue">{finance.occupancy}</div></div>
                <div className="metricTile"><p className="metricLabel">Monthly revenue</p><div className="metricValue">{finance.revenue}</div></div>
                <div className="metricTile"><p className="metricLabel">Invoices due</p><div className="metricValue">{finance.invoicesDue}</div></div>
            </section>
            <section className="grid">
                <div className="card"><h3>Local authority batch</h3><p className="metricValue">{finance.laBatch}</p><p className="muted">Ready for finance review and export.</p></div>
                <div className="card"><h3>Self-funder invoices</h3><p className="metricValue">{finance.selfFunders}</p><p className="muted">Stripe payment links can be issued from the billing API.</p></div>
            </section>
        </section>
    );
}
