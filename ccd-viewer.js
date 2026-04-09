/*
 * BioForge CCD Studio · 3D Conceptual Design Viewer
 *
 * This module renders a CCD JSON payload (areas + equipment, ISPE Baseline
 * Guide Vol 6 style) in a Three.js scene. The structure is intentionally
 * close to what an LLM would emit, so a future server response can be
 * dropped in directly via `applyCcdPayload(payload)`.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------------ */
/* 1. Sample CCD JSON                                                  */
/*    Structure follows ISPE Baseline Guide Vol 6 (Biopharmaceutical   */
/*    Manufacturing Facilities): a facility split into process areas   */
/*    (upstream / downstream / fill-finish / buffer / utilities), each */
/*    holding the major equipment items with absolute coordinates.     */
/* ------------------------------------------------------------------ */

const SAMPLE_CCD = {
  facility: {
    name: "ADCC Pilot Reference Facility",
    scale: "Pilot",
    processType: "ADC",
    cleanroomGrade: "Grade C",
    footprintMeters: [40, 28],
    areas: [
      {
        id: "upstream",
        name: "Upstream Process Area",
        grade: "Grade C",
        position: [-10, 0, -6],
        size: [16, 5, 12]
      },
      {
        id: "downstream",
        name: "Downstream Process Area",
        grade: "Grade C",
        position: [8, 0, -6],
        size: [16, 5, 12]
      },
      {
        id: "fill",
        name: "Aseptic Fill / Finish Suite",
        grade: "Grade A/B",
        position: [8, 0, 8],
        size: [14, 5, 10]
      },
      {
        id: "buffer",
        name: "Media / Buffer Prep",
        grade: "Grade D",
        position: [-10, 0, 8],
        size: [14, 5, 10]
      }
    ],
    equipment: [
      {
        id: "br-01",
        type: "Bioreactor",
        label: "Seed Bioreactor 200L",
        areaId: "upstream",
        position: [-15, 0, -9],
        size: [2, 3.4, 2]
      },
      {
        id: "br-02",
        type: "Bioreactor",
        label: "Production Bioreactor 2000L",
        areaId: "upstream",
        position: [-10, 0, -9],
        size: [2.6, 4.2, 2.6]
      },
      {
        id: "centrifuge",
        type: "Centrifuge",
        label: "Disc-stack Centrifuge",
        areaId: "upstream",
        position: [-5, 0, -3],
        size: [2.4, 2.6, 2.4]
      },
      {
        id: "chrom-01",
        type: "ChromatographySkid",
        label: "Capture Chromatography",
        areaId: "downstream",
        position: [3, 0, -9],
        size: [3, 2.6, 2]
      },
      {
        id: "chrom-02",
        type: "ChromatographySkid",
        label: "Polishing Chromatography",
        areaId: "downstream",
        position: [8, 0, -9],
        size: [3, 2.6, 2]
      },
      {
        id: "ufdf",
        type: "UFDFSkid",
        label: "UF / DF Skid",
        areaId: "downstream",
        position: [13, 0, -3],
        size: [3, 2.4, 2]
      },
      {
        id: "filling",
        type: "FillingMachine",
        label: "Aseptic Filling Line",
        areaId: "fill",
        position: [6, 0, 8],
        size: [6, 2.4, 2.4]
      },
      {
        id: "buffer-tank-01",
        type: "BufferTank",
        label: "Buffer Hold Tank A",
        areaId: "buffer",
        position: [-15, 0, 6],
        size: [1.8, 3, 1.8]
      },
      {
        id: "buffer-tank-02",
        type: "BufferTank",
        label: "Buffer Hold Tank B",
        areaId: "buffer",
        position: [-12, 0, 6],
        size: [1.8, 3, 1.8]
      },
      {
        id: "media-prep",
        type: "MediaPrepTank",
        label: "Media Prep Vessel",
        areaId: "buffer",
        position: [-7, 0, 9],
        size: [2.2, 3.2, 2.2]
      }
    ]
  }
};

/* ------------------------------------------------------------------ */
/* 2. Color / mesh registry                                            */
/* ------------------------------------------------------------------ */

