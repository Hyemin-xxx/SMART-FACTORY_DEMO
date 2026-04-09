# 공기 흐름 시각화 + 설비 형상 개선 + 평가 엔진

## 2026-04-10 작업 요약 (feature 브랜치)

CCD 뷰어를 "단순 박스 배치 데모"에서 "공기 흐름까지 보여주고 GMP 룰로 채점하는 데모"로
한 단계 끌어올렸다. 작업은 feature 브랜치에서 진행했고, main 머지/푸시는 별도 의사결정에
맡긴다.

핵심 산출물 4종:

1. **실제 형상 메시 빌더** — Bioreactor / BufferTank / FillingMachine 3종을 box/cylinder
   추상화에서 compound primitives + LatheGeometry 기반 사실적 형상으로 교체
2. **공기 흐름 시각화** — Pressure cascade 화살표(area 간 압력차) + HEPA supply→return
   파티클 시스템
3. **CCD JSON 스키마 확장** — `pressureDeltaPa`, `achPerHour`, `airflow.{supplyPoints,
   returnPoints}` 추가
4. **룰 기반 평가 엔진** — 4개 가중 룰로 점수와 S/A/B/C/D 등급 계산, UI 패널로 표시

상태 파일:

- [ccd-viewer.js](../ccd-viewer.js) — 약 1000줄 규모로 확장 (기존 593줄)
- [ccd-viewer.html](../ccd-viewer.html) — 시나리오 셀렉트 + 평가 패널 + 범례 갱신
- [styles.css](../styles.css) — 평가 카드/룰 카드/시나리오 행 스타일 추가

---

## Step 1. CCD JSON 스키마 확장

기존 area 필드(`id`, `name`, `grade`, `position`, `size`)에 다음을 추가했다.

```json
{
  "id": "fill",
  "name": "Aseptic Fill / Finish Suite",
  "grade": "Grade A/B",
  "pressureDeltaPa": 30,
  "achPerHour": 80,
  "position": [8, 0, 8],
  "size": [14, 5, 10],
  "airflow": {
    "supplyPoints": [[5, 4.7, 6], [11, 4.7, 6], [5, 4.7, 10], [11, 4.7, 10]],
    "returnPoints": [[2, 0.3, 8], [14, 0.3, 8]]
  }
}
```

스키마 의도:

- `pressureDeltaPa` — 외기(0Pa) 대비 양압(+) Pa. EU GMP Annex 1 기준 등급 사이 ≥10~15 Pa
  차이를 권장하는 압력 캐스케이드의 핵심 변수.
- `achPerHour` — Air Changes per Hour. ISO 14644-4 / ISPE HVAC 권장치를 비교 기준으로 사용.
- `airflow.supplyPoints` — 천장 HEPA 디퓨저 좌표 배열. 파티클 spawn origin.
- `airflow.returnPoints` — 벽/바닥 return grille 좌표. 파티클이 향하는 sink.

LLM 응답 호환성을 유지하기 위해 새 필드는 모두 optional로 두었다 (`?? 0`,
`?? "—"` 패턴으로 fallback).

## Step 2. 시나리오 프리셋

