const defaultSheetRows = [
  { field: "Project Name", value: "", notes: "CCD package 표지 및 기본 식별 정보" },
  { field: "Product Type", value: "", notes: "예: mAb, ADC, vaccine, cell therapy" },
  { field: "Facility Scale", value: "Pilot", notes: "Pilot / Clinical / Commercial" },
  { field: "Batch Strategy", value: "Fed-batch", notes: "배양 및 생산 운영 방식" },
  { field: "Cleanroom Grade", value: "Grade C", notes: "핵심 공정구역 기준" },
  { field: "Target Output", value: "", notes: "예상 산출물 범위" },
  { field: "Utility Coverage", value: "Process gases, WFI, clean steam", notes: "기본 유틸리티 범위" },
  { field: "Main Equipment", value: "Bioreactor, chromatography skid, UF/DF", notes: "대표 장비 세트" },
  { field: "Design Notes", value: "", notes: "특이사항 및 assumptions" }
];

const sampleValues = {
  projectName: "ADC Pilot Facility Concept Study",
  productType: "Antibody-Drug Conjugate",
  facilityScale: "Pilot",
  batchStrategy: "Fed-batch",
  cleanroomGrade: "Grade C",
  targetOutput: "CCD package + process block summary + utility list",
  includeUtilities: true,
  includeEquipment: true,
  includeSingleUse: true,
  includeAutomation: true,
  designNotes:
    "초기 단계에서 upstream/downstream area를 분리하고, single-use bioreactor와 modular cleanroom 적용 가능성을 검토합니다."
};

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

  let activeFile = null;
  let sheetRows = structuredClone(defaultSheetRows);
  let latestSummary = "";

  function setFileState(file, status) {
    activeFile = file;
    selectedFileName.textContent = file ? file.name : "아직 업로드된 파일이 없습니다.";
    selectedFileStatus.textContent = status;
  }

  function syncSheetFromForm() {
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());

    sheetRows = [
      { field: "Project Name", value: values.projectName || "", notes: "CCD package 표지 및 기본 식별 정보" },
      { field: "Product Type", value: values.productType || "", notes: "예: mAb, ADC, vaccine, cell therapy" },
      { field: "Facility Scale", value: values.facilityScale || "Pilot", notes: "Pilot / Clinical / Commercial" },
      { field: "Batch Strategy", value: values.batchStrategy || "Fed-batch", notes: "배양 및 생산 운영 방식" },
      { field: "Cleanroom Grade", value: values.cleanroomGrade || "Grade C", notes: "핵심 공정구역 기준" },
      { field: "Target Output", value: values.targetOutput || "", notes: "예상 산출물 범위" },
      {
        field: "Utility Coverage",
        value: form.includeUtilities.checked ? "Included in package draft" : "Not included",
        notes: "기본 유틸리티 범위"
      },
      {
        field: "Main Equipment",
        value: form.includeEquipment.checked ? "Equipment summary requested" : "Not requested",
        notes: "대표 장비 세트"
      },
      { field: "Design Notes", value: values.designNotes || "", notes: "특이사항 및 assumptions" }
    ];

    renderSheet();
  }

  function renderSheet() {
    sheetBody.innerHTML = "";

    sheetRows.forEach((row, index) => {
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

    syncSheetFromForm();
    setFileState(
      { name: "BioProcess_Assumptions_v0.xlsx" },
      "예시 데이터 준비 완료"
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildSummary(payload) {
    const deliverables = [
      "Concept design basis summary",
      payload.includeUtilities ? "Utility demand and interface summary" : null,
      payload.includeEquipment ? "Key equipment list and sizing checkpoints" : null,
      payload.includeSingleUse ? "Single-use application scope" : null,
      payload.includeAutomation ? "Automation and control philosophy note" : null
    ].filter(Boolean);

    const assumptions = [
      `${payload.facilityScale} scale facility targeting ${payload.productType || "bioprocess product"}.`,
      `${payload.batchStrategy} manufacturing strategy applied with ${payload.cleanroomGrade} cleanroom baseline.`,
      activeFile
        ? `Reference file "${activeFile.name}" will be treated as the primary source during later LLM ingestion.`
        : "No reference file uploaded; structured form inputs are used as the provisional source.",
      payload.designNotes || "No additional design notes were provided."
    ];

    const nextActions = [
      "Lock the Excel schema and map each sheet/tab to a prompt-ready data model.",
      "Attach an LLM orchestration layer for gap detection, summarization, and CCD drafting.",
      "Add export formats for Word/PDF deliverables and traced-back filled input sheets."
    ];

    latestSummary = [
      `Project: ${payload.projectName || "Untitled Project"}`,
      `Product: ${payload.productType || "Not specified"}`,
      `Scale: ${payload.facilityScale}`,
      `Batch Strategy: ${payload.batchStrategy}`,
      `Cleanroom Grade: ${payload.cleanroomGrade}`,
      `Target Output: ${payload.targetOutput || "CCD package draft"}`,
      "",
      "Deliverables:",
      ...deliverables.map((item) => `- ${item}`),
      "",
      "Assumptions:",
      ...assumptions.map((item) => `- ${item}`),
      "",
      "Next Actions:",
      ...nextActions.map((item) => `- ${item}`)
    ].join("\n");

    return { deliverables, assumptions, nextActions };
  }

  function renderResult() {
    const formData = new FormData(form);
    const payload = {
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

    const { deliverables, assumptions, nextActions } = buildSummary(payload);

    resultShell.innerHTML = `
      <div class="result-layout">
        <section class="result-banner">
          <div>
            <p class="eyebrow">CCD DRAFT OUTPUT</p>
            <h3>${escapeHtml(payload.projectName || "Untitled CCD Package")}</h3>
            <p>${escapeHtml(
              payload.targetOutput || "CCD package draft based on current assumptions"
            )}</p>
          </div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(payload.facilityScale)}</span>
            <span class="tag">${escapeHtml(payload.batchStrategy)}</span>
            <span class="tag">${escapeHtml(payload.cleanroomGrade)}</span>
          </div>
        </section>
        <div class="result-columns">
          <section class="result-card">
            <h3>추천 산출물</h3>
            <ul class="bullet-list">
              ${deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
          <section class="result-card">
            <h3>핵심 가정 조건</h3>
            <ul class="bullet-list">
              ${assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
        </div>
        <section class="result-card">
          <h3>다음 구현 단계</h3>
          <ul class="bullet-list">
            ${nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      </div>
    `;
  }

  function exportSheetCsv() {
    const rows = sheetRows.map((row) =>
      [row.field, row.value, row.notes]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = ["Field,Value,Notes", ...rows].join("\n");
    downloadFile("ccd-input-sheet.csv", csv, "text/csv;charset=utf-8");
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
          sheetRows[0].value = file.name.replace(/\.[^.]+$/, "");
          sheetRows[sheetRows.length - 1].notes = `CSV preview captured. First line: ${previewLine.slice(0, 80)}`;
          renderSheet();
        }
      };
      reader.readAsText(file);
      setFileState(file, "CSV 프리뷰 분석 완료");
    } else {
      setFileState(file, "엑셀 원본 연결됨 (실파싱은 차기 단계)");
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
    setFileState(
      { name: "Drive/Conceptual_Design_Input_Template.xlsx" },
      "Google Drive mock selection 완료"
    );
  });

  fillSampleButton.addEventListener("click", fillSampleData);
  generateButton.addEventListener("click", () => {
    syncSheetFromForm();
    renderResult();
  });

  form.addEventListener("input", syncSheetFromForm);
  form.addEventListener("change", syncSheetFromForm);

  sheetBody.addEventListener("input", (event) => {
    const cell = event.target;
    if (!(cell instanceof HTMLElement)) {
      return;
    }

    const index = Number(cell.dataset.index);
    const key = cell.dataset.key;

    if (Number.isNaN(index) || !key || !sheetRows[index]) {
      return;
    }

    sheetRows[index][key] = cell.textContent?.trim() || "";
  });

  downloadSummaryButton.addEventListener("click", () => {
    if (!latestSummary) {
      renderResult();
    }
    downloadFile("ccd-package-summary.txt", latestSummary, "text/plain;charset=utf-8");
  });

  downloadSheetButton.addEventListener("click", exportSheetCsv);

  syncSheetFromForm();
}

if (document.body.dataset.page === "workspace") {
  initWorkspacePage();
}
