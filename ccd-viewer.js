/*
 * BioForge CCD Studio · 3D Conceptual Design Viewer
 *
 * Renders a CCD JSON payload (areas + equipment + airflow) in a Three.js
 * scene, with:
 *   - Realistic compound-primitive meshes for Bioreactor, BufferTank,
 *     FillingMachine (other equipment still uses fallback shapes)
 *   - Pressure cascade arrows between adjacent areas
 *   - HEPA supply -> return particle system
 *   - Rule-based evaluation engine that produces a Compliance Score
 *
 * The schema is intentionally close to what an LLM would emit, so a future
 * server response can be passed directly to `applyCcdPayload(payload)`.
 *
 * NOTE: airflow visualization is conceptual only — not validated CFD.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ================================================================== */
/* 1. Sample CCD JSON                                                  */
/*    Schema follows ISPE Baseline Guide Vol 6, extended with:         */
/*      - area.pressureDeltaPa (relative to ambient, +Pa)              */
/*      - area.achPerHour      (HVAC air changes per hour)             */
/*      - area.airflow.{supplyPoints, returnPoints}                    */
/* ================================================================== */

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
        pressureDeltaPa: 15,
        achPerHour: 25,
        position: [-10, 0, -6],
        size: [16, 5, 12],
        airflow: {
          supplyPoints: [[-14, 4.6, -10], [-6, 4.6, -10], [-14, 4.6, -2], [-6, 4.6, -2]],
          returnPoints: [[-17, 0.4, -6], [-3, 0.4, -6]]
        }
      },
      {
        id: "downstream",
        name: "Downstream Process Area",
        grade: "Grade C",
        pressureDeltaPa: 15,
        achPerHour: 25,
        position: [8, 0, -6],
        size: [16, 5, 12],
        airflow: {
          supplyPoints: [[4, 4.6, -10], [12, 4.6, -10], [4, 4.6, -2], [12, 4.6, -2]],
          returnPoints: [[1, 0.4, -6], [15, 0.4, -6]]
        }
      },
      {
        id: "fill",
        name: "Aseptic Fill / Finish Suite",
        grade: "Grade A/B",
        pressureDeltaPa: 30,
        achPerHour: 80,
        position: [8, 0, 8],
        size: [14, 5, 10],
        airflow: {
          supplyPoints: [[5, 4.7, 6], [11, 4.7, 6], [5, 4.7, 10], [11, 4.7, 10]],
          returnPoints: [[2, 0.3, 8], [14, 0.3, 8]]
        }
      },
      {
        id: "buffer",
        name: "Media / Buffer Prep",
        grade: "Grade D",
        pressureDeltaPa: 5,
        achPerHour: 12,
        position: [-10, 0, 8],
        size: [14, 5, 10],
        airflow: {
          supplyPoints: [[-13, 4.5, 6], [-7, 4.5, 6], [-13, 4.5, 10], [-7, 4.5, 10]],
          returnPoints: [[-16, 0.3, 8], [-4, 0.3, 8]]
        }
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
        size: [6, 2.6, 2.4]
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

/* ================================================================== */
/* 2. Scenario presets                                                 */
/*    Each scenario rewrites pressure/ACH/adjacency to drive different */
/*    evaluation outcomes for demo storytelling.                       */
/* ================================================================== */

const SCENARIO_PRESETS = {
  recommended: {
    label: "권장",
    apply(facility) {
      // Already-correct defaults; no-op
    }
  },
  standard: {
    label: "표준",
    apply(facility) {
      // Slightly under-spec ACH and weaker pressure delta
      facility.areas.forEach((a) => {
        if (a.id === "fill") {
          a.achPerHour = 50; // below 60 minimum
          a.pressureDeltaPa = 20;
        }
        if (a.id === "upstream" || a.id === "downstream") {
          a.achPerHour = 18; // below 20 minimum
        }
      });
    }
  },
  violation: {
    label: "위반 사례",
    apply(facility) {
      // 1) Move buffer (Grade D) directly next to fill (Grade A/B)
      const fill = facility.areas.find((a) => a.id === "fill");
      const buffer = facility.areas.find((a) => a.id === "buffer");
      if (fill && buffer) {
        buffer.position = [fill.position[0] - 14, 0, fill.position[2]];
      }
      // 2) Break pressure cascade (D higher than C)
      facility.areas.forEach((a) => {
        if (a.id === "buffer") a.pressureDeltaPa = 25;
        if (a.id === "upstream") a.pressureDeltaPa = 8;
        if (a.id === "downstream") a.pressureDeltaPa = 8;
      });
      // 3) Crank ACH way down
      facility.areas.forEach((a) => {
        a.achPerHour = Math.round((a.achPerHour ?? 10) * 0.4);
      });
      // 4) Cram extra equipment into upstream to over-density it
      facility.equipment.push(
        {
          id: "extra-skid-01",
          type: "ChromatographySkid",
          label: "Extra Skid (overcrowded)",
          areaId: "upstream",
          position: [-13, 0, -3],
          size: [3, 2.6, 2]
        },
        {
          id: "extra-skid-02",
          type: "ChromatographySkid",
          label: "Extra Skid 2",
          areaId: "upstream",
          position: [-8, 0, -3],
          size: [3, 2.6, 2]
        },
        {
          id: "extra-tank",
          type: "BufferTank",
          label: "Extra Tank",
          areaId: "upstream",
          position: [-2, 0, -9],
          size: [2.4, 3.4, 2.4]
        }
      );
    }
  }
};

/* ================================================================== */
/* 3. Equipment color registry (fallback for non-custom shapes)        */
/* ================================================================== */

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

/* ================================================================== */
/* 4. Realistic mesh builders                                          */
/*    Custom builders for the 3 high-impact equipment types. Other     */
/*    types fall back to the simple cylinder/box from createBasicMesh. */
/* ================================================================== */

const STEEL_BODY = { color: 0xcbd5e1, metalness: 0.75, roughness: 0.32 };
const STEEL_ACCENT = { color: 0x64748b, metalness: 0.6, roughness: 0.4 };
const STEEL_DARK = { color: 0x1e293b, metalness: 0.7, roughness: 0.45 };

function buildBioreactorMesh({ size }) {
  const [w, h, d] = size;
  const r = Math.min(w, d) / 2;
  const group = new THREE.Group();

  // All sub-components must fit in y range [-h/2, +h/2].
  const legHeight = Math.min(0.4, h * 0.12);
  const motorHeight = Math.min(0.42, h * 0.13);
  const shaftHeight = Math.min(0.32, h * 0.1);
  const bottomDishH = r * 0.45;
  const topDishH = r * 0.5;
  const bodyHeight = Math.max(
    0.5,
    h - legHeight - bottomDishH - topDishH - motorHeight - shaftHeight
  );

  const bottomY = -h / 2;
  const legsTopY = bottomY + legHeight;
  const bodyBottomY = legsTopY + bottomDishH;
  const bodyCenterY = bodyBottomY + bodyHeight / 2;
  const bodyTopY = bodyBottomY + bodyHeight;
  const motorBottomY = bodyTopY + topDishH;
  const motorCenterY = motorBottomY + motorHeight / 2;
  const shaftCenterY = motorBottomY + motorHeight + shaftHeight / 2;

  // Bottom dished head (squashed south hemisphere, flat side up)
  const bottomDish = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial(STEEL_BODY)
  );
  bottomDish.scale.y = bottomDishH / r;
  bottomDish.position.y = bodyBottomY;
  bottomDish.castShadow = true;
  group.add(bottomDish);

  // Cylindrical body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, bodyHeight, 32),
    new THREE.MeshStandardMaterial(STEEL_BODY)
  );
  body.position.y = bodyCenterY;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Top dished head (squashed north hemisphere, flat side down)
  const topDish = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial(STEEL_BODY)
  );
  topDish.scale.y = topDishH / r;
  topDish.position.y = bodyTopY;
  topDish.castShadow = true;
  group.add(topDish);

  // 4 legs
  const legSpread = r * 0.72;
  const legGeom = new THREE.BoxGeometry(0.16, legHeight, 0.16);
  const legMat = new THREE.MeshStandardMaterial(STEEL_ACCENT);
  for (const [dx, dz] of [
    [-legSpread, -legSpread],
    [legSpread, -legSpread],
    [-legSpread, legSpread],
    [legSpread, legSpread]
  ]) {
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(dx, bottomY + legHeight / 2, dz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Top motor block
  const motor = new THREE.Mesh(
    new THREE.BoxGeometry(r * 0.7, motorHeight, r * 0.7),
    new THREE.MeshStandardMaterial(STEEL_DARK)
  );
  motor.position.y = motorCenterY;
  motor.castShadow = true;
  group.add(motor);

  // Impeller shaft poking out of motor
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, shaftHeight, 12),
    new THREE.MeshStandardMaterial(STEEL_ACCENT)
  );
  shaft.position.y = shaftCenterY;
  group.add(shaft);

  // Subtle teal tint band to keep legacy color cue
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.01, r * 1.01, bodyHeight * 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x14b8a6, metalness: 0.4, roughness: 0.4 })
  );
  band.position.y = bodyCenterY;
  group.add(band);

  return group;
}

