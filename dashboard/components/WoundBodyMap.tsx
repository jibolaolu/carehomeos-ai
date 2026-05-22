"use client";

import { useState } from "react";

interface WoundMarker {
  id: string;
  x: number;
  y: number;
  side: "front" | "back";
  label?: string;
}

interface WoundBodyMapProps {
  markers?: WoundMarker[];
  onSelect?: (coords: { x: number; y: number; side: "front" | "back" }) => void;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

export default function WoundBodyMap({
  markers = [],
  onSelect,
  readOnly = false,
  width = 280,
  height = 520,
}: WoundBodyMapProps) {
  const [side, setSide] = useState<"front" | "back">("front");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onSelect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onSelect({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, side });
  };

  const frontPath =
    "M50,10 C50,4 70,4 70,10 C70,16 80,20 80,28 C80,36 78,40 78,48 C78,56 82,60 82,70 C82,82 78,90 76,100 C74,110 76,120 76,130 C76,140 74,150 74,160 C74,170 76,180 76,190 C76,200 74,210 74,220 C74,230 76,240 76,250 C76,260 74,270 74,280 C74,290 76,300 76,310 C76,320 74,330 74,340 C74,350 76,360 76,370 C76,380 74,390 74,400 C74,410 76,420 76,430 C76,440 74,450 74,460 C74,470 76,480 76,490 C76,500 74,510 74,520";

  const backPath =
    "M50,10 C50,4 70,4 70,10 C70,16 80,20 80,28 C80,36 78,40 78,48 C78,56 82,60 82,70 C82,82 78,90 76,100 C74,110 76,120 76,130 C76,140 74,150 74,160 C74,170 76,180 76,190 C76,200 74,210 74,220 C74,230 76,240 76,250 C76,260 74,270 74,280 C74,290 76,300 76,310 C76,320 74,330 74,340 C74,350 76,360 76,370 C76,380 74,390 74,400 C74,410 76,420 76,430 C76,440 74,450 74,460 C74,470 76,480 76,490 C76,500 74,510 74,520";

  const sideMarkers = markers.filter((m) => m.side === side);

  return (
    <div className="card" style={{ display: "grid", gap: 12, width: "fit-content" }}>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className={`btn ${side === "front" ? "primary" : ""}`} onClick={() => setSide("front")}>
          Front
        </button>
        <button className={`btn ${side === "back" ? "primary" : ""}`} onClick={() => setSide("back")}>
          Back
        </button>
      </div>
      <svg
        viewBox="0 0 100 520"
        width={width}
        height={height}
        onClick={handleClick}
        style={{ cursor: readOnly ? "default" : "crosshair", borderRadius: 8, background: "#fbfcfe", border: "1px solid var(--card-border)" }}
      >
        <path
          d={side === "front" ? frontPath : backPath}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
        {sideMarkers.map((m) => (
          <g key={m.id}>
            <circle cx={m.x} cy={m.y} r={2.5} fill="var(--danger)" stroke="#fff" strokeWidth={0.8} />
            {m.label ? (
              <text x={m.x + 4} y={m.y + 1} fontSize={4} fill="#334155">
                {m.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>
        {readOnly ? "Wound locations" : "Click on the body outline to set location"}
      </p>
    </div>
  );
}
