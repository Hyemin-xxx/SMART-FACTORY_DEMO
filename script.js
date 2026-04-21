const sheetDefinitions = {
  projectOverview: {
    label: "Sheet 1 / Project Overview",
    filename: "ccd-project-overview.csv"
  },
  processDefinition: {
    label: "Sheet 2 / Process Definition",
    filename: "ccd-process-definition.csv"
  },
  equipmentCost: {
    label: "Sheet 3 / Equipment & Cost",
    filename: "ccd-equipment-cost.csv"
  }
};

const sampleValues = {
  projectName: "ADC Pilot Facility Concept Study",
  productType: "Antibody-Drug Conjugate",
  facilityScale: "Pilot",
  batchStrategy: "Fed-batch",
  cleanroomGrade: "Grade C",
  targetOutput: "CD package + process block summary + utility list + CAPEX snapshot",
  includeUtilities: true,
  includeEquipment: true,
  includeSingleUse: true,
  includeAutomation: true,
  designNotes:
    "초기 단계에서 upstream/downstream area를 분리하고, single-use bioreactor와 modular cleanroom 적용 가능성을 검토합니다."
};

function buildWorkbookSheets(values) {
  const includeUtilities = values.includeUtilities ? "Included" : "Not included";
  const includeEquipment = values.includeEquipment ? "Included" : "Not included";
  const includeSingleUse = values.includeSingleUse ? "Included" : "Not included";
  const includeAutomation = values.includeAutomation ? "Enabled" : "Deferred";

  return {
    projectOverview: [
      { field: "Project Name", value: values.projectName || "", notes: "CD package 표지 및 기본 식별 정보" },
      { field: "Product Type", value: values.productType || "", notes: "예: mAb, ADC, vaccine, cell therapy" },
      { field: "Facility Scale", value: values.facilityScale || "Pilot", notes: "Pilot / Clinical / Commercial" },
      { field: "Cleanroom Grade", value: values.cleanroomGrade || "Grade C", notes: "핵심 공정구역 기준" },
      { field: "Target Output", value: values.targetOutput || "", notes: "문서형 CD 패키지 목표 범위" },
      { field: "Design Notes", value: values.designNotes || "", notes: "특이사항 및 design basis memo" }
    ],
    processDefinition: [
      { field: "Batch Strategy", value: values.batchStrategy || "Fed-batch", notes: "배양 및 생산 운영 방식" },
      { field: "Utility Planning", value: includeUtilities, notes: "WFI, clean steam, process gases 범위" },
      { field: "Single-use Strategy", value: includeSingleUse, notes: "SUT 적용 범위" },
      { field: "Automation Scope", value: includeAutomation, notes: "BMS / EMS / PCS 개념 범위" },
      {
        field: "Process Flow Goal",
        value: "Seed -> Production -> Harvest -> Purification -> UF/DF -> Fill Prep",
        notes: "머메이드 공정도 기본 흐름"
      },
      {
        field: "Server Request Context",
        value: "Generate CD conceptual package",
        notes: "서버로 전송될 상위 패키지 생성 요청"
      }
    ],
    equipmentCost: [
      { field: "Equipment Summary", value: includeEquipment, notes: "주요 장비 리스트 포함 여부" },
      { field: "Upstream Core", value: "Seed bioreactor / Production bioreactor", notes: "Primary equipment set" },
      { field: "Downstream Core", value: "Chromatography skid / UFDF skid", notes: "DSP 핵심 장비" },
      { field: "Support Systems", value: "CIP/SIP, media prep, buffer hold", notes: "공통 보조 시스템" },
      { field: "Budget Mode", value: "Conceptual CAPEX ROM", notes: "Rough order of magnitude cost mode" },
      { field: "Budget Assumption", value: "Equipment + cleanroom + utilities", notes: "예산 요약 계산 범위" }
    ]
  };
}

function cloneWorkbookSheets(values) {
  return structuredClone(buildWorkbookSheets(values));
}

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

