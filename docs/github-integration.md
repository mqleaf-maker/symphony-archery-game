# GitHub Integration

This project keeps GitHub integration repo-local so it does not change any
global Git or GitLab configuration.

## Local-only Git settings

Use a separate remote named `github`:

```bash
git remote add github git@github.com:<owner>/<repo>.git
git config --local remote.pushDefault github
```

These commands only edit this repository's `.git/config`. They do not touch
`~/.gitconfig`, existing GitLab remotes, or global credential helpers.

## Environment variables

Create a project-local `.env` file when you want Symphony to create GitHub PRs:

```bash
cp .env.example .env
```

Then edit `.env`:

```bash
GITHUB_REPO_URL=git@github.com:<owner>/<repo>.git
GITHUB_REPOSITORY=<owner>/<repo>
GITHUB_TOKEN=<github-token-with-repo-access>
GITHUB_BASE_BRANCH=main
SYMPHONY_GIT_AUTHOR_NAME="Symphony Bot"
SYMPHONY_GIT_AUTHOR_EMAIL=symphony-bot@users.noreply.github.com
```

Do not commit tokens. `.env` and `.env.*` are ignored for local experiments.
`.env.example` is intentionally committed as a non-secret template.
Because Symphony sources this file from shell hooks, quote values that contain
spaces.

Symphony copies the project `.env` into each issue workspace and the PR helper
loads it before publishing a PR. This gives the agent only the project-specific
GitHub settings needed for this experiment.

HTTPS remotes are supported and are the simplest option for this PoC:

```bash
GITHUB_REPO_URL=https://github.com/<owner>/<repo>.git
```

The helper uses `GITHUB_TOKEN` only for GitHub API requests. It does not write
GitHub credentials into the global Git credential store and does not need to
modify your global Git or GitLab configuration.

If Linear is already connected to GitHub, the `SYM-*` issue key in the branch
name and PR title should let Linear associate the PR with the issue. That
integration does not replace the project-local GitHub token needed to create
the branch commit and PR.

## PR helper

After an agent changes files and `npm test` passes, run:

```bash
npm run github:pr -- SYM-6 "Improve hit feedback and round summary"
```

The helper:

- reads the current workspace changes with `git status`;
- creates GitHub blobs, a tree, a commit, and a `symphony/<issue-id>` branch
  through the GitHub API;
- creates a GitHub PR if `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are set;
- returns an existing open PR for the same branch if one already exists;
- exits with a blocker if `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, or local
  changes are missing.

It intentionally does not run `git switch`, `git add`, `git commit`, or
`git push`, and it sets `GIT_OPTIONAL_LOCKS=0` for read-only Git inspection.
This keeps the handoff compatible with Symphony/Codex workspaces where the
project `.git` directory may be read-only inside the agent sandbox.

You can verify what would be published without writing to GitHub:

```bash
npm run github:pr -- --dry-run SYM-6 "Improve hit feedback and round summary"
```

Symphony creates each issue workspace with `git clone`, so helper changes must
be committed in the source repository before starting a new Symphony issue run.
Uncommitted local edits in the source checkout are not copied into new issue
workspaces.
