# 3D 개념 설계(CCD) 뷰어 페이지 추가 메모

## 2026-04-10 작업 요약

`ADCC CCD Page` 하위 섹션의 한 축으로, LLM이 생성한 CCD JSON을 즉시 3D로 검토할 수 있는
독립 페이지를 추가했다. 기존 워크스페이스(입력 → 시트 → 서버 응답) 흐름과는 별도로,
시각화 단독으로 검증/시연할 수 있도록 분리한 형태다.

핵심 산출물:

- [ccd-viewer.html](../ccd-viewer.html) — 좌측 파라미터 패널 + 우측 3D 캔버스 레이아웃
- [ccd-viewer.js](../ccd-viewer.js) — Three.js 씬, OrbitControls, 솟아오름 애니메이션, 폼 → JSON 변환
- [styles.css](../styles.css) — `body[data-page="ccd-viewer"]` 스코프 스타일 블록 추가
- [index.html](../index.html), [workspace.html](../workspace.html) — 네비게이션에 `3D Viewer` 진입 추가

---

## 작업 단계별 기록

### Step 1. 페이지 골격 (`ccd-viewer.html`)

- `data-page="ccd-viewer"` 를 body에 부여해 워크스페이스/홈과 별도의 스타일 스코프를 만들었다.
- 상단은 기존 `topbar` + `brand` + `nav` 구조를 그대로 따라가서 페이지 간 일관성을 유지했다.
- 메인 영역은 4개 섹션으로 구성했다.
  1. **Hero 카드** — `ADCC CCD PAGE · 3D CONCEPTUAL DESIGN VIEWER` 라벨과 상태 카드
  2. **`.ccd-viewer-grid`** — 좌측 `ccd-controls-panel`, 우측 `ccd-canvas-panel`
  3. **CCD JSON 미리보기** — 현재 렌더링 중인 payload를 그대로 노출
- Three.js는 ESM importmap 으로 불러왔다.
  ```html
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
      }
    }
  </script>
  ```
- 빌드 단계 없이 정적 서버(`server.py`) 위에서 그대로 동작시키기 위한 선택이다.

### Step 2. 좌측 파라미터 패널

- 요구한 `면적, 공정 타입` 외에 시연 컨텍스트를 위해 다음 파라미터를 추가했다.
  - 프로젝트 명, 시설 규모, 핵심 클린룸 등급, Bioreactor 수량
  - Aseptic Fill / Buffer / Utilities / Lyophilizer 토글
- 입력값은 `ccd-viewer.js` 의 `buildPayloadFromForm()` 에서 결정적으로 JSON 으로 변환된다.
  추후 LLM 응답을 그대로 받게 되면 이 함수를 `await fetch("/api/ccd-3d", …)` 로 교체만 하면 된다.
- 색상 범례(`.ccd-legend`)를 패널 하단에 두어 각 3D 객체가 어떤 설비를 의미하는지 한 눈에 파악할 수 있게 했다.

### Step 3. 우측 3D 캔버스

- `ccd-canvas-shell` 컨테이너에 `WebGLRenderer.domElement` 를 직접 부착한다.
- `ResizeObserver` 로 패널 크기 변화를 감지해 `renderer.setSize()` / `camera.aspect` 를 자동 동기화한다.
- 첫 진입 시에는 어두운 그라데이션 배경 위에 안내 오버레이가 떠 있고, 생성 버튼을 누르면
  `is-hidden` 클래스가 부착되어 부드럽게 사라진다.
- `OrbitControls` 로 좌클릭 회전 / 휠 줌 / 우클릭 패닝을 모두 지원한다.
  - `minDistance: 12`, `maxDistance: 110`, `maxPolarAngle: ~88°` 로 카메라가 바닥을 뚫고
    내려가지 않도록 제한했다.
- 환경광은 `HemisphereLight` + 그림자 캐스팅 가능한 `DirectionalLight` 조합이다.

### Step 4. ISPE Baseline Guide Vol 6 기반 샘플 JSON

ISPE Baseline Guide Vol 6 (Biopharmaceutical Manufacturing Facilities) 가 권장하는 구역
분리(Upstream / Downstream / Aseptic Fill / Buffer Prep / Utilities)와 핵심 설비
배치를 그대로 JSON 스키마로 옮겼다.

```json
{
  "facility": {
    "name": "ADCC Pilot Reference Facility",
    "scale": "Pilot",
    "processType": "ADC",
    "cleanroomGrade": "Grade C",
    "footprintMeters": [40, 28],
    "areas": [
      {
        "id": "upstream",
        "name": "Upstream Process Area",
        "grade": "Grade C",
        "position": [-10, 0, -6],
        "size": [16, 5, 12]
      }
    ],
    "equipment": [
      {
        "id": "br-02",
        "type": "Bioreactor",
        "label": "Production Bioreactor 2000L",
        "areaId": "upstream",
        "position": [-10, 0, -9],
        "size": [2.6, 4.2, 2.6]
      }
    ]
  }
}
```

스키마 의도:

