const cars = {
  a12: { name: "Awesomatix A12", min: 112, max: 120 },
  a12x: { name: "Awesomatix A12X", min: 112, max: 125 }
};

const spurEl = document.getElementById("spur");
const pinionEl = document.getElementById("pinion");
const tireEl = document.getElementById("tire");
const carEl = document.getElementById("car");

const rolloutEl = document.getElementById("rollout");
const totalEl = document.getElementById("total");
const legalEl = document.getElementById("legal");

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
    legalEl.textContent = "Valid (" + car.min + "–" + car.max + ")";
    legalEl.className = "good";
  } else {
    legalEl.textContent = "Out of range (" + car.min + "–" + car.max + ")";
    legalEl.className = "bad";
  }
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", update);
});

update();

// Gear finder
function findMatches() {
  const target = parseFloat(document.getElementById("target").value);
  const tolerance = parseFloat(document.getElementById("tolerance").value);
  const tire = parseFloat(tireEl.value);
  const car = cars[carEl.value];

  const tbody = document.querySelector("#results tbody");
  tbody.innerHTML = "";

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
    tbody.appendChild(row);
  });
}

document.getElementById("find").addEventListener("click", findMatches);
