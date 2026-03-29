/******************************************************
 *  ROLLOUT CALCULATOR — FULL REGENERATED VERSION
 ******************************************************/

/******************************************************
 *  PART 1 — BASIC HELPERS
 ******************************************************/

function $(id) { return document.getElementById(id); }
function text(id, v) { const el = $(id); if (el) el.textContent = v; }
function html(id, v) { const el = $(id); if (el) el.innerHTML = v; }

/******************************************************
 *  PART 2 — UNIT CONVERSION + DUAL‑UNIT FORMATTERS
 ******************************************************/

function mmToIn(mm) { return mm / 25.4; }
function inToMm(inches) { return inches * 25.4; }

// Inputs (show units)
function formatDualUnitsInput(inches) {
  if (inches == null || isNaN(inches)) return { primary: "", secondary: "" };
  const mm = inToMm(inches);
  return {
    primary: `${inches.toFixed(3)} in`,
    secondary: `${mm.toFixed(2)} mm`
  };
}

// Grid + recommended table (NO units)
function formatDualUnitsGrid(inches) {
  if (inches == null || isNaN(inches)) return "";
  const mm = inToMm(inches);
  return `
    <div class="dual-unit-cell">
      <div class="primary-unit">${inches.toFixed(3)}</div>
      <div class="secondary-unit">${mm.toFixed(2)}</div>
    </div>
  `;
}

/******************************************************
 *  PART 3 — ROLLOUT MATH + INPUT INTERPRETATION
 ******************************************************/

function computeRollout(spur, pinion, tireMm) {
  if (!spur || !pinion || !tireMm) return null;
  const ratio = spur / pinion;
  const circumferenceIn = mmToIn(tireMm) * Math.PI;
  return circumferenceIn / ratio;
}

function totalTeeth(s, p) { return s + p; }

// Correct A12X range
function getCarTeethRange(car) {
  if (car === "a12x") return { min: 112, max: 125 };
  return { min: 90, max: 140 };
}

// Interpret dual‑unit inputs
function interpretDualUnitInput(raw) {
  const v = parseFloat(raw);
  if (isNaN(v)) return { inches: null, mm: null, mode: null };
  if (v < 10) return { inches: v, mm: inToMm(v), mode: "in" };
  return { inches: mmToIn(v), mm: v, mode: "mm" };
}

/******************************************************
 *  PART 4 — INPUT HANDLING + DISPLAY
 ******************************************************/

function updateTireDualDisplay() {
  const raw = $("tire")?.value;
  const outP = $("tirePrimary");
  const outS = $("tireSecondary");
  if (!raw || !outP || !outS) return;

  const { inches } = interpretDualUnitInput(raw);
  if (inches == null) { outP.textContent = ""; outS.textContent = ""; return; }

  const f = formatDualUnitsInput(inches);
  outP.textContent = f.primary;
  outS.textContent = f.secondary;
}

function markTireManualOverride() {
  const ind = $("tireManualIndicator");
  if (!ind) return;
  const raw = $("tire")?.value;
  ind.textContent = raw && !isNaN(parseFloat(raw)) ? "Manual override" : "";
}

function updateDesiredDualDisplay() {
  const raw = $("desiredRollout")?.value;
  const p = $("desiredPrimary");
  const s = $("desiredSecondary");
  if (!raw || !p || !s) return;

  const { inches } = interpretDualUnitInput(raw);
  if (inches == null) { p.textContent = ""; s.textContent = ""; return; }

  const f = formatDualUnitsInput(inches);
  p.textContent = f.primary;
  s.textContent = f.secondary;
}

function readInputs() {
  const spur = parseInt($("spur")?.value, 10) || 66;
  const pinion = parseInt($("pinion")?.value, 10) || 50;

  const tireParsed = interpretDualUnitInput($("tire")?.value);
  const desiredParsed = interpretDualUnitInput($("desiredRollout")?.value);

  const car = $("car")?.value || "a12x";

  return {
    spur,
    pinion,
    tireMm: tireParsed.mm,
    tireIn: tireParsed.inches,
    desiredIn: desiredParsed.inches,
    desiredMm: desiredParsed.mm,
    car
  };
}

function updateTeethRangeDisplay() {
  const { car } = readInputs();
  const r = getCarTeethRange(car);
  text("teethRange", `${r.min}–${r.max} total teeth`);
}

/******************************************************
 *  PART 5 — CENTERED LOCAL GEARING MAP (±3 WINDOW)
 ******************************************************/

let currentSpur = 66;
let currentPinion = 50;
const WINDOW = 3;

