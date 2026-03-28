// ===============================
// CAR RULES
// ===============================
const cars = {
  a12: { name: "Awesomatix A12", min: 112, max: 120 },
  a12x: { name: "Awesomatix A12X", min: 112, max: 125 }
};

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

const localBody = document.querySelector("#localTable tbody");
const localHeadRow = document.querySelector("#localTable thead tr");
const recommendedBody = document.querySelector("#recommended tbody");
const desiredRolloutEl = document.getElementById("desiredRollout");

// ===============================
// UNIT DETECTION & ROLLOUT
// ===============================
function detectUnits(tire) {
  if (tire > 37) return "mm";
  if (tire < 2) return "in";
  alert("Tire diameter is between 2 and 37. Please enter mm (>37) or inches (<2).");
  return "invalid";
}

function rolloutFromGears(spur, pinion, tire) {
  const units = detectUnits(tire);
  if (units === "invalid") return { value: NaN, units };

  let tireMm = tire;
  if (units === "in") {
    tireMm = tire * 25.4;
  }

  const ratio = pinion / spur;
  const rolloutMm = Math.PI * tireMm * ratio;

  if (units === "mm") {
    return { value: rolloutMm, units };
  } else {
    return { value: rolloutMm / 25.4, units };
  }
}

function formatRollout(rollout, units) {
  if (!isFinite(rollout)) return "—";
  if (units === "mm") return rollout.toFixed(2) + " mm";
  if (units === "in") return rollout.toFixed(3) + " in";
  return "—";
}

// ===============================
// MAIN UPDATE
// ===============================
function update() {
  const spur = parseInt(spurEl.value, 10);
  const pinion = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  if (!spur || !pinion || !tire) return;

  const { value: rolloutVal, units } = rolloutFromGears(spur, pinion, tire);
  const total = spur + pinion;

  rolloutEl.textContent = formatRollout(rolloutVal, units);
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

// ===============================
// SCROLL-TO-ADJUST INPUTS
// ===============================
function addScrollAdjust(el, step) {
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    el.value = (parseFloat(el.value) + step * dir).toFixed(0);
    update();
  });
}

addScrollAdjust(spurEl, 1);
addScrollAdjust(pinionEl, 1);

tireEl.addEventListener("wheel", (e) => {
  e.preventDefault();
  const val = parseFloat(tireEl.value);
  const units = detectUnits(val);
  if (units === "invalid") return;
  const step = units === "mm" ? 0.05 : 0.005;
  const dir = e.deltaY < 0 ? 1 : -1;
  tireEl.value = (val + step * dir).toFixed(3);
  update();
});

// ===============================
// LOCALIZED ±6 GEARING TABLE
// ===============================
function buildLocalTable() {
  const spur0 = parseInt(spurEl.value, 10);
  const pinion0 = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  if (!spur0 || !pinion0 || !tire) return;

  const units = detectUnits(tire);
  if (units === "invalid") {
    localBody.innerHTML = "";
    localHeadRow.innerHTML = `<th>Spur ↓ / Pinion →</th>`;
    return;
  }

  const spurMin = Math.max(1, spur0 - 6);
  const spurMax = spur0 + 6;
  const pinionMin = Math.max(1, pinion0 - 6);
  const pinionMax = pinion0 + 6;

  localBody.innerHTML = "";
  localHeadRow.innerHTML = `<th>Spur ↓ / Pinion →</th>`;

  for (let p = pinionMin; p <= pinionMax; p++) {
    localHeadRow.innerHTML += `<th>${p}</th>`;
  }

  for (let s = spurMin; s <= spurMax; s++) {
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${s}</strong></td>`;

    for (let p = pinionMin; p <= pinionMax; p++) {
      const total = s + p;
      const { value: rVal } = rolloutFromGears(s, p, tire);
      const legal = total >= car.min && total <= car.max;

      const cell = document.createElement("td");
      cell.textContent = formatRollout(rVal, units);
      cell.className = legal ? "legal-gear" : "illegal-gear";
      cell.dataset.spur = s;
      cell.dataset.pinion = p;

      cell.addEventListener("click", () => {
        spurEl.value = s;
        pinionEl.value = p;
        update();
      });

      cell.addEventListener("wheel", (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const newPinion = p + dir;
        pinionEl.value = newPinion;
        update();
      });

      row.appendChild(cell);
    }

    localBody.appendChild(row);
  }
}

// ===============================
// RECOMMENDED GEARING TABLE
// ===============================
function buildRecommended() {
  const desired = parseFloat(desiredRolloutEl.value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  recommendedBody.innerHTML = "";

  if (!desired || !tire) return;

  const units = detectUnits(tire);
  if (units === "invalid") return;

  const list = [];

  for (let spur = 40; spur <= 80; spur++) {
    for (let pinion = 20; pinion <= 70; pinion++) {
      const total = spur + pinion;
      if (total < car.min || total > car.max) continue;

      const { value: rVal } = rolloutFromGears(spur, pinion, tire);
      const diff = Math.abs(rVal - desired);

      list.push({ spur, pinion, total, rollout: rVal, diff });
    }
  }

  list.sort((a, b) => a.diff - b.diff);

  const maxRows = 40;
  list.slice(0, maxRows).forEach(m => {
    const row = document.createElement("tr");
    row.className = "legal-gear";

    row.innerHTML = `
      <td>${m.spur}</td>
      <td>${m.pinion}</td>
      <td>${m.total}</td>
      <td>${formatRollout(m.rollout, units)}</td>
      <td>${m.diff.toFixed(units === "mm" ? 2 : 3)}</td>
    `;

    row.addEventListener("click", () => {
      spurEl.value = m.spur;
      pinionEl.value = m.pinion;
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