- `areas[]` 는 ISPE 의 `process area / clean utility area / personnel flow area` 개념을
  단순화한 것으로, `position`(중심 좌표) 과 `size`(가로·높이·깊이) 만으로 cleanroom wall
  바운딩 박스를 그릴 수 있다.
- `equipment[]` 는 `areaId` 로 소속 구역을 가진다. 추후 동선 분석이나 면적 산정 등
  파생 계산을 붙이기 쉽게 의도적으로 평탄한 구조로 두었다.
- 좌표계는 우측 손 좌표계(`x` 가로, `y` 높이, `z` 깊이) 이고 단위는 `m` 로 가정한다.

### Step 5. 객체 → Three.js 메시 매핑

`EQUIPMENT_STYLES` 레지스트리에 타입별 색상과 형태를 정의했다.

| Type                 | Shape    | Color    |
| -------------------- | -------- | -------- |
| `CleanRoom_Wall`     | Box      | 반투명 blue (`#60a5fa`, opacity 0.18) + edge wireframe |
| `Bioreactor`         | Cylinder | teal `#14b8a6` |
| `Centrifuge`         | Cylinder | green `#10b981` |
| `ChromatographySkid` | Box      | amber `#f59e0b` |
| `UFDFSkid`           | Box      | yellow `#fbbf24` |
| `FillingMachine`     | Box      | purple `#a855f7` |
| `Lyophilizer`        | Box      | violet `#c084fc` |
| `BufferTank`         | Cylinder | red `#ef4444` |
| `MediaPrepTank`      | Cylinder | orange `#f97316` |

요구사항대로 `Bioreactor` 와 `Filling Machine` 은 색이 다른 원기둥/박스로 명확히 구분된다.

### Step 6. 솟아오름 애니메이션

- 생성 버튼을 누르면 `applyCcdPayload(payload, { animate: true })` 가 호출된다.
- 각 메시는 `targetY - 6 ~ -8` 만큼 바닥 아래에서 시작해 `targetY` 까지 올라온다.
- `easeOutBack` 이징을 적용해 끝에서 살짝 튀어오르는 느낌을 준다.
- 객체별 `stagger` 를 60ms 단위로 부여(최대 600ms)해서 한꺼번에 솟아오르는 게 아니라
  순차적으로 채워지는 듯한 인상을 만들었다.
- 영역(반투명 박스)은 `opacity: 0` 에서 `0.18` 까지 페이드 인된다.
- `replay` 버튼은 마지막 payload 를 그대로 다시 애니메이션 재생한다.

### Step 7. 워크스페이스/홈 네비게이션 연결

- [index.html](../index.html) 헤더의 `nav-home` 에 `3D Viewer` 핀과 우측 액션 버튼
  `Open 3D Viewer` 를 추가했다.
- [workspace.html](../workspace.html) 헤더에도 `3D CCD 뷰어` 진입 링크를 추가했다.
- 양쪽 모두 별도 스크립트 없이 정적 링크라 라우팅 변경이 단순하다.

### Step 8. CSS 스코프 정리

- 모든 신규 스타일은 `body[data-page="ccd-viewer"]` 또는 페이지 전용 클래스
  (`.ccd-viewer-grid`, `.ccd-canvas-shell`, `.ccd-legend`, `.ccd-json-block` …) 아래에 배치했다.
- 워크스페이스 페이지의 토큰(`--workspace-*`) 과 충돌하지 않도록 `--ccd-*` 토큰 셋을
  새로 정의했다.
- 1080px / 720px 두 단계의 미디어 쿼리로, 좁은 화면에서는 캔버스가 단일 컬럼으로
  내려오고 메타 카드도 2열로 압축된다.

---

## 후속 작업 후보

1. **LLM API 연동** — `buildPayloadFromForm()` 을 `fetch("/api/ccd-3d", …)` 로 치환하고,
   `server.py` 에 `/api/ccd-3d` 핸들러를 추가해 워크스페이스 payload → CCD JSON 변환 흐름을
   완성한다.
2. **객체 클릭 시 라벨 패널** — `Raycaster` 로 클릭한 메시의 `userData.label` 을 좌측
   패널 또는 캔버스 우상단에 표시한다.
3. **층별 보기(Floor toggle)** — 향후 다층 시설을 다룰 때 `floor` 필드를 JSON 에 추가하고
   레이어 토글을 노출한다.
4. **카메라 프리셋** — top / iso / front 뷰 버튼을 추가해 시연을 더 빠르게 한다.
5. **GLTF 익스포트** — 현재 씬을 `GLTFExporter` 로 내보내 외부 도구에서 검토할 수 있게 한다.

## 검증 방법

```bash
cd /Users/electrozone/SF_DEMO/SMART-FACTORY_DEMO
python3 server.py
# 브라우저에서 http://127.0.0.1:9000/ccd-viewer.html 접속
# - 좌측 파라미터 변경 → 「설계 생성」 클릭
# - 우측 캔버스에서 객체가 솟아오르는 애니메이션 확인
# - 마우스 좌클릭 회전 / 휠 줌 / 우클릭 패닝 동작 확인
# - 하단 JSON 미리보기에서 현재 payload 확인
```
