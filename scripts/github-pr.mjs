import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function loadDotEnv(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnv(process.env.SYMPHONY_ENV_FILE || ".env");

const [, , issueIdentifier = "issue", ...titleParts] = process.argv;
const issueTitle = titleParts.join(" ").trim() || issueIdentifier;
const branch = `symphony/${issueIdentifier.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")}`;
const base = process.env.GITHUB_BASE_BRANCH || "main";
const repo = process.env.GITHUB_REPOSITORY || "";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function git(args, options = {}) {
  const output = execFileSync("git", args, {
    encoding: "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...(options.env || {}),
      GIT_TERMINAL_PROMPT: "0"
    }
  });
  return typeof output === "string" ? output.trim() : "";
}

function hasChanges() {
  return git(["status", "--porcelain"]).length > 0;
}

function currentBranch() {
  return git(["branch", "--show-current"]) || "HEAD";
}

function ensureBranch() {
  if (currentBranch() === branch) return;

  try {
    git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
    git(["switch", branch], { stdio: "inherit" });
  } catch {
    git(["switch", "-c", branch], { stdio: "inherit" });
  }
}

function ensureLocalCommit() {
  if (!hasChanges()) {
    console.log("No local changes to commit.");
    return;
  }

  git(["add", "-A"], { stdio: "inherit" });
  git(
    [
      "-c",
      "user.name=Symphony Bot",
      "-c",
      "user.email=symphony-bot@users.noreply.github.com",
      "commit",
      "-m",
      `${issueIdentifier}: ${issueTitle}`
    ],
    { stdio: "inherit" }
  );
}

function remoteUrl() {
  try {
    return git(["remote", "get-url", "github"]);
  } catch {
    return "";
  }
}

async function githubRequest(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {})
    }
  });

  const body = await response.text();
  const data = body ? JSON.parse(body) : {};
  if (!response.ok) {
    const error = new Error(data.message || response.statusText);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function createPullRequest() {
  if (!token || !repo) {
    throw new Error("Set GITHUB_TOKEN and GITHUB_REPOSITORY=owner/repo to create the PR.");
  }

  const body = [
    `Linear issue: ${issueIdentifier}`,
    "",
    "Validation:",
    "- npm test",
    "",
    "Created by Symphony GitHub helper."
  ].join("\n");

  try {
    const pr = await githubRequest(`/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `${issueIdentifier}: ${issueTitle}`,
        head: branch,
        base,
        body
      })
    });
    console.log(`Created PR: ${pr.html_url}`);
  } catch (error) {
    if (error.status !== 422) throw error;

    const [owner] = repo.split("/");
    const pulls = await githubRequest(
      `/repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`
    );
    if (pulls.length > 0) {
      console.log(`Existing PR: ${pulls[0].html_url}`);
      return;
    }

    throw error;
  }
}

function pushBranch(url) {
  if (!url.startsWith("https://")) {
    git(["push", "-u", "github", `HEAD:${branch}`], { stdio: "inherit" });
    return;
  }

  if (!token) {
    throw new Error("Set GITHUB_TOKEN to push to the HTTPS GitHub remote.");
  }

  const askpassDir = mkdtempSync(join(tmpdir(), "symphony-git-askpass-"));
  const askpassPath = join(askpassDir, "askpass.sh");
  writeFileSync(
    askpassPath,
    [
      "#!/bin/sh",
      "case \"$1\" in",
      "  *Username*) printf '%s\\n' \"x-access-token\" ;;",
      "  *Password*) printf '%s\\n' \"$GITHUB_TOKEN\" ;;",
      "  *) printf '%s\\n' \"$GITHUB_TOKEN\" ;;",
      "esac",
      ""
    ].join("\n"),
    { mode: 0o700 }
  );
  chmodSync(askpassPath, 0o700);

  try {
    git(["push", "-u", "github", `HEAD:${branch}`], {
      stdio: "inherit",
      env: {
        GIT_ASKPASS: askpassPath,
        SSH_ASKPASS: askpassPath,
        GIT_TERMINAL_PROMPT: "0"
      }
    });
  } finally {
    rmSync(askpassDir, { recursive: true, force: true });
  }
}

async function main() {
  ensureBranch();
  ensureLocalCommit();

  const url = remoteUrl();
  if (!url) {
    throw new Error("Missing repo-local remote named 'github'.");
  }

  pushBranch(url);
  await createPullRequest();
}

try {
  await main();
} catch (error) {
  console.error(`GitHub PR handoff failed: ${error.message}`);
  process.exit(2);
}