function buildBufferTankMesh({ size }) {
  const [w, h, d] = size;
  const r = Math.min(w, d) / 2;
  const group = new THREE.Group();

  const legHeight = Math.min(0.5, h * 0.16);
  const dishHeight = r * 0.4;
  const cylHeight = h - legHeight - dishHeight * 2;

  // Lathe profile (revolved around Y axis)
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.5, 0.04),
    new THREE.Vector2(r * 0.85, dishHeight * 0.45),
    new THREE.Vector2(r, dishHeight),
    new THREE.Vector2(r, dishHeight + cylHeight),
    new THREE.Vector2(r * 0.85, dishHeight + cylHeight + dishHeight * 0.55),
    new THREE.Vector2(r * 0.5, dishHeight + cylHeight + dishHeight * 0.96),
    new THREE.Vector2(0, dishHeight + cylHeight + dishHeight)
  ];

  const tankGeom = new THREE.LatheGeometry(profile, 32);
  tankGeom.translate(0, -h / 2 + legHeight, 0);

  const tank = new THREE.Mesh(
    tankGeom,
    new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.55, roughness: 0.3 })
  );
  tank.castShadow = true;
  tank.receiveShadow = true;
  group.add(tank);

  // Stainless ring at the seam
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.04, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.15 })
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = -h / 2 + legHeight + dishHeight + cylHeight / 2;
  group.add(seam);

  // 3 legs (tripod)
  const legGeom = new THREE.BoxGeometry(0.12, legHeight, 0.12);
  const legMat = new THREE.MeshStandardMaterial(STEEL_ACCENT);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(Math.cos(angle) * r * 0.7, -h / 2 + legHeight / 2, Math.sin(angle) * r * 0.7);
    leg.castShadow = true;
    group.add(leg);
  }

  // Top nozzle
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12),
    new THREE.MeshStandardMaterial(STEEL_DARK)
  );
  nozzle.position.y = h / 2 + 0.05;
  group.add(nozzle);

  return group;
}

