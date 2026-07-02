import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const files = ["index.html", "src/styles.css", "src/game.js", "AGENTS.md", "README.md"];

for (const file of files) {
  const body = readFileSync(join(root, file), "utf8");
  if (!body.trim()) {
    throw new Error(`${file} is empty`);
  }
}

const html = readFileSync(join(root, "index.html"), "utf8");
const game = readFileSync(join(root, "src/game.js"), "utf8");

const requiredHtml = [
  '<canvas id="game"',
  'id="score"',
  'id="arrows"',
  'id="reset"',
  '<button id="draw" type="button" aria-label="Draw bow">Draw</button>',
  '<button id="fire" type="button" aria-label="Fire arrow">Fire</button>',
  'src="./src/game.js"'
];

for (const snippet of requiredHtml) {
  if (!html.includes(snippet)) {
    throw new Error(`index.html is missing ${snippet}`);
  }
}

const requiredGameSymbols = [
  "function startDraw",
  "function releaseArrow",
  "function scoreHit",
  "requestAnimationFrame(frame)",
  "pointerdown",
  "keydown"
];

for (const symbol of requiredGameSymbols) {
  if (!game.includes(symbol)) {
    throw new Error(`src/game.js is missing ${symbol}`);
  }
}

console.log("Static validation passed.");
