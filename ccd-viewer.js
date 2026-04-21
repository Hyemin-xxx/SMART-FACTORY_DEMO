/*
 * BioForge CD Studio · 3D Conceptual Design Viewer
 *
 * Renders a CD JSON payload (areas + equipment, ISPE Baseline Guide Vol 6
 * style) in a Three.js scene with:
 *   - Cleanroom walls with per-room status (ok / caution / risk)
 *   - HVAC ductwork + supply diffusers on ceiling
 *   - Animated airflow particles (visual only, no physics)
 *   - Pressure-cascade arrows between neighbouring rooms
 *   - Detail geometry for equipment (bioreactor dome, tank caps, skid pipes)
 *   - Floating sprite labels for major equipment
 *
 * The JSON structure mirrors what an LLM would emit, so a future server
 * response can be dropped in via `applyCdPayload(payload)`.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------------ */
/* 1. Sample CD JSON                                                   */
/* ------------------------------------------------------------------ */

const SAMPLE_CD = {
  facility: {
    name: "ADCC Pilot Reference Facility",
    scale: "Pilot",
    processType: "ADC",
    cleanroomGrade: "Grade C",
    footprintMeters: [40, 28],
    areas: [
      /* Core process 4 */
      { id: "upstream",   name: "Upstream Process Area",     grade: "Grade C",   position: [-10, 0, -6], size: [16, 5, 12], status: "ok",      pressurePa: 30 },
      { id: "downstream", name: "Downstream Process Area",   grade: "Grade C",   position: [ 8, 0, -6],  size: [16, 5, 12], status: "caution", statusReason: "차압 여유 부족 (권고 +15Pa)", pressurePa: 20 },
      { id: "fill",       name: "Aseptic Fill / Finish Suite", grade: "Grade A/B", position: [ 8, 0,  8], size: [14, 5, 10], status: "risk",    statusReason: "Grade A 존 근접 · ACH 재검토 필요", pressurePa: 45 },
      { id: "buffer",     name: "Media / Buffer Prep",       grade: "Grade D",   position: [-10, 0,  8], size: [14, 5, 10], status: "ok",      pressurePa: 15 },
      /* Upstream support strip (z=-22) */
      { id: "seed",         name: "Seed Expansion Suite",     grade: "Grade C", position: [-22, 0, -22], size: [10, 5, 7], status: "ok",      pressurePa: 25 },
      { id: "harvest",      name: "Harvest / Clarification",  grade: "Grade C", position: [ -8, 0, -22], size: [10, 5, 7], status: "ok",      pressurePa: 22 },
      { id: "viral-inact",  name: "Viral Inactivation",       grade: "Grade C", position: [  6, 0, -22], size: [10, 5, 7], status: "risk",    statusReason: "봉쇄 레벨 재평가 필요", pressurePa: 28 },
      { id: "viral-filt",   name: "Viral Filtration",         grade: "Grade C", position: [ 20, 0, -22], size: [10, 5, 7], status: "ok",      pressurePa: 28 },
      /* Packaging / logistics strip (z=22) */
      { id: "raw-wh",       name: "Raw Material Warehouse",   grade: "CNC",     position: [-22, 0,  22], size: [10, 5, 7], status: "ok",      pressurePa: 0 },
      { id: "gowning",      name: "Personnel Gowning",        grade: "Grade D", position: [ -8, 0,  22], size: [10, 5, 7], status: "ok",      pressurePa: 8 },
      { id: "packaging",    name: "Secondary Packaging",      grade: "Grade D", position: [  6, 0,  22], size: [10, 5, 7], status: "ok",      pressurePa: 5 },
      { id: "finished-wh",  name: "Finished Goods Warehouse", grade: "CNC",     position: [ 20, 0,  22], size: [10, 5, 7], status: "ok",      pressurePa: 0 },
      /* Side utility columns */
      { id: "wfi-util",     name: "WFI / Clean Steam",        grade: "CNC",     position: [-22, 0, -8], size: [8, 5, 8],  status: "ok",      pressurePa: 0 },
      { id: "qc-lab",       name: "QC Laboratory",            grade: "Grade D", position: [-22, 0,  8], size: [8, 5, 8],  status: "ok",      pressurePa: 5 },
      { id: "polishing",    name: "Polishing Chromatography", grade: "Grade C", position: [ 22, 0, -8], size: [8, 5, 8],  status: "caution", statusReason: "장비 밀도 재검토", pressurePa: 15 },
      { id: "lyo",          name: "Lyophilization Suite",     grade: "Grade A/B", position: [22, 0,  8], size: [8, 5, 8],  status: "risk",    statusReason: "동결건조 격리 구역 확대 필요", pressurePa: 40 },
      /* Outer ancillary ring */
      { id: "mech-plant",   name: "Mechanical Plant",         grade: "CNC",     position: [-22, 0, -32], size: [10, 5, 6], status: "ok", pressurePa: 0 },
      { id: "elec-plant",   name: "Electrical / IT Plant",    grade: "CNC",     position: [ 20, 0, -32], size: [10, 5, 6], status: "ok", pressurePa: 0 },
      { id: "admin",        name: "Admin / Documentation",    grade: "CNC",     position: [-22, 0,  32], size: [10, 5, 6], status: "ok", pressurePa: 0 },
      { id: "loading-dock", name: "Loading Dock",             grade: "CNC",     position: [ 20, 0,  32], size: [10, 5, 6], status: "ok", pressurePa: 0 }
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
/* 2. Color / style registry                                           */
/* ------------------------------------------------------------------ */

const EQUIPMENT_STYLES = {
  Bioreactor: { color: 0x14b8a6, shape: "bioreactor" },
  Centrifuge: { color: 0x10b981, shape: "centrifuge" },
  ChromatographySkid: { color: 0xf59e0b, shape: "skid" },
  UFDFSkid: { color: 0xfbbf24, shape: "skid" },
  FillingMachine: { color: 0xa855f7, shape: "fillingLine" },
  Lyophilizer: { color: 0xc084fc, shape: "lyo" },
  BufferTank: { color: 0xef4444, shape: "tank" },
  MediaPrepTank: { color: 0xf97316, shape: "tank" }
};

const FALLBACK_STYLE = { color: 0x94a3b8, shape: "box" };

const STATUS_STYLES = {
  ok: {
    wallColor: 0x60a5fa,
    wallOpacity: 0.12,
    edgeColor: 0x60a5fa,
    tagColor: "#34d399",
    tagText: "정상",
    reasonText: "차압/ACH 기준 충족"
  },
  caution: {
    wallColor: 0xfbbf24,
    wallOpacity: 0.16,
    edgeColor: 0xfbbf24,
    tagColor: "#fbbf24",
    tagText: "주의",
    reasonText: "검토 필요"
  },
  risk: {
    wallColor: 0xef4444,
    wallOpacity: 0.22,
    edgeColor: 0xef4444,
    tagColor: "#f87171",
    tagText: "위험",
    reasonText: "환기/차압 재설계 권고"
  }
};

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
scene.background = new THREE.Color(0x0b1220);
scene.fog = new THREE.Fog(0x0b1220, 70, 160);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
camera.position.set(52, 44, 58);

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
controls.maxDistance = 200;
controls.maxPolarAngle = Math.PI * 0.49;

/* lights */
const hemi = new THREE.HemisphereLight(0xa5b4fc, 0x1f2937, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 0.95);
sun.position.set(28, 42, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0x8fb5ff, 0.35);
fillLight.position.set(-30, 20, -20);
scene.add(fillLight);

/* ground + grid */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.95,
    metalness: 0.0
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(140, 70, 0x1e293b, 0x111827);
grid.position.y = 0.01;
scene.add(grid);

/* root group that holds the dynamically generated facility */
const facilityRoot = new THREE.Group();
scene.add(facilityRoot);

/* ------------------------------------------------------------------ */
/* 4. Sprite label (canvas-based)                                      */
/* ------------------------------------------------------------------ */

function createSpriteLabel(text, { color = "#e2e8f0", bg = "rgba(15, 23, 42, 0.78)", border = "#334155" } = {}) {
  const canvas = document.createElement("canvas");
  const scale = 3;
  const padding = 14 * scale;
  const fontSize = 28 * scale;
  canvas.height = fontSize + padding * 2;

  const ctx = canvas.getContext("2d");
  ctx.font = `600 ${fontSize}px "Pretendard", "Inter", system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  canvas.width = textWidth + padding * 2;

  // Redo font after resize
  ctx.font = `600 ${fontSize}px "Pretendard", "Inter", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = bg;
  const radius = 22 * scale;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
  ctx.fill();

  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = border;
  roundRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, radius);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillText(text, padding, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const worldWidth = (canvas.width / canvas.height) * 1.0;
  sprite.scale.set(worldWidth, 1.0, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* 5. Airflow particle system                                          */
/* ------------------------------------------------------------------ */

const airflowState = {
  points: null,
  positions: null,
  velocities: null,
  bounds: null,
  count: 0
};

function buildAirflowParticles(areas) {
  disposeAirflow();

  const perArea = 180;
  const totalCount = areas.length * perArea;
  if (totalCount === 0) return;

  const positions = new Float32Array(totalCount * 3);
  const velocities = new Float32Array(totalCount * 3);
  const bounds = [];

  areas.forEach((area, areaIndex) => {
    const [px, , pz] = area.position;
    const [sx, sy, sz] = area.size;
    const minX = px - sx / 2 + 0.5;
    const maxX = px + sx / 2 - 0.5;
    const minZ = pz - sz / 2 + 0.5;
    const maxZ = pz + sz / 2 - 0.5;
    const ceiling = sy - 0.4;

    for (let i = 0; i < perArea; i += 1) {
      const idx = (areaIndex * perArea + i) * 3;
      positions[idx] = minX + Math.random() * (maxX - minX);
      positions[idx + 1] = 0.3 + Math.random() * (ceiling - 0.3);
      positions[idx + 2] = minZ + Math.random() * (maxZ - minZ);

      velocities[idx] = (Math.random() - 0.5) * 0.02;
      velocities[idx + 1] = -0.015 - Math.random() * 0.03;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.02;
    }

    bounds.push({ minX, maxX, minZ, maxZ, ceiling, perArea, offset: areaIndex * perArea });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x7dd3fc,
    size: 0.18,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: createCircleTexture()
  });

  const points = new THREE.Points(geometry, material);
  facilityRoot.add(points);

  airflowState.points = points;
  airflowState.positions = positions;
  airflowState.velocities = velocities;
  airflowState.bounds = bounds;
  airflowState.count = totalCount;
}

function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(200,230,255,0.85)");
  gradient.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function disposeAirflow() {
  if (airflowState.points) {
    airflowState.points.geometry.dispose();
    airflowState.points.material.map?.dispose();
    airflowState.points.material.dispose();
    airflowState.points.parent?.remove(airflowState.points);
  }
  airflowState.points = null;
  airflowState.positions = null;
  airflowState.velocities = null;
  airflowState.bounds = null;
  airflowState.count = 0;
}

function updateAirflow(deltaScale) {
  if (!airflowState.points) return;
  const positions = airflowState.positions;
  const velocities = airflowState.velocities;

  airflowState.bounds.forEach((b) => {
    const start = b.offset * 3;
    const end = (b.offset + b.perArea) * 3;
    for (let i = start; i < end; i += 3) {
      positions[i] += velocities[i] * deltaScale;
      positions[i + 1] += velocities[i + 1] * deltaScale;
      positions[i + 2] += velocities[i + 2] * deltaScale;

      // clamp/recycle
      if (positions[i + 1] < 0.2) {
        positions[i + 1] = b.ceiling;
        positions[i] = b.minX + Math.random() * (b.maxX - b.minX);
        positions[i + 2] = b.minZ + Math.random() * (b.maxZ - b.minZ);
      }
      if (positions[i] < b.minX) positions[i] = b.maxX;
      if (positions[i] > b.maxX) positions[i] = b.minX;
      if (positions[i + 2] < b.minZ) positions[i + 2] = b.maxZ;
      if (positions[i + 2] > b.maxZ) positions[i + 2] = b.minZ;
    }
  });

  airflowState.points.geometry.attributes.position.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* 6. Animation loop                                                   */
/* ------------------------------------------------------------------ */

const animatedMeshes = [];
const pulsers = [];
let animationStart = null;
const ANIMATION_DURATION_MS = 1100;
let lastFrame = performance.now();

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function tickEntranceAnimation(now) {
  if (animationStart === null || animatedMeshes.length === 0) return;
  const elapsed = now - animationStart;
  const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

  animatedMeshes.forEach((entry, index) => {
    const stagger = Math.min(index * 45, 700);
    const localElapsed = Math.max(elapsed - stagger, 0);
    const localProgress = Math.min(localElapsed / ANIMATION_DURATION_MS, 1);
    const eased = easeOutBack(localProgress);
    entry.object.position.y = entry.startY + (entry.targetY - entry.startY) * eased;

    if (entry.object.material && entry.object.material.transparent) {
      const targetOpacity = entry.targetOpacity ?? 1;
      entry.object.material.opacity = targetOpacity * Math.min(localProgress * 1.4, 1);
    }
  });

  if (progress >= 1) animationStart = null;
}

function tickPulsers(now) {
  pulsers.forEach((p) => {
    const t = (now / 1000) * p.speed + p.phase;
    const wave = (Math.sin(t) + 1) / 2;
    if (p.kind === "opacity") {
      p.material.opacity = p.base + wave * p.amplitude;
    } else if (p.kind === "scale") {
      const s = p.base + wave * p.amplitude;
      p.object.scale.set(s, s, s);
    }
  });
}

function renderLoop(now) {
  const delta = Math.min((now - lastFrame) / 16.6667, 3);
  lastFrame = now;

  tickEntranceAnimation(now);
  tickPulsers(now);
  updateAirflow(delta);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

/* ------------------------------------------------------------------ */
/* 7. Resize handling                                                  */
/* ------------------------------------------------------------------ */

function resizeRendererToShell() {
  const rect = canvasShell.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 420);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(() => resizeRendererToShell());
resizeObserver.observe(canvasShell);
resizeRendererToShell();

/* ------------------------------------------------------------------ */
/* 8. Mesh builders                                                    */
/* ------------------------------------------------------------------ */

function clearFacility() {
  disposeAirflow();
  while (facilityRoot.children.length > 0) {
    const child = facilityRoot.children.pop();
    child.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        } else {
          node.material.map?.dispose();
          node.material.dispose();
        }
      }
    });
  }
  animatedMeshes.length = 0;
  pulsers.length = 0;
}

function createAreaGroup(area) {
  const group = new THREE.Group();
  const [sx, sy, sz] = area.size;
  const status = STATUS_STYLES[area.status] ?? STATUS_STYLES.ok;

  // Walls (transparent shell)
  const wallGeom = new THREE.BoxGeometry(sx, sy, sz);
  const wallMat = new THREE.MeshStandardMaterial({
    color: status.wallColor,
    transparent: true,
    opacity: status.wallOpacity,
    roughness: 0.5,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  const walls = new THREE.Mesh(wallGeom, wallMat);
  walls.userData = { kind: "CleanRoom_Wall", areaId: area.id, label: area.name };
  walls.position.y = sy / 2;
  group.add(walls);

  // Edges — thicker/brighter
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallGeom),
    new THREE.LineBasicMaterial({
      color: status.edgeColor,
      transparent: true,
      opacity: 0.9
    })
  );
  edges.position.y = sy / 2;
  group.add(edges);

  // Floor tile
  const floorGeom = new THREE.PlaneGeometry(sx - 0.2, sz - 0.2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;
  group.add(floor);

  // Floor status tint (glowing thin plane)
  const tintMat = new THREE.MeshBasicMaterial({
    color: status.wallColor,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  const tint = new THREE.Mesh(floorGeom, tintMat);
  tint.rotation.x = -Math.PI / 2;
  tint.position.y = 0.05;
  group.add(tint);

  // Pulsing on risk/caution walls
  if (area.status === "risk" || area.status === "caution") {
    pulsers.push({
      kind: "opacity",
      material: wallMat,
      base: status.wallOpacity,
      amplitude: 0.12,
      speed: area.status === "risk" ? 3.0 : 1.8,
      phase: Math.random() * 6.28
    });
  }

  // Status sprite (floating tag above room)
  const reason = area.statusReason || status.reasonText;
  const tagSprite = createSpriteLabel(`${status.tagText} · ${reason}`, {
    color: "#0b1220",
    bg: hexToRgba(status.wallColor, 0.92),
    border: "#0b1220"
  });
  tagSprite.position.set(0, sy + 1.4, 0);
  tagSprite.scale.multiplyScalar(1.4);
  group.add(tagSprite);

  // Room name label
  const nameSprite = createSpriteLabel(`${area.name} · ${area.grade}`, {
    color: "#e2e8f0",
    bg: "rgba(15, 23, 42, 0.82)",
    border: "#334155"
  });
  nameSprite.position.set(0, sy + 2.6, 0);
  nameSprite.scale.multiplyScalar(1.2);
  group.add(nameSprite);

  // Position the group
  group.position.set(area.position[0], 0, area.position[2]);
  group.userData = { kind: "AreaGroup", areaId: area.id };
  return group;
}

function createBioreactorMesh(equipment) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;
  const radius = Math.min(sx, sz) / 2;
  const bodyColor = 0x14b8a6;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, sy * 0.85, 32),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.55 })
  );
  body.position.y = sy * 0.425;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Dome top
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x5eead4, roughness: 0.3, metalness: 0.6 })
  );
  dome.position.y = sy * 0.85;
  dome.castShadow = true;
  group.add(dome);

  // Base ring
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.3 })
  );
  base.position.y = 0.06;
  group.add(base);

  // Side port
  const port = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, radius * 1.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
  );
  port.rotation.z = Math.PI / 2;
  port.position.set(radius * 0.6, sy * 0.45, 0);
  group.add(port);

  return group;
}

