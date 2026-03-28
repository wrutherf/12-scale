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

const resultsBody = document.querySelector("#results tbody");
const recommendedBody = document.querySelector("#recommended tbody");

// ===============================
// UPDATE CALCULATION
// ===============================
function update() {
  const spur = parseFloat(spurEl.value);
  const pinion = parseFloat(pinionEl.value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  if (!spur || !pinion || !tire) return;

  const ratio = pinion / spur;
  const rollout = Math.PI * tire * ratio;
  const total = spur + pinion;

  rolloutEl.textContent = rollout.toFixed(2);
  totalEl.textContent = total;

  if (total >= car.min && total <= car.max) {
    legalEl.textContent = `Valid (${car.min}–${car.max})`;
    legalEl.className = "good";
  } else {
    legalEl.textContent = `Out of range (${car.min}–${car.max})`;
    legalEl.className = "bad";
  }

  buildFullTable();
  buildRecommended();
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", update);
});

update();

// ===============================
// SCROLL-TO-ADJUST INPUTS
// ===============================
function addScrollAdjust(el, step) {
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    el.value = (parseFloat(el.value) + step * dir).toFixed(3);
    update();
  });
}

addScrollAdjust(spurEl, 1);
addScrollAdjust(pinionEl, 1);

tireEl.addEventListener("wheel", (e) => {
  e.preventDefault();
  const val = parseFloat(tireEl.value);
  const isImperial = val < 5;
  const step = isImperial ? 0.005 : 0.05;
  const dir = e.deltaY < 0 ? 1 : -1;
  tireEl.value = (val + step * dir).toFixed(3);
  update();
});

// ===============================
// FULL GEARING TABLE
// ===============================
function buildFullTable() {
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const tbody = document.querySelector("#fullTable tbody");
  const thead = document.querySelector("#fullTable thead tr");

  tbody.innerHTML = "";
  thead.innerHTML = `<th>Spur ↓ / Pinion →</th>`;

  for (let pinion = 30; pinion <= 60; pinion++) {
    thead.innerHTML += `<th>${pinion}</th>`;
  }

  for (let spur = 50; spur <= 80; spur++) {
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${spur}</strong></td>`;

    for (let pinion = 30; pinion <= 60; pinion++) {
      const total = spur + pinion;
      const rollout = Math.PI * tire * (pinion / spur);
      const legal = total >= car.min && total <= car.max;

      row.innerHTML += `
        <td class="${legal ? 'legal-gear' : 'illegal-gear'}">
          ${rollout.toFixed(1)}
        </td>
      `;
    }

    tbody.appendChild(row);
  }
}

// ===============================
// TARGET MATCH FINDER
// ===============================
function findMatches() {
  const target = parseFloat(document.getElementById("target").value);
  const tolerance = parseFloat(document.getElementById("tolerance").value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  resultsBody.innerHTML = "";

  const matches = [];

  for (let spur = 50; spur <= 80; spur++) {
    for (let pinion = 30; pinion <= 60; pinion++) {
      const total = spur + pinion;
      if (total < car.min || total > car.max) continue;

      const rollout = Math.PI * tire * (pinion / spur);
      const diffPct = Math.abs((rollout - target) / target) * 100;

      if (diffPct <= tolerance) {
        matches.push({ spur, pinion, total, rollout, diffPct });
      }
    }
  }

  matches.sort((a, b) => a.diffPct - b.diffPct);

  matches.forEach(m => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.spur}</td>
      <td>${m.pinion}</td>
      <td>${m.total}</td>
      <td>${m.rollout.toFixed(2)}</td>
      <td>${m.diffPct.toFixed(2)}%</td>
    `;
    resultsBody.appendChild(row);
  });
}

document.getElementById("find").addEventListener("click", findMatches);

// ===============================
// RECOMMENDED GEARS (HIGH → LOW)
// ===============================
function buildRecommended() {
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const list = [];

  for (let spur = 50; spur <= 80; spur++) {
    for (let pinion = 30; pinion <= 60; pinion++) {
      const total = spur + pinion;
      if (total < car.min || total > car.max) continue;

      const rollout = Math.PI * tire * (pinion / spur);
      list.push({ spur, pinion, total, rollout });
    }
  }

  list.sort((a, b) => b.rollout - a.rollout);

  recommendedBody.innerHTML = "";

  list.forEach(m => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.spur}</td>
      <td>${m.pinion}</td>
      <td>${m.total}</td>
      <td>${m.rollout.toFixed(2)}</td>
    `;
    recommendedBody.appendChild(row);
  });
}

buildFullTable();
buildRecommended();