function buildLocalTable() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  const { tireMm, car } = readInputs();
  const range = getCarTeethRange(car);

  const spurStart = currentSpur - WINDOW;
  const spurEnd   = currentSpur + WINDOW;
  const pinionStart = currentPinion - WINDOW;
  const pinionEnd   = currentPinion + WINDOW;

  // Header row
  headRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.textContent = "Spur ↓ / Pinion →";
  headRow.appendChild(corner);

  for (let p = pinionStart; p <= pinionEnd; p++) {
    const th = document.createElement("th");
    th.textContent = p;
    headRow.appendChild(th);
  }

  // Body rows
  body.innerHTML = "";

  for (let s = spurStart; s <= spurEnd; s++) {
    const tr = document.createElement("tr");

    const spurCell = document.createElement("td");
    spurCell.textContent = s;
    tr.appendChild(spurCell);

    for (let p = pinionStart; p <= pinionEnd; p++) {
      const td = document.createElement("td");

      const total = totalTeeth(s, p);
      const legal = total >= range.min && total <= range.max;
      const rolloutIn = computeRollout(s, p, tireMm);

      td.innerHTML = rolloutIn != null ? formatDualUnitsGrid(rolloutIn) : "";
      td.classList.add(legal ? "legal-gear" : "illegal-gear");

      if (s === currentSpur && p === currentPinion) {
        td.classList.add("current-gear");
      }

      td.addEventListener("click", () => {
        currentSpur = s;
        currentPinion = p;
        $("spur").value = s;
        $("pinion").value = p;
        buildLocalTable();
        buildRecommendedTable();
      });

      tr.appendChild(td);
    }

    body.appendChild(tr);
  }
}

function setupKeyboardNavigation() {
  document.addEventListener("keydown", e => {
    let moved = false;

    if (e.key === "ArrowUp") { currentSpur++; moved = true; }
    else if (e.key === "ArrowDown") { currentSpur--; moved = true; }
    else if (e.key === "ArrowLeft") { currentPinion--; moved = true; }
    else if (e.key === "ArrowRight") { currentPinion++; moved = true; }
    else if (e.key === "Enter") {
      $("spur").value = currentSpur;
      $("pinion").value = currentPinion;
      buildRecommendedTable();
      return;
    }

    if (moved) {
      e.preventDefault();
      $("spur").value = currentSpur;
      $("pinion").value = currentPinion;
      buildLocalTable();
      buildRecommendedTable();
    }
  });
}

function centerOnCurrentGearing() {
  buildLocalTable();
}

/******************************************************
 *  PART 6 — RECOMMENDED GEARING ENGINE
 ******************************************************/

function buildRecommendedTable() {
  const tbody = $("recommended")?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const { tireMm, car, desiredIn } = readInputs();
  const range = getCarTeethRange(car);

  const rows = [];

  for (let s = 60; s <= 80; s++) {
    for (let p = 40; p <= 60; p++) {
      const total = totalTeeth(s, p);
      if (total < range.min || total > range.max) continue;

      const rolloutIn = computeRollout(s, p, tireMm);
      if (rolloutIn == null) continue;

      const delta = desiredIn != null ? rolloutIn - desiredIn : null;

      rows.push({ spur: s, pinion: p, total, rolloutIn, delta });
    }
  }

  rows.sort((a, b) => {
    if (a.delta == null && b.delta == null) return 0;
    if (a.delta == null) return 1;
    if (b.delta == null) return -1;
    return Math.abs(a.delta) - Math.abs(b.delta);
  });

  rows.forEach((r, i) => {
    const tr = document.createElement("tr");

    const tdS = document.createElement("td"); tdS.textContent = r.spur;
    const tdP = document.createElement("td"); tdP.textContent = r.pinion;
    const tdT = document.createElement("td"); tdT.textContent = r.total;

    const tdR = document.createElement("td");
    tdR.innerHTML = formatDualUnitsGrid(r.rolloutIn);

    const tdD = document.createElement("td");
    if (r.delta != null) {
      const sign = r.delta >= 0 ? "+" : "";
      tdD.textContent = `${sign}${r.delta.toFixed(3)}`;
    }

    tr.appendChild(tdS);
    tr.appendChild(tdP);
    tr.appendChild(tdT);
    tr.appendChild(tdR);
    tr.appendChild(tdD);

    if (i === 0 && r.delta != null) {
      tr.classList.add("best-recommendation");
    }

    tr.addEventListener("click", () => {
      currentSpur = r.spur;
      currentPinion = r.pinion;
      $("spur").value = r.spur;
      $("pinion").value = r.pinion;
      buildLocalTable();
      buildRecommendedTable();
    });

    tbody.appendChild(tr);
  });
}

/******************************************************
 *  PART 7 — TIRE SYSTEM + INIT
 ******************************************************/

const TIRE_LS_KEY = "tireSetSystemData";

