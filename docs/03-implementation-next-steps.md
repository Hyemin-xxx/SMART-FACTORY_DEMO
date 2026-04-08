# 구현 메모 및 다음 단계

## 이번 구현에서 의도한 기술적 방향

현재 저장소가 비어 있었기 때문에, 의존성 설치 없이 바로 열어볼 수 있는 정적 프로토타입으로 시작했다.

장점은 다음과 같다.

- 별도 빌드 과정 없이 즉시 확인 가능
- 입력/출력 흐름 논의에 집중 가능
- 다음 단계에서 프레임워크 도입 여부를 유연하게 결정 가능

## 현재 구현의 한계

1. `.xlsx` 파일을 실제로 파싱하지 않는다.
2. Google Drive는 실제 API 연동이 아닌 모의 버튼이다.
3. LLM 호출 없이 화면 내 규칙 기반 요약만 생성한다.
4. 결과물은 CCD 패키지 "초안 UI" 수준이며, 문서 포맷 산출까지는 연결되지 않았다.

## 다음 단계 권장 순서

### 1. 입력 스키마 확정

- 어떤 Excel 템플릿을 표준으로 삼을지 결정
- 시트 이름, 컬럼명, 필수 입력값 정의
- 폼 입력과 Excel 컬럼 매핑 표 작성

### 2. Excel 처리 계층 추가

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

정적 파일 기반이므로 브라우저에서 `index.html`을 직접 열어도 되고, 간단한 로컬 서버로 실행해도 된다.

예시:

```bash
python3 -m http.server 8000
```
