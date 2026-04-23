export default function DeteriorationAlert({ level }: { level: string }) {
  const className = level === "High" ? "badge danger" : level === "Medium" ? "badge warning" : "badge success";
  return <span className={className}>{level} deterioration</span>;
}
