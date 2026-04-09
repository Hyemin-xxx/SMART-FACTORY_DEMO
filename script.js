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
  targetOutput: "CCD package + process block summary + utility list + CAPEX snapshot",
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
      { field: "Project Name", value: values.projectName || "", notes: "CCD package 표지 및 기본 식별 정보" },
      { field: "Product Type", value: values.productType || "", notes: "예: mAb, ADC, vaccine, cell therapy" },
      { field: "Facility Scale", value: values.facilityScale || "Pilot", notes: "Pilot / Clinical / Commercial" },
      { field: "Cleanroom Grade", value: values.cleanroomGrade || "Grade C", notes: "핵심 공정구역 기준" },
      { field: "Target Output", value: values.targetOutput || "", notes: "문서형 CCD 패키지 목표 범위" },
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
        value: "Generate CCD conceptual package",
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
    "  DSP --> Docs[CCD Package Document]",
    "  DSP --> Equip[Equipment List]",
    "  DSP --> Budget[ROM Budget Summary]"
  ].join("\n");
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
      targetOutput: formData.get("targetOutput") || "CCD package",
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
        <p>3개 시트 payload를 기준으로 CCD 개념설계 패키지, 공정도, 장비 목록, 예산 요약을 생성합니다.</p>
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
            <p class="eyebrow">SERVER GENERATED CCD PACKAGE</p>
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
            <h3>CCD Conceptual Design Document</h3>
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
      setFileState(file, "워크북 업로드 완료 -> 서버에서 시트 분석 중");
      fileToBase64(file)
        .then(async (contentBase64) => {
          const result = await fetch("/api/parse-workbook", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              filename: file.name,
              contentBase64
            })
          });

          if (!result.ok) {
            throw new Error(`Workbook parse API ${result.status}`);
          }

          const parsed = await result.json();
          applyParsedWorkbook(parsed, file);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "Workbook parsing failed";
          setFileState(file, `파싱 실패: ${message}`);
        });
      return;
    }

    setFileState(file, "지원 형식이 아니어서 기본 데모 모드로 유지됩니다.");
  }

  async function generatePackage() {
    syncSheetsFromForm();
    renderGeneratingState();

    const payload = buildServerPayload(form, workbookSheets, activeFile);
    payload.parsedWorkbook = latestParsedWorkbook;

    try {
      const result = await fetch("/api/ccd-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!result.ok) {
        throw new Error(`API ${result.status}`);
      }

      const response = await result.json();
      renderResult(payload, response);
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message}. 'python3 server.py'로 로컬 API 서버를 실행한 뒤 다시 시도해주세요.`
          : "알 수 없는 오류가 발생했습니다.";
      renderErrorState(message);
    }
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
