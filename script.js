const workbookName = "URS_SmartFactory_ConceptualDesign_v2.xlsx";

const schemaSections = [
  {
    id: "overview",
    sheetLabel: "Sheets 1-2",
    title: "프로젝트 개요 및 Business Drivers",
    description: "Executive Summary와 Business Drivers를 기반으로 프로젝트 목적과 우선순위를 정리합니다.",
    fields: [
      {
        id: "projectName",
        sheet: "1",
        category: "1.1 Project Overview",
        label: "Project Name",
        guide: "Smart Factory implementation project name",
        type: "text",
        placeholder: "예: Smart Biologics Factory Phase 1"
      },
      {
        id: "associatedFacility",
        sheet: "1",
        category: "1.1 Project Overview",
        label: "Associated Facility",
        guide: "Reference to associated Biopharm manufacturing URS",
        type: "text",
        placeholder: "예: URS_BiopharmDS_ConceptualDesign_v2"
      },
      {
        id: "projectObjective",
        sheet: "1",
        category: "1.1 Project Overview",
        label: "Project Objective",
        guide: "Primary objective of Smart Factory implementation",
        type: "textarea",
        placeholder: "예: paperless manufacturing, data integrity 강화, 실시간 release 기반 마련"
      },
      {
        id: "driverOperationalExcellence",
        sheet: "1",
        category: "1.2 Business Drivers",
        label: "Operational Excellence Priority",
        guide: "Reduce batch failures and improve operational excellence",
        type: "choice",
        options: ["High", "Medium", "Low"]
      },
      {
        id: "driverQualityImprovement",
        sheet: "1",
        category: "1.2 Business Drivers",
        label: "Quality Improvement Priority",
        guide: "Real-time quality assurance and visibility",
        type: "choice",
        options: ["High", "Medium", "Low"]
      },
      {
        id: "driverRegulatoryCompliance",
        sheet: "1",
        category: "1.2 Business Drivers",
        label: "Regulatory Compliance Priority",
        guide: "Data integrity and 21 CFR Part 11 expectations",
        type: "choice",
        options: ["High", "Medium", "Low"]
      },
      {
        id: "driverCostReduction",
        sheet: "1",
        category: "1.2 Business Drivers",
        label: "Cost Reduction Priority",
        guide: "Reduce operational cost through smart factory enablement",
        type: "choice",
        options: ["High", "Medium", "Low"]
      },
      {
        id: "driverTimeToMarket",
        sheet: "1",
        category: "1.2 Business Drivers",
        label: "Time-to-Market Priority",
        guide: "Accelerate batch release and product launch timing",
        type: "choice",
        options: ["High", "Medium", "Low"]
      }
    ]
  },
  {
    id: "vision",
    sheetLabel: "Sheets 2-3",
    title: "Vision, Objectives & Digital Maturity",
    description: "비전과 현재/목표 maturity 수준을 함께 기록해 개념설계 범위를 정합니다.",
    fields: [
      {
        id: "smartFactoryVision",
        sheet: "2",
        category: "2.1 Vision Statement",
        label: "Smart Factory Vision",
        guide: "Define the desired future state",
        type: "textarea",
        placeholder: "예: end-to-end digital thread 기반의 autonomous operations 구현"
      },
      {
        id: "autonomousOperations",
        sheet: "2",
        category: "2.2 Strategic Objectives",
        label: "Autonomous Operations",
        guide: "Level of autonomous manufacturing",
        type: "choice",
        options: ["Full", "Partial", "Minimal"]
      },
      {
        id: "predictiveCapabilities",
        sheet: "2",
        category: "2.2 Strategic Objectives",
        label: "Predictive Capabilities",
        guide: "Predictive quality, maintenance, scheduling capability",
        type: "choice",
        options: ["Advanced", "Basic", "None"]
      },
      {
        id: "realtimeVisibility",
        sheet: "2",
        category: "2.2 Strategic Objectives",
        label: "Real-time Visibility",
        guide: "End-to-end process visibility target",
        type: "choice",
        options: ["Full", "Partial", "None"]
      },
      {
        id: "digitalStrategyCurrent",
        sheet: "3",
        category: "3.1 Strategy",
        label: "Digital Strategy Current",
        guide: "Current maturity level (1-5)",
        type: "choice",
        options: ["1", "2", "3", "4", "5"]
      },
      {
        id: "digitalStrategyTarget",
        sheet: "3",
        category: "3.1 Strategy",
        label: "Digital Strategy Target",
        guide: "Target maturity level (1-5)",
        type: "choice",
        options: ["1", "2", "3", "4", "5"]
      },
      {
        id: "processStandardizationCurrent",
        sheet: "3",
        category: "3.3 Process",
        label: "Process Standardization Current",
        guide: "Current SOP digitization and standardization maturity",
        type: "choice",
        options: ["1", "2", "3", "4", "5"]
      },
      {
        id: "processStandardizationTarget",
        sheet: "3",
        category: "3.3 Process",
        label: "Process Standardization Target",
        guide: "Target SOP digitization and standardization maturity",
        type: "choice",
        options: ["1", "2", "3", "4", "5"]
      }
    ]
  },
  {
    id: "dataIntegration",
    sheetLabel: "Sheets 5-7",
    title: "Data Architecture & Integration",
    description: "ISA-95, data platform, 시스템 간 연결 방식을 정리해 CCD의 디지털 backbone을 구성합니다.",
    fields: [
      {
        id: "dataPhilosophy",
        sheet: "6",
        category: "6.1 Data Strategy",
        label: "Single Source of Truth",
        guide: "Single source of truth approach required",
        type: "choice",
        options: ["Yes", "No"]
      },
      {
        id: "dataOwnership",
        sheet: "6",
        category: "6.1 Data Strategy",
        label: "Data Ownership Model",
        guide: "Clear data ownership model",
        type: "text",
        placeholder: "예: QA owns release data, MES team owns execution data"
      },
      {
        id: "dataLakeModel",
        sheet: "6",
        category: "6.3 Data Platform",
        label: "Data Lake / Warehouse",
        guide: "Centralized data repository deployment model",
        type: "choice",
        options: ["Cloud", "On-prem", "Hybrid"]
      },
      {
        id: "timeseriesDb",
        sheet: "6",
        category: "6.3 Data Platform",
        label: "Time-series Database",
        guide: "High-frequency process data repository",
        type: "choice",
        options: ["Required", "Optional"]
      },
      {
        id: "mesToErpMethod",
        sheet: "7",
        category: "7.1 MES Integration",
        label: "MES -> ERP Integration Method",
        guide: "Production orders and material data flow",
        type: "choice",
        options: ["API", "File", "Middleware"]
      },
      {
        id: "mesToLimsMethod",
        sheet: "7",
        category: "7.1 MES Integration",
        label: "MES -> LIMS Integration Method",
        guide: "Sample request and results integration",
        type: "choice",
        options: ["API", "File", "Middleware"]
      },
      {
        id: "mesToDcsMethod",
        sheet: "7",
        category: "7.1 MES Integration",
        label: "MES -> DCS/SCADA Method",
        guide: "Recipes, setpoints and process data exchange",
        type: "choice",
        options: ["OPC UA", "Proprietary"]
      },
      {
        id: "veevaToMesMethod",
        sheet: "7",
        category: "7.2 Veeva Integration",
        label: "Veeva -> MES/EBR Method",
        guide: "Deviation, CAPA and change control integration",
        type: "choice",
        options: ["API", "Middleware"]
      }
    ]
  },
  {
    id: "platforms",
    sheetLabel: "Sheets 8-9 / 20-23",
    title: "Core Platforms: MES, EBR, ERP, LIMS, QMS",
    description: "핵심 운영 시스템의 필요 수준과 플랫폼 방향을 함께 입력합니다.",
    fields: [
      {
        id: "mesProductionScheduling",
        sheet: "8",
        category: "8.1 Production Operations",
        label: "MES Production Scheduling",
        guide: "Short-term production scheduling capability",
        type: "choice",
        options: ["Yes", "No", "Partial"]
      },
      {
        id: "mesRecipeManagement",
        sheet: "8",
        category: "8.1 Production Operations",
        label: "MES Recipe Management",
        guide: "Master recipe and control recipe management",
        type: "choice",
        options: ["Yes", "No", "Partial"]
      },
      {
        id: "mesBatchExecution",
        sheet: "8",
        category: "8.1 Production Operations",
        label: "MES Batch Execution",
        guide: "Automated batch control and execution",
        type: "choice",
        options: ["Yes", "No", "Partial"]
      },
      {
        id: "ebrAuthoring",
        sheet: "9",
        category: "9.1 Master Batch Record",
        label: "EBR Authoring",
        guide: "Electronic master batch record creation and versioning",
        type: "choice",
        options: ["Yes", "No"]
      },
      {
        id: "ebrApprovalWorkflow",
        sheet: "9",
        category: "9.1 Master Batch Record",
        label: "EBR Approval Workflow",
        guide: "Electronic review and approval workflow",
        type: "choice",
        options: ["Yes", "No"]
      },
      {
        id: "erpVendor",
        sheet: "20",
        category: "20.1 ERP System",
        label: "ERP Vendor",
        guide: "Current or planned ERP system",
        type: "text",
        placeholder: "예: SAP S/4HANA"
      },
      {
        id: "limsVendor",
        sheet: "21",
        category: "21.1 LIMS System",
        label: "LIMS Vendor",
        guide: "Current or planned LIMS platform",
        type: "text",
        placeholder: "예: LabVantage"
      },
      {
        id: "qmsPlatform",
        sheet: "22",
        category: "22.1 QMS Platform",
        label: "Primary QMS",
        guide: "Electronic quality management platform",
        type: "choice",
        options: ["Veeva", "TrackWise", "Other"]
      }
    ]
  },
  {
    id: "advancedCapabilities",
    sheetLabel: "Sheets 10-16",
    title: "PAT, APC, Digital Twin, AI & Automation",
    description: "고도화 capability 범위를 토글형으로 빠르게 비교할 수 있게 구성했습니다.",
    fields: [
      {
        id: "patBiomassMonitoring",
        sheet: "10",
        category: "10.1 Upstream",
        label: "PAT Biomass Monitoring",
        guide: "Biomass monitoring application style",
        type: "choice",
        options: ["In-line", "At-line", "Off-line"]
      },
      {
        id: "patProteinConcentration",
        sheet: "10",
        category: "10.2 Downstream",
        label: "PAT Protein Concentration",
        guide: "UF/DF or formulation concentration monitoring",
        type: "choice",
        options: ["In-line", "At-line", "Off-line"]
      },
      {
        id: "apcModelPredictiveControl",
        sheet: "11",
        category: "11.2 Supervisory Control",
        label: "Model Predictive Control",
        guide: "MPC for bioreactor or critical unit operations",
        type: "choice",
        options: ["Required", "Optional"]
      },
      {
        id: "smartSensorStandard",
        sheet: "12",
        category: "12.1 Process Sensors",
        label: "Process Sensor Standard",
        guide: "Smart or standard instrumentation baseline",
        type: "choice",
        options: ["Smart", "Standard"]
      },
      {
        id: "digitalTwinFacility",
        sheet: "13",
        category: "13.3 Facility Twin",
        label: "Facility Digital Twin",
        guide: "BIM-based or facility digital twin requirement",
        type: "choice",
        options: ["Required", "Optional"]
      },
      {
        id: "aiProcessOptimization",
        sheet: "14",
        category: "14.1 Process Optimization",
        label: "AI Process Optimization",
        guide: "Use AI/ML to optimize setpoints or feed strategy",
        type: "choice",
        options: ["Required", "Optional"]
      },
      {
        id: "roboticsMaterialHandling",
        sheet: "16",
        category: "16.1 Industrial Robots",
        label: "Robotics for Material Handling",
        guide: "Automated material transport with robots",
        type: "choice",
        options: ["Required", "Optional"]
      },
      {
        id: "agvAmr",
        sheet: "16",
        category: "16.2 Mobile Robots",
        label: "AGV / AMR",
        guide: "Autonomous mobile robot requirement",
        type: "choice",
        options: ["Required", "Optional"]
      }
    ]
  },
  {
    id: "infrastructure",
    sheetLabel: "Sheets 15 / 17-19",
    title: "Cloud, Network, Cybersecurity & HMI",
    description: "인프라 전략과 OT 보안 수준을 early concept 단계에서 함께 고정할 수 있습니다.",
    fields: [
      {
        id: "cloudDeploymentModel",
        sheet: "15",
        category: "15.1 Cloud Strategy",
        label: "Cloud Deployment Model",
        guide: "Public, Private or Hybrid cloud strategy",
        type: "choice",
        options: ["Public", "Private", "Hybrid"]
      },
      {
        id: "cloudProvider",
        sheet: "15",
        category: "15.1 Cloud Strategy",
        label: "Cloud Provider",
        guide: "Preferred cloud provider",
        type: "choice",
        options: ["AWS", "Azure", "GCP", "Other"]
      },
      {
        id: "networkTopology",
        sheet: "17",
        category: "17.1 Architecture",
        label: "Network Topology",
        guide: "Overall network design approach",
        type: "text",
        placeholder: "예: converged enterprise core + OT zone/cell segmentation"
      },
      {
        id: "itOtConvergence",
        sheet: "17",
        category: "17.1 Architecture",
        label: "IT/OT Convergence",
        guide: "Network integration strategy",
        type: "choice",
        options: ["Converged", "Separated", "DMZ"]
      },
      {
        id: "securityStandard",
        sheet: "18",
        category: "18.1 Framework",
        label: "Primary Security Standard",
        guide: "Primary OT security framework",
        type: "choice",
        options: ["IEC 62443", "NIST", "ISO 27001"]
      },
      {
        id: "securityLevel",
        sheet: "18",
        category: "18.1 Framework",
        label: "Target Security Level",
        guide: "Target security level for OT environment",
        type: "choice",
        options: ["SL 1", "SL 2", "SL 3", "SL 4"]
      },
      {
        id: "hmiPhilosophy",
        sheet: "19",
        category: "19.1 HMI Standards",
        label: "HMI Philosophy",
        guide: "High-performance HMI standard",
        type: "choice",
        options: ["ISA-101", "ASM", "Custom"]
      },
      {
        id: "mobileHmi",
        sheet: "19",
        category: "19.2 Operator Interface",
        label: "Mobile HMI",
        guide: "Mobile device access requirement",
        type: "choice",
        options: ["Required", "Optional"]
      }
    ]
  },
  {
    id: "compliance",
    sheetLabel: "Sheets 24-28",
    title: "Operations, Compliance & Change Enablement",
    description: "PdM, energy, 21 CFR Part 11, ALCOA+, change management까지 후속 CCD 패키지 범위에 반영합니다.",
    fields: [
      {
        id: "predictiveMaintenanceStrategy",
        sheet: "24",
        category: "24.1 Strategy",
        label: "Predictive Maintenance Philosophy",
        guide: "Target maintenance strategy",
        type: "text",
        placeholder: "예: critical rotating equipment 중심 predictive maintenance"
      },
      {
        id: "energyGoal",
        sheet: "25",
        category: "25.1 Strategy",
        label: "Energy Reduction Goal",
        guide: "Energy reduction target percentage or statement",
        type: "text",
        placeholder: "예: 15% utility reduction versus baseline"
      },
      {
        id: "closedSystemControls",
        sheet: "26",
        category: "21 CFR 11.10",
        label: "Closed System Controls Approach",
        guide: "Validation, audit trail and access control approach",
        type: "textarea",
        placeholder: "예: validated MES/EBR with role-based access and time-stamped audit trails"
      },
      {
        id: "auditTrailApproach",
        sheet: "26",
        category: "21 CFR 11.10(e)",
        label: "Audit Trail Approach",
        guide: "Computer-generated and time-stamped audit trail concept",
        type: "textarea",
        placeholder: "예: MES, QMS, LIMS 전 영역의 immutable audit trail 적용"
      },
      {
        id: "dataIntegrityUserId",
        sheet: "27",
        category: "Attributable",
        label: "Data Integrity User ID Control",
        guide: "Unique user IDs and shared account prevention",
        type: "textarea",
        placeholder: "예: centralized identity management with unique IDs and MFA for critical roles"
      },
      {
        id: "changeFramework",
        sheet: "28",
        category: "28.1 Change Management",
        label: "Change Management Framework",
        guide: "Organizational change methodology",
        type: "choice",
        options: ["ADKAR", "Kotter", "Other"]
      },
      {
        id: "trainingApproach",
        sheet: "28",
        category: "28.2 Training Requirements",
        label: "Training Approach",
        guide: "Training delivery method",
        type: "choice",
        options: ["Classroom", "eLearning", "OJT", "Blended"]
      },
      {
        id: "retrainingFrequency",
        sheet: "28",
        category: "28.2 Training Requirements",
        label: "Retraining Frequency",
        guide: "Refresher training cadence",
        type: "choice",
        options: ["Annual", "Biennial", "As needed"]
      }
    ]
  }
];