function createTankMesh(equipment, color) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;
  const radius = Math.min(sx, sz) / 2;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, sy * 0.9, 28),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 })
  );
  body.position.y = sy * 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Top cap
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.65 })
  );
  cap.position.y = sy * 0.9;
  group.add(cap);

  // Nozzle
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 })
  );
  nozzle.position.y = sy * 0.9 + radius + 0.15;
  group.add(nozzle);

  return group;
}

function createSkidMesh(equipment, color) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 })
  );
  body.position.y = sy / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Top rack of small cylinders (columns)
  const colCount = 3;
  for (let i = 0; i < colCount; i += 1) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, sy * 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.4 })
    );
    col.position.set(-sx * 0.3 + i * (sx * 0.3), sy + 0.25, 0);
    group.add(col);
  }

  // Pipe loop
  const pipeGeom = new THREE.TorusGeometry(sx * 0.25, 0.06, 8, 24);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.25 });
  const pipe = new THREE.Mesh(pipeGeom, pipeMat);
  pipe.position.set(0, sy + 0.1, sz * 0.25);
  pipe.rotation.x = Math.PI / 2;
  group.add(pipe);

  return group;
}

function createFillingLineMesh(equipment, color) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy * 0.5, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3 })
  );
  base.position.y = sy * 0.25;
  base.castShadow = true;
  group.add(base);

  // Conveyor rail
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(sx * 1.05, 0.1, sz * 0.2),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.35 })
  );
  rail.position.y = sy * 0.55;
  group.add(rail);

  // Vials (small cylinders)
  for (let i = 0; i < 6; i += 1) {
    const vial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.8 })
    );
    vial.position.set(-sx * 0.45 + i * (sx * 0.18), sy * 0.7 + 0.15, 0);
    group.add(vial);
  }

  // Filling head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(sx * 0.3, sy * 0.4, sz * 0.6),
    new THREE.MeshStandardMaterial({ color: 0x7c3aed, metalness: 0.4, roughness: 0.4 })
  );
  head.position.set(sx * 0.25, sy * 0.8, 0);
  group.add(head);

  return group;
}