function buildFillingMachineMesh({ size }) {
  const [w, h, d] = size;
  const group = new THREE.Group();

  const baseHeight = h * 0.5;
  const isolatorHeight = h * 0.45;

  // Base unit (purple cabinet)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w, baseHeight, d),
    new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.45, roughness: 0.45 })
  );
  base.position.y = -h / 2 + baseHeight / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Control panel inset (front)
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.28, baseHeight * 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4, emissive: 0x334155, emissiveIntensity: 0.25 })
  );
  panel.position.set(w * 0.28, base.position.y, d / 2 + 0.04);
  group.add(panel);

  // Top isolator (semi-transparent box with edge frame)
  const isolatorMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ff,
    transparent: true,
    opacity: 0.32,
    metalness: 0.1,
    roughness: 0.05
  });
  const isolator = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.95, isolatorHeight, d * 0.85),
    isolatorMat
  );
  isolator.position.y = base.position.y + baseHeight / 2 + isolatorHeight / 2;
  group.add(isolator);

  // Edge frame
  const edgeFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(isolator.geometry),
    new THREE.LineBasicMaterial({ color: 0x7e22ce, transparent: true, opacity: 0.85 })
  );
  edgeFrame.position.copy(isolator.position);
  group.add(edgeFrame);

  // Filling nozzles (3 cylinders hanging from inside the isolator)
  const nozzleCount = 3;
  for (let i = 0; i < nozzleCount; i++) {
    const t = (i + 1) / (nozzleCount + 1);
    const x = -w / 2 + w * t;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, isolatorHeight * 0.55, 12),
      new THREE.MeshStandardMaterial(STEEL_ACCENT)
    );
    nozzle.position.set(x, isolator.position.y + isolatorHeight / 2 - (isolatorHeight * 0.55) / 2, 0);
    group.add(nozzle);

    // Tiny vial under each nozzle
    const vial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 })
    );
    vial.position.set(x, base.position.y + baseHeight / 2 + 0.09, 0);
    group.add(vial);
  }

  return group;
}

