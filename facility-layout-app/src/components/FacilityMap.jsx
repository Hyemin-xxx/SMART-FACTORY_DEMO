import React, { useMemo } from "react";

/**
 * Renders a GMP facility cleanroom layout from a JSON spec.
 * SVG canvas is fixed at 1400 x 900.
 */
export default function FacilityMap({ layout, selectedRoomId, onRoomSelect }) {
  const {
    meta,
    grade_definitions: gradeDefs,
    grid,
    building,
    rooms,
    airlocks,
    flow_arrows: flowArrows
  } = layout;

  const FLOW_COLORS = {
    personnel: "#1f2937",
    material: "#16a34a",
    waste: "#dc2626",
    bulk: "#2563eb"
  };

  const roomCenter = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      map.set(r.id, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
    });
    return map;
  }, [rooms]);

  const buildingX = building.origin[0];
  const buildingY = building.origin[1];
  const buildingW = building.width_px;
  const buildingH = building.height_px;
  const scale = meta.scale_px_per_m ?? 14;

  // Cumulative grid x positions for top dimension chain
  const gridColumnX = [];
  let acc = buildingX;
  for (const w of grid.columns) {
    gridColumnX.push(acc);
    acc += w * scale;
  }
  gridColumnX.push(acc);

  // Cumulative grid y positions for left dimension chain
  const gridRowY = [];
  let accY = buildingY;
  for (const h of grid.rows) {
    gridRowY.push(accY);
    accY += h * scale;
  }
  gridRowY.push(accY);

  return (
    <svg
      viewBox="0 0 1400 900"
      className="facility-svg"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="GMP cleanroom facility layout"
    >
      <defs>
        {Object.entries(FLOW_COLORS).map(([type, color]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Background — click to deselect */}
      <rect width="1400" height="900" fill="#f8fafc" onClick={() => onRoomSelect?.(null)} />

      {/* Title block */}
      <text x="60" y="36" fontSize="20" fontWeight="700" fill="#0f172a">
        {meta.product}
      </text>
      <text x="60" y="56" fontSize="13" fill="#475569">
        {meta.scale} · {meta.phase} · v{meta.version}
      </text>

      {/* Top grid dimension chain */}
      <g className="grid-chain-top">
        {grid.columns.map((width, i) => {
          const x0 = gridColumnX[i];
          const x1 = gridColumnX[i + 1];
          const cx = (x0 + x1) / 2;
          return (
            <g key={`gcol-${i}`}>
              <line x1={x0} y1={92} x2={x1} y2={92} stroke="#475569" strokeWidth="0.6" />
              <line x1={x0} y1={86} x2={x0} y2={98} stroke="#475569" strokeWidth="0.6" />
              <line x1={x1} y1={86} x2={x1} y2={98} stroke="#475569" strokeWidth="0.6" />
              <text x={cx} y={84} fontSize="10" textAnchor="middle" fill="#475569">
                {width.toFixed(2)}m
              </text>
              <circle cx={cx} cy={70} r="9" fill="#ffffff" stroke="#475569" strokeWidth="0.7" />
              <text x={cx} y={73} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600">
                X{i + 1}
              </text>
            </g>
          );
        })}
        {/* Outermost column markers */}
        <circle cx={gridColumnX[0]} cy={70} r="9" fill="#ffffff" stroke="#475569" strokeWidth="0.7" />
        <text x={gridColumnX[0]} y={73} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600">
          X0
        </text>
        <circle
          cx={gridColumnX[gridColumnX.length - 1]}
          cy={70}
          r="9"
          fill="#ffffff"
          stroke="#475569"
          strokeWidth="0.7"
        />
        <text
          x={gridColumnX[gridColumnX.length - 1]}
          y={73}
          fontSize="9"
          textAnchor="middle"
          fill="#475569"
          fontWeight="600"
        >
          X{grid.columns.length + 1}
        </text>
      </g>

      {/* Left grid dimension chain */}
      <g className="grid-chain-left">
        {grid.rows.map((height, i) => {
          const y0 = gridRowY[i];
          const y1 = gridRowY[i + 1];
          const cy = (y0 + y1) / 2;
          return (
            <g key={`grow-${i}`}>
              <line x1={42} y1={y0} x2={42} y2={y1} stroke="#475569" strokeWidth="0.6" />
              <line x1={36} y1={y0} x2={48} y2={y0} stroke="#475569" strokeWidth="0.6" />
              <line x1={36} y1={y1} x2={48} y2={y1} stroke="#475569" strokeWidth="0.6" />
              <text
                x={28}
                y={cy + 3}
                fontSize="10"
                textAnchor="middle"
                fill="#475569"
                transform={`rotate(-90 28 ${cy + 3})`}
              >
                {height.toFixed(2)}m
              </text>
              <circle cx={20} cy={cy} r="9" fill="#ffffff" stroke="#475569" strokeWidth="0.7" />
              <text x={20} y={cy + 3} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600">
                Y{i + 1}
              </text>
            </g>
          );
        })}
      </g>

      {/* Building outer frame */}
      <rect
        x={buildingX}
        y={buildingY}
        width={buildingW}
        height={buildingH}
        fill="#e2e8f0"
        stroke="#1e293b"
        strokeWidth="1.6"
      />

      {/* Equipment hall background hatching (visual cue for upper area) */}
      <pattern
        id="hall-hatch"
        x="0"
        y="0"
        width="14"
        height="14"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="14" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
      </pattern>

      {/* Rooms */}
      {rooms.map((room) => {
        const grade = gradeDefs[room.grade] ?? gradeDefs.Uncontrolled;
        const isHall = room.id === "equipment-hall";
        const isSelected = selectedRoomId === room.id;
        const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
        const isAdjacent = selectedRoom?.adjacent_to?.includes(room.id);
        const isDimmed = selectedRoomId && !isSelected && !isAdjacent && !isHall;
        return (
          <g
            key={room.id}
            opacity={isDimmed ? 0.3 : 1}
            style={{ cursor: isHall ? "default" : "pointer" }}
            onClick={() => !isHall && onRoomSelect?.(room.id)}
          >
            <rect
              x={room.x}
              y={room.y}
              width={room.w}
              height={room.h}
              fill={isHall ? "url(#hall-hatch)" : grade.color}
              fillOpacity={isHall ? 1 : isSelected ? 1 : 0.8}
              stroke={isSelected ? "#f59e0b" : isAdjacent ? "#facc15" : "#1e293b"}
              strokeWidth={isSelected ? 3 : isAdjacent ? 2 : 0.85}
            />
            {!isHall && (
              <>
                <text
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2 - 4}
                  fontSize={room.w < 90 ? 9 : 10.5}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontWeight="700"
                  pointerEvents="none"
                >
                  {room.name}
                </text>
                <text
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2 + 9}
                  fontSize="9"
                  textAnchor="middle"
                  fill="#1e293b"
                  pointerEvents="none"
                >
                  ({room.area_m2.toFixed(1)} m²)
                </text>
              </>
            )}
            {isHall && (
              <>
                <text x={room.x + room.w / 2} y={room.y + 30} fontSize="14" textAnchor="middle" fill="#475569" fontWeight="700" pointerEvents="none">
                  {room.name}
                </text>
                <text
                  x={room.x + room.w / 2}
                  y={room.y + 50}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#64748b"
                  pointerEvents="none"
                >
                  ({room.area_m2.toFixed(1)} m² · open equipment area)
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Airlocks (small grey diamonds at boundaries) */}
      {airlocks.map((al) => {
        const cx = al.x + al.w / 2;
        const cy = al.y + al.h / 2;
        const r = Math.max(al.w, al.h) / 2 + 1;
        return (
          <polygon
            key={al.id}
            points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
            fill="#cbd5e1"
            stroke="#1e293b"
            strokeWidth="0.7"
          />
        );
      })}

      {/* Flow arrows (polyline with waypoints) */}
      {flowArrows.map((arrow, i) => {
        const color = FLOW_COLORS[arrow.type] ?? "#000";
        const wp = arrow.waypoints;
        const isRelated =
          selectedRoomId &&
          (arrow.from === selectedRoomId || arrow.to === selectedRoomId);
        const arrowDimmed = selectedRoomId && !isRelated;

        if (wp && wp.length >= 2) {
          const pts = wp.map((p) => `${p[0]},${p[1]}`).join(" ");
          return (
            <polyline
              key={`arrow-${i}`}
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isRelated ? 2.8 : 1.6}
              strokeOpacity={arrowDimmed ? 0.12 : 0.85}
              strokeLinejoin="round"
              strokeLinecap="round"
              markerEnd={`url(#arrow-${arrow.type})`}
            />
          );
        }

        // Fallback: straight line for arrows without waypoints
        const from = roomCenter.get(arrow.from);
        const to = roomCenter.get(arrow.to);
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        return (
          <line
            key={`arrow-${i}`}
            x1={from.x + (dx / len) * 8}
            y1={from.y + (dy / len) * 8}
            x2={to.x - (dx / len) * 16}
            y2={to.y - (dy / len) * 16}
            stroke={color}
            strokeWidth={isRelated ? 2.8 : 1.6}
            strokeOpacity={arrowDimmed ? 0.12 : 0.85}
            markerEnd={`url(#arrow-${arrow.type})`}
          />
        );
      })}

      {/* Legend (right side — centered between building edge and SVG edge, glassmorphism) */}
      <g transform="translate(1040, 120)" fontFamily="'Pretendard', 'Inter', system-ui, sans-serif">
        {/* Apple-style frosted glass card */}
        <defs>
          <filter id="legend-frost" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="1.8" />
          </filter>
          <linearGradient id="legend-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.52" />
          </linearGradient>
        </defs>
        {/* Soft shadow */}
        <rect x="-12" y="-20" width="240" height="560" rx="22" fill="#94a3b8" opacity="0.12" filter="url(#legend-frost)" />
        {/* Glass fill */}
        <rect x="-16" y="-26" width="240" height="560" rx="22" fill="url(#legend-glass)" />
        {/* Border — very subtle, Apple-style 1px hairline */}
        <rect x="-16" y="-26" width="240" height="560" rx="22" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
        {/* Inner top highlight */}
        <rect x="-14" y="-24" width="236" height="1" rx="0.5" fill="rgba(255,255,255,0.85)" />
        <text x="0" y="14" fontSize="17" fontWeight="700" fill="#1d1d1f" letterSpacing="-0.02em">
          Room Classification
        </text>
        <line x1="0" y1="26" x2="204" y2="26" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
        {Object.entries(gradeDefs).map(([key, def], i) => (
          <g key={key} transform={`translate(0, ${42 + i * 34})`}>
            <rect x="0" y="0" width="26" height="19" rx="5" fill={def.color} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
            <text x="38" y="14" fontSize="13.5" fill="#1d1d1f" fontWeight="600" letterSpacing="-0.01em">
              {key === "Uncontrolled" ? "Uncontrolled" : `Grade ${key}`}
            </text>
            <text x="38" y="28" fontSize="10.5" fill="#86868b">
              {def.iso_class}
            </text>
          </g>
        ))}

        {/* LAF / Airlock marker */}
        <g transform={`translate(0, ${42 + Object.keys(gradeDefs).length * 34 + 6})`}>
          <polygon points="13,0 26,10 13,20 0,10" fill="#d1d1d6" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
          <text x="38" y="15" fontSize="13.5" fill="#1d1d1f" fontWeight="600" letterSpacing="-0.01em">
            Airlock / LAF
          </text>
        </g>

        {/* Flow legend */}
        <g transform={`translate(0, ${42 + (Object.keys(gradeDefs).length + 1) * 34 + 36})`}>
          <text x="0" y="0" fontSize="17" fontWeight="700" fill="#1d1d1f" letterSpacing="-0.02em">
            Flow Legend
          </text>
          <line x1="0" y1="12" x2="204" y2="12" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
          {Object.entries(FLOW_COLORS).map(([key, color], i) => (
            <g key={key} transform={`translate(0, ${26 + i * 29})`}>
              <line x1="0" y1="9" x2="26" y2="9" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
              <polygon points="26,5 35,9 26,13" fill={color} />
              <text x="46" y="14" fontSize="13.5" fill="#1d1d1f" fontWeight="600" letterSpacing="-0.01em">
                {key.charAt(0).toUpperCase() + key.slice(1)} flow
              </text>
            </g>
          ))}
        </g>
      </g>

      {/* Notes block (bottom-left) */}
      <g transform="translate(60, 760)">
        <text x="0" y="0" fontSize="11" fontWeight="700" fill="#334155">
          Notes:
        </text>
        {meta.notes.map((line, i) => (
          <text key={i} x="0" y={16 + i * 14} fontSize="10" fill="#64748b">
            {line}
          </text>
        ))}
      </g>

      {/* Init label and page number (bottom-right of building area) */}
      <text x="900" y="860" fontSize="10" fill="#64748b" textAnchor="end">
        Init: CLFL
      </text>
      <text x="950" y="860" fontSize="10" fill="#64748b">
        Page: 1/1
      </text>
    </svg>
  );
}
