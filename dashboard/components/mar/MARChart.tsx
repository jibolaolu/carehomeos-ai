import { marRound } from "../../lib/demo-data";

export default function MARChart() {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr><th>Resident</th><th>Medication</th><th>Time</th><th>Status</th></tr>
        </thead>
        <tbody>
          {marRound.map((item) => (
            <tr key={item.resident + item.medication}>
              <td><strong>{item.resident}</strong><br /><span className="muted">Room {item.room}</span></td>
              <td>{item.medication}</td>
              <td>{item.time}</td>
              <td><span className={item.status === "Due" ? "badge warning" : "badge success"}>{item.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
