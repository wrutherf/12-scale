// =========================
// ROLLOUT CALCULATOR LOGIC
// =========================

// --- Constants / defaults ---
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

// --- Helpers ---
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
  // simple example ranges; adjust as needed
  if (car === "a12x") {
    return { min: 100, max: 150 };
  }
  return { min: 90, max: 140 };
}

function totalTeeth(spur, pinion) {
  return spur + pinion;
}

// --- DOM helpers ---
function $(id) {
  return document.getElementById(id);
}

// --- Inputs / state sync ---
function readInputs() {
  const spur = parseInt($("spur").value, 10) || DEFAULT_SPUR;
  const pinion = parseInt($("pinion").value, 10) || DEFAULT_PINION;
  const tire = parseFloat($("tire").value) || 40.0;
  const car = $("car").value || "a12";
  const desired = parseFloat($("desiredRollout").value) || null;
  return { spur, pinion, tire, car, desired };
}

function updateTeethRangeDisplay() {
  const { car } = readInputs();
  const range = getCarTeethRange(car);
  const el = $("teethRange");
  if (el) {
    el.textContent = `${range.min}–${range.max} total teeth`;
  }
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

// --- Local gearing map ---
function buildLocalTable() {
  const headRow = $("localHeadRow");
  const body = $("localBody");
  if (!headRow || !body) return;

  const { tire, car, desired } = readInputs();
  const range = getCarTeethRange(car);

  headRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.className = "sticky-corner";
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
      if (legal) td.classList.add("legal-gear");
      else td.classList.add("illegal-gear");

      if (s === currentSpur && p === currentPinion) {
        td.classList.add("current-gear");
      }
      if (s === cursorSpur && p === cursorPinion) {
        td.classList.add("cursor-cell");
      }

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

  Array.from(headRow.children).forEach(th => {
    th.classList.remove("header-highlight");
  });
  Array.from(body.rows).forEach(row => {
    row.cells[0].classList.remove("header-highlight");
  });

  const spurIndex = cursorSpur - MIN_SPUR + 1;
  const pinionIndex = cursorPinion - MIN_PINION + 1;

  if (headRow.children[pinionIndex]) {
    headRow.children[pinionIndex].classList.add("header-highlight");
  }
  if (body.rows[cursorSpur - MIN_SPUR]) {
    body.rows[cursorSpur - MIN_SPUR].cells[0].classList.add("header-highlight");
  }
}

function centerOnCurrentGearing() {
  cursorSpur = currentSpur;
  cursorPinion = currentPinion;
  buildLocalTable();
}

// --- Keyboard navigation ---
function setupKeyboardNavigation() {
  document.addEventListener("keydown", e => {
    const table = $("localTable");
    if (!table) return;

    let moved = false;
    if (e.key === "ArrowUp") {
      if (cursorSpur > MIN_SPUR) {
        cursorSpur--;
        moved = true;
      }
    } else if (e.key === "ArrowDown") {
      if (cursorSpur < MAX_SPUR) {
        cursorSpur++;
        moved = true;
      }
    } else if (e.key === "ArrowLeft") {
      if (cursorPinion > MIN_PINION) {
        cursorPinion--;
        moved = true;
      }
    } else if (e.key === "ArrowRight") {
      if (cursorPinion < MAX_PINION) {
        cursorPinion++;
        moved = true;
      }
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

// --- Recommended gearing ---
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
      if (desired != null && !isNaN(desired)) {
        const desiredIn = desired < 10 ? desired : desired; // already inches
        delta = rollout - desiredIn;
      }

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

// --- Inputs wiring ---
function setupInputs() {
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
      buildRecommendedTable();
    });
  }

  if (centerBtn) {
    centerBtn.addEventListener("click", () => {
      centerOnCurrentGearing();
    });
  }
}

// --- Collapsible cards (shared) ---
function setupCollapsibleCards() {
  document.querySelectorAll(".collapsible .card-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("collapsed");
    });
  });
}

// =========================
// HYBRID TIRE SYSTEM LOGIC
// =========================

const TIRE_LS_KEY = "tireDataHybrid";

const defaultTireData = {
  thresholds: {
    new_min: 40.5,
    cut_min: 40.0,
    old_min: 39.7
  },
  overrides: {},
  metadata: {}
};

const baseTireDiameters = [
  41.0, 40.95, 40.9, 40.85, 40.8, 40.75, 40.7,
  40.65, 40.6, 40.55, 40.5, 40.45, 40.4, 40.35,
  40.3, 40.25, 40.2, 40.15, 40.1, 40.05, 40.0,
  39.95, 39.9, 39.85, 39.8, 39.75, 39.7, 39.65,
  39.6
];

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