const EQUIPMENT_BUILDERS = {
  Bioreactor: buildBioreactorMesh,
  BufferTank: buildBufferTankMesh,
  FillingMachine: buildFillingMachineMesh
};

/* ================================================================== */
/* 5. DOM references                                                   */
/* ================================================================== */

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
const evalGradeEl = document.getElementById("ccdEvalGrade");
const evalGradeNoteEl = document.getElementById("ccdEvalGradeNote");
const evalScoreEl = document.getElementById("ccdEvalScore");
const evalScenarioEl = document.getElementById("ccdEvalScenario");
const evalRulesEl = document.getElementById("ccdEvalRules");

/* ================================================================== */
/* 6. Scene setup                                                      */
/* ================================================================== */

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

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(120, 60, 0x334155, 0x1f2937);
grid.position.y = 0.01;
scene.add(grid);

const facilityRoot = new THREE.Group();
scene.add(facilityRoot);

const airflowRoot = new THREE.Group();
scene.add(airflowRoot);

/* ================================================================== */
/* 7. Pressure cascade arrows                                          */
/* ================================================================== */

function pressureToColor(deltaPa) {
  // Map 0..40 Pa to a hue from blue (cool/low) to magenta (hot/high)
  const t = Math.max(0, Math.min(1, deltaPa / 40));
  const hue = 0.62 - t * 0.45; // 0.62 (blue) -> 0.17 (orange/magenta)
  return new THREE.Color().setHSL(hue, 0.65, 0.55);
}

function buildPressureCascadeArrows(facility) {
  const group = new THREE.Group();
  const areas = facility.areas;

  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i];
      const b = areas[j];

      // Adjacency test: closest face distance < threshold
      const dx = Math.abs(a.position[0] - b.position[0]) - (a.size[0] + b.size[0]) / 2;
      const dz = Math.abs(a.position[2] - b.position[2]) - (a.size[2] + b.size[2]) / 2;
      const gap = Math.max(dx, dz);
      if (gap > 4) continue;

      const pa = a.pressureDeltaPa ?? 0;
      const pb = b.pressureDeltaPa ?? 0;
      if (pa === pb) continue;

      const high = pa > pb ? a : b;
      const low = pa > pb ? b : a;
      const delta = Math.abs(pa - pb);

      const start = new THREE.Vector3(high.position[0], (high.size[1] ?? 5) + 1.5, high.position[2]);
      const end = new THREE.Vector3(low.position[0], (low.size[1] ?? 5) + 1.5, low.position[2]);
      const dir = end.clone().sub(start);
      const length = dir.length();
      if (length < 0.1) continue;
      dir.normalize();

      const color = pressureToColor(delta);
      const arrow = new THREE.ArrowHelper(
        dir,
        start,
        length * 0.85,
        color,
        Math.max(0.6, length * 0.12),
        Math.max(0.3, length * 0.06)
      );
      arrow.line.material.linewidth = 2;
      group.add(arrow);
    }
  }
  return group;
}

/* ================================================================== */
/* 8. HEPA particle system (supply -> return)                          */
/* ================================================================== */

const GRADE_PARTICLE_COLORS = {
  "Grade A/B": new THREE.Color(0xffffff),
  "Grade B": new THREE.Color(0xe0f2fe),
  "Grade C": new THREE.Color(0x7dd3fc),
  "Grade D": new THREE.Color(0x60a5fa),
  CNC: new THREE.Color(0x94a3b8)
};

class HepaParticleSystem {
  constructor() {
    this.maxParticles = 2700;
    this.particles = [];
    this.spawnAccumulator = 0;
    this.facility = null;

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  setFacility(facility) {
    this.facility = facility;
    this.particles.length = 0;
    this.flushBuffer();
  }

  flushBuffer() {
    const positions = this.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) positions[i] = -1000;
    this.geometry.attributes.position.needsUpdate = true;
  }