function createCentrifugeMesh(equipment, color) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;
  const radius = Math.min(sx, sz) / 2;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.05, sy, 28),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.5 })
  );
  body.position.y = sy / 2;
  body.castShadow = true;
  group.add(body);

  // Drive motor on top
  const motor = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 0.9, 0.4, radius * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 })
  );
  motor.position.y = sy + 0.2;
  group.add(motor);

  return group;
}

function createLyoMesh(equipment, color) {
  const group = new THREE.Group();
  const [sx, sy, sz] = equipment.size;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
  );
  body.position.y = sy / 2;
  body.castShadow = true;
  group.add(body);

  // Door circle
  const door = new THREE.Mesh(
    new THREE.CircleGeometry(Math.min(sx, sy) * 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
  );
  door.position.set(0, sy / 2, sz / 2 + 0.01);
  group.add(door);

  return group;
}

function createEquipmentGroup(equipment) {
  const style = EQUIPMENT_STYLES[equipment.type] ?? FALLBACK_STYLE;
  let group;
  switch (style.shape) {
    case "bioreactor":
      group = createBioreactorMesh(equipment);
      break;
    case "tank":
      group = createTankMesh(equipment, style.color);
      break;
    case "skid":
      group = createSkidMesh(equipment, style.color);
      break;
    case "fillingLine":
      group = createFillingLineMesh(equipment, style.color);
      break;
    case "centrifuge":
      group = createCentrifugeMesh(equipment, style.color);
      break;
    case "lyo":
      group = createLyoMesh(equipment, style.color);
      break;
    default: {
      group = new THREE.Group();
      const [sx, sy, sz] = equipment.size;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        new THREE.MeshStandardMaterial({ color: style.color, roughness: 0.5, metalness: 0.3 })
      );
      box.position.y = sy / 2;
      group.add(box);
    }
  }

  // Floating label
  const label = createSpriteLabel(equipment.label, {
    color: "#e2e8f0",
    bg: "rgba(15, 23, 42, 0.78)",
    border: "#475569"
  });
  label.position.set(0, equipment.size[1] + 0.9, 0);
  label.scale.multiplyScalar(0.85);
  group.add(label);

  group.userData = { kind: equipment.type, label: equipment.label, areaId: equipment.areaId };
  return group;
}

