/******************************************************
 *  ROLLOUT CALCULATOR — FULL ENHANCED VERSION
 *  Part 2 — Core Helpers + Dual‑Unit Engine
 ******************************************************/

// =========================
// BASIC DOM HELPERS
// =========================

function $(id) {
  return document.getElementById(id);
}

function text(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function html(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

// =========================
// UNIT CONVERSION
// =========================

function mmToIn(mm) {
  return mm / 25.4;
}

function inToMm(inches) {
  return inches * 25.4;
}

// =========================
// DUAL‑UNIT FORMATTER (A1 + S1)
// =========================
//
// Returns HTML with stacked units:
//   3.639 in
//   92.41 mm   (subtle secondary text)
//

function formatDualUnits(inches) {
  if (inches == null || isNaN(inches)) return "";

  const mm = inToMm(inches);

  return `
    <div class="dual-unit-cell">
      <div class="primary-unit">${inches.toFixed(3)} in</div>
      <div class="secondary-unit">${mm.toFixed(2)} mm</div>
    </div>
  `;
}

// =========================
// ROLLOUT MATH
// =========================

function computeRollout(spur, pinion, tireMm) {
  if (!spur || !pinion || !tireMm) return null;

  const ratio = spur / pinion;
  const circumferenceIn = mmToIn(tireMm) * Math.PI;

  return circumferenceIn / ratio;
}

function totalTeeth(spur, pinion) {
  return spur + pinion;
}

function getCarTeethRange(car) {
  if (car === "a12x") return { min: 100, max: 150 };
  return { min: 90, max: 140 };
}

// =========================
// DUAL‑UNIT INPUT INTERPRETATION
// =========================
//
// Rule:
//   < 10  → inches
//   ≥ 10 → mm
//

function interpretDualUnitInput(rawValue) {
  const v = parseFloat(rawValue);
  if (isNaN(v)) return { inches: null, mm: null, mode: null };

  if (v < 10) {
    // User entered inches
    return {
      inches: v,
      mm: inToMm(v),
      mode: "in"
    };
  }

  // User entered mm
  return {
    inches: mmToIn(v),
    mm: v,
    mode: "mm"
  };
}

// =========================
// TIRE DIAMETER INPUT HANDLING
// =========================

function updateTireDualDisplay() {
  const raw = $("tire")?.value;
  const outPrimary = $("tirePrimary");
  const outSecondary = $("tireSecondary");

  if (!raw || !outPrimary || !outSecondary) return;

  const { inches, mm, mode } = interpretDualUnitInput(raw);

  if (inches == null) {
    outPrimary.textContent = "";
    outSecondary.textContent = "";
    return;
  }

  // Primary = inches
  outPrimary.textContent = `${inches.toFixed(3)} in`;

  // Secondary = mm (subtle)
  outSecondary.textContent = `${mm.toFixed(2)} mm`;
}

function markTireManualOverride() {
  const indicator = $("tireManualIndicator");
  if (!indicator) return;

  const raw = $("tire")?.value;
  if (!raw || isNaN(parseFloat(raw))) {
    indicator.textContent = "";
    return;
  }

  indicator.textContent = "Manual override";
}

// =========================
// DESIRED ROLLOUT INPUT HANDLING
// =========================

function updateDesiredDualDisplay() {
  const raw = $("desiredRollout")?.value;
  const primary = $("desiredPrimary");
  const secondary = $("desiredSecondary");

  if (!raw || !primary || !secondary) return;

  const { inches, mm, mode } = interpretDualUnitInput(raw);

  if (inches == null) {
    primary.textContent = "";
    secondary.textContent = "";
    return;
  }

  // Primary = inches
  primary.textContent = `${inches.toFixed(3)} in`;

  // Secondary = mm
  secondary.textContent = `${mm.toFixed(2)} mm`;
}

// =========================
// READ ALL CALCULATOR INPUTS
// =========================

function readInputs() {
  const spur = parseInt($("spur")?.value, 10) || 66;
  const pinion = parseInt($("pinion")?.value, 10) || 50;

  const tireRaw = $("tire")?.value;
  const desiredRaw = $("desiredRollout")?.value;

  const tireParsed = interpretDualUnitInput(tireRaw);
  const desiredParsed = interpretDualUnitInput(desiredRaw);

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

// =========================
// TEETH RANGE DISPLAY
// =========================

function updateTeethRangeDisplay() {
  const { car } = readInputs();
  const range = getCarTeethRange(car);
  text("teethRange", `${range.min}–${range.max} total teeth`);
}

// =========================
// INPUT BINDINGS
// =========================

function setupCalculatorInputs() {
  const tire = $("tire");
  const desired = $("desiredRollout");
  const spur = $("spur");
  const pinion = $("pinion");
  const car = $("car");

  if (tire) {
    tire.addEventListener("input", () => {
      updateTireDualDisplay();
      markTireManualOverride();
      buildLocalTable();
      buildRecommendedTable();
    });
  }

  if (desired) {
    desired.addEventListener("input", () => {
      updateDesiredDualDisplay();
      buildRecommendedTable();
    });
  }

  if (spur) {
    spur.addEventListener("input", () => {
      buildLocalTable();
      buildRecommendedTable();
    });
  }

  if (pinion) {
    pinion.addEventListener("input", () => {
      buildLocalTable();
      buildRecommendedTable();
    });
  }

  if (car) {
    car.addEventListener("change", () => {
      updateTeethRangeDisplay();
      buildLocalTable();
      buildRecommendedTable();
    });
  }
}
/******************************************************
 *  PART 3 — LOCAL GEARING MAP + NAVIGATION
 ******************************************************/

// Range constants
const MIN_SPUR = 60;
const MAX_SPUR = 80;
const MIN_PINION = 40;
const MAX_PINION = 60;

// Track current + cursor positions
let currentSpur = 66;
let currentPinion = 50;
let cursorSpur = 66;
let cursorPinion = 50;

// =========================
// BUILD LOCAL GEARING TABLE
// =========================

function buildLocalTable() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  const { tireMm, car } = readInputs();
  const range = getCarTeethRange(car);

  // ----- Build header row -----
  headRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.textContent = "Spur ↓ / Pinion →";
  headRow.appendChild(corner);

  for (let p = MIN_PINION; p <= MAX_PINION; p++) {
    const th = document.createElement("th");
    th.textContent = p;
    headRow.appendChild(th);
  }

  // ----- Build body rows -----
  body.innerHTML = "";

  for (let s = MIN_SPUR; s <= MAX_SPUR; s++) {
    const tr = document.createElement("tr");

    // Spur label
    const spurCell = document.createElement("td");
    spurCell.textContent = s;
    tr.appendChild(spurCell);

    // Pinion columns
    for (let p = MIN_PINION; p <= MAX_PINION; p++) {
      const td = document.createElement("td");

      const total = totalTeeth(s, p);
      const legal = total >= range.min && total <= range.max;

      const rolloutIn = computeRollout(s, p, tireMm);

      if (rolloutIn != null) {
        td.innerHTML = formatDualUnits(rolloutIn);
      } else {
        td.textContent = "";
      }

      // Legal / illegal coloring
      td.classList.add(legal ? "legal-gear" : "illegal-gear");

      // Current gear highlight
      if (s === currentSpur && p === currentPinion) {
        td.classList.add("current-gear");
      }

      // Cursor highlight
      if (s === cursorSpur && p === cursorPinion) {
        td.classList.add("cursor-cell");
      }

      // Store coordinates
      td.dataset.spur = s;
      td.dataset.pinion = p;

      // Click → move cursor + set current
      td.addEventListener("click", () => {
        cursorSpur = s;
        cursorPinion = p;
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

  highlightHeaders();
}

// =========================
// HEADER HIGHLIGHTING
// =========================

function highlightHeaders() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  // Clear old highlights
  Array.from(headRow.children).forEach(th =>
    th.classList.remove("header-highlight")
  );
  Array.from(body.rows).forEach(row =>
    row.cells[0].classList.remove("header-highlight")
  );

  // Compute indices
  const spurIndex = cursorSpur - MIN_SPUR + 1;
  const pinionIndex = cursorPinion - MIN_PINION + 1;

  // Highlight pinion column header
  if (headRow.children[pinionIndex]) {
    headRow.children[pinionIndex].classList.add("header-highlight");
  }

  // Highlight spur row header
  const row = body.rows[cursorSpur - MIN_SPUR];
  if (row) row.cells[0].classList.add("header-highlight");
}

// =========================
// KEYBOARD NAVIGATION
// =========================
//
// Arrow keys move the cursor.
// Enter sets current gearing.
//

function setupKeyboardNavigation() {
  document.addEventListener("keydown", e => {
    let moved = false;

    if (e.key === "ArrowUp" && cursorSpur > MIN_SPUR) {
      cursorSpur--;
      moved = true;
    } else if (e.key === "ArrowDown" && cursorSpur < MAX_SPUR) {
      cursorSpur++;
      moved = true;
    } else if (e.key === "ArrowLeft" && cursorPinion > MIN_PINION) {
      cursorPinion--;
      moved = true;
    } else if (e.key === "ArrowRight" && cursorPinion < MAX_PINION) {
      cursorPinion++;
      moved = true;
    } else if (e.key === "Enter") {
      currentSpur = cursorSpur;
      currentPinion = cursorPinion;

      $("spur").value = currentSpur;
      $("pinion").value = currentPinion;

      buildLocalTable();
      buildRecommendedTable();
      return;
    }

    if (moved) {
      e.preventDefault();
      buildLocalTable();
    }
  });
}

// =========================
// CENTER ON CURRENT GEARING
// =========================

function centerOnCurrentGearing() {
  cursorSpur = currentSpur;
  cursorPinion = currentPinion;
  buildLocalTable();
}
/******************************************************
 *  PART 4 — RECOMMENDED GEARING ENGINE
 ******************************************************/

function buildRecommendedTable() {
  const table = $("recommended");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  const { tireMm, car, desiredIn } = readInputs();
  const range = getCarTeethRange(car);

  const rows = [];

  // --------------------------------------------------
  // Generate all legal gear combinations
  // --------------------------------------------------
  for (let s = MIN_SPUR; s <= MAX_SPUR; s++) {
    for (let p = MIN_PINION; p <= MAX_PINION; p++) {
      const total = totalTeeth(s, p);
      const legal = total >= range.min && total <= range.max;
      if (!legal) continue;

      const rolloutIn = computeRollout(s, p, tireMm);
      if (rolloutIn == null) continue;

      let delta = null;
      if (desiredIn != null && !isNaN(desiredIn)) {
        delta = rolloutIn - desiredIn;
      }

      rows.push({
        spur: s,
        pinion: p,
        total,
        rolloutIn,
        delta
      });
    }
  }

  // --------------------------------------------------
  // Sort by closeness to desired rollout
  // --------------------------------------------------
  rows.sort((a, b) => {
    if (a.delta == null && b.delta == null) return 0;
    if (a.delta == null) return 1;
    if (b.delta == null) return -1;
    return Math.abs(a.delta) - Math.abs(b.delta);
  });

  // --------------------------------------------------
  // Render rows
  // --------------------------------------------------
  rows.forEach((r, index) => {
    const tr = document.createElement("tr");

    // Spur
    const tdSpur = document.createElement("td");
    tdSpur.textContent = r.spur;

    // Pinion
    const tdPinion = document.createElement("td");
    tdPinion.textContent = r.pinion;

    // Total teeth
    const tdTotal = document.createElement("td");
    tdTotal.textContent = r.total;

    // Rollout (dual‑unit stacked)
    const tdRollout = document.createElement("td");
    tdRollout.innerHTML = formatDualUnits(r.rolloutIn);

    // Delta (inches only — industry standard)
    const tdDelta = document.createElement("td");
    if (r.delta == null) {
      tdDelta.textContent = "";
    } else {
      const sign = r.delta >= 0 ? "+" : "";
      tdDelta.textContent = `${sign}${r.delta.toFixed(3)}`;
    }

    tr.appendChild(tdSpur);
    tr.appendChild(tdPinion);
    tr.appendChild(tdTotal);
    tr.appendChild(tdRollout);
    tr.appendChild(tdDelta);

    // --------------------------------------------------
    // Highlight the best recommendation (closest to desired)
    // --------------------------------------------------
    if (index === 0 && r.delta != null) {
      tr.classList.add("best-recommendation");
    }

    // --------------------------------------------------
    // Click → apply gearing to calculator
    // --------------------------------------------------
    tr.addEventListener("click", () => {
      currentSpur = r.spur;
      currentPinion = r.pinion;
      cursorSpur = r.spur;
      cursorPinion = r.pinion;

      $("spur").value = r.spur;
      $("pinion").value = r.pinion;

      buildLocalTable();
      buildRecommendedTable();
    });

    tbody.appendChild(tr);
  });
}
/******************************************************
 *  PART 5 — GLOBAL TIRE SET SYSTEM + INIT
 ******************************************************/

// =========================
// GLOBAL TIRE DATA MODEL
// =========================

const TIRE_LS_KEY = "tireSetSystemData";

const defaultTireData = {
  thresholds: {
    new_min: 40.5,
    cut_min: 40.0,
    old_min: 39.7
  },
  racers: {
    William: {},
    John: {}
  },
  tire_sets: {
    "12": {
      identifier: "12",
      LH: {
        measured: 40.85,
        status: "CUT",
        wear: 78,
        uses: 2,
        last_used: "2026-03-28"
      },
      RH: {
        measured: 40.80,
        status: "CUT",
        wear: 85,
        uses: 1,
        last_used: "2026-03-28"
      },
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

// =========================
// STORAGE HELPERS
// =========================

function loadTireDataFromLocalStorage() {
  const raw = localStorage.getItem(TIRE_LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveTireDataToLocalStorage(data) {
  localStorage.setItem(TIRE_LS_KEY, JSON.stringify(data));
}

async function loadTireDataJson() {
  try {
    const res = await fetch("tireData.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("no tireData.json");
    return await res.json();
  } catch {
    return null;
  }
}

async function ensureTireDataLoaded() {
  if (tireData) return tireData;

  const fromLS = loadTireDataFromLocalStorage();
  if (fromLS) {
    tireData = fromLS;
  } else {
    const fromJson = await loadTireDataJson();
    tireData = fromJson || structuredClone(defaultTireData);
    saveTireDataToLocalStorage(tireData);
  }

  if (!tireData.racers) tireData.racers = {};
  if (!tireData.tire_sets) tireData.tire_sets = {};
  if (!tireData.history) tireData.history = [];

  return tireData;
}

// =========================
// RACER + TIRE SET SELECTS
// =========================

function buildCalcRacerSelect() {
  const sel = $("calcRacerSelect");
  if (!sel || !tireData) return;

  sel.innerHTML = "";
  const names = Object.keys(tireData.racers || {}).sort();

  names.forEach(name => {
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
  const sets = tireData.tire_sets || {};
  const ids = Object.keys(sets).sort();

  ids.forEach(id => {
    const set = sets[id];
    const opt = document.createElement("option");
    opt.value = id;

    const lh = set.LH || {};
    const rh = set.RH || {};
    const usedBy = (set.usedByRacers || []).join(", ");

    opt.textContent =
      `${set.identifier || id} ` +
      `(LH: ${lh.measured ?? "?"} / RH: ${rh.measured ?? "?"})` +
      (usedBy ? ` — Used by: ${usedBy}` : "");

    sel.appendChild(opt);
  });
}

// =========================
// APPLY SELECTED TIRE TO CALCULATOR
// =========================

function applySelectedTireToCalculator() {
  if (!tireData) return;

  const setId = $("calcTireSetSelect")?.value;
  const side = $("calcTireSideSelect")?.value || "LH";
  if (!setId || !tireData.tire_sets[setId]) return;

  const set = tireData.tire_sets[setId];
  const sideData = set[side] || {};
  if (!sideData.measured) return;

  const tireInput = $("tire");
  if (!tireInput) return;

  tireInput.value = sideData.measured;
  updateTireDualDisplay();
  markTireManualOverride();
  buildLocalTable();
  buildRecommendedTable();
}

// =========================
// COLLAPSIBLE CARDS
// =========================

function setupCollapsibleCards() {
  document.querySelectorAll(".collapsible .card-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("collapsed");
    });
  });
}

// =========================
// INIT
// =========================

async function initApp() {
  setupCollapsibleCards();
  setupKeyboardNavigation();
  setupCalculatorInputs();

  await ensureTireDataLoaded();
  buildCalcRacerSelect();
  buildCalcTireSetSelect();

  const tireSetSel = $("calcTireSetSelect");
  const tireSideSel = $("calcTireSideSelect");
  const centerBtn = $("centerBtn");

  if (tireSetSel) {
    tireSetSel.addEventListener("change", applySelectedTireToCalculator);
  }
  if (tireSideSel) {
    tireSideSel.addEventListener("change", applySelectedTireToCalculator);
  }
  if (centerBtn) {
    centerBtn.addEventListener("click", centerOnCurrentGearing);
  }

  updateTireDualDisplay();
  updateDesiredDualDisplay();
  updateTeethRangeDisplay();
  buildLocalTable();
  buildRecommendedTable();
}

document.addEventListener("DOMContentLoaded", initApp);
