// =========================
// SHARED HELPERS
// =========================

function $(id) {
  return document.getElementById(id);
}

function setupCollapsibleCards() {
  document.querySelectorAll(".collapsible .card-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("collapsed");
    });
  });
}

// =========================
// ROLLOUT CALCULATOR
// =========================

const DEFAULT_SPUR = 66;
const DEFAULT_PINION = 50;
const MIN_SPUR = 60;
const MAX_SPUR = 80;
const MIN_PINION = 40;
const MAX_PINION = 60;

let currentSpur = DEFAULT_SPUR;
let currentPinion = DEFAULT_PINION;
let cursorSpur = DEFAULT_SPUR;
let cursorPinion = DEFAULT_PINION;

function mmToInches(mm) {
  return mm / 25.4;
}

function computeRollout(spur, pinion, tireMm) {
  if (!spur || !pinion || !tireMm) return null;
  const ratio = spur / pinion;
  const circumferenceIn = mmToInches(tireMm) * Math.PI;
  return circumferenceIn / ratio;
}

function formatRollout(value) {
  if (value == null || isNaN(value)) return "";
  return value.toFixed(3);
}

function getCarTeethRange(car) {
  if (car === "a12x") return { min: 100, max: 150 };
  return { min: 90, max: 140 };
}

function totalTeeth(spur, pinion) {
  return spur + pinion;
}

// =========================
// DESIRED ROLLOUT (DUAL UNIT)
// =========================

function interpretDesiredRollout() {
  const raw = parseFloat($("desiredRollout").value);
  const label = $("desiredRolloutUnits");

  if (isNaN(raw)) {
    label.textContent = "";
    return null;
  }

  // <10 → inches
  if (raw < 10) {
    label.textContent = `Interpreted as: ${raw.toFixed(3)} in`;
    return raw;
  }

  // ≥10 → mm
  const inches = raw / 25.4;
  label.textContent = `Interpreted as: ${raw.toFixed(2)} mm → ${inches.toFixed(3)} in`;
  return inches;
}

function readInputs() {
  const spur = parseInt($("spur")?.value, 10) || DEFAULT_SPUR;
  const pinion = parseInt($("pinion")?.value, 10) || DEFAULT_PINION;
  const tire = parseFloat($("tire")?.value) || 40.0;
  const car = $("car")?.value || "a12x";

  const desiredInches = interpretDesiredRollout();

  return { spur, pinion, tire, car, desired: desiredInches };
}

function updateTeethRangeDisplay() {
  const { car } = readInputs();
  const range = getCarTeethRange(car);
  const el = $("teethRange");
  if (el) el.textContent = `${range.min}–${range.max} total teeth`;
}

function updateTireConvertedDisplay() {
  const tireInput = $("tire");
  const out = $("tireConverted");
  if (!tireInput || !out) return;
  const mm = parseFloat(tireInput.value);
  if (!mm || isNaN(mm)) {
    out.textContent = "";
    return;
  }
  const inches = mmToInches(mm);
  out.textContent = `${inches.toFixed(3)} in`;
}

// =========================
// LOCAL GEARING MAP
// =========================

