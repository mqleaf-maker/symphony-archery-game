import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync
} from "node:fs";

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

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const args = rawArgs.filter((arg) => arg !== "--dry-run");
const [issueIdentifier = "issue", ...titleParts] = args;
const issueTitle = titleParts.join(" ").trim() || issueIdentifier;
const branch = `symphony/${issueIdentifier.toLowerCase().replace(/[^a-z0-9._-]+/g, "-")}`;
const base = process.env.GITHUB_BASE_BRANCH || "main";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const authorName = process.env.SYMPHONY_GIT_AUTHOR_NAME || "Symphony Bot";
const authorEmail =
  process.env.SYMPHONY_GIT_AUTHOR_EMAIL ||
  "symphony-bot@users.noreply.github.com";

function git(args, options = {}) {
  const output = execFileSync("git", args, {
    encoding: options.encoding || "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0"
    }
  });
  if (typeof output !== "string") return output;
  return options.trim === false ? output : output.trim();
}

function remoteUrl(name) {
  try {
    return git(["remote", "get-url", name]);
  } catch {
    return "";
  }
}

function repoFromUrl(url) {
  if (!url) return "";

  const patterns = [
    /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/,
    /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/,
    /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function repository() {
  return (
    process.env.GITHUB_REPOSITORY ||
    repoFromUrl(process.env.GITHUB_REPO_URL || "") ||
    repoFromUrl(remoteUrl("github")) ||
    repoFromUrl(remoteUrl("origin"))
  );
}

function encodePathPart(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function parseStatus(output) {
  if (!output) return [];

  const parts = output.split("\0").filter(Boolean);
  const changes = [];

  for (let index = 0; index < parts.length; index += 1) {
    const entry = parts[index];
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    const [indexStatus, worktreeStatus] = status;

    if (indexStatus === "R" || indexStatus === "C") {
      const oldPath = parts[index + 1];
      index += 1;
      if (indexStatus === "R" && oldPath && oldPath !== path) {
        changes.push({ path: oldPath, status: "deleted" });
      }
      changes.push({ path, status: "upsert" });
      continue;
    }

    if (indexStatus === "D" || worktreeStatus === "D") {
      changes.push({ path, status: "deleted" });
      continue;
    }

    changes.push({ path, status: "upsert" });
  }

  return changes;
}

function dedupeChanges(changes) {
  const byPath = new Map();
  for (const change of changes) {
    byPath.set(change.path, change);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function workspaceChanges() {
  const output = git([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all"
  ], { trim: false });
  return dedupeChanges(parseStatus(output));
}

function trackedMode(path) {
  try {
    const output = git(["ls-files", "--stage", "--", path]);
    const [mode] = output.split(/\s+/);
    return mode || "";
  } catch {
    return "";
  }
}

function fileEntry(change) {
  if (change.status === "deleted") {
    return {
      path: change.path,
      mode: "100644",
      type: "blob",
      sha: null
    };
  }

  const stat = lstatSync(change.path);
  const tracked = trackedMode(change.path);

  if (stat.isSymbolicLink()) {
    return {
      path: change.path,
      mode: "120000",
      type: "blob",
      content: readlinkSync(change.path)
    };
  }

  const mode =
    tracked === "100755" || (!tracked && (stat.mode & 0o111)) ? "100755" : "100644";

  return {
    path: change.path,
    mode,
    type: "blob",
    content: readFileSync(change.path).toString("base64"),
    encoding: "base64"
  };
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

async function existingPullRequest(repo) {
  const [owner] = repo.split("/");
  const pulls = await githubRequest(
    `/repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`
  );
  return pulls[0] || null;
}

async function createBlob(repo, entry) {
  if (entry.sha === null) return entry;

  const blob = await githubRequest(`/repos/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({
      content: entry.content,
      encoding: entry.encoding || "utf-8"
    })
  });

  return {
    path: entry.path,
    mode: entry.mode,
    type: entry.type,
    sha: blob.sha
  };
}

async function upsertBranch(repo, commitSha) {
  try {
    await githubRequest(`/repos/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: commitSha
      })
    });
    return;
  } catch (error) {
    if (error.status !== 422) throw error;
  }

  await githubRequest(`/repos/${repo}/git/refs/heads/${encodePathPart(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({
      sha: commitSha,
      force: true
    })
  });
}

async function createPullRequest(repo) {
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
    return;
  } catch (error) {
    if (error.status !== 422) throw error;
  }

  const pr = await existingPullRequest(repo);
  if (pr) {
    console.log(`Existing PR: ${pr.html_url}`);
    return;
  }

  throw new Error("GitHub rejected PR creation and no matching open PR was found.");
}

async function createCommitFromWorkspace(repo, changes) {
  const baseRef = await githubRequest(
    `/repos/${repo}/git/ref/heads/${encodePathPart(base)}`
  );
  const baseSha = baseRef.object.sha;
  const baseCommit = await githubRequest(`/repos/${repo}/git/commits/${baseSha}`);

  const treeEntries = [];
  for (const change of changes) {
    const entry = fileEntry(change);
    treeEntries.push(await createBlob(repo, entry));
  }

  const tree = await githubRequest(`/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeEntries
    })
  });

  const commit = await githubRequest(`/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `${issueIdentifier}: ${issueTitle}`,
      tree: tree.sha,
      parents: [baseSha],
      author: {
        name: authorName,
        email: authorEmail
      },
      committer: {
        name: authorName,
        email: authorEmail
      }
    })
  });

  return commit.sha;
}

async function main() {
  const repo = repository();
  const changes = workspaceChanges();

  if (dryRun) {
    console.log(`Repository: ${repo || "(not configured)"}`);
    console.log(`Base branch: ${base}`);
    console.log(`PR branch: ${branch}`);
    console.log(`Changed files: ${changes.length}`);
    for (const change of changes) {
      console.log(`- ${change.status}: ${change.path}`);
    }
    return;
  }

  if (!token || !repo) {
    throw new Error("Set GITHUB_TOKEN and GITHUB_REPOSITORY=owner/repo to create the PR.");
  }

  if (changes.length === 0) {
    const pr = await existingPullRequest(repo);
    if (pr) {
      console.log(`No local changes. Existing PR: ${pr.html_url}`);
      return;
    }
    throw new Error("No local changes to publish and no matching open PR was found.");
  }

  const commitSha = await createCommitFromWorkspace(repo, changes);
  await upsertBranch(repo, commitSha);
  await createPullRequest(repo);
}

try {
  await main();
} catch (error) {
  console.error(`GitHub PR handoff failed: ${error.message}`);
  process.exit(2);
}
