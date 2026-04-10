# Facility Layout · React + SVG 하위 앱

## 2026-04-10 작업 요약 (feature 브랜치)

기존 정적 사이트와 분리된 **별도 Vite + React 하위 앱** 으로 GMP 클린룸 평면도 렌더러를
추가했다. 첨부된 reference floor plan 의 구조 (cleanroom block + 우측 utility/HVAC +
상단 equipment hall + grade 색상 + flow 화살표 + grid 치수) 를 SVG 로 재현한다.

핵심 결정:

- **사용자 입력은 모양만** — 모달 폼은 서버 호출이 없고, 항상 `facility_layout.json` 의
  고정 데이터가 렌더링된다.
- **빌드 환경 분리** — 메인 정적 사이트(`server.py`) 와 무관하게 `npm run dev` 로 띄움.
  Vite 자동 HMR 사용.
- **하위 디렉토리** — `facility-layout-app/` 단일 디렉토리에 모든 React 코드 격리.
- **메인 사이트 nav 연결** — index.html / ccd-viewer.html 의 nav 에 `Layout Test ↗`
  핀을 추가해 `http://localhost:5173` 로 새 탭 진입.

산출물:

- [facility-layout-app/](../facility-layout-app/) — 전체 Vite + React 앱
- [facility-layout-app/src/data/facility_layout.json](../facility-layout-app/src/data/facility_layout.json) — 23개 room + 8개 airlock + 17개 flow arrow
- [facility-layout-app/src/components/FacilityMap.jsx](../facility-layout-app/src/components/FacilityMap.jsx) — SVG 렌더러
- [facility-layout-app/src/components/InputModal.jsx](../facility-layout-app/src/components/InputModal.jsx) — mock 입력 모달
- [facility-layout-app/README.md](../facility-layout-app/README.md) — 실행 방법 / 구조 / 스키마 요약

---

## 작업 단계별 기록

### Step 1. 디렉토리 / 빌드 결정

같은 저장소 안에 두 가지 빌드 환경을 공존시켜야 했다.

| 옵션 | 장점 | 단점 |
|---|---|---|
| A. importmap + 정적 React (CDN) | 빌드 단계 0, `python3 server.py` 만으로 동작 | JSX 변환을 브라우저에서 못 함 → 코드가 React.createElement 호출로 가독성 떨어짐 |
| B. Vite + React 하위 디렉토리 | JSX, HMR, modern dev 경험 | npm 의존성 설치 필요, 메인 정적 사이트와 별도 dev 서버 |
| C. 메인 정적 사이트 자체를 Vite 로 마이그레이션 | 단일 빌드 시스템 | 기존 흐름(`python3 server.py`) 을 깨뜨림. 작업 범위가 너무 큼 |

→ 사용자 요구사항이 "src/components/FacilityMap.jsx", "src/App.jsx", "Vite 기준으로
세팅", "npm run dev" 로 명시되어 있어 **옵션 B** 채택.

`facility-layout-app/` 하위에 모든 것을 격리하고, 루트 `.gitignore` 에 `node_modules`,
`dist`, `.vite`, `*.log` 를 추가했다.

### Step 2. Vite 프로젝트 골격