const EQUIPMENT_STYLES = {
  Bioreactor: { color: 0x14b8a6, shape: "cylinder" },
  Centrifuge: { color: 0x10b981, shape: "cylinder" },
  ChromatographySkid: { color: 0xf59e0b, shape: "box" },
  UFDFSkid: { color: 0xfbbf24, shape: "box" },
  FillingMachine: { color: 0xa855f7, shape: "box" },
  Lyophilizer: { color: 0xc084fc, shape: "box" },
  BufferTank: { color: 0xef4444, shape: "cylinder" },
  MediaPrepTank: { color: 0xf97316, shape: "cylinder" }
};

const FALLBACK_STYLE = { color: 0x94a3b8, shape: "box" };

/* ------------------------------------------------------------------ */
/* 3. Scene setup                                                      */
/* ------------------------------------------------------------------ */

const canvasShell = document.getElementById("ccdCanvasShell");
const overlay = document.getElementById("ccdCanvasOverlay");
const jsonBlock = document.getElementById("ccdJsonBlock");
const generateButton = document.getElementById("ccdGenerateButton");
const replayButton = document.getElementById("ccdReplayButton");
const resetButton = document.getElementById("ccdResetButton");
const form = document.getElementById("ccdForm");
const statusStrong = document.getElementById("ccdStatusStrong");
const statusMeta = document.getElementById("ccdStatusMeta");
const metaChip = document.getElementById("ccdMetaChip");
const areaCountEl = document.getElementById("ccdAreaCount");
const equipmentCountEl = document.getElementById("ccdEquipmentCount");
const footprintEl = document.getElementById("ccdFootprint");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.Fog(0x0f172a, 60, 140);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
camera.position.set(34, 28, 36);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasShell.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 2, 0);
controls.minDistance = 12;
controls.maxDistance = 110;
controls.maxPolarAngle = Math.PI * 0.49;

/* lights */
const hemi = new THREE.HemisphereLight(0xa5b4fc, 0x1f2937, 0.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(28, 36, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

/* ground + grid */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.0
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(120, 60, 0x334155, 0x1f2937);
grid.position.y = 0.01;
scene.add(grid);

/* root group that holds the dynamically generated facility */
const facilityRoot = new THREE.Group();
scene.add(facilityRoot);

/* ------------------------------------------------------------------ */
/* 4. Animation loop                                                   */
/* ------------------------------------------------------------------ */

const animatedMeshes = [];
let animationStart = null;
const ANIMATION_DURATION_MS = 1100;

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function tickAnimation(now) {
  if (animationStart === null || animatedMeshes.length === 0) {
    return;
  }

  const elapsed = now - animationStart;
  const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

  animatedMeshes.forEach((entry, index) => {
    const stagger = Math.min(index * 60, 600);
    const localElapsed = Math.max(elapsed - stagger, 0);
    const localProgress = Math.min(localElapsed / ANIMATION_DURATION_MS, 1);
    const eased = easeOutBack(localProgress);
    entry.mesh.position.y = entry.startY + (entry.targetY - entry.startY) * eased;

    if (entry.mesh.material && entry.mesh.material.transparent) {
      const targetOpacity = entry.targetOpacity ?? 1;
      entry.mesh.material.opacity = targetOpacity * Math.min(localProgress * 1.4, 1);
    }
  });

  if (progress >= 1) {
    animationStart = null;
  }
}

function renderLoop(now) {
  tickAnimation(now);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

/* ------------------------------------------------------------------ */
/* 5. Resize handling                                                  */
/* ------------------------------------------------------------------ */

function resizeRendererToShell() {
  const rect = canvasShell.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 360);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(() => resizeRendererToShell());
resizeObserver.observe(canvasShell);
resizeRendererToShell();

/* ------------------------------------------------------------------ */
/* 6. Mesh builders                                                    */
/* ------------------------------------------------------------------ */

function clearFacility() {
  while (facilityRoot.children.length > 0) {
    const child = facilityRoot.children.pop();
    child.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    });
  }
  animatedMeshes.length = 0;
}

function createAreaMesh(area) {
  const [sx, sy, sz] = area.size;
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  const material = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.18,
    roughness: 0.4,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { kind: "CleanRoom_Wall", areaId: area.id, label: area.name };

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.7 })
  );
  mesh.add(edges);

  return mesh;
}

