import React, { useState } from "react";
import FacilityMap from "./components/FacilityMap.jsx";
import RoomDetailPanel from "./components/RoomDetailPanel.jsx";
import InputModal from "./components/InputModal.jsx";
import layout from "./data/facility_layout.json";

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const selectedRoom = layout.rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">BF</span>
          <div>
            <strong>Facility Layout · Functional Test</strong>
            <small>Sub-app of BioForge CCD Studio</small>
          </div>
        </div>
        <nav className="topbar-nav">
          <a href="../index.html" className="nav-link">
            ← Static site
          </a>
          <button
            type="button"
            className="button-ghost"
            onClick={() => window.print()}
          >
            PDF 다운로드
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => setShowModal(true)}
          >
            파라미터 입력
          </button>
        </nav>
      </header>

      <main>
        <section className="intro-card">
          <p className="eyebrow">REACT + SVG TEST</p>
          <h1>2000L mAb Pilot · Conceptual Cleanroom Layout</h1>
          <p>
            <code>facility_layout.json</code> 을 SVG 도면으로 렌더링하는 기능 테스트입니다.
            방을 클릭하면 우측 패널에 상세 정보가 표시되고, 관련 동선이 하이라이트됩니다.
          </p>
        </section>

        <div className="map-and-panel">
          <section className="map-card">
            <FacilityMap
              layout={layout}
              selectedRoomId={selectedRoomId}
              onRoomSelect={setSelectedRoomId}
            />
          </section>

          <RoomDetailPanel
            room={selectedRoom}
            gradeDefs={layout.grade_definitions}
            rooms={layout.rooms}
            onRoomSelect={setSelectedRoomId}
            onClose={() => setSelectedRoomId(null)}
          />
        </div>
      </main>

      {showModal && <InputModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
