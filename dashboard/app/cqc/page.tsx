import InspectionPackBuilder from "../../components/cqc/InspectionPackBuilder";
import MockInspectionReport from "../../components/cqc/MockInspectionReport";
import { cqc } from "../../lib/demo-data";

export default function CqcPage() {
    return (
        <section className="stack">
            <div className="hero">
                <span className="badge">CQC readiness</span>
                <h2 className="pageTitle">Inspection evidence and Regulation 17 loop</h2>
                <p className="pageLead">Quality statement coverage, action owners, evidence counts, and inspection pack generation in one governance view.</p>
            </div>
            <section className="metrics">
                {cqc.map((item) => (
                    <div className="metricTile detailMetric scoreMetric" key={item.key}>
                        <p className="metricLabel">{item.key}</p>
                        <div className="metricValue">{item.score}%</div>
                        <div className="progress"><span style={{ width: `${item.score}%` }} /></div>
                    </div>
                ))}
            </section>
            <section className="grid">
                <InspectionPackBuilder />
                <MockInspectionReport />
            </section>
        </section>
    );
}
