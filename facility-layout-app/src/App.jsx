import React, { useState } from "react";
import FacilityMap from "./components/FacilityMap.jsx";
import InputModal from "./components/InputModal.jsx";
import layout from "./data/facility_layout.json";

export default function App() {
  const [showModal, setShowModal] = useState(false);

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
            우측 상단 「파라미터 입력」 버튼은 모양만 있으며, 입력값은 실제 서버로 전송되지
            않습니다 — 항상 동일한 JSON 이 렌더링됩니다.
          </p>
        </section>

        <section className="map-card">
          <FacilityMap layout={layout} />
        </section>
      </main>

      {showModal && <InputModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
