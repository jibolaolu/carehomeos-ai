import { careNotes } from "../../lib/demo-data";

export default function ResidentTimeline({ resident }: { resident: string }) {
  const notes = careNotes.filter((note) => note.resident === resident);

  return (
    <div className="card">
      <h3 className="sectionTitle">Care note timeline</h3>
      <ul className="list">
        {notes.map((note) => (
          <li className="listItem" key={note.type}>
            <div>
              <strong>{note.type}</strong>
              <div className="muted">{note.summary}</div>
            </div>
            <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