function sheetRowsToCsv(rows) {
  const dataRows = rows.map((row) =>
    [row.field, row.value, row.notes]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return ["Field,Value,Notes", ...dataRows].join("\n");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

function buildMermaidDiagram(payload) {
  const automationNode = payload.includeAutomation ? "Automation[Automation / Control Layer]" : "Review[Manual review checkpoints]";
  const singleUseNode = payload.includeSingleUse ? "SUT[Single-use bioreactor train]" : "Steel[Stainless upstream train]";

  return [
    "flowchart LR",
    "  Input[Workbook Inputs] --> Basis[Design Basis Review]",
    `  Basis --> ${singleUseNode}`,
    `  ${singleUseNode} --> Harvest[Harvest / Clarification]`,
    "  Harvest --> DSP[Chromatography + UF/DF]",
    `  DSP --> ${automationNode}`,
    "  DSP --> Docs[CD Package Document]",
    "  DSP --> Equip[Equipment List]",
    "  DSP --> Budget[ROM Budget Summary]"
  ].join("\n");
}

function parseDiagramSegment(segment) {
  const trimmed = segment.trim();
  const match = trimmed.match(/^([A-Za-z0-9_]+)\[(.+)\]$/);
  if (match) {
    return { id: match[1], label: match[2] };
  }

  return { id: trimmed, label: trimmed };
}

function buildDiagramPreview(mermaid) {
  const lines = mermaid
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("flowchart"));

  const nodes = new Map();
  const edges = [];

  lines.forEach((line) => {
    const parts = line.split("-->");
    if (parts.length !== 2) {
      return;
    }

    const source = parseDiagramSegment(parts[0]);
    const target = parseDiagramSegment(parts[1]);
    nodes.set(source.id, source.label);
    nodes.set(target.id, target.label);
    edges.push({ source: source.id, target: target.id });
  });

  if (!nodes.size) {
    return "";
  }

  const incomingCount = new Map();
  const levels = new Map();
  const adjacency = new Map();

  nodes.forEach((_, id) => {
    incomingCount.set(id, 0);
    adjacency.set(id, []);
  });

  edges.forEach((edge) => {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  });

  const queue = [];
  nodes.forEach((_, id) => {
    if ((incomingCount.get(id) || 0) === 0) {
      levels.set(id, 0);
      queue.push(id);
    }
  });

  while (queue.length) {
    const current = queue.shift();
    const currentLevel = levels.get(current) || 0;

    (adjacency.get(current) || []).forEach((target) => {
      const nextLevel = currentLevel + 1;
      levels.set(target, Math.max(levels.get(target) || 0, nextLevel));
      incomingCount.set(target, (incomingCount.get(target) || 1) - 1);
      if ((incomingCount.get(target) || 0) <= 0) {
        queue.push(target);
      }
    });
  }

  const grouped = new Map();
  nodes.forEach((label, id) => {
    const level = levels.get(id) || 0;
    const bucket = grouped.get(level) || [];
    bucket.push({ id, label });
    grouped.set(level, bucket);
  });

  const sortedLevels = [...grouped.keys()].sort((a, b) => a - b);
  const nodeWidth = 180;
  const nodeHeight = 56;
  const columnGap = 84;
  const rowGap = 32;
  const padding = 24;
  const maxRows = Math.max(...sortedLevels.map((level) => grouped.get(level).length));
  const width = padding * 2 + sortedLevels.length * nodeWidth + Math.max(sortedLevels.length - 1, 0) * columnGap;
  const height = padding * 2 + maxRows * nodeHeight + Math.max(maxRows - 1, 0) * rowGap;

  const positions = new Map();
  sortedLevels.forEach((level, levelIndex) => {
    const items = grouped.get(level) || [];
    const columnX = padding + levelIndex * (nodeWidth + columnGap);
    const occupiedHeight = items.length * nodeHeight + Math.max(items.length - 1, 0) * rowGap;
    const startY = padding + (height - padding * 2 - occupiedHeight) / 2;

    items.forEach((item, itemIndex) => {
      positions.set(item.id, {
        x: columnX,
        y: startY + itemIndex * (nodeHeight + rowGap)
      });
    });
  });

  const edgeMarkup = edges
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) {
        return "";
      }

      const startX = source.x + nodeWidth;
      const startY = source.y + nodeHeight / 2;
      const endX = target.x;
      const endY = target.y + nodeHeight / 2;
      const midX = startX + (endX - startX) / 2;

      return `<path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" class="diagram-edge" marker-end="url(#diagram-arrow)" />`;
    })
    .join("");

  const nodeMarkup = [...nodes.entries()]
    .map(([id, label]) => {
      const position = positions.get(id);
      if (!position) {
        return "";
      }

      return `
        <g transform="translate(${position.x} ${position.y})">
          <rect width="${nodeWidth}" height="${nodeHeight}" rx="16" ry="16" class="diagram-node" />
          <foreignObject x="12" y="10" width="${nodeWidth - 24}" height="${nodeHeight - 20}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="diagram-node-label">${escapeHtml(label)}</div>
          </foreignObject>
        </g>
      `;
    })
    .join("");

  return `
    <div class="diagram-preview-shell">
      <svg viewBox="0 0 ${width} ${height}" class="diagram-preview" role="img" aria-label="Process flow diagram preview">
        <defs>
          <marker id="diagram-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
            <path d="M 0 0 L 12 6 L 0 12 z" fill="#3e7d68"></path>
          </marker>
        </defs>
        ${edgeMarkup}
        ${nodeMarkup}
      </svg>
    </div>
  `;
}

