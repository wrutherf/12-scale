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
// ROLLOUT CALCULATOR LOGIC
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
  if (car === "a12x") {
    return { min: 100, max: 150 };
  }
  return { min: 90, max: 140 };
}

function totalTeeth(spur, pinion) {
  return spur + pinion;
}

function readInputs() {
  const spur = parseInt($("spur")?.value, 10) || DEFAULT_SPUR;
  const pinion = parseInt($("pinion")?.value, 10) || DEFAULT_PINION;
  const tire = parseFloat($("tire")?.value) || 40.0;
  const car = $("car")?.value || "a12x";
  const desired = parseFloat($("desiredRollout")?.value);
  return { spur, pinion, tire, car, desired: isNaN(desired) ? null : desired };
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

  Array.from(headRow.children).forEach(th => th.classList.remove("header-highlight"));
  Array.from(body.rows).forEach(row => row.cells[0].classList.remove("header-highlight"));

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
        delta = rollout - desired;
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
// TIRE SET SYSTEM
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
    William: {
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
      }
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
  return tireData;
}

function mergeTireData(base, incoming) {
  const merged = structuredClone(base);

  if (incoming.thresholds) merged.thresholds = structuredClone(incoming.thresholds);
  if (incoming.overrides) {
    merged.overrides = { ...merged.overrides, ...incoming.overrides };
  }
  if (incoming.metadata) {
    merged.metadata = { ...merged.metadata, ...incoming.metadata };
  }
  if (incoming.racers) {
    merged.racers = { ...merged.racers, ...incoming.racers };
  }
  if (incoming.history) {
    merged.history = [...merged.history, ...incoming.history];
  }

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
  if (!tireData.racers[name]) {
    tireData.racers[name] = { tire_sets: {} };
  }
}

function buildRacerSelects() {
  const racerSelect = $("racerSelect");
  const historyRacerFilter = $("historyRacerFilter");
  const logRacer = $("logRacer");
  const calcRacerSelect = $("calcRacerSelect");

  const racerNames = Object.keys(tireData.racers || {}).sort();

  if (racerSelect) {
    racerSelect.innerHTML = "";
    racerNames.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      racerSelect.appendChild(opt);
    });
  }

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
}

function getSelectedRacerForTirePage() {
  const sel = $("racerSelect");
  if (!sel) return null;
  const name = sel.value;
  if (!name || !tireData.racers[name]) return null;
  return name;
}

