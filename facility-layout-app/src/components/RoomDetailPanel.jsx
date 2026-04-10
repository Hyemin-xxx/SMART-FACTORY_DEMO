import React from "react";

export default function RoomDetailPanel({ room, gradeDefs, rooms, onRoomSelect, onClose }) {
  if (!room) {
    return (
      <aside className="room-panel room-panel-empty">
        <p className="room-panel-hint">도면에서 방을 클릭하면 상세 정보가 표시됩니다.</p>
      </aside>
    );
  }

  const grade = gradeDefs[room.grade] ?? gradeDefs.Uncontrolled;
  const adjacentRooms = (room.adjacent_to ?? [])
    .map((id) => rooms.find((r) => r.id === id))
    .filter(Boolean);

  return (
    <aside className="room-panel">
      <header className="room-panel-head">
        <div>
          <h2 className="room-panel-title">{room.name}</h2>
          <span
            className="room-panel-grade-chip"
            style={{ background: grade.color, color: "#fff" }}
          >
            {room.grade === "Uncontrolled" ? "Uncontrolled" : `Grade ${room.grade}`} · {grade.iso_class}
          </span>
        </div>
        <button className="room-panel-close" onClick={onClose} title="닫기">
          ×
        </button>
      </header>

      <section className="room-panel-section">
        <h3>기본 정보</h3>
        <dl className="room-panel-dl">
          <div><dt>면적</dt><dd>{room.area_m2.toFixed(1)} m²</dd></div>
          <div><dt>차압</dt><dd>+{room.pressure_pa} Pa</dd></div>
          <div><dt>환기</dt><dd>{room.ach} ACH</dd></div>
        </dl>
      </section>

      {room.equipment?.length > 0 && (
        <section className="room-panel-section">
          <h3>설비 (Equipment)</h3>
          <ul className="room-panel-equip">
            {room.equipment.map((eq, i) => (
              <li key={i}>{eq}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="room-panel-section">
        <h3>동선 (Flow)</h3>
        <div className="room-panel-flow-group">
          <FlowRow label="Personnel" data={room.personnel_flow} />
          <FlowRow label="Material" data={room.material_flow} />
          <FlowRow label="Waste" data={room.waste_flow} />
        </div>
      </section>

      {adjacentRooms.length > 0 && (
        <section className="room-panel-section">
          <h3>인접 방 (Adjacent)</h3>
          <div className="room-panel-chips">
            {adjacentRooms.map((adj) => {
              const adjGrade = gradeDefs[adj.grade] ?? gradeDefs.Uncontrolled;
              return (
                <button
                  key={adj.id}
                  className="room-panel-chip"
                  style={{ borderColor: adjGrade.color }}
                  onClick={() => onRoomSelect(adj.id)}
                  title={`${adj.name} 으로 이동`}
                >
                  {adj.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {room.ispe_ref && (
        <section className="room-panel-section room-panel-ref">
          <h3>Reference</h3>
          <p>{room.ispe_ref}</p>
        </section>
      )}
    </aside>
  );
}

function FlowRow({ label, data }) {
  if (!data) return null;
  const entries = Object.entries(data).filter(([, v]) => v && v !== "—");
  if (entries.length === 0) return null;
  return (
    <div className="room-panel-flow-row">
      <span className="room-panel-flow-label">{label}</span>
      {entries.map(([dir, val]) => (
        <span key={dir} className="room-panel-flow-val">
          {dir === "in" ? "← " : "→ "}{val}
        </span>
      ))}
    </div>
  );
}