  spawn() {
    if (!this.facility) return;
    if (this.particles.length >= this.maxParticles) return;

    const candidates = this.facility.areas.filter(
      (a) => a.airflow?.supplyPoints?.length && a.airflow?.returnPoints?.length
    );
    if (candidates.length === 0) return;
    const area = candidates[Math.floor(Math.random() * candidates.length)];

    const supplies = area.airflow.supplyPoints;
    const returns = area.airflow.returnPoints;
    const supply = supplies[Math.floor(Math.random() * supplies.length)];
    const target = returns[Math.floor(Math.random() * returns.length)];

    this.particles.push({
      pos: new THREE.Vector3(supply[0], supply[1], supply[2]),
      target: new THREE.Vector3(target[0], target[1], target[2]),
      grade: area.grade,
      life: 1.0
    });
  }

  update(dt) {
    if (!this.facility) return;

    // Spawn rate ~ ACH-weighted, simplified to ~90/sec total (3x denser flow)
    this.spawnAccumulator += dt * 90;
    while (this.spawnAccumulator >= 1) {
      this.spawn();
      this.spawnAccumulator -= 1;
    }

    // Update positions
    const speed = 1.6;
    this.particles = this.particles.filter((p) => {
      const dir = p.target.clone().sub(p.pos);
      const dist = dir.length();
      if (dist < 0.35 || p.life <= 0) return false;

      dir.normalize().multiplyScalar(speed * dt);
      // Slight downward bias + jitter
      dir.y -= 0.05 * dt;
      dir.x += (Math.random() - 0.5) * 0.04 * dt;
      dir.z += (Math.random() - 0.5) * 0.04 * dt;
      p.pos.add(dir);
      p.life -= dt * 0.18;
      return true;
    });

    // Update buffers
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        positions[i * 3] = p.pos.x;
        positions[i * 3 + 1] = p.pos.y;
        positions[i * 3 + 2] = p.pos.z;
        const c = GRADE_PARTICLE_COLORS[p.grade] ?? GRADE_PARTICLE_COLORS.CNC;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      } else {
        positions[i * 3] = -1000;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = -1000;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}

const hepaParticles = new HepaParticleSystem();
airflowRoot.add(hepaParticles.points);

/* ================================================================== */
/* 9. Evaluation engine                                                */
/*    4 weighted rules, output: { overallScore, grade, checks[] }      */
/* ================================================================== */

const GRADE_ORDER = { "Grade A/B": 4, "Grade A": 4, "Grade B": 3, "Grade C": 2, "Grade D": 1, CNC: 0 };
const MIN_ACH = { "Grade A/B": 60, "Grade A": 60, "Grade B": 40, "Grade C": 20, "Grade D": 10, CNC: 0 };

function statusForScore(score) {
  if (score >= 80) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

function evaluateCcdLayout(facility) {
  const areas = facility.areas ?? [];
  const equipment = facility.equipment ?? [];
  const checks = [];

  /* Rule 1: Pressure cascade integrity */
  let cascadeScore = 100;
  const cascadeIssues = [];
  for (const a of areas) {
    if (a.pressureDeltaPa === undefined) {
      cascadeScore -= 10;
      cascadeIssues.push(`${a.name}: pressureDeltaPa 미정의`);
    }
  }
  // Higher grade should have higher (or equal) pressure than lower grade
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i];
      const b = areas[j];
      const ga = GRADE_ORDER[a.grade] ?? 0;
      const gb = GRADE_ORDER[b.grade] ?? 0;
      if (ga === gb) continue;
      const high = ga > gb ? a : b;
      const low = ga > gb ? b : a;
      if ((high.pressureDeltaPa ?? 0) <= (low.pressureDeltaPa ?? 0)) {
        cascadeScore -= 25;
        cascadeIssues.push(
          `압력 역전: ${high.name}(${high.grade}, ${high.pressureDeltaPa ?? "—"}Pa) ≤ ${low.name}(${low.grade}, ${low.pressureDeltaPa ?? "—"}Pa)`
        );
      }
    }
  }
  checks.push({
    rule: "압력 캐스케이드 무결성",
    reference: "EU GMP Annex 1 §4.5",
    weight: 30,
    score: Math.max(0, cascadeScore),
    issues: cascadeIssues
  });

  /* Rule 2: Grade adjacency (no Grade A/B directly next to Grade D) */
  let adjScore = 100;
  const adjIssues = [];
  const ab = areas.filter((a) => a.grade === "Grade A/B" || a.grade === "Grade A");
  const dArea = areas.filter((a) => a.grade === "Grade D");
  for (const aArea of ab) {
    for (const dAreaItem of dArea) {
      const dx = Math.abs(aArea.position[0] - dAreaItem.position[0]) - (aArea.size[0] + dAreaItem.size[0]) / 2;
      const dz = Math.abs(aArea.position[2] - dAreaItem.position[2]) - (aArea.size[2] + dAreaItem.size[2]) / 2;
      const gap = Math.max(dx, dz);
      if (gap < 2) {
        adjScore -= 35;
        adjIssues.push(
          `${aArea.name}(A/B)와 ${dAreaItem.name}(D)가 직접 인접 (gap ${gap.toFixed(1)}m) — Grade C 버퍼 권장`
        );
      }
    }
  }
  checks.push({
    rule: "Grade 인접성 (cascading buffer)",
    reference: "EU GMP Annex 1 §4.3",
    weight: 25,
    score: Math.max(0, adjScore),
    issues: adjIssues
  });

  /* Rule 3: Equipment density (footprint occupancy) */
  let densityScore = 100;
  const densityIssues = [];
  for (const a of areas) {
    const areaFp = a.size[0] * a.size[2];
    const equipInArea = equipment.filter((e) => e.areaId === a.id);
    const equipFp = equipInArea.reduce((sum, e) => sum + e.size[0] * e.size[2], 0);
    const density = areaFp > 0 ? equipFp / areaFp : 0;
    if (density > 0.35) {
      const penalty = Math.round((density - 0.35) * 200);
      densityScore -= penalty;
      densityIssues.push(
        `${a.name}: 설비 밀도 ${(density * 100).toFixed(0)}% (권장 ≤ 35%, 동선/청소 공간 부족)`
      );
    }
  }
  checks.push({
    rule: "설비 밀도 (동선·청소 공간)",
    reference: "ISPE Baseline Guide Vol 6 §6",
    weight: 20,
    score: Math.max(0, densityScore),
    issues: densityIssues
  });

  /* Rule 4: HEPA ACH coverage */
  let achScore = 100;
  const achIssues = [];
  for (const a of areas) {
    const required = MIN_ACH[a.grade];
    if (required === undefined || required === 0) continue;
    const actual = a.achPerHour ?? 0;
    if (actual < required) {
      const shortfall = (required - actual) / required;
      achScore -= Math.round(shortfall * 60);
      achIssues.push(`${a.name}: ACH ${actual} < 권장 ${required} (${a.grade})`);
    }
  }
  checks.push({
    rule: "HEPA 환기 횟수 (ACH)",
    reference: "ISO 14644-4 / ISPE HVAC Guide",
    weight: 25,
    score: Math.max(0, achScore),
    issues: achIssues
  });

  // Weighted overall score
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const weighted = checks.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight;
  const overallScore = Math.round(weighted);

  let grade;
  if (overallScore >= 90) grade = "S";
  else if (overallScore >= 80) grade = "A";
  else if (overallScore >= 70) grade = "B";
  else if (overallScore >= 60) grade = "C";
  else grade = "D";

  return { overallScore, grade, checks };
}