const sampleValues = {
  projectName: "Incheon Smart Biologics Factory",
  associatedFacility: "URS_BiopharmDS_ConceptualDesign_v2",
  projectObjective:
    "MES/EBR, PAT, OT cybersecurity, data platform을 포함하는 Smart Factory 개념설계 패키지를 마련하고 pilot-to-commercial 확장 전략을 수립합니다.",
  driverOperationalExcellence: "High",
  driverQualityImprovement: "High",
  driverRegulatoryCompliance: "High",
  driverCostReduction: "Medium",
  driverTimeToMarket: "High",
  smartFactoryVision:
    "Paperless manufacturing과 real-time release readiness를 갖춘 data-centric biologics production campus를 구축합니다.",
  autonomousOperations: "Partial",
  predictiveCapabilities: "Advanced",
  realtimeVisibility: "Full",
  digitalStrategyCurrent: "2",
  digitalStrategyTarget: "4",
  processStandardizationCurrent: "2",
  processStandardizationTarget: "4",
  dataPhilosophy: "Yes",
  dataOwnership: "MES team owns execution data, QA owns release/approval data, OT team owns historian data.",
  dataLakeModel: "Hybrid",
  timeseriesDb: "Required",
  mesToErpMethod: "Middleware",
  mesToLimsMethod: "API",
  mesToDcsMethod: "OPC UA",
  veevaToMesMethod: "API",
  mesProductionScheduling: "Yes",
  mesRecipeManagement: "Yes",
  mesBatchExecution: "Yes",
  ebrAuthoring: "Yes",
  ebrApprovalWorkflow: "Yes",
  erpVendor: "SAP S/4HANA",
  limsVendor: "LabVantage",
  qmsPlatform: "Veeva",
  patBiomassMonitoring: "In-line",
  patProteinConcentration: "At-line",
  apcModelPredictiveControl: "Optional",
  smartSensorStandard: "Smart",
  digitalTwinFacility: "Optional",
  aiProcessOptimization: "Required",
  roboticsMaterialHandling: "Optional",
  agvAmr: "Optional",
  cloudDeploymentModel: "Hybrid",
  cloudProvider: "Azure",
  networkTopology: "OT zone/cell segmentation with enterprise DMZ and historian bridge",
  itOtConvergence: "DMZ",
  securityStandard: "IEC 62443",
  securityLevel: "SL 3",
  hmiPhilosophy: "ISA-101",
  mobileHmi: "Optional",
  predictiveMaintenanceStrategy: "Critical utilities and rotating equipment 중심 predictive maintenance roadmap 적용",
  energyGoal: "Utility and cleanroom energy intensity 12% 절감",
  closedSystemControls:
    "Validated MES/EBR platform with role-based access, review by exception and controlled electronic signatures.",
  auditTrailApproach:
    "MES, QMS, LIMS, historian 간 time-synchronized audit trail을 유지하고 deviation investigation trace를 연결합니다.",
  dataIntegrityUserId:
    "Shared account 금지, unique user ID, MFA for critical approvals, central identity lifecycle management 적용.",
  changeFramework: "ADKAR",
  trainingApproach: "Blended",
  retrainingFrequency: "Annual"
};

