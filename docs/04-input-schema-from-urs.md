# 입력 스키마 확정 메모

## 기준 파일

- `URS_SmartFactory_ConceptualDesign_v2.xlsx`

이번 스키마 보강은 위 엑셀 파일의 시트 구조를 읽어 프로토타입 입력 화면에 반영한 것이다.

## 워크북 구조 요약

원본 워크북은 총 29개 시트로 구성되어 있으며, 실질적인 사용자 입력 질문은 다음 범주를 포함한다.

- Executive Summary / Business Drivers
- Smart Factory Vision / Objectives / KPIs
- Digital Maturity Assessment
- Industry 4.0 / Pharma 4.0
- ISA-95 Integration Model
- Data Architecture & Governance
- System Integration Requirements
- MES / EBR / PAT / APC / IIoT
- Digital Twin / AI-ML / Cloud / Robotics
- Network / Cybersecurity / HMI
- ERP / LIMS / QMS / Supply Chain
- Predictive Maintenance / Energy
- 21 CFR Part 11 / ALCOA+
- Change Management / Training

## 프로토타입 반영 방식

원본 시트를 그대로 한 장씩 보여주면 입력량이 과도해지고 논의 흐름이 끊기기 때문에, 프로토타입에서는 질문을 7개의 아코디언 입력 군으로 재구성했다.

### 1. 프로젝트 개요 및 Business Drivers

기준 시트:

- Sheet 1
- Sheet 2 일부

주요 항목:

- Project Name
- Associated Facility
- Project Objective
- Operational Excellence Priority
- Quality Improvement Priority
- Regulatory Compliance Priority
- Cost Reduction Priority
- Time-to-Market Priority

### 2. Vision, Objectives & Digital Maturity

기준 시트:

- Sheet 2
- Sheet 3

주요 항목:

- Smart Factory Vision
- Autonomous Operations
- Predictive Capabilities
- Real-time Visibility
- Digital Strategy Current / Target
- Process Standardization Current / Target

### 3. Data Architecture & Integration

기준 시트:

- Sheet 5
- Sheet 6
- Sheet 7

주요 항목:

- Single Source of Truth
- Data Ownership Model
- Data Lake / Warehouse
- Time-series Database
- MES-ERP / MES-LIMS / MES-DCS 연결 방식
- Veeva-MES 연계 방식

### 4. Core Platforms: MES / EBR / ERP / LIMS / QMS

기준 시트:

- Sheet 8
- Sheet 9
- Sheet 20
- Sheet 21
- Sheet 22

주요 항목:

- MES Production Scheduling
- MES Recipe Management
- MES Batch Execution
- EBR Authoring
- EBR Approval Workflow
- ERP Vendor
- LIMS Vendor
- Primary QMS

### 5. Advanced Smart Factory Capabilities

기준 시트:

- Sheet 10
- Sheet 11
- Sheet 12
- Sheet 13
- Sheet 14
- Sheet 16

주요 항목:

- PAT Biomass Monitoring
- PAT Protein Concentration
- Model Predictive Control
- Process Sensor Standard
- Facility Digital Twin
- AI Process Optimization
- Robotics for Material Handling
- AGV / AMR

### 6. Cloud, Network, Cybersecurity & HMI

기준 시트:

- Sheet 15
- Sheet 17
- Sheet 18
- Sheet 19

주요 항목:

- Cloud Deployment Model
- Cloud Provider
- Network Topology
- IT/OT Convergence
- Primary Security Standard
- Target Security Level
- HMI Philosophy
- Mobile HMI

### 7. Operations, Compliance & Change Enablement

기준 시트:

- Sheet 24
- Sheet 25
- Sheet 26
- Sheet 27
- Sheet 28

주요 항목:

- Predictive Maintenance Philosophy
- Energy Reduction Goal
- Closed System Controls Approach
- Audit Trail Approach
- Data Integrity User ID Control
- Change Management Framework
- Training Approach
- Retraining Frequency

## 현재 반영 원칙

### 선택형 질문은 토글형으로 우선 구현

원본 시트의 `[High/Medium/Low]`, `[Required/Optional]`, `[Yes/No]`, `[Cloud/On-prem/Hybrid]` 같은 값은
사용자가 빠르게 비교할 수 있도록 토글형 버튼으로 구성했다.

### 서술형 질문은 텍스트 / textarea로 유지

아래 성격의 항목은 자유 서술이 필요한 질문이어서 텍스트 또는 textarea로 유지했다.

- Vision statement
- Project objective
- Data ownership
- Network topology
- Part 11 approach
- Data integrity approach

### 전체 시트 1:1 복제는 아직 하지 않음

이번 단계는 개념설계 협의용 프로토타입이므로, 원본 워크북의 모든 row를 화면에 그대로 복제하지는 않았다.
대신 다음 단계에서 다음 두 옵션 중 하나를 선택할 수 있다.

1. 현재 아코디언 구조를 유지하고, 세부 질문을 점진적으로 추가
2. 실제 워크북 row 전체를 동적으로 렌더링하는 sheet-native UI로 전환

## 다음 단계 제안

- 실제 워크북 row 전체를 JSON schema로 변환
- 질문 타입 자동 추론
- 빈값 validation
- 필수 입력 마킹
- 결과 문서와 입력 row 간 traceability 연결
