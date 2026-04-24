import { finance } from "../../lib/demo-data";

const financeCards = [
  { label: "Occupancy", value: finance.occupancy, note: "Across nursing and residential beds", tone: "success" },
  { label: "Monthly revenue", value: finance.revenue, note: "Booked across local authority and self-funder invoices", tone: "default" },
  { label: "Invoices due", value: String(finance.invoicesDue), note: "Require chase or payment-link follow-up this week", tone: "warning" },
  { label: "Payroll readiness", value: "92%", note: "Agency and overtime files nearly ready for export", tone: "default" },
];

const invoiceQueue = [
  ["Oakfield House LA batch", finance.laBatch, "Awaiting final approval", "Today 16:00"],
  ["Self-funder invoice run", finance.selfFunders, "Payment links queued", "Tomorrow 09:00"],
  ["Top-up fees", "GBP 18.6k", "3 invoices overdue", "Today 12:00"],
];

const financeInsights = [
  ["Average weekly fee", "GBP 1,084", "Up 3.2% month on month"],
  ["Agency spend", "GBP 12.4k", "Below rota pressure threshold"],
  ["Unbilled care extras", "GBP 4.1k", "Ready for manager sign-off"],
];

const financeActions = [
  ["Overdue self-funder reminders", "3 accounts", "Send payment links and note the contact outcome."],
  ["Payroll variance review", "2 shifts", "Bank-hour corrections are waiting for home admin approval."],
  ["Local authority export pack", "Ready", "Submit before the council funding window closes."],
];

function renderMoney(value: string) {
  if (!value.startsWith("GBP ")) return <span className="moneyValue">{value}</span>;
  return (
    <span className="moneyValue moneyInline">
      <span className="moneyCurrency">GBP</span>
      <span className="moneyAmount">{value.replace("GBP ", "")}</span>
    </span>
  );
}

export default function FinancePage() {
  return (
    <section className="stack financePage">
      <div className="hero financeHero">
        <div>
          <span className="badge">Finance operations</span>
          <h2 className="pageTitle">Occupancy, invoicing, and payroll exports</h2>
          <p className="pageLead">Monitor occupancy economics, invoice batches, self-funder payments, payroll readiness, and finance action queues in one calmer view.</p>
        </div>
        <div className="financeHeroAside">
          <span className="metricLabel">Cash collection focus</span>
          <strong>9 invoices need action</strong>
          <p className="muted">Manager and finance teams can prioritise overdue, pending, and export-ready items.</p>
        </div>
      </div>

      <section className="metrics financeMetrics">
        {financeCards.map((card) => (
          <article className="metricTile financeMetricTile" key={card.label}>
            <div>
              <p className="metricLabel">{card.label}</p>
              <div className="metricValue">{card.value.startsWith("GBP ") ? renderMoney(card.value) : card.value}</div>
              <p className="muted">{card.note}</p>
            </div>
            <span className={card.tone === "success" ? "badge success" : card.tone === "warning" ? "badge warning" : "badge"}>{card.tone === "warning" ? "Action" : "Live"}</span>
          </article>
        ))}
      </section>

      <section className="split financeSplit">
        <div className="card financeCardLarge">
          <div className="listItem">
            <h3 className="sectionTitle">Invoice and export queue</h3>
            <span className="badge">This week</span>
          </div>
          <div className="financeQueue">
            {invoiceQueue.map(([label, value, status, due]) => (
              <div className="financeQueueRow" key={label}>
                <div>
                  <strong>{label}</strong>
                  <p className="muted">{status}</p>
                </div>
                <div className="financeValueBlock">
                  <strong>{renderMoney(value)}</strong>
                  <p className="muted">Due {due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="card financeCardSide">
          <h3 className="sectionTitle">Financial insights</h3>
          <ul className="list financeInsightList">
            {financeInsights.map(([label, value, note]) => (
              <li className="listItem financeInsightRow" key={label}>
                <span><strong>{label}</strong><br /><span className="muted">{note}</span></span>
                <strong>{renderMoney(value)}</strong>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="split financeSplitSecondary">
        <div className="card financeCardLarge">
          <div className="listItem">
            <h3 className="sectionTitle">Collection and payroll action board</h3>
            <span className="badge warning">Needs attention</span>
          </div>
          <div className="financeActionGrid">
            {financeActions.map(([label, count, note]) => (
              <article className="financeActionCard" key={label}>
                <span className="metricLabel">{label}</span>
                <strong>{count}</strong>
                <p className="muted">{note}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="card financeCardSide financeCardTall">
          <h3 className="sectionTitle">Month-end readiness</h3>
          <div className="financeReadinessList">
            <div className="financeReadinessRow"><span>Occupancy closeout</span><strong>Complete</strong></div>
            <div className="financeReadinessRow"><span>Funding submissions</span><strong>1 pending</strong></div>
            <div className="financeReadinessRow"><span>Payroll export</span><strong>92% ready</strong></div>
            <div className="financeReadinessRow"><span>Management pack</span><strong>Drafting</strong></div>
          </div>
        </aside>
      </section>

      <section className="tableWrap">
        <table>
          <thead>
            <tr><th>Ledger stream</th><th>Status</th><th>Amount</th><th>Action owner</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Local authority funding</strong><br /><span className="muted">Weekly council submission pack</span></td><td><span className="badge success">Ready</span></td><td>{renderMoney(finance.laBatch)}</td><td>Finance lead</td></tr>
            <tr><td><strong>Self-funder payments</strong><br /><span className="muted">Stripe payment links and reminders</span></td><td><span className="badge warning">Review</span></td><td>{renderMoney(finance.selfFunders)}</td><td>Home admin</td></tr>
            <tr><td><strong>Payroll export</strong><br /><span className="muted">Hours, overtime, and bank staff costs</span></td><td><span className="badge">In progress</span></td><td>{renderMoney("GBP 54.8k")}</td><td>Payroll team</td></tr>
          </tbody>
        </table>
      </section>
    </section>
  );
}