function createEquipmentMesh(equipment) {
  const style = EQUIPMENT_STYLES[equipment.type] ?? FALLBACK_STYLE;
  const [sx, sy, sz] = equipment.size;

  let geometry;
  if (style.shape === "cylinder") {
    const radius = Math.min(sx, sz) / 2;
    geometry = new THREE.CylinderGeometry(radius, radius, sy, 32);
  } else {
    geometry = new THREE.BoxGeometry(sx, sy, sz);
  }

  const material = new THREE.MeshStandardMaterial({
    color: style.color,
    roughness: 0.45,
    metalness: 0.25
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    kind: equipment.type,
    label: equipment.label,
    areaId: equipment.areaId
  };

  return mesh;
}

/* ------------------------------------------------------------------ */
/* 7. Apply CCD payload                                                */
/* ------------------------------------------------------------------ */

function applyCcdPayload(payload, { animate = true } = {}) {
  clearFacility();

  const facility = payload?.facility;
  if (!facility) return;

  const areas = facility.areas ?? [];
  const equipment = facility.equipment ?? [];

  areas.forEach((area) => {
    const mesh = createAreaMesh(area);
    const [px, py, pz] = area.position;
    const halfHeight = area.size[1] / 2;
    const targetY = py + halfHeight;
    mesh.position.set(px, animate ? targetY - 6 : targetY, pz);
    facilityRoot.add(mesh);

    if (animate) {
      animatedMeshes.push({
        mesh,
        startY: targetY - 6,
        targetY,
        targetOpacity: 0.18
      });
    }
  });

  equipment.forEach((item) => {
    const mesh = createEquipmentMesh(item);
    const [px, py, pz] = item.position;
    const halfHeight = item.size[1] / 2;
    const targetY = py + halfHeight;
    mesh.position.set(px, animate ? targetY - 8 : targetY, pz);
    facilityRoot.add(mesh);

    if (animate) {
      animatedMeshes.push({
        mesh,
        startY: targetY - 8,
        targetY
      });
    }
  });

  if (animate) {
    animationStart = performance.now();
  }

  // recenter camera target on facility center
  const footprint = facility.footprintMeters ?? [40, 30];
  controls.target.set(0, 3, 0);
  controls.update();

  // ui sync
  overlay.classList.add("is-hidden");
  metaChip.textContent = `${facility.name} · ${facility.scale}`;
  areaCountEl.textContent = String(areas.length);
  equipmentCountEl.textContent = String(equipment.length);
  footprintEl.textContent = `${footprint[0]} m × ${footprint[1]} m`;
  statusStrong.textContent = `${facility.name} · ${areas.length}개 구역, ${equipment.length}개 설비`;
  statusMeta.textContent = `Grade ${facility.cleanroomGrade ?? "—"} · ${facility.processType ?? "—"} 공정`;

  jsonBlock.textContent = JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ */
/* 8. Build a payload from the form parameters                         */
/*    This is a deterministic local builder so the demo works fully    */
/*    offline. Once the LLM endpoint exists, swap the body for a       */
/*    fetch() call and forward the resulting JSON to applyCcdPayload.  */
/* ------------------------------------------------------------------ */

function buildPayloadFromForm() {
  const formData = new FormData(form);
  const totalArea = Number(formData.get("totalArea")) || 1200;
  const facilityScale = formData.get("facilityScale") || "Pilot";
  const cleanroomGrade = formData.get("cleanroomGrade") || "Grade C";
  const processType = formData.get("processType") || "adc";
  const projectName = formData.get("projectName") || "Untitled CCD";
  const bioreactorCount = Math.max(1, Math.min(6, Number(formData.get("bioreactorCount")) || 2));
  const includeFill = form.includeFill.checked;
  const includeBuffer = form.includeBuffer.checked;
  const includeUtilities = form.includeUtilities.checked;
  const includeLyo = form.includeLyo.checked;

  // derive footprint from total area (assume 1.45 aspect ratio)
  const aspect = 1.45;
  const widthM = Math.round(Math.sqrt(totalArea * aspect));
  const depthM = Math.round(totalArea / widthM);

  const payload = structuredClone(SAMPLE_CCD);
  payload.facility.name = projectName;
  payload.facility.scale = facilityScale;
  payload.facility.cleanroomGrade = cleanroomGrade;
  payload.facility.processType = processType.toUpperCase();
  payload.facility.footprintMeters = [widthM, depthM];

  // adjust bioreactor count
  const baseEquipment = SAMPLE_CCD.facility.equipment.filter(
    (item) => item.type !== "Bioreactor"
  );
  const bioreactors = [];
  for (let i = 0; i < bioreactorCount; i += 1) {
    const isProduction = i % 2 === 1;
    bioreactors.push({
      id: `br-${String(i + 1).padStart(2, "0")}`,
      type: "Bioreactor",
      label: isProduction
        ? `Production Bioreactor ${1000 + i * 500}L`
        : `Seed Bioreactor ${100 + i * 100}L`,
      areaId: "upstream",
      position: [-15 + i * 3, 0, -9],
      size: isProduction ? [2.6, 4.2, 2.6] : [2, 3.4, 2]
    });
  }
  payload.facility.equipment = [...bioreactors, ...baseEquipment];

  // optional areas
  payload.facility.areas = payload.facility.areas.filter((area) => {
    if (area.id === "fill") return includeFill;
    if (area.id === "buffer") return includeBuffer;
    return true;
  });

  if (!includeFill) {
    payload.facility.equipment = payload.facility.equipment.filter(
      (item) => item.areaId !== "fill"
    );
  }
  if (!includeBuffer) {
    payload.facility.equipment = payload.facility.equipment.filter(
      (item) => item.areaId !== "buffer"
    );
  }

  if (includeUtilities) {
    payload.facility.areas.push({
      id: "utilities",
      name: "Utilities Area (WFI / Clean Steam)",
      grade: "CNC",
      position: [22, 0, 0],
      size: [10, 5, 18]
    });
    payload.facility.equipment.push({
      id: "wfi-skid",
      type: "BufferTank",
      label: "WFI Storage Tank",
      areaId: "utilities",
      position: [22, 0, -4],
      size: [2.4, 4, 2.4]
    });
    payload.facility.equipment.push({
      id: "clean-steam",
      type: "ChromatographySkid",
      label: "Clean Steam Generator",
      areaId: "utilities",
      position: [22, 0, 4],
      size: [3, 2.8, 2]
    });
  }

  if (includeLyo && includeFill) {
    payload.facility.equipment.push({
      id: "lyo-01",
      type: "Lyophilizer",
      label: "Freeze Dryer",
      areaId: "fill",
      position: [12, 0, 10],
      size: [3, 3, 3]
    });
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/* 9. Wire up UI                                                       */
/* ------------------------------------------------------------------ */

let lastPayload = null;

function handleGenerate() {
  const payload = buildPayloadFromForm();
  lastPayload = payload;
  applyCcdPayload(payload, { animate: true });
}

function handleReplay() {
  if (!lastPayload) {
    handleGenerate();
    return;
  }
  applyCcdPayload(lastPayload, { animate: true });
}

function handleReset() {
  form.reset();
  // restore selected defaults that form.reset() would otherwise overwrite
  form.processType.value = "adc";
  form.facilityScale.value = "Pilot";
  form.cleanroomGrade.value = "Grade C";
  form.includeFill.checked = true;
  form.includeBuffer.checked = true;
  form.includeUtilities.checked = false;
  form.includeLyo.checked = false;
  form.projectName.value = "ADCC Pilot Reference Facility";
  form.totalArea.value = 1200;
  form.bioreactorCount.value = 2;
}

generateButton.addEventListener("click", handleGenerate);
replayButton.addEventListener("click", handleReplay);
resetButton.addEventListener("click", handleReset);

// Initial JSON preview (no scene yet — user must press the button)
jsonBlock.textContent = JSON.stringify(SAMPLE_CCD, null, 2);