최소 의존성으로 구성:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.8"
  }
}
```

`vite.config.js` 는 React 플러그인만 등록하고 dev 서버 포트를 5173 에 고정했다 — 메인
정적 서버(`server.py`, 9000) 와 충돌하지 않도록.

### Step 3. facility_layout.json 설계

[`src/data/facility_layout.json`](../facility-layout-app/src/data/facility_layout.json)
의 구조 결정:

- **좌표계**: SVG pixels. `meta.scale_px_per_m = 14` 로 1 m = 14 px 환산.
- **건물 크기**: 첨부 reference 의 grid sum 을 픽셀로 환산
  - columns: 8.1+8.12+7.8+7.2+7.8+7.8+7.2+7.0 = **61.02 m → 854 px**
  - rows:    7.3+8.2+9.5+8.7+8.3 = **42 m → 588 px**
- **건물 origin**: (60, 110) — grid 라벨 자리 + 상단 타이틀 자리 확보

#### Room 배치 전략

reference 의 시각 구성을 그대로 따라 3 영역으로 나눴다:

1. **상단 Equipment Hall** (y 110~327, full width)
   - 단일 큰 room: `equipment-hall`
   - hatching 패턴으로 채워서 "open equipment area" 인상 부여
2. **하단 좌측 cleanroom 블록** (x 60~595, y 327~698)
   - upstream Grade C: media-buffer, weighing, seed-lab, ipc, fermentation
   - downstream Grade B: puri-1, puri-2, puri-3, preparation
   - support: calibration (C), storage-bulk (C), storage-material (D)
   - cleaning + tools (D), gowning-c (C), gowning-d (D), 두 개 airlock (D)
   - 하단: office, stairs (Uncontrolled), visitor-corridor (CNC)
3. **하단 우측 utility/HVAC** (x 595~914, y 327~698)
   - hvac (CNC, 큰 면적)
   - wfi-pw (Uncontrolled)

총 23 room. 각 room 은 user spec 의 모든 필드(`pressure_pa`, `ach`, `adjacent_to`,
`personnel_flow`, `material_flow`, `waste_flow`, `equipment`, `ispe_ref`) 를 채워서
실제 LLM 응답이 들어오면 그대로 호환 가능하도록 했다.

#### Airlock / Flow arrow

- **airlocks**: 8개. cleanroom 블록의 등급 경계에 작은 회색 다이아몬드로 표시.
- **flow_arrows**: 17개
  - personnel (검정) 6개: stairs → gowning-d → gowning-c → process rooms
  - material (초록) 6개: storage-material → weighing → media-buffer → fermentation → puri-1/2 → preparation
  - bulk (파랑) 2개: preparation → storage-bulk → visitor-corridor
  - waste (빨강) 3개: process rooms → cleaning → tools

### Step 4. FacilityMap.jsx (SVG 렌더러)

[`src/components/FacilityMap.jsx`](../facility-layout-app/src/components/FacilityMap.jsx) 의 렌더링 순서:

1. `<defs>` — 4개 flow type 별 화살촉 marker 생성 (`arrow-personnel`, `arrow-material`,
   `arrow-waste`, `arrow-bulk`)
2. **배경 + 타이틀 블록** — 제품/규모/phase/version
3. **상단 grid dimension chain** — column 별 치수 라벨 + X1~X10 원형 마커
4. **좌측 grid dimension chain** — row 별 치수 라벨 + Y1~Y5 마커 (회전 텍스트)
5. **건물 외곽 frame** — 두꺼운 stroke 로 건물 경계
6. **rooms** — 각 room 을 grade.color 로 채움. equipment-hall 만 hatching pattern.
   font size 는 room 폭에 따라 9~10.5 px 로 조정. name + (area m²) 두 줄.
7. **airlocks** — 다이아몬드 polygon (회색)
8. **flow arrows** — `<line>` + marker. 시작/끝 좌표를 양쪽 모두 8/16 px 단축해서
   room 박스 안에 안 묻히도록.
9. **legend (우측)** — 흰 박스 + Room Classification (6개 grade) + Flow Legend (4개)
10. **notes block (하단 좌측)** — `meta.notes` 배열을 14 px 간격으로 출력

핵심 트릭:

```js
const roomCenter = useMemo(() => {
  const map = new Map();
  rooms.forEach((r) => map.set(r.id, { x: r.x + r.w / 2, y: r.y + r.h / 2 }));
  return map;
}, [rooms]);
```

flow arrow 들은 `from`/`to` 가 room id 로 들어오기 때문에 lookup map 으로 한 번에
중심 좌표를 인덱싱한다.

### Step 5. InputModal.jsx (mock 입력)

사용자 명시: "사용자 입력은 대충 창만 띄우고 입력하는 척만 하게 하고 그 입력값을 실제 서버로
줄 필요는 없고".

→ 폼 submit 시 `setSubmitting(true)` 후 `setTimeout(900ms)` 으로 fake 로딩 → 모달 닫음.
실제로는 어떤 데이터도 어디에도 저장하지 않는다. 모달 상단 카피에도 명시:

> 데모용 입력 화면입니다. 실제 서버로 전송되지 않고, 항상 facility_layout.json 의
> 고정된 레이아웃이 렌더링됩니다.

폼 필드는 product, bioreactor 규모, 연 배치 수, phase, cleanroom grade, 총 면적,
3개 토글(ISPE 권장 동선 / airlock 자동 / visitor corridor) — 시연 자리에서 자연스럽게
보일 수 있는 레벨로 채웠다.

### Step 6. App.jsx + 스타일

`App.jsx` 는 상단 topbar (브랜드 + 「← Static site」 링크 + 「파라미터 입력」 버튼) +
intro card + map card + 모달 토글로 구성. shadcn 풍 미니멀 light 테마를 자체
`styles.css` 에 정의 (메인 정적 사이트의 styles.css 와 토큰 충돌 없도록 완전 분리).

### Step 7. 메인 사이트 nav 진입 동선

[index.html](../index.html) 와 [ccd-viewer.html](../ccd-viewer.html) 의 nav 에 다음
핀 추가:

```html
<a href="http://localhost:5173" target="_blank" rel="noopener"
   title="facility-layout-app · npm run dev 후 접속">Layout Test ↗</a>