const defaultTireData = {
  thresholds: { new_min: 40.5, cut_min: 40.0, old_min: 39.7 },
  racers: { William: {}, John: {} },
  tire_sets: {
    "12": {
      identifier: "12",
      LH: { measured: 40.85, status: "CUT", wear: 78, uses: 2 },
      RH: { measured: 40.80, status: "CUT", wear: 85, uses: 1 },
      batch: "B12",
      compound: "CRC",
      brand: "CRC",
      notes: "Baseline CRC set",
      usedByRacers: ["William"]
    }
  },
  history: []
};

let tireData = null;

function loadTireDataFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(TIRE_LS_KEY)); }
  catch { return null; }
}

function saveTireDataToLocalStorage(d) {
  localStorage.setItem(TIRE_LS_KEY, JSON.stringify(d));
}

async function loadTireDataJson() {
  try {
    const res = await fetch("tireData.json", { cache: "no-cache" });
    if (!res.ok) throw 0;
    return await res.json();
  } catch { return null; }
}

async function ensureTireDataLoaded() {
  if (tireData) return tireData;

  const fromLS = loadTireDataFromLocalStorage();
  if (fromLS) tireData = fromLS;
  else {
    const fromJson = await loadTireDataJson();
    tireData = fromJson || structuredClone(defaultTireData);
    saveTireDataToLocalStorage(tireData);
  }

  return tireData;
}

function buildCalcRacerSelect() {
  const sel = $("calcRacerSelect");
  if (!sel || !tireData) return;

  sel.innerHTML = "";
  Object.keys(tireData.racers).sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function buildCalcTireSetSelect() {
  const sel = $("calcTireSetSelect");
  if (!sel || !tireData) return;

  sel.innerHTML = "";
  Object.keys(tireData.tire_sets).sort().forEach(id => {
    const set = tireData.tire_sets[id];
    const opt = document.createElement("option");
    const lh = set.LH?.measured ?? "?";
    const rh = set.RH?.measured ?? "?";
    const used = (set.usedByRacers || []).join(", ");
    opt.value = id;
    opt.textContent = `${id} (LH: ${lh} / RH: ${rh})${used ? " — Used by: " + used : ""}`;
    sel.appendChild(opt);
  });
}

function applySelectedTireToCalculator() {
  if (!tireData) return;

  const setId = $("calcTireSetSelect")?.value;
  const side = $("calcTireSideSelect")?.value || "LH";
  if (!setId) return;

  const set = tireData.tire_sets[setId];
  const sideData = set[side];
  if (!sideData?.measured) return;

  $("tire").value = sideData.measured;
  updateTireDualDisplay();
  markTireManualOverride();
  buildLocalTable();
  buildRecommendedTable();
}

function setupCollapsibleCards() {
  document.querySelectorAll(".collapsible .card-header").forEach(h => {
    h.addEventListener("click", () => {
      h.parentElement.classList.toggle("collapsed");
    });
  });
}

function setupCalculatorInputs() {
  const tire = $("tire");
  const desired = $("desiredRollout");
  const spur = $("spur");
  const pinion = $("pinion");
  const car = $("car");

  if (tire) tire.addEventListener("input", () => {
    updateTireDualDisplay();
    markTireManualOverride();
    buildLocalTable();
    buildRecommendedTable();
  });

  if (desired) desired.addEventListener("input", () => {
    updateDesiredDualDisplay();
    buildRecommendedTable();
  });

  if (spur) spur.addEventListener("input", () => {
    currentSpur = parseInt(spur.value, 10) || currentSpur;
    buildLocalTable();
    buildRecommendedTable();
  });

  if (pinion) pinion.addEventListener("input", () => {
    currentPinion = parseInt(pinion.value, 10) || currentPinion;
    buildLocalTable();
    buildRecommendedTable();
  });

  if (car) car.addEventListener("change", () => {
    updateTeethRangeDisplay();
    buildLocalTable();
    buildRecommendedTable();
  });
}

async function initApp() {
  setupCollapsibleCards();
  setupKeyboardNavigation();
  setupCalculatorInputs();

  await ensureTireDataLoaded();
  buildCalcRacerSelect();
  buildCalcTireSetSelect();

  $("calcTireSetSelect")?.addEventListener("change", applySelectedTireToCalculator);
  $("calcTireSideSelect")?.addEventListener("change", applySelectedTireToCalculator);
  $("centerBtn")?.addEventListener("click", centerOnCurrentGearing);

  updateTireDualDisplay();
  updateDesiredDualDisplay();
  updateTeethRangeDisplay();
  buildLocalTable();
  buildRecommendedTable();
}

document.addEventListener("DOMContentLoaded", initApp);
