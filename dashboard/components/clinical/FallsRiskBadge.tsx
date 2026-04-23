export default function FallsRiskBadge({ risk }: { risk: string }) {
  const className = risk === "High" ? "badge danger" : risk === "Medium" ? "badge warning" : "badge success";
  return <span className={className}>{risk} falls risk</span>;
}