function buildTireSetTable() {
  const tbody = document.querySelector("#tireSetTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const racerName = getSelectedRacerForTirePage();
  if (!racerName) return;

  const racer = tireData.racers[racerName];
  const sets = racer.tire_sets || {};
  const setIds = Object.keys(sets).sort();

  setIds.forEach(setId => {
    const set = sets[setId];

    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = set.identifier || setId;

    const tdLh = document.createElement("td");
    const lh = set.LH || {};
    tdLh.textContent = `${(lh.measured ?? "").toString()} / ${(lh.status || "")} / ${(lh.wear ?? "").toString()}`;

    const tdRh = document.createElement("td");
    const rh = set.RH || {};
    tdRh.textContent = `${(rh.measured ?? "").toString()} / ${(rh.status || "")} / ${(rh.wear ?? "").toString()}`;

    const tdUses = document.createElement("td");
    const totalUses = (lh.uses || 0) + (rh.uses || 0);
    tdUses.textContent = totalUses;

    const tdLast = document.createElement("td");
    const lastDates = [lh.last_used, rh.last_used].filter(Boolean).sort();
    tdLast.textContent = lastDates.length ? lastDates[lastDates.length - 1] : "";

    const tdLog = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Log Run";
    btn.addEventListener("click", () => openLogRunModal(racerName, setId));
    tdLog.appendChild(btn);

    tr.addEventListener("click", e => {
      if (e.target === btn) return;
      openLogRunModal(racerName, setId);
    });

    tr.appendChild(tdId);
    tr.appendChild(tdLh);
    tr.appendChild(tdRh);
    tr.appendChild(tdUses);
    tr.appendChild(tdLast);
    tr.appendChild(tdLog);

    tbody.appendChild(tr);
  });

  buildLogSetSelect(racerName);
  buildCalcTireSetSelect();
}

function buildLogSetSelect(racerName) {
  const logSetId = $("logSetId");
  if (!logSetId) return;
  logSetId.innerHTML = "";

  if (!racerName || !tireData.racers[racerName]) return;

  const sets = tireData.racers[racerName].tire_sets || {};
  const setIds = Object.keys(sets).sort();

  setIds.forEach(id => {
    const set = sets[id];
    const opt = document.createElement("option");
    opt.value = id;
    const lh = set.LH || {};
    const rh = set.RH || {};
    opt.textContent = `${set.identifier || id} (LH: ${lh.measured ?? "?"}, RH: ${rh.measured ?? "?"})`;
    logSetId.appendChild(opt);
  });
}

function buildHistoryTable() {
  const tbody = document.querySelector("#tireHistoryTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const racerFilter = $("historyRacerFilter")?.value || "ALL";
  const eventFilter = $("historyEventFilter")?.value.trim().toLowerCase() || "";
  const trackFilter = $("historyTrackFilter")?.value.trim().toLowerCase() || "";
  const sideFilter = $("historySideFilter")?.value || "ALL";

  const entries = (tireData.history || []).slice().sort((a, b) => {
    return (b.date || "").localeCompare(a.date || "");
  });

  entries.forEach(h => {
    if (racerFilter !== "ALL" && h.racer !== racerFilter) return;
    if (sideFilter !== "ALL" && h.side !== sideFilter) return;
    if (eventFilter && !(h.event || "").toLowerCase().includes(eventFilter)) return;
    if (trackFilter && !(h.track || "").toLowerCase().includes(trackFilter)) return;

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = h.date || "";

    const tdRacer = document.createElement("td");
    tdRacer.textContent = h.racer || "";

    const tdSet = document.createElement("td");
    tdSet.textContent = h.set_id || "";

    const tdSide = document.createElement("td");
    tdSide.textContent = h.side || "";

    const tdEvent = document.createElement("td");
    tdEvent.textContent = h.event || "";

    const tdTrack = document.createElement("td");
    tdTrack.textContent = h.track || "";

    const tdGrip = document.createElement("td");
    tdGrip.textContent = h.grip || "";

    const tdRot = document.createElement("td");
    tdRot.textContent = h.rotation || "";

    const tdNotes = document.createElement("td");
    tdNotes.textContent = h.notes || "";

    tr.appendChild(tdDate);
    tr.appendChild(tdRacer);
    tr.appendChild(tdSet);
    tr.appendChild(tdSide);
    tr.appendChild(tdEvent);
    tr.appendChild(tdTrack);
    tr.appendChild(tdGrip);
    tr.appendChild(tdRot);
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

function setupAddRacer() {
  const btn = $("addRacerBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const name = prompt("Enter racer name:");
    if (!name) return;
    ensureRacerExists(name);
    saveTireDataToLocalStorage(tireData);
    buildRacerSelects();
    buildTireSetTable();
    buildHistoryTable();
    buildCalcTireSetSelect();
  });
}

function openAddTireSetModal() {
  $("addTireSetModal")?.classList.remove("hidden");
}

function closeAddTireSetModal() {
  $("addTireSetModal")?.classList.add("hidden");
}

function setupAddTireSet() {
  const btn = $("addTireSetBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const racerName = getSelectedRacerForTirePage();
    if (!racerName) {
      alert("Select a racer first.");
      return;
    }
    $("newSetId").value = "";
    $("newSetLhMm").value = "";
    $("newSetRhMm").value = "";
    $("newSetNotes").value = "";
    openAddTireSetModal();
  });

  $("cancelNewSetBtn")?.addEventListener("click", () => {
    closeAddTireSetModal();
  });

  $("saveNewSetBtn")?.addEventListener("click", () => {
    const racerName = getSelectedRacerForTirePage();
    if (!racerName) {
      alert("No racer selected.");
      return;
    }
    const id = $("newSetId").value.trim();
    const lhMm = parseFloat($("newSetLhMm").value);
    const rhMm = parseFloat($("newSetRhMm").value);
    const notes = $("newSetNotes").value.trim();

    if (!id) {
      alert("Set identifier is required.");
      return;
    }

    ensureRacerExists(racerName);
    const racer = tireData.racers[racerName];
    if (!racer.tire_sets) racer.tire_sets = {};
    if (racer.tire_sets[id]) {
      alert("A tire set with this identifier already exists for this racer.");
      return;
    }

    racer.tire_sets[id] = {
      identifier: id,
      LH: {
        measured: isNaN(lhMm) ? null : lhMm,
        status: "NEW",
        wear: 100,
        uses: 0,
        last_used: null
      },
      RH: {
        measured: isNaN(rhMm) ? null : rhMm,
        status: "NEW",
        wear: 100,
        uses: 0,
        last_used: null
      },
      rotation_history: [],
      notes
    };

    saveTireDataToLocalStorage(tireData);
    closeAddTireSetModal();
    buildTireSetTable();
    buildCalcTireSetSelect();
  });
}

let currentLogSetId = null;

function openLogRunModal(racerName, setId) {
  currentLogSetId = setId;

  const logRacer = $("logRacer");
  if (logRacer) {
    logRacer.value = racerName;
  }

  buildLogSetSelect(racerName);
  const logSetId = $("logSetId");
  if (logSetId) {
    logSetId.value = setId;
  }

  $("logSide").value = "LH";
  $("logMeasured").value = "";
  $("logRotation").value = "NONE";
  $("logEvent").value = "";
  $("logTrack").value = "";
  $("logGrip").value = "MEDIUM";
  $("logNotes").value = "";

  $("logRunModal")?.classList.remove("hidden");
}

function closeLogRunModal() {
  $("logRunModal")?.classList.add("hidden");
}

function setupLogRunModal() {
  $("cancelLogRunBtn")?.addEventListener("click", () => {
    closeLogRunModal();
  });

  $("logRacer")?.addEventListener("change", () => {
    const racerName = $("logRacer").value;
    buildLogSetSelect(racerName);
  });

  $("saveLogRunBtn")?.addEventListener("click", () => {
    const racerName = $("logRacer").value;
    const setId = $("logSetId").value;
    const side = $("logSide").value;
    const measured = parseFloat($("logMeasured").value);
    const rotation = $("logRotation").value;
    const eventName = $("logEvent").value.trim();
    const track = $("logTrack").value.trim();
    const grip = $("logGrip").value;
    const notes = $("logNotes").value.trim();

    if (!racerName || !tireData.racers[racerName]) {
      alert("Invalid racer.");
      return;
    }
    const racer = tireData.racers[racerName];
    if (!racer.tire_sets || !racer.tire_sets[setId]) {
      alert("Invalid tire set.");
      return;
    }

    const set = racer.tire_sets[setId];
    const sideObj = set[side];
    if (!sideObj) {
      alert("Invalid side.");
      return;
    }

    if (!isNaN(measured)) {
      sideObj.measured = measured;
    }

    const wearLoss = getWearLoss(sideObj.status || "NEW", grip);
    sideObj.wear = Math.max(0, (sideObj.wear ?? 100) - wearLoss);
    sideObj.uses = (sideObj.uses || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    sideObj.last_used = today;

    let rotationLabel = "None";
    if (rotation === "LH_TO_RH" || rotation === "RH_TO_LH") {
      const from = rotation === "LH_TO_RH" ? "LH" : "RH";
      const to = rotation === "LH_TO_RH" ? "RH" : "LH";
      const tmp = structuredClone(set[from]);
      set[from] = structuredClone(set[to]);
      set[to] = tmp;
      set.rotation_history.push({
        date: today,
        from,
        to
      });
      rotationLabel = `${from}→${to}`;
    }

    if (!tireData.history) tireData.history = [];
    tireData.history.push({
      racer: racerName,
      set_id: setId,
      side,
      date: today,
      event: eventName,
      track,
      grip,
      rotation: rotationLabel,
      notes
    });

    saveTireDataToLocalStorage(tireData);
    closeLogRunModal();
    buildTireSetTable();
    buildHistoryTable();
    buildCalcTireSetSelect();
  });
}

function setupExportImportReset() {
  const exportBtn = $("exportTireJson");
  const importInput = $("importTireJson");
  const resetBtn = $("resetTireData");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(tireData, null, 2)], { type: "application/json" });
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
          const merged = mergeTireData(tireData, incoming);
          tireData = merged;
          saveTireDataToLocalStorage(tireData);
          initTirePage();
          initCalculatorFromTireData();
        } catch {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Reset all tire data to defaults?")) return;
      localStorage.removeItem(TIRE_LS_KEY);
      tireData = structuredClone(defaultTireData);
      saveTireDataToLocalStorage(tireData);
      initTirePage();
      initCalculatorFromTireData();
    });
  }
}

