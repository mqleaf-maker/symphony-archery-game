const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreNode = document.querySelector("#score");
const arrowsNode = document.querySelector("#arrows");
const bestNode = document.querySelector("#best");
const resetButton = document.querySelector("#reset");
const drawButton = document.querySelector("#draw");
const fireButton = document.querySelector("#fire");

const state = {
  score: 0,
  arrows: 12,
  best: Number(localStorage.getItem("archery-best") || 0),
  pointer: { x: 840, y: 300 },
  drawing: false,
  drawStart: 0,
  power: 0,
  arrowsInFlight: [],
  hits: [],
  wind: 0.06
};

const bow = { x: 155, y: 430 };
const target = { x: 1020, y: 345, radius: 92 };
let lastFrame = performance.now();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateHud() {
  scoreNode.textContent = String(state.score);
  arrowsNode.textContent = String(state.arrows);
  bestNode.textContent = String(state.best);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function aimVector() {
  const dx = state.pointer.x - bow.x;
  const dy = state.pointer.y - bow.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function startDraw() {
  if (state.arrows <= 0 || state.drawing) return;
  state.drawing = true;
  state.drawStart = performance.now();
}

function releaseArrow() {
  if (!state.drawing || state.arrows <= 0) return;

  const aim = aimVector();
  const power = clamp((performance.now() - state.drawStart) / 1100, 0.18, 1);
  const speed = 520 + power * 760;

  state.arrowsInFlight.push({
    x: bow.x + aim.x * 42,
    y: bow.y + aim.y * 42,
    vx: aim.x * speed,
    vy: aim.y * speed,
    rotation: Math.atan2(aim.y, aim.x),
    stuck: false
  });

  state.drawing = false;
  state.power = 0;
  state.arrows -= 1;
  updateHud();
}

function scoreHit(x, y) {
  const distance = Math.hypot(x - target.x, y - target.y);
  if (distance > target.radius) return 0;
  if (distance < 16) return 10;
  if (distance < 34) return 8;
  if (distance < 56) return 6;
  if (distance < 76) return 4;
  return 2;
}

function registerHit(arrow) {
  const points = scoreHit(arrow.x, arrow.y);
  if (!points) return false;

  state.score += points;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem("archery-best", String(state.best));
  state.hits.push({ x: arrow.x, y: arrow.y, points, age: 0 });
  updateHud();
  return true;
}

function resetRound() {
  state.score = 0;
  state.arrows = 12;
  state.drawing = false;
  state.power = 0;
  state.arrowsInFlight = [];
  state.hits = [];
  updateHud();
}

function update(dt) {
  if (state.drawing) {
    state.power = clamp((performance.now() - state.drawStart) / 1100, 0, 1);
  }

  for (const arrow of state.arrowsInFlight) {
    if (arrow.stuck) continue;

    arrow.vx += state.wind * dt;
    arrow.vy += 620 * dt;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    arrow.rotation = Math.atan2(arrow.vy, arrow.vx);

    if (arrow.x > target.x - 8 && arrow.x < target.x + 14) {
      if (registerHit(arrow)) {
        arrow.stuck = true;
        arrow.vx = 0;
        arrow.vy = 0;
      }
    }
  }

  state.arrowsInFlight = state.arrowsInFlight.filter((arrow) => {
    return arrow.stuck || (arrow.x < canvas.width + 80 && arrow.y < canvas.height + 80);
  });

  for (const hit of state.hits) {
    hit.age += dt;
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#9ed0ef");
  sky.addColorStop(0.62, "#d8eef8");
  sky.addColorStop(0.63, "#80b06f");
  sky.addColorStop(1, "#4f7f45");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.ellipse(235, 105, 80, 24, 0, 0, Math.PI * 2);
  ctx.ellipse(300, 96, 105, 30, 0, 0, Math.PI * 2);
  ctx.ellipse(850, 130, 120, 28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTarget() {
  const rings = [
    ["#f5f0df", 92],
    ["#2f65a7", 75],
    ["#e93f3f", 57],
    ["#ffd74d", 37],
    ["#25342d", 16]
  ];

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.fillStyle = "#744b2c";
  ctx.fillRect(86, 85, 24, 190);

  for (const [color, radius] of rings) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(20, 35, 28, 0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBow() {
  const aim = aimVector();
  const pull = state.drawing ? 18 + state.power * 54 : 12;
  const stringX = bow.x - aim.x * pull;
  const stringY = bow.y - aim.y * pull;

  ctx.save();
  ctx.translate(bow.x, bow.y);
  ctx.rotate(Math.atan2(aim.y, aim.x));

  ctx.strokeStyle = "#5a3724";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 82, -1.15, 1.15);
  ctx.stroke();

  ctx.strokeStyle = "#f8f2e4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -74);
  ctx.lineTo(-pull, 0);
  ctx.lineTo(34, 74);
  ctx.stroke();

  ctx.fillStyle = "#f1c36d";
  ctx.fillRect(-12, -4, 92, 8);
  ctx.restore();

  if (state.drawing) {
    ctx.fillStyle = "rgba(20, 35, 28, 0.16)";
    ctx.beginPath();
    ctx.arc(stringX, stringY, 18 + state.power * 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawArrow(arrow) {
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(arrow.rotation);
  ctx.strokeStyle = "#3c2b1d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();
  ctx.fillStyle = "#d9483b";
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(28, -7);
  ctx.lineTo(28, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2d6f9f";
  ctx.fillRect(-42, -8, 12, 5);
  ctx.fillRect(-42, 3, 12, 5);
  ctx.restore();
}

function drawHits() {
  for (const hit of state.hits) {
    const alpha = clamp(1.4 - hit.age, 0, 1);
    ctx.fillStyle = `rgba(20, 35, 28, ${alpha})`;
    ctx.font = "700 28px system-ui";
    ctx.fillText(`+${hit.points}`, hit.x + 16, hit.y - 16);
  }
}

function drawAimGuide() {
  if (!state.drawing) return;
  const aim = aimVector();
  ctx.save();
  ctx.setLineDash([12, 12]);
  ctx.strokeStyle = "rgba(20, 35, 28, 0.34)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bow.x, bow.y);
  ctx.lineTo(bow.x + aim.x * (280 + state.power * 170), bow.y + aim.y * (280 + state.power * 170));
  ctx.stroke();
  ctx.restore();
}

function render() {
  drawBackground();
  drawTarget();
  drawAimGuide();
  drawBow();
  for (const arrow of state.arrowsInFlight) drawArrow(arrow);
  drawHits();

  if (state.arrows === 0 && state.arrowsInFlight.every((arrow) => arrow.stuck)) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillRect(428, 286, 344, 110);
    ctx.fillStyle = "#14231c";
    ctx.font = "700 34px system-ui";
    ctx.fillText("Round complete", 474, 332);
    ctx.font = "500 18px system-ui";
    ctx.fillText("Press Reset to play again", 501, 368);
  }
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.04);
  lastFrame = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointermove", (event) => {
  state.pointer = canvasPoint(event);
});

canvas.addEventListener("pointerdown", (event) => {
  state.pointer = canvasPoint(event);
  canvas.setPointerCapture(event.pointerId);
  startDraw();
});

canvas.addEventListener("pointerup", releaseArrow);
canvas.addEventListener("pointercancel", () => {
  state.drawing = false;
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    startDraw();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    releaseArrow();
  }
});

resetButton.addEventListener("click", resetRound);
drawButton.addEventListener("pointerdown", startDraw);
drawButton.addEventListener("pointerup", releaseArrow);
fireButton.addEventListener("click", releaseArrow);

updateHud();
requestAnimationFrame(frame);