```

전제: 사용자가 별도 터미널에서 `cd facility-layout-app && npm run dev` 를 띄워 둔 상태.
주의: `localhost:5173` 은 dev 서버 전용이라 prod 배포 시에는 다른 처리 필요 (현재는
시연 데모이므로 OK).

### Step 8. .gitignore 갱신

루트 [.gitignore](../.gitignore) 에 다음 추가:

```
# Node / Vite (facility-layout-app)
node_modules
dist
.vite
*.log
```

`facility-layout-app/node_modules` 가 실수로 commit 되지 않도록.

---

## 실행 방법

```bash
# 1. 메인 정적 사이트 (워크스페이스 / 3D viewer)
python3 server.py
# → http://localhost:9000

# 2. (별도 터미널) facility layout 하위 앱
cd facility-layout-app
npm install
npm run dev
# → http://localhost:5173
```

브라우저:
- `http://localhost:9000/index.html` 또는 `/ccd-viewer.html` 의 nav 에서
  「Layout Test ↗」 클릭 → 새 탭에서 `localhost:5173` 열림
- 또는 `http://localhost:5173` 직접 접속

## 검증 포인트

1. SVG 1400×900 캔버스에 건물 외곽 + 상단 equipment hall (hatching) + 하단 cleanroom
   23개 room 이 렌더링되는지
2. 각 room 의 색이 `grade_definitions[grade].color` 와 일치하는지 (Grade C = 진한 파랑,
   B = 연두, D = 하늘색, CNC = 노랑, Uncontrolled = 살구색)
3. 상단 X1~X10 + 좌측 Y1~Y5 grid 마커가 표시되는지
4. 17개 flow arrow 가 색상별로 정확하게 그려지는지 (검정/초록/빨강/파랑)
5. 우측 legend 에 6개 grade + airlock + 4개 flow 가 모두 나오는지
6. 「파라미터 입력」 버튼 → 모달 열림 → 「레이아웃 생성」 → 0.9초 후 모달 닫힘
7. 모달이 열려있는 동안 backdrop 클릭하면 닫히는지
8. 1080px 이하 화면에서 모달 grid 가 1열로 떨어지는지

## 후속 작업 후보

1. **Room 클릭 시 사이드 패널** — `userData` 에 metadata 가 있으므로 클릭으로
   pressure / ACH / equipment / ISPE ref 를 펼쳐서 표시
2. **Hover tooltip** — `<title>` 또는 별도 div tooltip
3. **Flow arrow filtering** — legend 의 각 flow type 을 토글로 켜고 끌 수 있게
4. **JSON 업로드** — 다른 facility_layout.json 을 직접 드래그해서 즉시 렌더
5. **3D viewer 와의 연동** — 동일한 facility 정의를 두 viewer 가 공유 (지금은 스키마가
   다름. 통합하려면 변환 layer 필요)
6. **PDF 익스포트** — `svg2pdf.js` 또는 서버측 변환

## 정직한 한계

- **첨부 reference 와 100% 일치하지는 않는다.** 23개 room 의 위치와 비율은 reference 의
  시각적 인상을 따른 손작업 좌표이고, 픽셀 단위 일치는 아니다.
- **데이터는 손으로 작성한 sample 한 벌** 이다. LLM 이 같은 스키마로 응답을 보내면 그대로
  주입할 수 있도록 설계는 했지만, 아직 실제 LLM endpoint 와 연결되어 있지는 않다.
- **모달 입력은 시각적 placeholder** — 실제 동작하는 폼이 아니다. 데모 컨텍스트 외에서
  쓰면 사용자 혼란을 줄 수 있어, 모달 상단에 명시 카피를 넣어 두었다.