/* ------------------------------------------------------------------ */
/* 9. HVAC ductwork                                                    */
/* ------------------------------------------------------------------ */

function createHvacSystem(areas) {
  const group = new THREE.Group();
  group.userData = { kind: "HVAC" };

  const ductMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.55,
    metalness: 0.7
  });

  const diffuserMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.3
  });

  areas.forEach((area) => {
    const [px, , pz] = area.position;
    const [sx, sy, sz] = area.size;
    const ductY = sy + 0.4;

    // Main ceiling duct running along longer axis
    const isLongX = sx >= sz;
    const ductLength = (isLongX ? sx : sz) - 1.2;
    const ductGeom = new THREE.BoxGeometry(
      isLongX ? ductLength : 0.7,
      0.55,
      isLongX ? 0.7 : ductLength
    );
    const duct = new THREE.Mesh(ductGeom, ductMat);
    duct.position.set(px, ductY, pz);
    duct.castShadow = true;
    group.add(duct);

    // Supply diffusers at ~1/3 and ~2/3 points along the duct
    const diffuserCount = 3;
    for (let i = 1; i <= diffuserCount; i += 1) {
      const t = i / (diffuserCount + 1);
      const ox = isLongX ? (t - 0.5) * ductLength : 0;
      const oz = isLongX ? 0 : (t - 0.5) * ductLength;

      const diffuser = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.55, 20, 1, true),
        diffuserMat
      );
      diffuser.rotation.x = Math.PI; // open bottom
      diffuser.position.set(px + ox, ductY - 0.55, pz + oz);
      group.add(diffuser);

      // Little drop pipe connecting duct → diffuser
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8),
        ductMat
      );
      drop.position.set(px + ox, ductY - 0.15, pz + oz);
      group.add(drop);
    }
  });

  // Main trunk connecting rooms
  const minX = Math.min(...areas.map((a) => a.position[0] - a.size[0] / 2));
  const maxX = Math.max(...areas.map((a) => a.position[0] + a.size[0] / 2));
  const trunkY = Math.max(...areas.map((a) => a.size[1])) + 1.5;
  const trunkLen = maxX - minX + 2;
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(trunkLen, 0.9, 1.1),
    ductMat
  );
  trunk.position.set((minX + maxX) / 2, trunkY, 0);
  trunk.castShadow = true;
  group.add(trunk);

  // Vertical connectors from trunk to per-room ducts
  areas.forEach((area) => {
    const [px, , pz] = area.position;
    const [, sy] = area.size;
    const ductY = sy + 0.4;
    const riserLen = trunkY - ductY;
    const riser = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, riserLen, 0.6),
      ductMat
    );
    riser.position.set(px, ductY + riserLen / 2, pz);
    group.add(riser);
  });

  return group;
}

