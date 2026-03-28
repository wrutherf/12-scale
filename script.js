// ===============================
// CAR RULES
// ===============================
const cars = {
  a12: { min: 112, max: 120 },
  a12x: { min: 112, max: 125 }
};

// Soft limits for virtual table
const SPUR_MIN_SOFT = 20;
const SPUR_MAX_SOFT = 120;
const PINION_MIN_SOFT = 10;
const PINION_MAX_SOFT = 80;

// ===============================
// ELEMENTS
// ===============================
const spurEl = document.getElementById("spur");
const pinionEl = document.getElementById("pinion");
const tireEl = document.getElementById("tire");
const carEl = document.getElementById("car");

const rolloutEl = document.getElementById("rollout");
const totalEl = document.getElementById("total");
const legalEl = document.getElementById("legal");

const localScroll = document.getElementById("localScroll");
const localBody = document.querySelector("#localTable tbody");
const localHeadRow = document.getElementById("localHeadRow");

const desiredRolloutEl = document.getElementById("desiredRollout");
const recommendedBody = document.querySelector("#recommended tbody");
const centerBtn = document.getElementById("centerBtn");

// Virtual table state
let spurMin = null;
let spurMax = null;
let pinionMin = null;
let pinionMax = null;

// ===============================
// UNIT DETECTION
// ===============================
function detectUnits(tire) {
  if (tire > 37) return "mm";
  if (tire < 2) return "in";
  alert("Tire diameter between 2 and 37 is ambiguous. Enter mm (>37) or inches (<2).");
  return "invalid";
}

// ===============================
// ROLLOUT CALCULATION
// ===============================
function rolloutFromGears(spur, pinion, tire) {
  const units = detectUnits(tire);
  if (units === "invalid") return { value: NaN, units };

  let tireMm = tire;
  if (units === "in") tireMm = tire * 25.4;

  const rolloutMm = Math.PI * tireMm * (pinion / spur);

  if (units === "mm") return { value: rolloutMm, units };
  return { value: rolloutMm / 25.4, units };
}

function formatRollout(val, units) {
  if (!isFinite(val)) return "—";
  return units === "mm" ? val.toFixed(2) : val.toFixed(3);
}

// ===============================
// MAIN UPDATE
// ===============================
function update() {
  const spur = parseInt(spurEl.value, 10);
  const pinion = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const { value: rVal, units } = rolloutFromGears(spur, pinion, tire);
  const total = spur + pinion;

  rolloutEl.textContent = formatRollout(rVal, units);
  totalEl.textContent = total;

  if (total >= car.min && total <= car.max) {
    legalEl.textContent = `Valid (${car.min}–${car.max})`;
    legalEl.className = "good";
  } else {
    legalEl.textContent = `Out of range (${car.min}–${car.max})`;
    legalEl.className = "bad";
  }

  resetLocalTableCenter();
  buildRecommended();
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", update);
});

// ===============================
// SCROLL-TO-ADJUST INPUTS ONLY
// ===============================
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

// ===============================
// LOCALIZED VIRTUAL ±5 TABLE
// ===============================
function resetLocalTableCenter() {
  const spur0 = parseInt(spurEl.value, 10);
  const pinion0 = parseInt(pinionEl.value, 10);

  if (!spur0 || !pinion0) return;

  spurMin = Math.max(SPUR_MIN_SOFT, spur0 - 5);
  spurMax = Math.min(SPUR_MAX_SOFT, spur0 + 5);
  pinionMin = Math.max(PINION_MIN_SOFT, pinion0 - 5);
  pinionMax = Math.min(PINION_MAX_SOFT, pinion0 + 5);

  buildLocalTable();
  centerLocalScroll();
}

function centerLocalScroll() {
  // Rough center of the content
  localScroll.scrollTop = (localScroll.scrollHeight - localScroll.clientHeight) / 2;
  localScroll.scrollLeft = (localScroll.scrollWidth - localScroll.clientWidth) / 2;
}

function buildLocalTable() {
  const spur0 = parseInt(spurEl.value, 10);
  const pinion0 = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const units = detectUnits(tire);
  if (units === "invalid" || !spur0 || !pinion0 || !tire) {
    localBody.innerHTML = "";
    localHeadRow.innerHTML = `<th>Spur ↓ / Pinion →</th>`;
    return;
  }

  // Header
  localHeadRow.innerHTML = `<th>Spur ↓ / Pinion →</th>`;
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

    for (let p = pinionMin; p <= pinionMax; p++) {
      const total = s + p;
      const { value: rVal } = rolloutFromGears(s, p, tire);
      const legal = total >= car.min && total <= car.max;

      const cell = document.createElement("td");
      cell.textContent = formatRollout(rVal, units);

      if (s === spur0 && p === pinion0) {
        cell.className = "current-gear";
      } else if (legal) {
        cell.className = "legal-gear";
      } else {
        cell.className = "illegal-gear";
      }

      cell.addEventListener("click", () => {
        spurEl.value = s;
        pinionEl.value = p;
        update();
      });

      // Do NOT change inputs on wheel; allow natural scroll
      cell.addEventListener("wheel", () => {});

      row.appendChild(cell);
    }

    localBody.appendChild(row);
  }
}

// Virtual scroll: extend ranges when near edges
localScroll.addEventListener("scroll", () => {
  const threshold = 20;

  const maxV = localScroll.scrollHeight - localScroll.clientHeight;
  const maxH = localScroll.scrollWidth - localScroll.clientWidth;

  let changed = false;

  // Vertical: up
  if (localScroll.scrollTop < threshold && spurMin > SPUR_MIN_SOFT) {
    spurMin = Math.max(SPUR_MIN_SOFT, spurMin - 1);
    spurMax = spurMin + 10;
    changed = true;
  }

  // Vertical: down
  if (localScroll.scrollTop > maxV - threshold && spurMax < SPUR_MAX_SOFT) {
    spurMax = Math.min(SPUR_MAX_SOFT, spurMax + 1);
    spurMin = spurMax - 10;
    changed = true;
  }

  // Horizontal: left
  if (localScroll.scrollLeft < threshold && pinionMin > PINION_MIN_SOFT) {
    pinionMin = Math.max(PINION_MIN_SOFT, pinionMin - 1);
    pinionMax = pinionMin + 10;
    changed = true;
  }

  // Horizontal: right
  if (localScroll.scrollLeft > maxH - threshold && pinionMax < PINION_MAX_SOFT) {
    pinionMax = Math.min(PINION_MAX_SOFT, pinionMax + 1);
    pinionMin = pinionMax - 10;
    changed = true;
  }

  if (changed) {
    const prevTop = localScroll.scrollTop;
    const prevLeft = localScroll.scrollLeft;

    buildLocalTable();

    // Keep it feeling stable: nudge back toward center
    localScroll.scrollTop = prevTop + (localScroll.scrollHeight - localScroll.clientHeight) / 22;
    localScroll.scrollLeft = prevLeft + (localScroll.scrollWidth - localScroll.clientWidth) / 22;
  }
});

// Center button
centerBtn.addEventListener("click", () => {
  resetLocalTableCenter();
});

// ===============================
// RECOMMENDED GEARING
// ===============================
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
      <td>${formatRollout(m.rVal, units)}</td>
      <td>${m.diff.toFixed(units === "mm" ? 2 : 3)}</td>
    `;

    row.addEventListener("click", () => {
      spurEl.value = m.s;
      pinionEl.value = m.p;
      update();
    });

    recommendedBody.appendChild(row);
  });
}

desiredRolloutEl.addEventListener("input", buildRecommended);

// ===============================
// INITIALIZE
// ===============================
update();
