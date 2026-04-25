import DeteriorationAlert from "../../../components/clinical/DeteriorationAlert";
import FallsRiskBadge from "../../../components/clinical/FallsRiskBadge";
import ResidentTimeline from "../../../components/residents/ResidentTimeline";
import { residents } from "../../../lib/demo-data";

export default async function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resident = residents.find((item) => item.id === id) ?? residents[0];

  return (
    <section className="stack">
      <div className="hero">
        <span className="badge">Resident detail</span>
        <h2 className="pageTitle">{resident.name}</h2>
        <p className="pageLead">Room {resident.room} - {resident.need}. Review current risk, care plan deadlines, and note history before handover.</p>
      </div>
      <section className="metrics">
        <div className="metricTile detailMetric"><p className="metricLabel">Falls risk</p><div><FallsRiskBadge risk={resident.fallsRisk} /></div></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Deterioration</p><div><DeteriorationAlert level={resident.deterioration} /></div></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Hydration</p><div className="metricValue">{resident.hydration}</div></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Next review</p><div className="metricValue">{resident.nextReview}</div></div>
      </section>
      <ResidentTimeline resident={resident.name} residentId={resident.id} />
    </section>
  );
}