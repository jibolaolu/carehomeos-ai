import { cqc } from "../../lib/demo-data";

export default function InspectionPackBuilder() {
  return (
    <div className="card">
      <div className="pageHeader">
        <div>
          <h3 className="sectionTitle">Inspection pack builder</h3>
          <p className="muted">Evidence register, action plan trail, and key-question summaries are ready for export.</p>
        </div>
        <button className="btn primary" type="button">Generate pack</button>
      </div>
      <ul className="list">
        {cqc.map((item) => (
          <li className="listItem" key={item.key}>
            <div>
              <strong>{item.key}</strong>
              <div className="muted">{item.evidence} evidence items - {item.risk}</div>
            </div>
            <span className="badge">{item.score}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