function setupHistoryFilters() {
  ["historyRacerFilter", "historyEventFilter", "historyTrackFilter", "historySideFilter"].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", () => buildHistoryTable());
      el.addEventListener("change", () => buildHistoryTable());
    }
  });
}

// =========================
// CALCULATOR ↔ TIRE SET INTEGRATION
// =========================

function buildCalcTireSetSelect() {
  const calcRacerSelect = $("calcRacerSelect");
  const calcTireSetSelect = $("calcTireSetSelect");
  const calcTireSideSelect = $("calcTireSideSelect");
  if (!calcRacerSelect || !calcTireSetSelect || !calcTireSideSelect) return;
  const racerName = calcRacerSelect.value;
  calcTireSetSelect.innerHTML = "";

  if (!racerName || !tireData.racers[racerName]) return;
  const sets = tireData.racers[racerName].tire_sets || {};
  const setIds = Object.keys(sets).sort();

  setIds.forEach(id => {
    const set = sets[id];
    const opt = document.createElement("option");
    opt.value = id;
    const lh = set.LH || {};
    const rh = set.RH || {};
    opt.textContent = `${set.identifier || id} (LH: ${lh.measured ?? "?"}, RH: ${rh.measured ?? "?"})`;
    calcTireSetSelect.appendChild(opt);
  });

  applySelectedTireToCalculator();
}

