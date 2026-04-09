# 구현 메모 및 다음 단계

## 2026-04-09 업데이트

오늘 작업에서는 워크스페이스 데모를 단순 입력 화면 수준에서, 실제 서버 왕복과 workbook 파싱이 보이는 흐름으로 확장했다.

이번에 반영한 항목:

- 워크스페이스 입력 구조를 단일 시트에서 `3개 데모 시트` 구조로 재구성
- 시트별 CSV 다운로드가 가능하도록 변경
- `server.py`를 추가해 정적 파일 서빙과 `/api/ccd-package` API를 함께 제공
- 프론트엔드가 mock 결과를 직접 만들지 않고, 서버에 payload를 전송해 CCD 패키지 결과를 받도록 변경
- 서버 응답으로 CCD conceptual document, Mermaid 공정도, 장비 목록, ROM 예산 요약, open items를 반환
- `.xlsx` 업로드 시 `/api/parse-workbook`로 파일을 전송하고, 서버에서 시트명과 셀 preview를 읽어 3개 데모 시트로 매핑

현재 기준 의미:

- 이제 흐름은 `frontend only demo`가 아니라 `frontend -> local API server -> generated package response` 구조다.
- 다만 workbook parsing은 아직 기본적인 zip/xml 기반 preview 수준이며, 실제 URS 템플릿별 정교한 셀 매핑은 다음 단계다.
- LLM 호출, Word/PDF 산출, 실제 견적 계산은 아직 붙어 있지 않다.

## 이번 구현에서 의도한 기술적 방향

현재 저장소가 비어 있었기 때문에, 의존성 설치 없이 바로 열어볼 수 있는 정적 프로토타입으로 시작했다.

장점은 다음과 같다.

- 별도 빌드 과정 없이 즉시 확인 가능
- 입력/출력 흐름 논의에 집중 가능
- 다음 단계에서 프레임워크 도입 여부를 유연하게 결정 가능

## 홈 화면 UI 테마 업데이트 메모

이번 홈 화면은 기존의 밝은 톤에서, 바이오프로세스 / 스마트팩토리 컨셉에 맞는 다크 테마 중심 UI로 방향을 전환했다.

주요 변경 사항은 다음과 같다.

- 배경을 `#080C14` 계열의 딥 네이비 기반으로 변경
- 히어로 중앙에 cyan-teal glow를 두어 제품 인상을 강화
- 제목은 과도하게 큰 한글 문장에서, 더 짧고 세련된 영어 타이틀 `BioForge CCD Studio`로 조정
- 네비게이션을 pill 형태의 floating dark bar 스타일로 변경
- 홈 화면 내 워크스페이스 프리뷰, 프로세스, 결과, value card를 동일한 dark glass 계열 surface로 통일

가독성 측면에서 특히 반영한 원칙:

- 헤드라인 크기를 축소해 첫 화면에서 과도하게 압도되지 않도록 조정
- 긴 문장은 보조 설명으로 내려 시선 흐름을 단순화
- 카드와 그리드에 `minmax(0, 1fr)` 기준을 적용해 텍스트가 영역 밖으로 튀어나오지 않도록 방지
- 모바일 구간에서 버튼, 템플릿 카드, 프로세스 레이아웃이 1열로 자연스럽게 재배치되도록 반응형 보완
- 줄바꿈이 불안정한 제목 영역에는 `text-wrap` / `overflow-wrap` 기준을 적용해 레이아웃 깨짐을 줄임

이 변경은 현재 `index.html`, `styles.css` 기준으로만 반영되어 있으며, 이후 `workspace.html`에도 동일한 테마 언어를 확장 적용할 수 있다.

## 현재 구현의 한계

1. `.xlsx` 파일은 현재 기본 zip/xml 파서로 시트명과 일부 셀 미리보기만 읽는다.
2. Google Drive는 실제 API 연동이 아닌 모의 버튼이다.
3. 현재 서버는 로컬 mock API이며 실제 LLM 호출은 아직 없다.
4. 결과물은 CCD 패키지 문서형 데모까지 확장되었지만 Word/PDF/Excel 패키지 산출은 아직 연결되지 않았다.
5. 서버 응답은 규칙 기반으로 생성되며, 실제 견적 엔진이나 비용 DB는 붙어 있지 않다.

## 현재 데모 서버 상태

이번 단계에서 정적 프로토타입에 로컬 API 서버를 추가했다.