function updateEvaluationUI(result, scenarioLabel) {
  evalGradeEl.textContent = result.grade;
  evalGradeEl.dataset.grade = result.grade;
  evalScoreEl.textContent = String(result.overallScore);
  evalScenarioEl.textContent = scenarioLabel ?? "—";

  const noteByGrade = {
    S: "모든 룰을 모범적으로 통과했습니다.",
    A: "전반적으로 양호. 일부 룰만 점검 필요.",
    B: "개선 권장 항목이 있습니다.",
    C: "핵심 룰 일부 위반 — 재검토 필요.",
    D: "다수 룰 위반 — 배치 재설계 권장."
  };
  evalGradeNoteEl.textContent = noteByGrade[result.grade] ?? "";

  evalRulesEl.innerHTML = "";
  for (const check of result.checks) {
    const status = statusForScore(check.score);
    const li = document.createElement("li");
    li.className = "ccd-eval-rule";

    const issuesHtml = check.issues.length
      ? `<ul class="ccd-eval-rule-issues">${check.issues
          .map((msg) => `<li>${escapeHtml(msg)}</li>`)
          .join("")}</ul>`
      : `<p class="ccd-eval-rule-ok">위반 사항 없음 — 모범 사례에 부합</p>`;

    li.innerHTML = `
      <div class="ccd-eval-rule-header">
        <div>
          <div class="ccd-eval-rule-title">${escapeHtml(check.rule)}</div>
          <span class="ccd-eval-rule-ref">${escapeHtml(check.reference)} · weight ${check.weight}</span>
        </div>
        <span class="ccd-eval-rule-score" data-status="${status}">${check.score} / 100</span>
      </div>
      <div class="ccd-eval-rule-bar">
        <span data-status="${status}" style="width: ${check.score}%"></span>
      </div>
      ${issuesHtml}
    `;
    evalRulesEl.appendChild(li);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================================================================== */
/* 10. Animation loop                                                  */
/* ================================================================== */

const animatedMeshes = [];
let animationStart = null;
const ANIMATION_DURATION_MS = 1100;
let lastFrameMs = performance.now();

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function tickAnimation(now) {
  if (animationStart === null || animatedMeshes.length === 0) return;
  const elapsed = now - animationStart;
  const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

  animatedMeshes.forEach((entry, index) => {
    const stagger = Math.min(index * 60, 600);
    const localElapsed = Math.max(elapsed - stagger, 0);
    const localProgress = Math.min(localElapsed / ANIMATION_DURATION_MS, 1);
    const eased = easeOutBack(localProgress);
    entry.mesh.position.y = entry.startY + (entry.targetY - entry.startY) * eased;

    if (entry.targetOpacity !== undefined && entry.mesh.material?.transparent) {
      entry.mesh.material.opacity = entry.targetOpacity * Math.min(localProgress * 1.4, 1);
    }
  });

  if (progress >= 1) animationStart = null;
}

function renderLoop(now) {
  const dt = Math.min((now - lastFrameMs) / 1000, 0.05);
  lastFrameMs = now;
  tickAnimation(now);
  hepaParticles.update(dt);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

/* ================================================================== */
/* 11. Resize handling                                                 */
/* ================================================================== */

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

/* ================================================================== */
/* 12. Mesh builders for areas + equipment + scene clear               */
/* ================================================================== */

function clearFacility() {
  while (facilityRoot.children.length > 0) {
    const child = facilityRoot.children.pop();
    child.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
        else node.material.dispose();
      }
    });
  }
  // Clear airflow arrows but keep particle Points
  while (airflowRoot.children.length > 1) {
    const child = airflowRoot.children.find((c) => c !== hepaParticles.points);
    if (!child) break;
    airflowRoot.remove(child);
    child.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
        else node.material.dispose();
      }
    });
  }
  animatedMeshes.length = 0;
}

