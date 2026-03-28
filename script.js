// CAR RULES
const cars = {
  a12: { min: 112, max: 120 },
  a12x: { min: 112, max: 125 }
};

// Soft limits for virtual map
const SPUR_MIN_SOFT = 20;
const SPUR_MAX_SOFT = 120;
const PINION_MIN_SOFT = 10;
const PINION_MAX_SOFT = 80;

// Viewport half-span (±5)
const SPAN = 5;

// ELEMENTS
const spurEl = document.getElementById("spur");
const pinionEl = document.getElementById("pinion");
const tireEl = document.getElementById("tire");
const carEl = document.getElementById("car");

const rolloutPrimary = document.getElementById("rolloutPrimary");
const rolloutSecondary = document.getElementById("rolloutSecondary");
const totalEl = document.getElementById("total");
const legalEl = document.getElementById("legal");

const tireConverted = document.getElementById("tireConverted");

const localBody = document.getElementById("localBody");
const localHeadRow = document.getElementById("localHeadRow");

const desiredRolloutEl = document.getElementById("desiredRollout");
const recommendedBody = document.querySelector("#recommended tbody");
const centerBtn = document.getElementById("centerBtn");

// Cursor state (preview)
let cursorSpur = parseInt(spurEl.value, 10);
let cursorPinion = parseInt(pinionEl.value, 10);

// UNIT DETECTION
function detectUnits(tire) {
  if (tire > 37) return "mm";
  if (tire < 2) return "in";
  alert("Tire diameter between 2 and 37 is ambiguous. Enter mm (>37) or inches (<2).");
  return "invalid";
}

// ROLLOUT CALCULATION
function rolloutFromGears(spur, pinion, tire) {
  const units = detectUnits(tire);
  if (units === "invalid") return { value: NaN, units };

  let tireMm = tire;
  if (units === "in") tireMm = tire * 25.4;

  const rolloutMm = Math.PI * tireMm * (pinion / spur);

  if (units === "mm") return { value: rolloutMm, units };
  return { value: rolloutMm / 25.4, units };
}

function updateRolloutDualUnits(value, units) {
  if (!isFinite(value)) {
    rolloutPrimary.textContent = "—";
    rolloutSecondary.textContent = "";
    return;
  }

  if (units === "mm") {
    const inches = value / 25.4;
    rolloutPrimary.textContent = `${value.toFixed(2)} mm`;
    rolloutSecondary.textContent = `${inches.toFixed(3)} in`;
  } else {
    const mm = value * 25.4;
    rolloutPrimary.textContent = `${value.toFixed(3)} in`;
    rolloutSecondary.textContent = `${mm.toFixed(2)} mm`;
  }
}

// TIRE DUAL-UNIT DISPLAY
function updateTireConversion() {
  const val = parseFloat(tireEl.value);
  if (!val || val <= 0) {
    tireConverted.textContent = "";
    return;
  }

  const units = detectUnits(val);
  if (units === "invalid") {
    tireConverted.textContent = "";
    return;
  }

  if (units === "mm") {
    const inches = val / 25.4;
    tireConverted.textContent = `${inches.toFixed(3)} in`;
  } else {
    const mm = val * 25.4;
    tireConverted.textContent = `${mm.toFixed(2)} mm`;
  }
}

// MAIN UPDATE (COMMITTED GEARING)
function update() {
  updateTireConversion();

  const spur = parseInt(spurEl.value, 10);
  const pinion = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const { value: rVal, units } = rolloutFromGears(spur, pinion, tire);
  const total = spur + pinion;

  updateRolloutDualUnits(rVal, units);
  totalEl.textContent = total;

  if (total >= car.min && total <= car.max) {
    legalEl.textContent = `Valid (${car.min}–${car.max})`;
    legalEl.className = "good";
  } else {
    legalEl.textContent = `Out of range (${car.min}–${car.max})`;
    legalEl.className = "bad";
  }

  buildLocalTable();
  buildRecommended();
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", update);
});

// SCROLL-TO-ADJUST INPUTS ONLY
function addScrollAdjust(el, step) {
  el.addEventListener("wheel", e => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    el.value = parseInt(el.value || "0", 10) + step * dir;
    update();
  });
}

addScrollAdjust(spurEl, 1);
addScrollAdjust(pinionEl, 1);

tireEl.addEventListener("wheel", e => {
  e.preventDefault();
  const val = parseFloat(tireEl.value || "0");
  const units = detectUnits(val);
  if (units === "invalid") return;

  const step = units === "mm" ? 0.05 : 0.005;
  const dir = e.deltaY < 0 ? 1 : -1;

  tireEl.value = (val + step * dir).toFixed(3);
  update();
});