function mergeTireData(base, incoming) {
  const merged = structuredClone(base);

  if (incoming.thresholds) {
    merged.thresholds = structuredClone(incoming.thresholds);
  }

  if (incoming.overrides) {
    merged.overrides = {
      ...merged.overrides,
      ...incoming.overrides
    };
  }

  if (incoming.metadata) {
    merged.metadata = {
      ...merged.metadata,
      ...incoming.metadata
    };
  }

  return merged;
}

function getEffectiveTireData() {
  const ls = loadTireDataFromLocalStorage();
  return ls ? ls : structuredClone(defaultTireData);
}

function classifyTire(diameter, data) {
  const d = parseFloat(diameter.toFixed(2));
  const key = d.toFixed(2);

  if (data.overrides && data.overrides[key]) {
    return data.overrides[key];
  }

  const { new_min, cut_min, old_min } = data.thresholds;
  if (d >= new_min) return "NEW";
  if (d >= cut_min) return "CUT";
  if (d >= old_min) return "OLD";
  return "DO_NOT_USE";
}

function buildTireTable(data) {
  const tbody = document.querySelector("#tireTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  baseTireDiameters.forEach(mm => {
    const mmFixed = mm.toFixed(2);
    const inches = (mm / 25.4).toFixed(3);
    const status = classifyTire(mm, data);

    const tr = document.createElement("tr");
    tr.dataset.mm = mmFixed;
    tr.classList.add("tire-status-" + status);

    const tdMm = document.createElement("td");
    tdMm.textContent = mmFixed;

    const tdIn = document.createElement("td");
    tdIn.textContent = inches;

    const tdStatus = document.createElement("td");
    const select = document.createElement("select");
    select.className = "tire-status-select";

    const options = ["AUTO", "NEW", "CUT", "OLD", "DO_NOT_USE"];
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt === "DO_NOT_USE" ? "DO NOT USE" : opt;
      select.appendChild(o);
    });

    const key = mmFixed;
    select.value = data.overrides[key] || "AUTO";

    select.addEventListener("change", () => {
      const current = getEffectiveTireData();
      const val = select.value;

      if (val === "AUTO") {
        delete current.overrides[key];
      } else {
        current.overrides[key] = val;
      }

      saveTireDataToLocalStorage(current);
      buildTireTable(current);
      applyTireFilter();
    });

    tdStatus.appendChild(select);

    tr.appendChild(tdMm);
    tr.appendChild(tdIn);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

function applyTireFilter() {
  const filterInput = document.getElementById("tireFilter");
  const tbody = document.querySelector("#tireTable tbody");
  if (!filterInput || !tbody) return;

  const q = filterInput.value.trim().toLowerCase();
  Array.from(tbody.rows).forEach(row => {
    const mm = row.cells[0].textContent.toLowerCase();
    const inch = row.cells[1].textContent.toLowerCase();
    row.style.display = (!q || mm.includes(q) || inch.includes(q)) ? "" : "none";
  });
}

function setupTireFilter() {
  const filterInput = document.getElementById("tireFilter");
  if (!filterInput) return;
  filterInput.addEventListener("input", applyTireFilter);
}

function setupTireExportImport() {
  const exportBtn = document.getElementById("exportTireJson");
  const importInput = document.getElementById("importTireJson");
  const resetBtn = document.getElementById("resetTireOverrides");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const data = getEffectiveTireData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tireData.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", () => {
      const file = importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const incoming = JSON.parse(e.target.result);
          const current = getEffectiveTireData();
          const merged = mergeTireData(current, incoming);
          saveTireDataToLocalStorage(merged);
          buildTireTable(merged);
          applyTireFilter();
        } catch {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Reset all tire overrides to defaults?")) return;
      localStorage.removeItem(TIRE_LS_KEY);
      const data = structuredClone(defaultTireData);
      saveTireDataToLocalStorage(data);
      buildTireTable(data);
      applyTireFilter();
    });
  }
}

// =========================
// PAGE INITIALIZATION
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  setupCollapsibleCards();

  // If main calculator elements exist, init calculator
  if ($("localTable") && $("recommended")) {
    setupInputs();
    updateTeethRangeDisplay();
    updateTireConvertedDisplay();
    buildLocalTable();
    buildRecommendedTable();
    setupKeyboardNavigation();
  }

  // If tire table exists, init tire system
  const tireTable = document.getElementById("tireTable");
  if (tireTable) {
    let data = loadTireDataFromLocalStorage();
    if (!data) {
      const jsonData = await loadTireDataJson();
      data = jsonData || structuredClone(defaultTireData);
      saveTireDataToLocalStorage(data);
    }

    buildTireTable(data);
    setupTireFilter();
    setupTireExportImport();
    applyTireFilter();
  }
});
