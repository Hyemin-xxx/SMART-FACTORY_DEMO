import React, { useState } from "react";

/**
 * Mock parameter input modal. The form does NOT call any server — it just
 * pretends to "generate" by closing after a short delay. The rendered layout
 * always comes from facility_layout.json.
 */
export default function InputModal({ onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 900);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <form
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-head">
          <h2>설계 파라미터 입력</h2>
          <p>
            데모용 입력 화면입니다. 실제 서버로 전송되지 않고, 항상{" "}
            <code>facility_layout.json</code> 의 고정된 레이아웃이 렌더링됩니다.
          </p>
        </header>

        <div className="modal-grid">
          <label>
            <span>제품 (Modality)</span>
            <select defaultValue="mab">
              <option value="mab">Monoclonal Antibody (mAb)</option>
              <option value="adc">Antibody-Drug Conjugate (ADC)</option>
              <option value="vaccine">Vaccine</option>
              <option value="cellTherapy">Cell Therapy</option>
            </select>
          </label>

          <label>
            <span>Bioreactor 규모</span>
            <select defaultValue="2000">
              <option value="200">200 L (pilot)</option>
              <option value="2000">2000 L (clinical / early commercial)</option>
              <option value="10000">10000 L (commercial)</option>
            </select>
          </label>

          <label>
            <span>연간 배치 수</span>
            <input type="number" min="1" max="200" defaultValue={20} />
          </label>

          <label>
            <span>시설 단계</span>
            <select defaultValue="clinical">
              <option value="pilot">Pilot</option>
              <option value="clinical">Clinical / Early Commercial</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>

          <label>
            <span>Cleanroom Grade 기준</span>
            <select defaultValue="C">
              <option value="C">Grade C 중심 (CCD 표준)</option>
              <option value="B">Grade B 중심</option>
              <option value="A">Grade A/B aseptic</option>
            </select>
          </label>

          <label>
            <span>총 면적 (m²)</span>
            <input type="number" min="200" max="3000" defaultValue={1200} />
          </label>
        </div>

        <label className="modal-toggle">
          <input type="checkbox" defaultChecked /> ISPE Vol 6 권장 동선 자동 적용
        </label>
        <label className="modal-toggle">
          <input type="checkbox" defaultChecked /> 등급 경계마다 airlock 자동 삽입
        </label>
        <label className="modal-toggle">
          <input type="checkbox" /> Visitor corridor 별도 분리
        </label>

        <footer className="modal-actions">
          <button type="button" className="button-ghost" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="button-primary" disabled={submitting}>
            {submitting ? "레이아웃 생성 중…" : "레이아웃 생성"}
          </button>
        </footer>
      </form>
    </div>
  );
}