function pressureToAreaTint(deltaPa) {
  const t = Math.max(0, Math.min(1, (deltaPa ?? 0) / 35));
  // Cool blue (low) -> warm red (high)
  const color = new THREE.Color().setHSL(0.6 - t * 0.55, 0.55, 0.6);
  return color;
}

function createAreaMesh(area) {
  const [sx, sy, sz] = area.size;
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  const tint = pressureToAreaTint(area.pressureDeltaPa);
  const material = new THREE.MeshStandardMaterial({
    color: tint,
    transparent: true,
    opacity: 0.18,
    roughness: 0.4,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { kind: "CleanRoom_Wall", areaId: area.id, label: area.name };

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: 0.7 })
  );
  mesh.add(edges);

  return mesh;
}

function createBasicEquipmentMesh(equipment) {
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
  return mesh;
}

function createEquipmentMesh(equipment) {
  const builder = EQUIPMENT_BUILDERS[equipment.type];
  const mesh = builder ? builder(equipment) : createBasicEquipmentMesh(equipment);
  mesh.userData = {
    kind: equipment.type,
    label: equipment.label,
    areaId: equipment.areaId
  };
  return mesh;
}

/* ================================================================== */
/* 13. Apply CCD payload                                               */
/* ================================================================== */

function applyCcdPayload(payload, { animate = true, scenarioLabel = "" } = {}) {
  clearFacility();

  const facility = payload?.facility;
  if (!facility) return;

  const areas = facility.areas ?? [];
  const equipment = facility.equipment ?? [];

  // Areas
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

  // Equipment
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

  // Pressure cascade arrows
  const arrows = buildPressureCascadeArrows(facility);
  airflowRoot.add(arrows);

  // HEPA particles
  hepaParticles.setFacility(facility);

  if (animate) animationStart = performance.now();

  // Camera target
  controls.target.set(0, 3, 0);
  controls.update();

  // UI sync
  overlay.classList.add("is-hidden");
  metaChip.textContent = `${facility.name} · ${facility.scale}`;
  areaCountEl.textContent = String(areas.length);
  equipmentCountEl.textContent = String(equipment.length);
  const footprint = facility.footprintMeters ?? [40, 30];
  footprintEl.textContent = `${footprint[0]} m × ${footprint[1]} m`;
  statusStrong.textContent = `${facility.name} · ${areas.length}개 구역, ${equipment.length}개 설비`;
  statusMeta.textContent = `Grade ${facility.cleanroomGrade ?? "—"} · ${facility.processType ?? "—"} 공정`;

  jsonBlock.textContent = JSON.stringify(payload, null, 2);

  // Evaluation
  const result = evaluateCcdLayout(facility);
  updateEvaluationUI(result, scenarioLabel);
}