/* ------------------------------------------------------------------ */
/* 10. Pressure-cascade arrows between neighbouring rooms              */
/* ------------------------------------------------------------------ */

function createPressureArrows(areas) {
  const group = new THREE.Group();
  group.userData = { kind: "PressureCascade" };

  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const a = areas[i];
      const b = areas[j];
      if (!areShareWall(a, b)) continue;

      const midpoint = new THREE.Vector3(
        (a.position[0] + b.position[0]) / 2,
        1.2,
        (a.position[2] + b.position[2]) / 2
      );

      // Direction: from higher pressure → lower pressure
      const fromHigher = (a.pressurePa ?? 0) >= (b.pressurePa ?? 0) ? a : b;
      const toLower = fromHigher === a ? b : a;
      const dir = new THREE.Vector3(
        toLower.position[0] - fromHigher.position[0],
        0,
        toLower.position[2] - fromHigher.position[2]
      ).normalize();

      const arrow = new THREE.ArrowHelper(
        dir,
        midpoint.clone().addScaledVector(dir, -1.2),
        2.4,
        0x7dd3fc,
        0.8,
        0.4
      );
      group.add(arrow);

      // Pressure delta label
      const delta = Math.abs((a.pressurePa ?? 0) - (b.pressurePa ?? 0));
      const label = createSpriteLabel(`Δ ${delta} Pa`, {
        color: "#e0f2fe",
        bg: "rgba(12, 74, 110, 0.88)",
        border: "#0ea5e9"
      });
      label.position.set(midpoint.x, 2.6, midpoint.z);
      label.scale.multiplyScalar(0.7);
      group.add(label);
    }
  }

  return group;
}