function buildMermaidDiagramLocal(featureFlags) {
  const automationNode = featureFlags.includeAutomation
    ? "Automation[Automation / Control Layer]"
    : "Review[Manual review checkpoints]";
  const singleUseNode = featureFlags.includeSingleUse
    ? "SUT[Single-use bioreactor train]"
    : "Steel[Stainless upstream train]";

  return [
    "flowchart LR",
    "  Input[Workbook Inputs] --> Basis[Design Basis Review]",
    `  Basis --> ${singleUseNode}`,
    `  ${singleUseNode} --> Harvest[Harvest / Clarification]`,
    "  Harvest --> DSP[Chromatography + UF/DF]",
    `  DSP --> ${automationNode}`,
    "  DSP --> Docs[CD Package Document]",
    "  DSP --> Equip[Equipment List]",
    "  DSP --> Budget[ROM Budget Summary]"
  ].join("\n");
}

function buildCcdPackageLocal(payload) {
  const project = payload.project || {};
  const featureFlags = payload.featureFlags || {};
  const sheetCount = (payload.metadata || {}).sheetCount || Object.keys(payload.workbookSheets || {}).length;
  const parsedWorkbook = payload.parsedWorkbook || {};

  const budgetItems = [
    { category: "Process Equipment", estimate: "$2.8M", note: "Core upstream + downstream skids" },
    { category: "Cleanroom & HVAC", estimate: "$1.9M", note: `${project.cleanroomGrade || "Grade C"} baseline cleanroom envelope` },
    { category: "Utilities & Infrastructure", estimate: "$1.2M", note: featureFlags.includeUtilities ? "Included in current ROM" : "Placeholder allowance" },
    { category: "Automation / Integration", estimate: featureFlags.includeAutomation ? "$0.7M" : "$0.25M", note: featureFlags.includeAutomation ? "Automation scope enabled" : "Deferred to later phase" }
  ];

  const equipmentRows = [
    { name: featureFlags.includeSingleUse ? "Single-use seed bioreactor" : "Seed bioreactor", qty: "2", capacity: "50 L / 200 L", area: "Upstream" },
    { name: featureFlags.includeSingleUse ? "Single-use production bioreactor" : "Production bioreactor", qty: "2", capacity: project.facilityScale === "Commercial" ? "2,000 L" : "500 L", area: "Upstream" },
    { name: "Chromatography skid", qty: "1", capacity: "Pilot-scale train", area: "Downstream" },
    { name: "UF/DF skid", qty: "1", capacity: "Single train", area: "Downstream" }
  ];

  const designNotes = project.designNotes || "추가 설계 메모 없음";
  const sheetNames = (parsedWorkbook.sheetNames || []).slice(0, 5).join(", ") || "N/A";
  const wbSheetCount = parsedWorkbook.sheetCount || sheetCount;

  const documentSections = [
    {
      title: "1. Design Basis Summary",
      body: `${project.projectName || "Untitled Project"}는 ${project.facilityScale || "Pilot"} 규모의 ${project.productType || "bioprocess product"} 생산을 목표로 하며, ${project.batchStrategy || "Fed-batch"} 전략과 ${project.cleanroomGrade || "Grade C"} 기준을 기반으로 CD 개념설계를 수행합니다.`
    },
    {
      title: "2. Input Workbook Summary",
      body: `총 ${sheetCount}개 데모 시트가 전달되었고, Project Overview / Process Definition / Equipment & Cost 시트의 입력을 기반으로 문서형 CD 패키지를 생성했습니다. 업로드된 워크북에서 ${wbSheetCount}개 시트를 감지했고, 앞선 시트명은 ${sheetNames} 입니다.`
    },
    {
      title: "3. Process Concept",
      body: `${featureFlags.includeSingleUse ? "Single-use 기반" : "Stainless 기반"} upstream와 표준 downstream train을 결합하고, utility interface, equipment scope, design basis memo를 함께 정리합니다. 주요 설계 메모: ${designNotes}`
    },
    {
      title: "4. Deliverables",
      body: "개념 공정도, CD conceptual document, equipment list, ROM budget summary, open items register, next-step action proposal을 포함합니다."
    }
  ];

  const openItems = [
    "URS 기준 필수 입력 컬럼과 각 시트 책임 구간을 확정할 것",
    "유틸리티 demand 산정 로직과 cleanroom zoning 기준을 연결할 것",
    "ROM budget 산정식을 reference cost DB 또는 견적 로직과 연결할 것"
  ];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return {
    packageTitle: `${project.projectName || "Untitled Project"} CD Conceptual Design Package`,
    requestId: `CD-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
    generatedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    responseMode: "Client-side Demo Mode",
    mermaid: buildMermaidDiagramLocal(featureFlags),
    documentSections,
    equipmentRows,
    budgetItems,
    openItems
  };
}

function buildServerPayload(form, workbookSheets, activeFile) {
  const formData = new FormData(form);

  return {
    metadata: {
      sourceFile: activeFile ? activeFile.name : "No uploaded workbook",
      requestMode: "mock-server-demo",
      sheetCount: Object.keys(workbookSheets).length
    },
    project: {
      projectName: formData.get("projectName") || "Untitled Project",
      productType: formData.get("productType") || "Not specified",
      facilityScale: formData.get("facilityScale") || "Pilot",
      batchStrategy: formData.get("batchStrategy") || "Fed-batch",
      cleanroomGrade: formData.get("cleanroomGrade") || "Grade C",
      targetOutput: formData.get("targetOutput") || "CD package",
      designNotes: formData.get("designNotes") || ""
    },
    featureFlags: {
      includeUtilities: form.includeUtilities.checked,
      includeEquipment: form.includeEquipment.checked,
      includeSingleUse: form.includeSingleUse.checked,
      includeAutomation: form.includeAutomation.checked
    },
    workbookSheets
  };
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
  const form = document.getElementById("configForm");
  const resultShell = document.getElementById("resultShell");
  const sheetBody = document.getElementById("sheetBody");
  const sheetTabs = document.getElementById("sheetTabs");
  const activeSheetLabel = document.getElementById("activeSheetLabel");

  let activeFile = null;
  let activeSheetKey = "projectOverview";
  let workbookSheets = cloneWorkbookSheets(sampleValues);
  let latestPackageDocument = "";
  let latestServerPayload = null;
  let latestParsedWorkbook = null;

  function setFileState(file, status) {
    activeFile = file;
    selectedFileName.textContent = file ? file.name : "아직 업로드된 파일이 없습니다.";
    selectedFileStatus.textContent = status;
  }

  function collectFormValues() {
    const formData = new FormData(form);
    return {
      projectName: formData.get("projectName"),
      productType: formData.get("productType"),
      facilityScale: formData.get("facilityScale"),
      batchStrategy: formData.get("batchStrategy"),
      cleanroomGrade: formData.get("cleanroomGrade"),
      targetOutput: formData.get("targetOutput"),
      designNotes: formData.get("designNotes"),
      includeUtilities: form.includeUtilities.checked,
      includeEquipment: form.includeEquipment.checked,
      includeSingleUse: form.includeSingleUse.checked,
      includeAutomation: form.includeAutomation.checked
    };
  }

  function syncSheetsFromForm() {
    const currentValues = collectFormValues();
    const rebuiltSheets = cloneWorkbookSheets(currentValues);

    if (latestParsedWorkbook) {
      rebuiltSheets.projectOverview[1].value = latestParsedWorkbook.sheetNames?.[0] || rebuiltSheets.projectOverview[1].value;
      rebuiltSheets.projectOverview[2].value = latestParsedWorkbook.sheetNames?.[1] || rebuiltSheets.projectOverview[2].value;
      rebuiltSheets.projectOverview[3].value = latestParsedWorkbook.sheetNames?.[2] || rebuiltSheets.projectOverview[3].value;
      rebuiltSheets.projectOverview[5].value = `${latestParsedWorkbook.sheetCount || 0} total sheets`;
    }

    workbookSheets = rebuiltSheets;
    renderActiveSheet();
  }

  function renderSheetTabs() {
    const buttons = sheetTabs.querySelectorAll(".sheet-tab");
    buttons.forEach((button) => {
      const isActive = button.dataset.sheet === activeSheetKey;
      button.classList.toggle("is-active", isActive);
    });
    activeSheetLabel.textContent = sheetDefinitions[activeSheetKey].label;
  }

  function renderActiveSheet() {
    renderSheetTabs();
    sheetBody.innerHTML = "";

    workbookSheets[activeSheetKey].forEach((row, index) => {
      const tr = document.createElement("tr");

      const fieldTd = document.createElement("td");
      fieldTd.textContent = row.field;

      const valueTd = document.createElement("td");
      valueTd.contentEditable = "true";
      valueTd.textContent = row.value;
      valueTd.dataset.index = String(index);
      valueTd.dataset.key = "value";

      const notesTd = document.createElement("td");
      notesTd.contentEditable = "true";
      notesTd.textContent = row.notes;
      notesTd.dataset.index = String(index);
      notesTd.dataset.key = "notes";

      tr.append(fieldTd, valueTd, notesTd);
      sheetBody.appendChild(tr);
    });
  }

  function fillSampleData() {
    Object.entries(sampleValues).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field) {
        return;
      }

      if (field.type === "checkbox") {
        field.checked = value;
      } else {
        field.value = value;
      }
    });

    syncSheetsFromForm();
    latestParsedWorkbook = {
      sheetCount: 29,
      sheetNames: ["List of Document", "1", "2"]
    };
    setFileState({ name: "URS_SmartFactory_ConceptualDesign_v2.xlsx" }, "29-sheet workbook detected -> 3 demo sheets mapped");
  }

  function renderGeneratingState() {
    resultShell.innerHTML = `
      <div class="result-loading">
        <div class="loading-orb" aria-hidden="true"></div>
        <h3>서버로 입력 워크북을 전송하는 중입니다...</h3>
        <p>3개 시트 payload를 기준으로 CD 개념설계 패키지, 공정도, 장비 목록, 예산 요약을 생성합니다.</p>
      </div>
    `;
  }

  function renderErrorState(message) {
    resultShell.innerHTML = `
      <div class="result-loading result-loading-error">
        <div class="loading-orb loading-orb-error" aria-hidden="true"></div>
        <h3>서버 연결에 실패했습니다.</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function buildDocumentDownload(payload, response) {
    return [
      `${response.packageTitle}`,
      `Request ID: ${response.requestId}`,
      `Generated At: ${response.generatedAt}`,
      "",
      "[Server Payload]",
      JSON.stringify(payload, null, 2),
      "",
      "[Mermaid Process Flow]",
      response.mermaid,
      "",
      "[Document Sections]",
      ...response.documentSections.flatMap((section) => [section.title, section.body, ""]),
      "[Equipment List]",
      ...response.equipmentRows.map((row) => `- ${row.name} / ${row.qty} / ${row.capacity} / ${row.area}`),
      "",
      "[Budget]",
      ...response.budgetItems.map((item) => `- ${item.category}: ${item.estimate} (${item.note})`),
      "",
      "[Open Items]",
      ...response.openItems.map((item) => `- ${item}`)
    ].join("\n");
  }

  function renderResult(payload, response) {
    latestServerPayload = payload;
    latestPackageDocument = buildDocumentDownload(payload, response);

    resultShell.innerHTML = `
      <div class="result-layout result-layout-docs">
        <section class="result-banner">
          <div>
            <p class="eyebrow">SERVER GENERATED CD PACKAGE</p>
            <h3>${escapeHtml(response.packageTitle)}</h3>
            <p>Request ${escapeHtml(response.requestId)} · ${escapeHtml(response.generatedAt)}</p>
          </div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(payload.project.facilityScale)}</span>
            <span class="tag">${escapeHtml(payload.project.batchStrategy)}</span>
            <span class="tag">${escapeHtml(payload.project.cleanroomGrade)}</span>
          </div>
        </section>

        <section class="result-card server-card">
          <div class="result-card-heading">
            <h3>Server Payload</h3>
            <span class="result-status">${escapeHtml(response.responseMode || "Server API OK")}</span>
          </div>
          <div class="payload-grid">
            <div>
              <span class="meta-label">Source Workbook</span>
              <strong>${escapeHtml(payload.metadata.sourceFile)}</strong>
            </div>
            <div>
              <span class="meta-label">Sheets Sent</span>
              <strong>${escapeHtml(String(payload.metadata.sheetCount))}</strong>
            </div>
            <div>
              <span class="meta-label">Target Output</span>
              <strong>${escapeHtml(payload.project.targetOutput)}</strong>
            </div>
            <div>
              <span class="meta-label">Payload Mode</span>
              <strong>${escapeHtml(payload.metadata.requestMode)}</strong>
            </div>
          </div>
        </section>

        <section class="result-card document-card">
          <div class="result-card-heading">
            <h3>CD Conceptual Design Document</h3>
            <span class="doc-chip">Docs-style preview</span>
          </div>
          <div class="document-sections">
            ${response.documentSections
              .map(
                (section) => `
                  <article class="document-section">
                    <h4>${escapeHtml(section.title)}</h4>
                    <p>${escapeHtml(section.body)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="result-card mermaid-card">
          <div class="result-card-heading">
            <h3>Process Flow Diagram</h3>
            <span class="doc-chip">Mermaid</span>
          </div>
          ${buildDiagramPreview(response.mermaid)}
          <pre class="mermaid-block">${escapeHtml(response.mermaid)}</pre>
        </section>

        <div class="result-columns">
          <section class="result-card">
            <div class="result-card-heading">
              <h3>Equipment List</h3>
            </div>
            <div class="result-table-wrapper">
              <table class="result-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Capacity</th>
                    <th>Area</th>
                  </tr>
                </thead>
                <tbody>
                  ${response.equipmentRows
                    .map(
                      (row) => `
                        <tr>
                          <td>${escapeHtml(row.name)}</td>
                          <td>${escapeHtml(row.qty)}</td>
                          <td>${escapeHtml(row.capacity)}</td>
                          <td>${escapeHtml(row.area)}</td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>

          <section class="result-card">
            <div class="result-card-heading">
              <h3>Budget Snapshot</h3>
            </div>
            <div class="budget-list">
              ${response.budgetItems
                .map(
                  (item) => `
                    <article class="budget-item">
                      <div>
                        <strong>${escapeHtml(item.category)}</strong>
                        <p>${escapeHtml(item.note)}</p>
                      </div>
                      <span>${escapeHtml(item.estimate)}</span>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        </div>

        <section class="result-card">
          <div class="result-card-heading">
            <h3>Open Items</h3>
          </div>
          <ul class="bullet-list">
            ${response.openItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      </div>
    `;
  }

  function applyParsedWorkbook(result, file) {
    latestParsedWorkbook = result.parsedWorkbook || null;
    workbookSheets = result.mappedWorkbookSheets || workbookSheets;

    const projectSheet = workbookSheets.projectOverview || [];
    const projectNameRow = projectSheet.find((row) => row.field === "Project Name");
    if (projectNameRow && projectNameRow.value) {
      form.elements.namedItem("projectName").value = projectNameRow.value;
    }

    const designNotesField = form.elements.namedItem("designNotes");
    if (designNotesField instanceof HTMLTextAreaElement && latestParsedWorkbook) {
      designNotesField.value = `Workbook parsed from ${file.name}. Sheets detected: ${latestParsedWorkbook.sheetNames.join(", ")}`;
    }

    renderActiveSheet();
    setFileState(
      file,
      `${latestParsedWorkbook?.sheetCount || 0} sheets parsed -> mapped to 3 demo sheets`
    );
  }

  function exportWorkbookCsvPackage() {
    Object.entries(sheetDefinitions).forEach(([sheetKey, definition], index) => {
      const csv = sheetRowsToCsv(workbookSheets[sheetKey]);
      window.setTimeout(() => {
        downloadFile(definition.filename, csv, "text/csv;charset=utf-8");
      }, index * 160);
    });
  }

  function handleFile(file) {
    if (!file) {
      return;
    }

    setFileState(file, "업로드 준비 완료");

    if (file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const previewLine = text.split(/\r?\n/).find((line) => line.trim());
        if (previewLine) {
          workbookSheets.projectOverview[0].value = file.name.replace(/\.[^.]+$/, "");
          workbookSheets.projectOverview[0].notes = `CSV source mapped. Preview: ${previewLine.slice(0, 80)}`;
          renderActiveSheet();
        }
      };
      reader.readAsText(file);
      setFileState(file, "CSV source mapped to Project Overview");
      return;
    }

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setFileState(file, "워크북 업로드 완료 -> 시트 분석 중");
      fileToBase64(file)
        .then(async (contentBase64) => {
          let parsed;
          try {
            const result = await fetch("/api/parse-workbook", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: file.name, contentBase64 })
            });
            if (!result.ok) throw new Error(`API ${result.status}`);
            parsed = await result.json();
          } catch (_) {
            const projectName = file.name.replace(/\.[^.]+$/, "");
            parsed = {
              parsedWorkbook: { sheetCount: 3, sheetNames: ["Overview", "Process", "Equipment"] },
              mappedWorkbookSheets: cloneWorkbookSheets(sampleValues)
            };
            parsed.mappedWorkbookSheets.projectOverview[0].value = projectName;
            parsed.mappedWorkbookSheets.projectOverview[0].notes = `Source: ${file.name} (client-side demo mode)`;
          }
          applyParsedWorkbook(parsed, file);
        });
      return;
    }

    setFileState(file, "지원 형식이 아니어서 기본 데모 모드로 유지됩니다.");
  }

  async function generatePackage() {
    syncSheetsFromForm();
    renderGeneratingState();
    const pipeline = startAgentPipeline();

    const payload = buildServerPayload(form, workbookSheets, activeFile);
    payload.parsedWorkbook = latestParsedWorkbook;

    let response;
    try {
      const result = await fetch("/api/ccd-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!result.ok) throw new Error(`API ${result.status}`);
      response = await result.json();
    } catch (_) {
      response = buildCcdPackageLocal(payload);
    }
    await pipeline.finish();
    renderResult(payload, response);
  }

  const AGENT_DEFINITIONS = [
    {
      id: "parser",
      name: "Workbook Parser",
      role: "시트 파싱",
      duration: 1400,
      steps: ["시트 구조 스캔", "셀 정규화", "3개 시트 매핑 완료"]
    },
    {
      id: "analyzer",
      name: "Project Analyzer",
      role: "프로젝트 분석",
      duration: 1800,
      steps: ["프로젝트 메타데이터 추출", "옵션·토글 평가", "산출물 범위 확정"]
    },
    {
      id: "process",
      name: "Process Designer",
      role: "공정 설계",
      duration: 2400,
      steps: ["공정 단계 후보 생성", "Mermaid 다이어그램 작성", "단계별 파라미터 정리"]
    },
    {
      id: "equipment",
      name: "Equipment Estimator",
      role: "장비 산정",
      duration: 2200,
      steps: ["주요 장비 후보 매칭", "용량·면적 산정", "Single-use 전략 반영"]
    },
    {
      id: "cost",
      name: "Cost Calculator",
      role: "예산 계산",
      duration: 1900,
      steps: ["카테고리별 예산 추정", "유틸리티 비용 합산", "범위/오픈이슈 정리"]
    },
    {
      id: "composer",
      name: "Document Composer",
      role: "문서 작성",
      duration: 2000,
      steps: ["섹션별 본문 생성", "다운로드 자료 묶음", "패키지 최종 검수"]
    }
  ];

  const agentProgressEl = document.getElementById("agentProgress");
  const agentGridEl = document.getElementById("agentGrid");
  const agentOverallFill = document.getElementById("agentOverallFill");
  const agentOverallPercent = document.getElementById("agentOverallPercent");
  const agentProgressCopy = document.getElementById("agentProgressCopy");
  const terminalLogEl = document.getElementById("terminalLog");
  const terminalLogBodyEl = document.getElementById("terminalLogBody");
  const terminalLogBadgeEl = document.getElementById("terminalLogBadge");

  function formatLogTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function appendTerminalLine(text, level = "info") {
    if (!terminalLogBodyEl) return;
    const line = document.createElement("span");
    line.className = "terminal-log-line";
    line.dataset.level = level;
    line.innerHTML = `<span class="terminal-log-ts">[${formatLogTimestamp()}]</span>${escapeHtml(text)}\n`;
    terminalLogBodyEl.appendChild(line);
    terminalLogBodyEl.scrollTop = terminalLogBodyEl.scrollHeight;
  }

  function resetTerminal() {
    if (terminalLogBodyEl) terminalLogBodyEl.innerHTML = "";
  }

  function setTerminalBadge(state, text) {
    if (!terminalLogBadgeEl) return;
    terminalLogBadgeEl.dataset.state = state;
    terminalLogBadgeEl.textContent = text;
  }

  function renderAgentCards() {
    agentGridEl.innerHTML = AGENT_DEFINITIONS.map((agent) => `
      <article class="agent-card" data-agent="${agent.id}" data-status="pending">
        <div class="agent-card-head">
          <div>
            <p class="agent-card-role">${escapeHtml(agent.role)}</p>
            <div class="agent-card-name">${escapeHtml(agent.name)}</div>
          </div>
          <span class="agent-card-badge" data-role="status">대기</span>
        </div>
        <div class="agent-card-bar"><span data-role="bar"></span></div>
        <div class="agent-card-meta">
          <span class="agent-card-step" data-role="step">대기열에서 순서를 기다리는 중...</span>
          <span class="agent-card-percent" data-role="percent">0%</span>
        </div>
      </article>
    `).join("");
  }

  function setAgentState(agent, percent, statusLabel, stepText, status) {
    const card = agentGridEl.querySelector(`[data-agent="${agent.id}"]`);
    if (!card) return;
    card.dataset.status = status;
    card.querySelector('[data-role="bar"]').style.width = `${percent}%`;
    card.querySelector('[data-role="percent"]').textContent = `${Math.round(percent)}%`;
    card.querySelector('[data-role="status"]').textContent = statusLabel;
    if (stepText) card.querySelector('[data-role="step"]').textContent = stepText;
  }

  function updateOverall(progressMap) {
    const total = AGENT_DEFINITIONS.reduce((sum, a) => sum + (progressMap[a.id] || 0), 0);
    const pct = Math.round(total / AGENT_DEFINITIONS.length);
    agentOverallFill.style.width = `${pct}%`;
    agentOverallPercent.textContent = String(pct);
  }

  function startAgentPipeline() {
    renderAgentCards();
    agentProgressEl.hidden = false;
    if (agentProgressCopy) {
      agentProgressCopy.textContent = "서버에 요청을 보낸 직후, 각 모듈이 어떤 단계에 있는지 실시간으로 표시합니다.";
    }

    if (terminalLogEl) terminalLogEl.hidden = false;
    resetTerminal();
    setTerminalBadge("running", "RUNNING");
    appendTerminalLine("$ cd-pipeline run --profile=demo", "prompt");
    appendTerminalLine("server: POST /api/cd-package", "run");
    appendTerminalLine(`booting ${AGENT_DEFINITIONS.length} agents...`, "info");

    const progressMap = {};
    AGENT_DEFINITIONS.forEach((a) => { progressMap[a.id] = 0; });
    updateOverall(progressMap);

    const startedAt = Date.now();
    let cancelled = false;
    let stagger = 0;

    const promises = AGENT_DEFINITIONS.map((agent) => {
      const launchDelay = stagger;
      stagger += Math.round(agent.duration * 0.35);

      return new Promise((resolve) => {
        setTimeout(() => {
          if (cancelled) { resolve(); return; }
          const begin = Date.now();
          let lastStepIdx = -1;
          appendTerminalLine(`[${agent.id}] spawn  · ${agent.name}`, "run");
          const interval = setInterval(() => {
            if (cancelled) { clearInterval(interval); resolve(); return; }
            const elapsed = Date.now() - begin;
            const ratio = Math.min(elapsed / agent.duration, 0.95);
            const percent = ratio * 100;
            const stepIdx = Math.min(
              agent.steps.length - 1,
              Math.floor(ratio * agent.steps.length)
            );
            progressMap[agent.id] = percent;
            setAgentState(agent, percent, "진행중", agent.steps[stepIdx], "running");
            updateOverall(progressMap);
            if (stepIdx !== lastStepIdx) {
              appendTerminalLine(`[${agent.id}] ${agent.steps[stepIdx]}`, "run");
              lastStepIdx = stepIdx;
            }
            if (ratio >= 0.95) {
              clearInterval(interval);
              resolve();
            }
          }, 120);
        }, launchDelay);
      });
    });

    const allRunning = Promise.all(promises);

    return {
      async finish() {
        await allRunning;
        if (cancelled) return;
        AGENT_DEFINITIONS.forEach((agent) => {
          progressMap[agent.id] = 100;
          setAgentState(agent, 100, "완료", agent.steps[agent.steps.length - 1], "done");
          appendTerminalLine(`[${agent.id}] done · ${agent.steps[agent.steps.length - 1]}`, "ok");
        });
        updateOverall(progressMap);
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        if (agentProgressCopy) {
          agentProgressCopy.textContent = `모든 에이전트가 ${elapsedSec}초 만에 작업을 마쳤습니다.`;
        }
        appendTerminalLine(`pipeline complete in ${elapsedSec}s · package ready`, "ok");
        appendTerminalLine("$", "prompt");
        setTerminalBadge("done", "DONE");
      },
      fail() {
        cancelled = true;
        AGENT_DEFINITIONS.forEach((agent) => {
          const card = agentGridEl.querySelector(`[data-agent="${agent.id}"]`);
          if (!card) return;
          if (card.dataset.status !== "done") {
            const pct = progressMap[agent.id] || 0;
            setAgentState(agent, pct, "중단", "서버 응답 실패로 중단됨", "error");
          }
        });
        if (agentProgressCopy) {
          agentProgressCopy.textContent = "서버 연결에 실패해 파이프라인이 중단되었습니다.";
        }
        appendTerminalLine("pipeline aborted · server request failed", "error");
        setTerminalBadge("error", "FAILED");
      }
    };
  }

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
    setFileState({ name: "Drive/URS_SmartFactory_ConceptualDesign_v2.xlsx" }, "Drive workbook selected -> 3 demo sheets mapped");
  });

  fillSampleButton.addEventListener("click", fillSampleData);
  generateButton.addEventListener("click", () => {
    generatePackage();
  });

  form.addEventListener("input", syncSheetsFromForm);
  form.addEventListener("change", syncSheetsFromForm);

  sheetTabs.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest(".sheet-tab");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    activeSheetKey = button.dataset.sheet || "projectOverview";
    renderActiveSheet();
  });

  sheetBody.addEventListener("input", (event) => {
    const cell = event.target;
    if (!(cell instanceof HTMLElement)) {
      return;
    }

    const index = Number(cell.dataset.index);
    const key = cell.dataset.key;
    const currentRows = workbookSheets[activeSheetKey];

    if (Number.isNaN(index) || !key || !currentRows?.[index]) {
      return;
    }

    currentRows[index][key] = cell.textContent?.trim() || "";
  });

  downloadSummaryButton.addEventListener("click", () => {
    if (!latestPackageDocument) {
      return;
    }

    downloadFile("ccd-conceptual-design-package.txt", latestPackageDocument, "text/plain;charset=utf-8");
  });

  downloadSheetButton.addEventListener("click", exportWorkbookCsvPackage);

  fillSampleData();
}

if (document.body.dataset.page === "workspace") {
  initWorkspacePage();
}
