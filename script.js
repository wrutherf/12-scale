// =========================
// SHARED: COLLAPSIBLE CARDS
// =========================

function setupCollapsibleCards() {
  document.querySelectorAll(".collapsible .card-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("collapsed");
    });
  });
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

function getEffectiveTireData() {
  const ls = loadTireDataFromLocalStorage();
  return ls ? ls : structuredClone(defaultTireData);
}

// Wear model
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

// UI helpers
function $(id) {
  return document.getElementById(id);
}

function getSelectedRacer(data) {
  const sel = $("racerSelect");
  if (!sel) return null;
  const name = sel.value;
  if (!name || !data.racers[name]) return null;
  return name;
}

function ensureRacerExists(data, name) {
  if (!data.racers[name]) {
    data.racers[name] = { tire_sets: {} };
  }
}

// Build racer select + history filter
function buildRacerSelects(data) {
  const racerSelect = $("racerSelect");
  const historyRacerFilter = $("historyRacerFilter");
  const logRacer = $("logRacer");

  const racerNames = Object.keys(data.racers).sort();

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
}

// Build tire set table
function buildTireSetTable(data) {
  const tbody = document.querySelector("#tireSetTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const racerName = getSelectedRacer(data);
  if (!racerName) return;

  const racer = data.racers[racerName];
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
    btn.addEventListener("click", () => openLogRunModal(data, racerName, setId));
    tdLog.appendChild(btn);

    tr.addEventListener("click", e => {
      if (e.target === btn) return;
      openLogRunModal(data, racerName, setId);
    });

    tr.appendChild(tdId);
    tr.appendChild(tdLh);
    tr.appendChild(tdRh);
    tr.appendChild(tdUses);
    tr.appendChild(tdLast);
    tr.appendChild(tdLog);

    tbody.appendChild(tr);
  });

  buildLogSetSelect(data, racerName);
}

// Build log modal set select
function buildLogSetSelect(data, racerName) {
  const logSetId = $("logSetId");
  if (!logSetId) return;
  logSetId.innerHTML = "";

  if (!racerName || !data.racers[racerName]) return;

  const sets = data.racers[racerName].tire_sets || {};
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

// Build history table
function buildHistoryTable(data) {
  const tbody = document.querySelector("#tireHistoryTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const racerFilter = $("historyRacerFilter")?.value || "ALL";
  const eventFilter = $("historyEventFilter")?.value.trim().toLowerCase() || "";
  const trackFilter = $("historyTrackFilter")?.value.trim().toLowerCase() || "";
  const sideFilter = $("historySideFilter")?.value || "ALL";

  const entries = (data.history || []).slice().sort((a, b) => {
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

// Add racer
function setupAddRacer(data) {
  const btn = $("addRacerBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const name = prompt("Enter racer name:");
    if (!name) return;
    ensureRacerExists(data, name);
    saveTireDataToLocalStorage(data);
    buildRacerSelects(data);
    buildTireSetTable(data);
    buildHistoryTable(data);
  });
}

// Add tire set modal
function openAddTireSetModal() {
  $("addTireSetModal")?.classList.remove("hidden");
}

function closeAddTireSetModal() {
  $("addTireSetModal")?.classList.add("hidden");
}

function setupAddTireSet(data) {
  const btn = $("addTireSetBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const racerName = getSelectedRacer(data);
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
    const racerName = getSelectedRacer(data);
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

    ensureRacerExists(data, racerName);
    const racer = data.racers[racerName];
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

    saveTireDataToLocalStorage(data);
    closeAddTireSetModal();
    buildTireSetTable(data);
  });
}

// Log run modal
let currentLogSetId = null;

function openLogRunModal(data, racerName, setId) {
  currentLogSetId = setId;

  const logRacer = $("logRacer");
  if (logRacer) {
    logRacer.value = racerName;
  }

  buildLogSetSelect(data, racerName);
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

function setupLogRunModal(data) {
  $("cancelLogRunBtn")?.addEventListener("click", () => {
    closeLogRunModal();
  });

  $("logRacer")?.addEventListener("change", () => {
    const racerName = $("logRacer").value;
    buildLogSetSelect(data, racerName);
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

    if (!racerName || !data.racers[racerName]) {
      alert("Invalid racer.");
      return;
    }
    const racer = data.racers[racerName];
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

    // Update measured if provided
    if (!isNaN(measured)) {
      sideObj.measured = measured;
    }

    // Wear model
    const wearLoss = getWearLoss(sideObj.status || "NEW", grip);
    sideObj.wear = Math.max(0, (sideObj.wear ?? 100) - wearLoss);
    sideObj.uses = (sideObj.uses || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    sideObj.last_used = today;

    // Rotation
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

    // History entry
    if (!data.history) data.history = [];
    data.history.push({
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

    saveTireDataToLocalStorage(data);
    closeLogRunModal();
    buildTireSetTable(data);
    buildHistoryTable(data);
  });
}

// Export / import / reset
function setupExportImportReset(data) {
  const exportBtn = $("exportTireJson");
  const importInput = $("importTireJson");
  const resetBtn = $("resetTireData");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const current = getEffectiveTireData();
      const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
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
          initTireSystem(merged);
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
      const fresh = structuredClone(defaultTireData);
      saveTireDataToLocalStorage(fresh);
      initTireSystem(fresh);
    });
  }
}

// History filters
function setupHistoryFilters(data) {
  ["historyRacerFilter", "historyEventFilter", "historyTrackFilter", "historySideFilter"].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", () => buildHistoryTable(data));
      el.addEventListener("change", () => buildHistoryTable(data));
    }
  });
}

// Initialize tire system
async function initTireSystem(existingData) {
  let data = existingData;
  if (!data) {
    data = loadTireDataFromLocalStorage();
    if (!data) {
      const jsonData = await loadTireDataJson();
      data = jsonData || structuredClone(defaultTireData);
      saveTireDataToLocalStorage(data);
    }
  }

  buildRacerSelects(data);
  buildTireSetTable(data);
  buildHistoryTable(data);
  setupAddRacer(data);
  setupAddTireSet(data);
  setupLogRunModal(data);
  setupExportImportReset(data);
  setupHistoryFilters(data);

  const racerSelect = $("racerSelect");
  if (racerSelect) {
    racerSelect.addEventListener("change", () => {
      buildTireSetTable(data);
    });
  }
}

// =========================
// PAGE INIT
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  setupCollapsibleCards();

  const tireSetTable = document.getElementById("tireSetTable");
  if (tireSetTable) {
    await initTireSystem(null);
  }
});