- `server.py`가 정적 파일 서빙과 `/api/ccd-package` 엔드포인트를 함께 제공
- `server.py`가 `/api/parse-workbook` 엔드포인트를 통해 `.xlsx` 시트명/셀 preview를 파싱
- 프론트엔드 `script.js`는 3개 시트 입력 workbook JSON을 서버로 전송
- 서버는 CCD conceptual package, Mermaid 공정도, 장비 목록, ROM 예산 요약을 JSON으로 반환
- 업로드된 workbook은 서버에서 3개 데모 시트 구조로 매핑되어 화면에 반영

즉, 현재는 `frontend mock`이 아니라 `frontend -> local server -> generated response` 흐름까지 연결된 상태다.

## 다음 단계 권장 순서

### 1. 입력 스키마 확정

- 현재 프로토타입 입력 스키마는 `URS_SmartFactory_ConceptualDesign_v2.xlsx`를 기준으로 7개 입력 군으로 재구성했다.
- 상세 매핑은 `docs/04-input-schema-from-urs.md` 참고
- 어떤 Excel 템플릿을 표준으로 삼을지 결정
- 시트 이름, 컬럼명, 필수 입력값 정의
- 폼 입력과 Excel 컬럼 매핑 표 작성

### 2. Excㅇ쇼ㅏㅓㅗㅎel 처리 계층 추가

- 브라우저 업로드 파일 파싱
- 시트별 validation
- 누락 데이터 및 형식 오류 표시

추천 후보:

- 프론트에서 간단 preview: `SheetJS`
- 서버에서 정밀 처리: Python `openpyxl` 또는 Node `exceljs`

### 3. LLM 분석 파이프라인 연결

- 입력 시트를 JSON 구조로 정규화
- prompt template 설계
- 결과를 CCD 섹션별로 반환

예상 출력 섹션:

- Design Basis
- Process Summary
- Equipment Summary
- Utility Requirements
- Assumptions and Open Items
- Recommended Deliverables

### 4. Google Drive 연동

- OAuth 인증
- Drive Picker
- 선택 파일 메타데이터 및 다운로드 URL 처리

### 5. 결과 문서화

- 화면 출력 외에 Word / PDF / Excel 반환
- 입력값 추적성 확보
- 생성 시각, 버전, 작성 근거 포함

## 향후 권장 아키텍처

### 프론트엔드

- React 또는 Next.js 기반 워크스페이스
- 업로드, 입력 폼, 결과 문서 미리보기

### 백엔드

- Excel parser
- LLM orchestration
- 결과 패키지 생성 API
- 파일 저장 및 버전 관리

### 데이터 모델

- raw input
- normalized project assumptions
- generated CCD sections
- exported package artifacts

## 실행 방법

현재는 API 호출이 포함되어 있으므로 `index.html`을 파일로 직접 여는 방식보다 로컬 서버 실행 방식이 권장된다.

예시:

```bash
python3 server.py
```

실행 후 브라우저에서 아래 주소로 접속:

```text
http://127.0.0.1:8000
```

## 로컬 서버 실행 시 `OSError: [Errno 48] Address already in use`가 뜨는 경우

이 에러는 보통 같은 포트를 이미 다른 프로세스가 사용 중일 때 발생한다.

### 해결 방법 1. 다른 포트로 실행

가장 간단한 방법은 포트 번호를 바꿔서 다시 실행하는 것이다.

```bash
python3 -m http.server 8001
```

또는

```bash
python3 -m http.server 9000
```

### 해결 방법 2. 해당 포트를 점유한 프로세스 종료

현재 어떤 프로세스가 포트를 쓰고 있는지 확인한 뒤 종료할 수 있다.

```bash
lsof -i :8000
```

출력된 PID를 확인한 뒤 종료:

```bash
kill <PID>
```

강제 종료가 필요하면:

```bash
kill -9 <PID>
```

### 자주 있는 원인

- 이전에 실행한 `python3 -m http.server 8000` 프로세스가 그대로 살아 있는 경우
- 다른 개발 서버가 같은 포트를 쓰고 있는 경우
- IDE나 백그라운드 툴이 해당 포트를 이미 점유하고 있는 경우

### 권장 대응

프로토타입 확인 목적이라면 우선 다른 포트로 빠르게 실행하는 방법이 가장 편하다.  
반대로 항상 같은 포트를 써야 한다면 `lsof -i :포트번호`로 점유 프로세스를 찾아 정리하는 방식이 적합하다.
