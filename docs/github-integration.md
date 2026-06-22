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
```

Do not commit tokens. `.env` and `.env.*` are ignored for local experiments.
`.env.example` is intentionally committed as a non-secret template.

Symphony copies the project `.env` into each issue workspace and the PR helper
loads it before pushing. This gives the agent only the project-specific GitHub
settings needed for this experiment.

If Linear is already connected to GitHub, the `SYM-*` issue key in the branch
name and PR title should let Linear associate the PR with the issue. That
integration does not replace the local GitHub credentials needed to push a
branch and create the PR.

## PR helper

After an agent changes files and `npm test` passes, run:

```bash
npm run github:pr -- SYM-6 "Improve hit feedback and round summary"
```

The helper:

- creates a branch named `symphony/<issue-id>`;
- commits the current workspace changes with a temporary commit identity;
- pushes to the repo-local `github` remote;
- creates a GitHub PR if `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are set;
- exits with a blocker if the `github` remote, `GITHUB_TOKEN`, or
  `GITHUB_REPOSITORY` is missing.