function areShareWall(a, b) {
  const ax1 = a.position[0] - a.size[0] / 2;
  const ax2 = a.position[0] + a.size[0] / 2;
  const az1 = a.position[2] - a.size[2] / 2;
  const az2 = a.position[2] + a.size[2] / 2;
  const bx1 = b.position[0] - b.size[0] / 2;
  const bx2 = b.position[0] + b.size[0] / 2;
  const bz1 = b.position[2] - b.size[2] / 2;
  const bz2 = b.position[2] + b.size[2] / 2;

  const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
  const overlapZ = Math.min(az2, bz2) - Math.max(az1, bz1);
  const gap = 1.5;
  // share wall if they are adjacent along one axis with overlap on the other
  const adjacentX = Math.abs(ax2 - bx1) < gap || Math.abs(bx2 - ax1) < gap;
  const adjacentZ = Math.abs(az2 - bz1) < gap || Math.abs(bz2 - az1) < gap;

  if (adjacentX && overlapZ > 1) return true;
  if (adjacentZ && overlapX > 1) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* 11. Apply CD payload                                                */
/* ------------------------------------------------------------------ */

function applyCdPayload(payload, { animate = true } = {}) {
  clearFacility();

  const facility = payload?.facility;
  if (!facility) return;

  const areas = facility.areas ?? [];
  const equipment = facility.equipment ?? [];

  // Areas
  areas.forEach((area) => {
    const group = createAreaGroup(area);
    const targetY = 0;
    group.position.y = animate ? targetY - 6 : targetY;
    facilityRoot.add(group);

    if (animate) {
      animatedMeshes.push({
        object: group,
        startY: targetY - 6,
        targetY,
        targetOpacity: 1
      });
    }
  });

  // Equipment
  equipment.forEach((item) => {
    const group = createEquipmentGroup(item);
    const [px, , pz] = item.position;
    const targetY = 0;
    group.position.set(px, animate ? targetY - 8 : targetY, pz);
    facilityRoot.add(group);

    if (animate) {
      animatedMeshes.push({
        object: group,
        startY: targetY - 8,
        targetY
      });
    }
  });

  // HVAC + airflow + pressure arrows
  if (areas.length > 0) {
    facilityRoot.add(createHvacSystem(areas));
    facilityRoot.add(createPressureArrows(areas));
    buildAirflowParticles(areas);
  }

  if (animate) animationStart = performance.now();

  // recenter camera
  controls.target.set(0, 3, 0);
  controls.update();

  // ui sync
  const footprint = facility.footprintMeters ?? [40, 30];
  overlay.classList.add("is-hidden");
  metaChip.textContent = `${facility.name} · ${facility.scale}`;
  areaCountEl.textContent = String(areas.length);
  equipmentCountEl.textContent = String(equipment.length);
  footprintEl.textContent = `${footprint[0]} m × ${footprint[1]} m`;

  const riskCount = areas.filter((a) => a.status === "risk").length;
  const cautionCount = areas.filter((a) => a.status === "caution").length;
  statusStrong.textContent = `${facility.name} · ${areas.length}개 구역, ${equipment.length}개 설비`;

  const statusParts = [];
  if (riskCount > 0) statusParts.push(`⚠ 위험 ${riskCount}건`);
  if (cautionCount > 0) statusParts.push(`● 주의 ${cautionCount}건`);
  statusParts.push(`Grade ${facility.cleanroomGrade ?? "—"}`);
  statusParts.push(`${facility.processType ?? "—"} 공정`);
  statusMeta.textContent = statusParts.join(" · ");

  if (jsonBlock) jsonBlock.textContent = JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ */
/* 12. Build payload from form                                         */
/* ------------------------------------------------------------------ */

function buildPayloadFromForm() {
  const formData = new FormData(form);
  const totalArea = Number(formData.get("totalArea")) || 1200;
  const facilityScale = formData.get("facilityScale") || "Pilot";
  const cleanroomGrade = formData.get("cleanroomGrade") || "Grade C";
  const processType = formData.get("processType") || "adc";
  const projectName = formData.get("projectName") || "Untitled CD";
  const bioreactorCount = Math.max(1, Math.min(6, Number(formData.get("bioreactorCount")) || 2));
  const includeFill = form.includeFill.checked;
  const includeBuffer = form.includeBuffer.checked;
  const includeUtilities = form.includeUtilities.checked;
  const includeLyo = form.includeLyo.checked;

  const aspect = 1.45;
  const widthM = Math.round(Math.sqrt(totalArea * aspect));
  const depthM = Math.round(totalArea / widthM);

  const payload = structuredClone(SAMPLE_CD);
  payload.facility.name = projectName;
  payload.facility.scale = facilityScale;
  payload.facility.cleanroomGrade = cleanroomGrade;
  payload.facility.processType = processType.toUpperCase();
  payload.facility.footprintMeters = [widthM, depthM];

  // bioreactors
  const baseEquipment = SAMPLE_CD.facility.equipment.filter((item) => item.type !== "Bioreactor");
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
    payload.facility.equipment = payload.facility.equipment.filter((item) => item.areaId !== "fill");
  }
  if (!includeBuffer) {
    payload.facility.equipment = payload.facility.equipment.filter((item) => item.areaId !== "buffer");
  }

  if (includeUtilities) {
    payload.facility.areas.push({
      id: "utilities",
      name: "Utilities Area (WFI / Clean Steam)",
      grade: "CNC",
      position: [22, 0, 0],
      size: [10, 5, 18],
      status: "ok",
      pressurePa: 5
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

  // Dynamically override status based on grade — just for demo flavor
  if (cleanroomGrade === "Grade A/B") {
    const fill = payload.facility.areas.find((a) => a.id === "fill");
    if (fill) {
      fill.status = "risk";
      fill.statusReason = "Grade A 존 근접 · ACH 재검토 필요";
    }
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/* 13. Utility: hex number → rgba string                               */
/* ------------------------------------------------------------------ */

function hexToRgba(hex, alpha) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/* 14. Wire up UI                                                      */
/* ------------------------------------------------------------------ */

let lastPayload = null;

function handleGenerate() {
  const payload = buildPayloadFromForm();
  lastPayload = payload;
  applyCdPayload(payload, { animate: true });
}

function handleReplay() {
  if (!lastPayload) {
    handleGenerate();
    return;
  }
  applyCdPayload(lastPayload, { animate: true });
}

function handleReset() {
  form.reset();
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

if (jsonBlock) jsonBlock.textContent = JSON.stringify(SAMPLE_CD, null, 2);