function buildLocalTable() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  const { tire, car } = readInputs();
  const range = getCarTeethRange(car);

  headRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.textContent = "Spur ↓ / Pinion →";
  headRow.appendChild(corner);

  for (let p = MIN_PINION; p <= MAX_PINION; p++) {
    const th = document.createElement("th");
    th.textContent = p;
    headRow.appendChild(th);
  }

  body.innerHTML = "";

  for (let s = MIN_SPUR; s <= MAX_SPUR; s++) {
    const tr = document.createElement("tr");

    const spurCell = document.createElement("td");
    spurCell.textContent = s;
    tr.appendChild(spurCell);

    for (let p = MIN_PINION; p <= MAX_PINION; p++) {
      const td = document.createElement("td");
      const total = totalTeeth(s, p);
      const rollout = computeRollout(s, p, tire);
      td.textContent = rollout ? formatRollout(rollout) : "";

      const legal = total >= range.min && total <= range.max;
      td.classList.add(legal ? "legal-gear" : "illegal-gear");

      if (s === currentSpur && p === currentPinion) td.classList.add("current-gear");
      if (s === cursorSpur && p === cursorPinion) td.classList.add("cursor-cell");

      td.dataset.spur = s;
      td.dataset.pinion = p;

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

function highlightHeaders() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  Array.from(headRow.children).forEach(th => th.classList.remove("header-highlight"));
  Array.from(body.rows).forEach(row => row.cells[0].classList.remove("header-highlight"));

  const spurIndex = cursorSpur - MIN_SPUR + 1;
  const pinionIndex = cursorPinion - MIN_PINION + 1;

  if (headRow.children[pinionIndex]) headRow.children[pinionIndex].classList.add("header-highlight");
  if (body.rows[cursorSpur - MIN_SPUR]) body.rows[cursorSpur - MIN_SPUR].cells[0].classList.add("header-highlight");
}

function centerOnCurrentGearing() {
  cursorSpur = currentSpur;
  cursorPinion = currentPinion;
  buildLocalTable();
}

function setupKeyboardNavigation() {
  document.addEventListener("keydown", e => {
    const table = $("localTable");
    if (!table) return;

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
// RECOMMENDED GEARING PANEL
// =========================

function buildRecommendedTable() {
  const table = $("recommended");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  const { tire, car, desired } = readInputs();
  const range = getCarTeethRange(car);

  const rows = [];
  for (let s = MIN_SPUR; s <= MAX_SPUR; s++) {
    for (let p = MIN_PINION; p <= MAX_PINION; p++) {
      const total = totalTeeth(s, p);
      const legal = total >= range.min && total <= range.max;
      if (!legal) continue;
      const rollout = computeRollout(s, p, tire);
      if (!rollout) continue;

      let delta = null;
      if (desired != null && !isNaN(desired)) delta = rollout - desired;

      rows.push({ spur: s, pinion: p, total, rollout, delta });
    }
  }

  rows.sort((a, b) => {
    if (a.delta == null && b.delta == null) return 0;
    if (a.delta == null) return 1;
    if (b.delta == null) return -1;
    return Math.abs(a.delta) - Math.abs(b.delta);
  });

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const tdSpur = document.createElement("td");
    tdSpur.textContent = r.spur;

    const tdPinion = document.createElement("td");
    tdPinion.textContent = r.pinion;

    const tdTotal = document.createElement("td");
    tdTotal.textContent = r.total;

    const tdRollout = document.createElement("td");
    tdRollout.textContent = formatRollout(r.rollout);

    const tdDelta = document.createElement("td");
    tdDelta.textContent =
      r.delta == null ? "" : (r.delta >= 0 ? "+" : "") + r.delta.toFixed(3);

    tr.appendChild(tdSpur);
    tr.appendChild(tdPinion);
    tr.appendChild(tdTotal);
    tr.appendChild(tdRollout);
    tr.appendChild(tdDelta);

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

// =========================
// CALCULATOR INPUT BINDINGS
// =========================

function setupCalculatorInputs() {
  const spur = $("spur");
  const pinion = $("pinion");
  const tire = $("tire");
  const car = $("car");
  const desired = $("desiredRollout");
  const centerBtn = $("centerBtn");

  if (spur) {
    spur.value = DEFAULT_SPUR;
    spur.addEventListener("input", () => {
      currentSpur = parseInt(spur.value, 10) || DEFAULT_SPUR;
      cursorSpur = currentSpur;
      buildLocalTable();
      buildRecommendedTable();
    });
  }

  if (pinion) {
    pinion.value = DEFAULT_PINION;
    pinion.addEventListener("input", () => {
      currentPinion = parseInt(pinion.value, 10) || DEFAULT_PINION;
      cursorPinion = currentPinion;
      buildLocalTable();
      buildRecommendedTable();
    });
  }

  if (tire) {
    tire.addEventListener("input", () => {
      updateTireConvertedDisplay();
      markTireManualOverride();
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

  if (desired) {
    desired.addEventListener("input", () => {
      interpretDesiredRollout();
      buildRecommendedTable();
    });
  }

  if (centerBtn) {
    centerBtn.addEventListener("click", () => {
      centerOnCurrentGearing();
    });
  }
}

// =========================
// GLOBAL TIRE SET SYSTEM
// =========================

const TIRE_LS_KEY = "tireSetSystemData";

const defaultTireData = {
  thresholds: {
    new_min: 40.5,
    cut_min: 40.0,
    old_min: 39.7
  },
  overrides: {},
  metadata: {},
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
        measured: 40.8,
        status: "CUT",
        wear: 85,
        uses: 1,
        last_used: "2026-03-28"
      },
      rotation_history: [],
      notes: "Batch B12, CRC"
    }
  },
  history: []
};

let tireData = null;

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
    if (!res.ok) throw new Error("No tireData.json");
    return await res.json();
  } catch {
    return null;
  }
}

async function ensureTireDataLoaded() {
  if (tireData) return tireData;
  const ls = loadTireDataFromLocalStorage();
  if (ls) {
    tireData = ls;
  } else {
    const json = await loadTireDataJson();
    tireData = json || structuredClone(defaultTireData);
    saveTireDataToLocalStorage(tireData);
  }
  if (!tireData.racers) tireData.racers = {};
  if (!tireData.tire_sets) tireData.tire_sets = {};
  if (!tireData.history) tireData.history = [];
  return tireData;
}

function mergeTireData(base, incoming) {
  const merged = structuredClone(base);

  if (incoming.thresholds) merged.thresholds = structuredClone(incoming.thresholds);
  if (incoming.overrides) merged.overrides = { ...merged.overrides, ...incoming.overrides };
  if (incoming.metadata) merged.metadata = { ...merged.metadata, ...incoming.metadata };
  if (incoming.racers) merged.racers = { ...merged.racers, ...incoming.racers };
  if (incoming.tire_sets) merged.tire_sets = { ...merged.tire_sets, ...incoming.tire_sets };
  if (incoming.history) merged.history = [...merged.history, ...incoming.history];

  return merged;
}

function getWearLoss(status, grip) {
  let base = 0;
  switch (status) {
    case "NEW": base = 2; break;
    case "CUT": base = 4; break;
    case "OLD": base = 6; break;
    case "DO_NOT_USE": base = 10; break;
    default: base = 3; break;
  }
  let mult = 1.0;
  if (grip === "MEDIUM") mult = 1.3;
  else if (grip === "HIGH") mult = 1.6;
  return base * mult;
}

function ensureRacerExists(name) {
  if (!tireData.racers[name]) tireData.racers[name] = {};
}

// =========================
// RACER SELECTS (GLOBAL)
// =========================

function buildRacerSelects() {
  const historyRacerFilter = $("historyRacerFilter");
  const logRacer = $("logRacer");
  const calcRacerSelect = $("calcRacerSelect");
  const tireSetRacerFilter = $("tireSetRacerFilter");

  const racerNames = Object.keys(tireData.racers || {}).sort();

  if (historyRacerFilter) {
    historyRacerFilter.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "ALL";
    allOpt.textContent = "All";
    historyRacerFilter.appendChild(allOpt);
    racerNames.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      historyRacerFilter.appendChild(opt);
    });
  }

  if (logRacer) {
    logRacer.innerHTML = "";
    racerNames.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      logRacer.appendChild(opt);
    });
  }

  if (calcRacerSelect) {
    calcRacerSelect.innerHTML = "";
    racerNames.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      calcRacerSelect.appendChild(opt);
    });
  }

  if (tireSetRacerFilter) {
    tireSetRacerFilter.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "ALL";
    allOpt.textContent = "All";
    tireSetRacerFilter.appendChild(allOpt);
    racerNames.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      tireSetRacerFilter.appendChild(opt);
    });
  }
}

// =========================
// TIRE SET TABLE (GLOBAL)
// =========================

function buildTireSetTable() {
  const tbody = document.querySelector("#tireSetTable tbody");
  if (!tbody