// LOCALIZED CURSOR-CENTERED TABLE
function buildLocalTable() {
  const spur0 = parseInt(spurEl.value, 10);
  const pinion0 = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const units = detectUnits(tire);
  if (units === "invalid") return;

  // Clamp cursor to soft limits
  cursorSpur = Math.max(SPUR_MIN_SOFT, Math.min(SPUR_MAX_SOFT, cursorSpur));
  cursorPinion = Math.max(PINION_MIN_SOFT, Math.min(PINION_MAX_SOFT, cursorPinion));

  const spurMin = Math.max(SPUR_MIN_SOFT, cursorSpur - SPAN);
  const spurMax = Math.min(SPUR_MAX_SOFT, cursorSpur + SPAN);
  const pinionMin = Math.max(PINION_MIN_SOFT, cursorPinion - SPAN);
  const pinionMax = Math.min(PINION_MAX_SOFT, cursorPinion + SPAN);

  // Header
  localHeadRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.textContent = "Spur ↓ / Pinion →";
  corner.classList.add("sticky-corner");
  localHeadRow.appendChild(corner);

  for (let p = pinionMin; p <= pinionMax; p++) {
    const th = document.createElement("th");
    th.textContent = p;
    localHeadRow.appendChild(th);
  }

  // Body
  localBody.innerHTML = "";
  for (let s = spurMin; s <= spurMax; s++) {
    const row = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.innerHTML = `<strong>${s}</strong>`;
    row.appendChild(labelCell);

    // Spur header highlight
    labelCell.classList.remove("header-highlight");
    if (s === cursorSpur) {
      labelCell.classList.add("header-highlight");
    }

    for (let p = pinionMin; p <= pinionMax; p++) {
      const total = s + p;
      const { value: rVal } = rolloutFromGears(s, p, tire);
      const legal = total >= car.min && total <= car.max;

      const cell = document.createElement("td");
      cell.textContent = units === "mm"
        ? rVal.toFixed(2)
        : rVal.toFixed(3);

      if (s === spur0 && p === pinion0) {
        cell.classList.add("current-gear");
      } else if (legal) {
        cell.classList.add("legal-gear");
      } else {
        cell.classList.add("illegal-gear");
      }

      if (s === cursorSpur && p === cursorPinion) {
        cell.classList.add("cursor-cell");
      }

      cell.addEventListener("click", () => {
        cursorSpur = s;
        cursorPinion = p;
        spurEl.value = s;
        pinionEl.value = p;
        update();
      });

      row.appendChild(cell);
    }

    localBody.appendChild(row);
  }

  // Pinion header highlight
  Array.from(localHeadRow.children).forEach((th, idx) => {
    th.classList.remove("header-highlight");
    if (idx > 0) {
      const pinionVal = pinionMin + (idx - 1);
      if (pinionVal === cursorPinion) {
        th.classList.add("header-highlight");
      }
    }
  });
}

// KEYBOARD NAVIGATION (CURSOR)
function handleCursorKeys(e) {
  const key = e.key;

  if (key === "ArrowUp") {
    e.preventDefault();
    cursorSpur = Math.min(SPUR_MAX_SOFT, cursorSpur + 1);
    buildLocalTable();
  } else if (key === "ArrowDown") {
    e.preventDefault();
    cursorSpur = Math.max(SPUR_MIN_SOFT, cursorSpur - 1);
    buildLocalTable();
  } else if (key === "ArrowLeft") {
    e.preventDefault();
    cursorPinion = Math.max(PINION_MIN_SOFT, cursorPinion - 1);
    buildLocalTable();
  } else if (key === "ArrowRight") {
    e.preventDefault();
    cursorPinion = Math.min(PINION_MAX_SOFT, cursorPinion + 1);
    buildLocalTable();
  } else if (key === "Enter") {
    e.preventDefault();
    spurEl.value = cursorSpur;
    pinionEl.value = cursorPinion;
    update();
  }
}

window.addEventListener("keydown", handleCursorKeys);

// Center button: snap cursor to current gearing
centerBtn.addEventListener("click", () => {
  cursorSpur = parseInt(spurEl.value, 10);
  cursorPinion = parseInt(pinionEl.value, 10);
  buildLocalTable();
});

// RECOMMENDED GEARING
function buildRecommended() {
  const desired = parseFloat(desiredRolloutEl.value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const units = detectUnits(tire);
  if (units === "invalid" || !desired || !tire) {
    recommendedBody.innerHTML = "";
    return;
  }

  recommendedBody.innerHTML = "";
  const list = [];

  for (let s = 40; s <= 80; s++) {
    for (let p = 20; p <= 70; p++) {
      const total = s + p;
      if (total < car.min || total > car.max) continue;

      const { value: rVal } = rolloutFromGears(s, p, tire);
      const diff = Math.abs(rVal - desired);

      list.push({ s, p, total, rVal, diff });
    }
  }

  list.sort((a, b) => a.diff - b.diff);

  list.slice(0, 40).forEach(m => {
    const row = document.createElement("tr");
    row.className = "legal-gear";

    row.innerHTML = `
      <td>${m.s}</td>
      <td>${m.p}</td>
      <td>${m.total}</td>
      <td>${units === "mm" ? m.rVal.toFixed(2) : m.rVal.toFixed(3)}</td>
      <td>${m.diff.toFixed(units === "mm" ? 2 : 3)}</td>
    `;

    row.addEventListener("click", () => {
      cursorSpur = m.s;
      cursorPinion = m.p;
      spurEl.value = m.s;
      pinionEl.value = m.p;
      update();
    });

    recommendedBody.appendChild(row);
  });
}

desiredRolloutEl.addEventListener("input", buildRecommended);

// INITIALIZE
update();
cursorSpur = parseInt(spurEl.value, 10);
cursorPinion = parseInt(pinionEl.value, 10);
buildLocalTable();
