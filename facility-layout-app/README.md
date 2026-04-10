# Facility Layout · React + SVG sub-app

BioForge CCD Studio 의 **기능 테스트용 하위 앱**입니다. GMP 클린룸 시설 평면도를 SVG 로
렌더링하는 컴포넌트를 격리된 Vite + React 환경에서 검증합니다.

상위 정적 사이트 (`server.py` 로 띄우는 메인 데모) 와 분리되어 있고, 자체 `npm run dev`
워크플로우로 동작합니다.

## 실행

```bash
cd facility-layout-app
npm install
npm run dev
# → http://localhost:5173
```

빌드:

```bash
npm run build       # → dist/
npm run preview     # 빌드 결과 미리보기
```

## 구조

```
facility-layout-app/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx              # React 엔트리
│   ├── App.jsx               # 페이지 셸 (헤더 + 인트로 + FacilityMap + 모달)
│   ├── styles.css
│   ├── components/
│   │   ├── FacilityMap.jsx   # SVG 렌더러 (rooms / airlocks / arrows / legend / grid)
│   │   └── InputModal.jsx    # 입력 모달 (mock — 서버 호출 없음)
│   └── data/
│       └── facility_layout.json  # 손으로 작성한 GMP 레이아웃 spec
└── README.md
```

## 데이터 스키마 요약

[`src/data/facility_layout.json`](src/data/facility_layout.json) 의 최상위 키:

| Key | 설명 |
|---|---|
| `meta` | 제품, 규모, phase, 버전, scale_px_per_m, 노트 |
| `grade_definitions` | A/B/C/D/CNC/Uncontrolled 별 색상, ISO class, 설명 |
| `grid` | 컬럼/로우 치수 (m 단위) |
| `building` | 건물 외곽 origin / 크기 (px) |
| `rooms[]` | 각 방의 id, name, grade, area_m2, x/y/w/h, pressure_pa, ach, adjacent_to, personnel/material/waste flow, equipment, ispe_ref |
| `airlocks[]` | id, between, x/y/w/h |
| `flow_arrows[]` | type (personnel/material/waste/bulk), from, to |

좌표계: SVG pixels. `meta.scale_px_per_m = 14` 기준이라 1 m = 14 px 로 변환된 값을
`x/y/w/h` 에 직접 박아 두었다.

## 주의

- 입력 모달은 모양만 있고 **서버 호출이 없다**. 폼 값은 어디에도 저장되지 않는다.
- 항상 동일한 `facility_layout.json` 이 렌더링된다.
- 메인 정적 사이트와 분리된 별도 dev 환경이라, `python3 server.py` 와는 무관하다.
