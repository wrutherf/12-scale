// ===============================
// CAR RULES
// ===============================
const cars = {
  a12: { min: 112, max: 120 },
  a12x: { min: 112, max: 125 }
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

const desiredRolloutEl = document.getElementById("desiredRollout");
const recommendedBody = document.querySelector("#recommended tbody");

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

  buildLocalTable();
  buildRecommended();
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", update);
});

// ===============================
// SCROLL-TO-ADJUST
// ===============================
function addScrollAdjust(el, step) {
  el.addEventListener("wheel", e => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    el.value = parseInt(el.value, 10) + step * dir;
    update();
  });
}

addScrollAdjust(spurEl, 1);
addScrollAdjust(pinionEl, 1);

tireEl.addEventListener("wheel", e => {
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
// LOCALIZED ±10 TABLE
// ===============================
function buildLocalTable() {
  const spur0 = parseInt(spurEl.value, 10);
  const pinion0 = parseInt(pinionEl.value, 10);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const units = detectUnits(tire);
  if (units === "invalid") return;

  const spurMin = Math.max(1, spur0 - 10);
  const spurMax = spur0 + 10;
  const pinionMin = Math.max(1, pinion0 - 10);
  const pinionMax = pinion0 + 10;

  localHeadRow.innerHTML = `<th>Spur ↓ / Pinion →</th>`;
  for (let p = pinionMin; p <= pinionMax; p++) {
    localHeadRow.innerHTML += `<th>${p}</th>`;
  }

  localBody.innerHTML = "";

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

      cell.addEventListener("click", () => {
        spurEl.value = s;
        pinionEl.value = p;
        update();
      });

      cell.addEventListener("wheel", e => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        pinionEl.value = p + dir;
        update();
      });

      row.appendChild(cell);
    }

    localBody.appendChild(row);
  }
}

// ===============================
// RECOMMENDED GEARING
// ===============================
function buildRecommended() {
  const desired = parseFloat(desiredRolloutEl.value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const units = detectUnits(tire);
  if (units === "invalid") return;

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