function applySelectedTireToCalculator() {
  const calcRacerSelect = $("calcRacerSelect");
  const calcTireSetSelect = $("calcTireSetSelect");
  const calcTireSideSelect = $("calcTireSideSelect");
  const tireInput = $("tire");
  if (!calcRacerSelect || !calcTireSetSelect || !calcTireSideSelect || !tireInput) return;

  const racerName = calcRacerSelect.value;
  const setId = calcTireSetSelect.value;
  const side = calcTireSideSelect.value;

  if (!racerName || !tireData.racers[racerName]) return;
  const racer = tireData.racers[racerName];
  if (!racer.tire_sets || !racer.tire_sets[setId]) return;
  const set = racer.tire_sets[setId];
  const sideObj = set[side];
  if (!sideObj || sideObj.measured == null) return;

  tireInput.value = sideObj.measured.toFixed(2);
  $("tireManualIndicator").textContent = "";
  updateTireConvertedDisplay();
  buildLocalTable();
  buildRecommendedTable();
}

function markTireManualOverride() {
  const calcRacerSelect = $("calcRacerSelect");
  const calcTireSetSelect = $("calcTireSetSelect");
  const calcTireSideSelect = $("calcTireSideSelect");
  const tireInput = $("tire");
  const indicator = $("tireManualIndicator");
  if (!calcRacerSelect || !calcTireSetSelect || !calcTireSideSelect || !tireInput || !indicator) return;

  const racerName = calcRacerSelect.value;
  const setId = calcTireSetSelect.value;
  const side = calcTireSideSelect.value;

  if (!racerName || !tireData.racers[racerName]) {
    indicator.textContent = "";
    return;
  }
  const racer = tireData.racers[racerName];
  if (!racer.tire_sets || !racer.tire_sets[setId]) {
    indicator.textContent = "";
    return;
  }
  const set = racer.tire_sets[setId];
  const sideObj = set[side];
  if (!sideObj || sideObj.measured == null) {
    indicator.textContent = "";
    return;
  }

  const currentVal = parseFloat(tireInput.value);
  if (isNaN(currentVal)) {
    indicator.textContent = "";
    return;
  }

  if (Math.abs(currentVal - sideObj.measured) > 0.001) {
    indicator.textContent = "Manual override";
  } else {
    indicator.textContent = "";
  }
}

function setupCalculatorTireIntegration() {
  const calcRacerSelect = $("calcRacerSelect");
  const calcTireSetSelect = $("calcTireSetSelect");
  const calcTireSideSelect = $("calcTireSideSelect");

  if (!calcRacerSelect || !calcTireSetSelect || !calcTireSideSelect) return;

  calcRacerSelect.addEventListener("change", () => {
    buildCalcTireSetSelect();
  });

  calcTireSetSelect.addEventListener("change", () => {
    applySelectedTireToCalculator();
  });

  calcTireSideSelect.addEventListener("change", () => {
    applySelectedTireToCalculator();
  });
}

// =========================
// INIT FUNCTIONS
// =========================

async function initTirePage() {
  if (!$("tireSetTable")) return;
  await ensureTireDataLoaded();
  buildRacerSelects();
  buildTireSetTable();
  buildHistoryTable();
  setupAddRacer();
  setupAddTireSet();
  setupLogRunModal();
  setupExportImportReset();
  setupHistoryFilters();

  const racerSelect = $("racerSelect");
  if (racerSelect) {
    racerSelect.addEventListener("change", () => {
      buildTireSetTable();
    });
  }
}

async function initCalculatorFromTireData() {
  if (!$("localTable")) return;
  await ensureTireDataLoaded();
  buildRacerSelects();
  setupCalculatorInputs();
  setupCalculatorTireIntegration();
  updateTeethRangeDisplay();
  updateTireConvertedDisplay();
  buildCalcTireSetSelect();
  buildLocalTable();
  buildRecommendedTable();
  setupKeyboardNavigation();
}

// =========================
// PAGE INIT
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  setupCollapsibleCards();
  await ensureTireDataLoaded();
  await initCalculatorFromTireData();
  await initTirePage();
});