`SCENARIO_PRESETS` 객체에 3개 시나리오를 정의했다 ([ccd-viewer.js:170-227](../ccd-viewer.js#L170-L227)).

| 시나리오 | 동작 | 기대 점수 |
|---|---|---|
| `recommended` | 기본 SAMPLE_CCD 그대로 | S (90+) |
| `standard` | Fill ACH를 50으로, Upstream/Downstream ACH를 18로 낮춤 (권장 미달) | B (~75) |
| `violation` | Buffer(D)를 Fill(A/B)에 직접 인접 + 압력 역전 + ACH 40% 감소 + 설비 과밀 | D (40~50) |

시나리오는 `buildPayloadFromForm()` 마지막 단계에서 `preset.apply(facility)` 로 payload
를 mutate한다. 사용자가 좌측 셀렉트를 바꾸고 「설계 생성」을 누르면 점수가 실시간으로
달라지는 것을 시연할 수 있다.

## Step 3. 사실적 설비 메시 빌더

3종의 시각 임팩트가 큰 설비에 custom builder 를 적용했다. 나머지 타입은 기존 box/cylinder
fallback을 그대로 사용한다.

### 3-1. Bioreactor — compound primitives ([ccd-viewer.js:285-389](../ccd-viewer.js#L285-L389))

구성: 4개 다리(box) + 바닥 dished head(squashed half sphere) + 본체(cylinder) +
상단 dished head + 모터 블록(box) + 임펠러 샤프트(thin cylinder) + teal 색상 띠(thin band)

**좌표 산식 — 모든 컴포넌트가 size[1] 안에 들어오도록 명시적 계산:**

```js
const legHeight   = min(0.4, h * 0.12);
const motorHeight = min(0.42, h * 0.13);
const shaftHeight = min(0.32, h * 0.1);
const bottomDishH = r * 0.45;
const topDishH    = r * 0.5;
const bodyHeight  = max(0.5, h - legHeight - bottomDishH - topDishH - motorHeight - shaftHeight);
```

bottom dish 와 top dish 는 `SphereGeometry` 의 부분 hemisphere 를 만든 뒤 `scale.y` 로
ASME dished head 비율로 눌러서 표현했다. 진짜 LatheGeometry 보다 코드가 짧고 동일한
실루엣을 만든다.

검증: Production Bioreactor (h=4.2, r=1.3)
```
0.4 + 0.585 + 1.765 + 0.65 + 0.45 + 0.35 = 4.2 ✓
```

### 3-2. BufferTank — LatheGeometry ([ccd-viewer.js:391-455](../ccd-viewer.js#L391-L455))

ISPE 시설에서 흔히 보이는 ASME pressure vessel 외형을 LatheGeometry 로 정확히 표현했다.

```js
const profile = [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(r * 0.5, 0.04),
  new THREE.Vector2(r * 0.85, dishHeight * 0.45),
  new THREE.Vector2(r, dishHeight),                    // bottom dish 끝
  new THREE.Vector2(r, dishHeight + cylHeight),        // top dish 시작
  new THREE.Vector2(r * 0.85, dishHeight + cylHeight + dishHeight * 0.55),
  new THREE.Vector2(r * 0.5, dishHeight + cylHeight + dishHeight * 0.96),
  new THREE.Vector2(0, dishHeight + cylHeight + dishHeight)
];
const tankGeom = new THREE.LatheGeometry(profile, 32);
```

부가 요소: 3-leg tripod (BoxGeometry × 3, 120° 간격), 중앙 stainless seam (TorusGeometry),
상단 nozzle (작은 cylinder).

LatheGeometry 의 장점은 단 8개 좌표만으로 회전 대칭 압력용기를 정확히 만들 수 있다는 점.
나중에 다른 vessel 타입(Media Prep, WFI Tank)에도 동일 함수를 재활용할 수 있다.

### 3-3. FillingMachine — base + isolator + nozzles ([ccd-viewer.js:457-530](../ccd-viewer.js#L457-L530))

구성: 자색 cabinet base (box) + 어두운 control panel (얇은 box) + 반투명 isolator
(box, opacity 0.32) + edge wireframe (LineSegments) + 3개 filling nozzle (cylinder) +
3개 vial (작은 cylinder, 흰색 반투명)

핵심은 isolator 의 반투명 + edge frame 조합이다. 이게 "Grade A 아이솔레이터" 라는
인상을 강하게 준다.

## Step 4. Pressure Cascade 화살표

`buildPressureCascadeArrows(facility)` 가 모든 area 쌍을 순회하면서 인접한
(face-distance < 4m) 두 area 가 다른 압력을 가지면 고압 → 저압으로 향하는
`THREE.ArrowHelper` 를 생성한다 ([ccd-viewer.js:602-650](../ccd-viewer.js#L602-L650)).

화살표 색상은 압력 차이에 비례해 cool blue → warm magenta 그라데이션으로 매핑한다
(`pressureToColor(deltaPa)`), 두께도 길이에 비례해 자동 조정한다.

화살표는 각 area 의 천장 위 1.5m 지점에서 시작·끝나서, 메시와 겹치지 않고 평면도처럼
한눈에 흐름이 보인다.

## Step 5. HEPA 파티클 시스템

`HepaParticleSystem` 클래스 ([ccd-viewer.js:665-779](../ccd-viewer.js#L665-L779)) 가 다음을 수행:

- `THREE.BufferGeometry` + `THREE.Points` + AdditiveBlending → GPU 친화적인 빠른 렌더
- 최대 900개 파티클, ~30개/sec spawn rate (`spawnAccumulator` 로 dt 보정)
- 각 파티클은 무작위로 area 의 supply point 에서 시작 → 무작위 return point 로 향함
- 이동은 단순 보간 + 약한 downward bias + 노이즈 (CFD 가 아니라 인상적 시각화)
- 색상은 area grade 별 다름: Grade A/B 흰색, Grade C 청록, Grade D 짙은 파랑
- distance < 0.35m 에 도달하거나 life < 0 이면 제거

```js
class HepaParticleSystem {
  spawn() { /* random supply -> random return */ }
  update(dt) {
    // 1) spawn accumulator로 30/sec 유지
    // 2) 모든 활성 파티클의 위치 갱신
    // 3) THREE.BufferAttribute에 기록
  }
}
```

성능: 900 파티클은 일반 노트북에서도 60fps 유지가 쉽다 (GPU instancing 없이도).

`renderLoop` 에서 매 프레임 `dt = (now - lastFrameMs) / 1000` 을 계산해 `update(dt)` 로
전달한다. dt 는 0.05 (50ms) 로 캡해 탭 비활성화 후 복귀 시 폭주를 방지한다.

## Step 6. 룰 기반 평가 엔진

`evaluateCcdLayout(facility)` 가 4개 가중 룰을 평가해 0~100 점수와 S/A/B/C/D 등급을
산출한다 ([ccd-viewer.js:790-918](../ccd-viewer.js#L790-L918)).

| # | 룰 | Weight | Reference |
|---|---|---|---|
| 1 | 압력 캐스케이드 무결성 (등급 역전 검출) | 30 | EU GMP Annex 1 §4.5 |
| 2 | Grade 인접성 (A/B 가 D 와 직접 인접 X) | 25 | EU GMP Annex 1 §4.3 |
| 3 | 설비 밀도 (footprint 점유율 ≤ 35%) | 20 | ISPE Baseline Guide Vol 6 §6 |
| 4 | HEPA ACH 권장치 충족 | 25 | ISO 14644-4 / ISPE HVAC Guide |

각 룰은 `{ rule, reference, weight, score, issues[] }` 형태로 결과를 반환하고,
overall = `Σ(score × weight) / Σ(weight)` 가중 평균.

등급 매핑:
```
≥ 90 → S
≥ 80 → A
≥ 70 → B
≥ 60 → C
<  60 → D
```

### 정직한 한계

- 4개 룰은 모두 **CCD 단계의 sanity check** 수준이며, 진짜 GMP 검증과는 다르다.
- 실제 배치 검토에는 personnel/material flow, airlock 위치, equipment connection,
  RABS/isolator 분리, 단방향/회수 동선 등 수십 가지 룰이 더 필요하다.
- "점수 70" 이라는 숫자는 **상대적 의사결정 보조** 용도지, 규제 통과 보장이 아니다.
  UI 우상단에 `Rule-based · concept-level` chip 으로 명시해 두었다.

## Step 7. 평가 패널 UI

`updateEvaluationUI(result, scenarioLabel)` 이 다음을 갱신한다 ([ccd-viewer.js:920-965](../ccd-viewer.js#L920-L965)):

- 큰 등급 글자 (S~D) — 등급별 색상 (S 녹색, D 빨강 등)
- 가중 점수 (0~100)
- 시나리오 라벨
- 룰별 카드: 제목 + reference + 점수 chip(pass/warn/fail) + 진행률 바 + 위반 리스트
  (없으면 "위반 사항 없음 — 모범 사례에 부합")

CSS 토큰 `.ccd-eval-rule-score[data-status="pass|warn|fail"]` 로 색상 분기.

## Step 8. 시나리오 셀렉트 + 폼 통합

`<select name="scenario">` 를 form-grid 위에 별도 row 로 배치 (`.ccd-scenario-row`).
사용자가 시나리오를 바꾸고 「설계 생성」을 누르면 `buildPayloadFromForm()` 에서
`SCENARIO_PRESETS[scenario].apply(payload.facility)` 가 호출되어 area 들의 압력 / ACH /
인접 좌표가 즉시 변형된다.

`handleReset()` 에서도 `form.scenario.value = "recommended"` 로 명시 복원.

---

## 검증 방법

```bash
cd /Users/electrozone/SF_DEMO/SMART-FACTORY_DEMO
python3 server.py
# 브라우저: http://127.0.0.1:9000/ccd-viewer.html
```

체크 시퀀스:

1. **권장 시나리오** 로 「설계 생성」 → 설비 형상이 사실적인지 확인
   - Bioreactor: 다리 + dished head + 본체 + 모터 + 샤프트
   - BufferTank: ASME pressure vessel 실루엣 + tripod + seam + nozzle
   - FillingMachine: cabinet + 반투명 isolator + 3 노즐 + 3 vial
   - 평가 패널: **S 등급, 90+ 점수**, 4개 룰 모두 pass
   - 압력 화살표: Fill (A/B) → Downstream/Upstream (C) → Buffer (D) 방향
   - HEPA 파티클: 천장에서 위→아래로 흘러내림
2. **표준 시나리오** 로 다시 생성 → ACH 룰이 warn 으로 떨어지고 점수 ~75 (B)
3. **위반 사례** 로 다시 생성 → 점수 ~45 (D), 다음 위반이 모두 빨간색으로 표시
   - Buffer(D)와 Fill(A/B) 직접 인접
   - 압력 역전 (Buffer 25Pa > Upstream 8Pa)
   - ACH 권장치 미달 (모든 area 40% 감소)
   - Upstream 설비 밀도 초과
4. 좌클릭 회전 / 휠 줌 / 우클릭 패닝 — 카메라 컨트롤 정상

## 후속 작업 후보

1. **스크린 캡처 / 히어로 이미지** — 시연 자료용 정지 이미지 생성
2. **객체 클릭 시 라벨 패널** — Raycaster + InfoOverlay
3. **추가 룰** — 동선 분리, airlock 검증, GMP zone 정의
4. **LLM 연동** — 텍스트 프롬프트로 시나리오 수정 → JSON → 렌더 → 채점 루프
5. **PDF / GLTF 익스포트** — 결과 문서 자동 생성
6. **2D 평면도 토글** — 3D ↔ top-down 전환 버튼 (Three.js Orthographic 카메라)

## 결정 사항 / 노트

- **feature 브랜치에서 작업** — main 직접 push 하지 않음. 머지는 사용자 의사결정.
- **빌드 단계 도입 안 함** — 여전히 importmap + 정적 서버 (`python3 server.py`).
  Three.js 0.160 그대로 CDN 로드.
- **`escapeHtml` 함수 재정의** — script.js 에 동일 함수가 있지만 모듈이 분리돼 있어
  중복 정의가 불가피했다. 이후 공통 utility 모듈 분리 시 합칠 수 있음.
- **시나리오 mutate 패턴** — `preset.apply(facility)` 가 in-place mutation 이라
  `structuredClone(SAMPLE_CCD)` 직후에 호출해야 SAMPLE_CCD 원본이 안전. 현재 흐름은
  `buildPayloadFromForm()` 마지막 단계에서 호출하므로 OK.
