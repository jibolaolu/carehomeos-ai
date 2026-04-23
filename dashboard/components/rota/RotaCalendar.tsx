import { staff } from "../../lib/demo-data";

export default function RotaCalendar() {
  return (
    <div className="grid">
      {staff.map((member) => (
        <div className="card" key={member.name}>
          <span className="badge">{member.shift}</span>
          <h3>{member.name}</h3>
          <p className="muted">{member.role}</p>
          <div className="progress"><span style={{ width: `${member.training}%` }} /></div>
          <p className="muted">Training compliance {member.training}%</p>
        </div>
      ))}
    </div>
  );
}