/* ================================================================== */
/* 14. Build payload from form                                         */
/* ================================================================== */

function buildPayloadFromForm() {
  const formData = new FormData(form);
  const totalArea = Number(formData.get("totalArea")) || 1200;
  const facilityScale = formData.get("facilityScale") || "Pilot";
  const cleanroomGrade = formData.get("cleanroomGrade") || "Grade C";
  const processType = formData.get("processType") || "adc";
  const projectName = formData.get("projectName") || "Untitled CCD";
  const scenario = formData.get("scenario") || "recommended";
  const bioreactorCount = Math.max(1, Math.min(6, Number(formData.get("bioreactorCount")) || 2));
  const includeFill = form.includeFill.checked;
  const includeBuffer = form.includeBuffer.checked;
  const includeUtilities = form.includeUtilities.checked;
  const includeLyo = form.includeLyo.checked;

  const aspect = 1.45;
  const widthM = Math.round(Math.sqrt(totalArea * aspect));
  const depthM = Math.round(totalArea / widthM);

  const payload = structuredClone(SAMPLE_CCD);
  payload.facility.name = projectName;
  payload.facility.scale = facilityScale;
  payload.facility.cleanroomGrade = cleanroomGrade;
  payload.facility.processType = processType.toUpperCase();
  payload.facility.footprintMeters = [widthM, depthM];

  // Bioreactor count adjustment
  const baseEquipment = SAMPLE_CCD.facility.equipment.filter((item) => item.type !== "Bioreactor");
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

  // Optional areas
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
      pressureDeltaPa: 0,
      achPerHour: 6,
      position: [22, 0, 0],
      size: [10, 5, 18]
    });
    payload.facility.equipment.push(
      {
        id: "wfi-skid",
        type: "BufferTank",
        label: "WFI Storage Tank",
        areaId: "utilities",
        position: [22, 0, -4],
        size: [2.4, 4, 2.4]
      },
      {
        id: "clean-steam",
        type: "ChromatographySkid",
        label: "Clean Steam Generator",
        areaId: "utilities",
        position: [22, 0, 4],
        size: [3, 2.8, 2]
      }
    );
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

  // Apply scenario preset (mutates the payload's facility)
  const preset = SCENARIO_PRESETS[scenario] ?? SCENARIO_PRESETS.recommended;
  preset.apply(payload.facility);

  return { payload, scenarioLabel: preset.label };
}

/* ================================================================== */
/* 15. Wire up UI                                                      */
/* ================================================================== */

let lastResult = null;

function handleGenerate() {
  const { payload, scenarioLabel } = buildPayloadFromForm();
  lastResult = { payload, scenarioLabel };
  applyCcdPayload(payload, { animate: true, scenarioLabel });
}

function handleReplay() {
  if (!lastResult) {
    handleGenerate();
    return;
  }
  applyCcdPayload(lastResult.payload, { animate: true, scenarioLabel: lastResult.scenarioLabel });
}

function handleReset() {
  form.reset();
  form.scenario.value = "recommended";
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