const allFields = schemaSections.flatMap((section) =>
  section.fields.map((field) => ({
    ...field,
    sectionId: section.id,
    sectionTitle: section.title,
    sheetLabel: section.sheetLabel
  }))
);

const defaultState = Object.fromEntries(allFields.map((field) => [field.id, field.defaultValue || ""]));

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labelizeValue(value) {
  return value && String(value).trim() ? String(value).trim() : "미입력";
}

function getFieldById(fieldId) {
  return allFields.find((field) => field.id === fieldId);
}

function initWorkspacePage() {
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const selectedFileName = document.getElementById("selectedFileName");
  const selectedFileStatus = document.getElementById("selectedFileStatus");
  const mockDriveButton = document.getElementById("mockDriveButton");
  const fillSampleButton = document.getElementById("fillSampleButton");
  const generateButton = document.getElementById("generateButton");
  const downloadSummaryButton = document.getElementById("downloadSummaryButton");
  const downloadSheetButton = document.getElementById("downloadSheetButton");
  const resultShell = document.getElementById("resultShell");
  const sheetBody = document.getElementById("sheetBody");
  const schemaSectionsElement = document.getElementById("schemaSections");
  const schemaStatsElement = document.getElementById("schemaStats");
  const schemaHighlightsElement = document.getElementById("schemaHighlights");
  const expandAllToggle = document.getElementById("expandAllToggle");

  let activeFile = null;
  let latestSummary = "";
  const formState = { ...defaultState };

  function setFileState(file, status) {
    activeFile = file;
    selectedFileName.textContent = file ? file.name : "아직 업로드된 파일이 없습니다.";
    selectedFileStatus.textContent = status;
  }

  function countCompletedFields() {
    return allFields.filter((field) => String(formState[field.id] || "").trim()).length;
  }

  function countPriorityHigh() {
    return Object.keys(formState).filter((key) => String(formState[key]) === "High").length;
  }

  function renderSchemaStats() {
    const completed = countCompletedFields();
    const highPriority = countPriorityHigh();
    const stats = [
      { label: "기준 문서", value: workbookName },
      { label: "아코디언 섹션", value: `${schemaSections.length}개` },
      { label: "매핑된 입력 항목", value: `${allFields.length}개` },
      { label: "현재 입력 완료", value: `${completed}개` },
      { label: "High 우선순위", value: `${highPriority}개` }
    ];

    schemaStatsElement.innerHTML = stats
      .map(
        (stat) => `
          <article class="stat-card">
            <span>${escapeHtml(stat.label)}</span>
            <strong>${escapeHtml(stat.value)}</strong>
          </article>
        `
      )
      .join("");

    const highlights = [
      "원본 워크북의 28개 시트를 7개 입력 군으로 재구성",
      "선택형 항목은 토글 버튼 방식으로 빠르게 비교 가능",
      "입력값은 시트 미리보기와 결과 초안에 동시에 반영",
      activeFile ? `현재 업로드 파일: ${activeFile.name}` : "아직 참조 파일은 업로드되지 않음"
    ];

    schemaHighlightsElement.innerHTML = highlights
      .map((item) => `<div class="highlight-pill">${escapeHtml(item)}</div>`)
      .join("");
  }

  function renderField(field) {
    const currentValue = formState[field.id] || "";
    const meta = `Sheet ${field.sheet} · ${field.category}`;

    if (field.type === "choice") {
      return `
        <article class="schema-field" data-field-id="${field.id}">
          <div class="field-meta">${escapeHtml(meta)}</div>
          <h3>${escapeHtml(field.label)}</h3>
          <p>${escapeHtml(field.guide)}</p>
          <div class="choice-toggle" data-field-id="${field.id}">
            ${field.options
              .map(
                (option) => `
                  <button
                    class="choice-pill${currentValue === option ? " is-active" : ""}"
                    type="button"
                    data-field-id="${field.id}"
                    data-value="${escapeHtml(option)}"
                  >
                    ${escapeHtml(option)}
                  </button>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    }

    if (field.type === "textarea") {
      return `
        <article class="schema-field" data-field-id="${field.id}">
          <div class="field-meta">${escapeHtml(meta)}</div>
          <h3>${escapeHtml(field.label)}</h3>
          <p>${escapeHtml(field.guide)}</p>
          <textarea
            class="schema-textarea"
            data-field-id="${field.id}"
            rows="4"
            placeholder="${escapeHtml(field.placeholder || "")}"
          >${escapeHtml(currentValue)}</textarea>
        </article>
      `;
    }

    return `
      <article class="schema-field" data-field-id="${field.id}">
        <div class="field-meta">${escapeHtml(meta)}</div>
        <h3>${escapeHtml(field.label)}</h3>
        <p>${escapeHtml(field.guide)}</p>
        <input
          class="schema-input"
          data-field-id="${field.id}"
          type="text"
          value="${escapeHtml(currentValue)}"
          placeholder="${escapeHtml(field.placeholder || "")}"
        />
      </article>
    `;
  }

  function renderSchemaSections() {
    schemaSectionsElement.innerHTML = schemaSections
      .map(
        (section, index) => `
          <details class="accordion-item" ${index < 2 ? "open" : ""}>
            <summary class="accordion-summary">
              <div>
                <span class="accordion-sheet">${escapeHtml(section.sheetLabel)}</span>
                <strong>${escapeHtml(section.title)}</strong>
              </div>
              <span class="accordion-count">${section.fields.length} fields</span>
            </summary>
            <div class="accordion-body">
              <p class="panel-copy">${escapeHtml(section.description)}</p>
              <div class="schema-grid">
                ${section.fields.map(renderField).join("")}
              </div>
            </div>
          </details>
        `
      )
      .join("");
  }

  function renderSheet() {
    sheetBody.innerHTML = allFields
      .map(
        (field) => `
          <tr>
            <td>${escapeHtml(`Sheet ${field.sheet}`)}</td>
            <td>${escapeHtml(field.sectionTitle)}</td>
            <td>${escapeHtml(field.label)}</td>
            <td
              contenteditable="true"
              data-field-id="${field.id}"
              class="sheet-value-cell"
            >${escapeHtml(formState[field.id] || "")}</td>
            <td>${escapeHtml(field.guide)}</td>
          </tr>
        `
      )
      .join("");
  }

  function updateFieldState(fieldId, value) {
    formState[fieldId] = value;
    updateChoiceVisuals(fieldId);
    updateInputVisuals(fieldId);
    updateSheetValueCell(fieldId);
    renderSchemaStats();
  }

  function updateChoiceVisuals(fieldId) {
    const value = formState[fieldId] || "";
    document.querySelectorAll(`.choice-pill[data-field-id="${fieldId}"]`).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === value);
    });
  }

  function updateInputVisuals(fieldId) {
    const field = getFieldById(fieldId);
    if (!field || field.type === "choice") {
      return;
    }

    document.querySelectorAll(`[data-field-id="${fieldId}"]`).forEach((element) => {
      if (element.classList.contains("schema-input") || element.classList.contains("schema-textarea")) {
        if (element.value !== formState[fieldId]) {
          element.value = formState[fieldId];
        }
      }
    });
  }

  function updateSheetValueCell(fieldId) {
    const value = formState[fieldId] || "";
    const cell = sheetBody.querySelector(`.sheet-value-cell[data-field-id="${fieldId}"]`);
    if (cell && cell.textContent !== value) {
      cell.textContent = value;
    }
  }

  function fillSampleData() {
    Object.entries(sampleValues).forEach(([key, value]) => {
      if (key in formState) {
        formState[key] = value;
      }
    });

    renderSchemaSections();
    renderSheet();
    renderSchemaStats();
    setFileState({ name: workbookName }, "예시 데이터 준비 완료");
  }

  function flattenRowsForCsv() {
    return allFields.map((field) => ({
      sheet: `Sheet ${field.sheet}`,
      section: field.sectionTitle,
      field: field.label,
      value: formState[field.id] || "",
      guide: field.guide
    }));
  }

  function exportSheetCsv() {
    const rows = flattenRowsForCsv().map((row) =>
      [row.sheet, row.section, row.field, row.value, row.guide]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = ["Sheet,Section,Field,Value,Guide", ...rows].join("\n");
    downloadFile("smart-factory-input-schema.csv", csv, "text/csv;charset=utf-8");
  }

  function buildResultData() {
    const priorities = [
      ["Operational Excellence", formState.driverOperationalExcellence],
      ["Quality Improvement", formState.driverQualityImprovement],
      ["Regulatory Compliance", formState.driverRegulatoryCompliance],
      ["Cost Reduction", formState.driverCostReduction],
      ["Time-to-Market", formState.driverTimeToMarket]
    ]
      .filter(([, value]) => value === "High")
      .map(([label]) => label);

    const currentMaturity = Number(formState.digitalStrategyCurrent || 0);
    const targetMaturity = Number(formState.digitalStrategyTarget || 0);
    const maturityGap = currentMaturity && targetMaturity ? targetMaturity - currentMaturity : 0;

    const enabledCapabilities = [
      formState.mesBatchExecution === "Yes" ? "MES batch execution" : null,
      formState.ebrAuthoring === "Yes" ? "EBR authoring and approval" : null,
      formState.patBiomassMonitoring ? `PAT (${formState.patBiomassMonitoring})` : null,
      formState.apcModelPredictiveControl === "Required" ? "Advanced Process Control" : null,
      formState.aiProcessOptimization === "Required" ? "AI process optimization" : null,
      formState.digitalTwinFacility === "Required" ? "Facility digital twin" : null,
      formState.roboticsMaterialHandling === "Required" ? "Robotics material handling" : null,
      formState.agvAmr === "Required" ? "AGV/AMR" : null
    ].filter(Boolean);

    const integrationHighlights = [
      formState.erpVendor ? `ERP: ${formState.erpVendor}` : null,
      formState.limsVendor ? `LIMS: ${formState.limsVendor}` : null,
      formState.qmsPlatform ? `QMS: ${formState.qmsPlatform}` : null,
      formState.mesToErpMethod ? `MES-ERP: ${formState.mesToErpMethod}` : null,
      formState.mesToLimsMethod ? `MES-LIMS: ${formState.mesToLimsMethod}` : null,
      formState.mesToDcsMethod ? `MES-DCS: ${formState.mesToDcsMethod}` : null
    ].filter(Boolean);

    const deliverables = [
      "Smart Factory CCD basis of design",
      "Digital architecture and ISA-95 aligned integration matrix",
      formState.mesBatchExecution === "Yes" || formState.ebrAuthoring === "Yes"
        ? "MES / EBR functional scope summary"
        : null,
      formState.patBiomassMonitoring || formState.apcModelPredictiveControl
        ? "PAT / APC capability roadmap"
        : null,
      formState.securityStandard ? "OT cybersecurity and compliance concept note" : null,
      formState.trainingApproach ? "Change management and training readiness summary" : null
    ].filter(Boolean);

    const openItems = [
      formState.smartFactoryVision ? null : "Vision statement needs alignment with stakeholders.",
      formState.dataOwnership ? null : "Data ownership model is not yet defined.",
      formState.networkTopology ? null : "Network topology approach needs clarification.",
      formState.closedSystemControls ? null : "21 CFR Part 11 control approach is still open.",
      activeFile ? null : "Reference workbook or source file has not been uploaded yet."
    ].filter(Boolean);

    latestSummary = [
      `Project: ${labelizeValue(formState.projectName)}`,
      `Source Workbook: ${workbookName}`,
      `Input Method: ${document.querySelector('input[name="inputMethod"]:checked')?.value || "upload"}`,
      `Completed Fields: ${countCompletedFields()} / ${allFields.length}`,
      "",
      "High Priorities:",
      ...(priorities.length ? priorities.map((item) => `- ${item}`) : ["- No High priorities selected"]),
      "",
      `Digital Maturity Gap: ${maturityGap || "Not defined"}`,
      "",
      "Integration Highlights:",
      ...(integrationHighlights.length ? integrationHighlights.map((item) => `- ${item}`) : ["- No integration choices yet"]),
      "",
      "Enabled Capabilities:",
      ...(enabledCapabilities.length ? enabledCapabilities.map((item) => `- ${item}`) : ["- No advanced capabilities selected"]),
      "",
      "Recommended Deliverables:",
      ...deliverables.map((item) => `- ${item}`),
      "",
      "Open Items:",
      ...(openItems.length ? openItems.map((item) => `- ${item}`) : ["- No critical open items detected in current draft"])
    ].join("\n");

    return { priorities, maturityGap, enabledCapabilities, integrationHighlights, deliverables, openItems };
  }

  function renderResult() {
    const resultData = buildResultData();
    const completed = countCompletedFields();
    const progressPercent = Math.round((completed / allFields.length) * 100);
    const projectName = labelizeValue(formState.projectName);

    resultShell.innerHTML = `
      <div class="result-layout">
        <section class="result-banner">
          <div>
            <p class="eyebrow">CCD DRAFT OUTPUT</p>
            <h3>${escapeHtml(projectName)}</h3>
            <p>${escapeHtml(formState.projectObjective || "URS 기반 Smart Factory conceptual design scope draft")}</p>
          </div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(`완료 ${completed}/${allFields.length}`)}</span>
            <span class="tag">${escapeHtml(`입력률 ${progressPercent}%`)}</span>
            <span class="tag">${escapeHtml(activeFile ? "파일 연계됨" : "폼 기반 초안")}</span>
          </div>
        </section>
        <div class="result-columns">
          <section class="result-card">
            <h3>핵심 Priority & Maturity</h3>
            <ul class="bullet-list">
              ${
                resultData.priorities.length
                  ? resultData.priorities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
                  : "<li>High 우선순위가 아직 선택되지 않았습니다.</li>"
              }
              <li>${escapeHtml(
                resultData.maturityGap
                  ? `Digital maturity gap: ${resultData.maturityGap}`
                  : "Digital maturity gap is not fully defined."
              )}</li>
            </ul>
          </section>
          <section class="result-card">
            <h3>시스템 & Capability Highlights</h3>
            <ul class="bullet-list">
              ${resultData.integrationHighlights
                .concat(resultData.enabledCapabilities)
                .slice(0, 8)
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("") || "<li>핵심 시스템 선택이 아직 충분하지 않습니다.</li>"}
            </ul>
          </section>
        </div>
        <section class="result-card">
          <h3>권장 CCD 산출물</h3>
          <ul class="bullet-list">
            ${resultData.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
        <section class="result-card">
          <h3>현재 Open Items</h3>
          <ul class="bullet-list">
            ${
              resultData.openItems.length
                ? resultData.openItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
                : "<li>현재 초안 기준으로 치명적인 open item은 식별되지 않았습니다.</li>"
            }
          </ul>
        </section>
      </div>
    `;
  }

  function handleFile(file) {
    if (!file) {
      return;
    }

    setFileState(file, "업로드 준비 완료");

    if (file.name.toLowerCase().endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const previewLine = text.split(/\r?\n/).find((line) => line.trim());
        if (previewLine) {
          updateFieldState("projectName", file.name.replace(/\.[^.]+$/, ""));
          updateFieldState(
            "projectObjective",
            `CSV preview detected. First line captured for discussion: ${previewLine.slice(0, 120)}`
          );
          setFileState(file, "CSV 프리뷰 분석 완료");
        }
      };
      reader.readAsText(file);
    } else {
      setFileState(file, "엑셀 원본 연결됨 (실파싱은 차기 단계)");
    }
  }

  renderSchemaSections();
  renderSheet();
  renderSchemaStats();

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => handleFile(event.target.files?.[0]));

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  });

  mockDriveButton.addEventListener("click", () => {
    setFileState({ name: `Drive/${workbookName}` }, "Google Drive mock selection 완료");
  });

  fillSampleButton.addEventListener("click", fillSampleData);
  generateButton.addEventListener("click", renderResult);

  schemaSectionsElement.addEventListener("click", (event) => {
    const button = event.target.closest(".choice-pill");
    if (!button) {
      return;
    }

    updateFieldState(button.dataset.fieldId, button.dataset.value);
  });

  schemaSectionsElement.addEventListener("input", (event) => {
    const target = event.target;
    const fieldId = target.dataset.fieldId;
    if (!fieldId) {
      return;
    }
    updateFieldState(fieldId, target.value);
  });

  sheetBody.addEventListener("input", (event) => {
    const cell = event.target.closest(".sheet-value-cell");
    if (!cell) {
      return;
    }

    const fieldId = cell.dataset.fieldId;
    if (!fieldId) {
      return;
    }

    updateFieldState(fieldId, cell.textContent?.trim() || "");
  });

  expandAllToggle.addEventListener("change", () => {
    schemaSectionsElement.querySelectorAll(".accordion-item").forEach((item) => {
      item.open = expandAllToggle.checked;
    });
  });

  downloadSummaryButton.addEventListener("click", () => {
    if (!latestSummary) {
      renderResult();
    }
    downloadFile("ccd-package-summary.txt", latestSummary, "text/plain;charset=utf-8");
  });

  downloadSheetButton.addEventListener("click", exportSheetCsv);
}

if (document.body.dataset.page === "workspace") {
  initWorkspacePage();
}
