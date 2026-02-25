#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

const defaultStatePath = ".ai-dev-workflow/state.json";

function readJsonFile(filePath, fallback) {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runJsonCommand(command) {
  const output = execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(output);
}

function runGhJson(args) {
  const output = execSync(`gh api ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(output);
}

function prNumberFromUrl(url) {
  if (!url) {
    return null;
  }

  const match = /\/pull\/(\d+)$/.exec(url);
  return match ? Number(match[1]) : null;
}

function normalizeProjects(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((project) => project && project.status === "on_deck")
    .map((project) => {
      const proposalPr = prNumberFromUrl(project?.links?.proposal?.url);
      const implementationPr = prNumberFromUrl(project?.links?.implementation?.url);

      return {
        id: project.id,
        status: project.status,
        updatedAt: project.updated_at ?? null,
        prs: [proposalPr, implementationPr].filter((value) => Number.isInteger(value)),
      };
    });
}

function detectProjectChanges(onDeckProjects, priorState) {
  const priorMap = new Map((priorState.onDeckProjects ?? []).map((project) => [project.id, project.updatedAt]));

  const changed = [];
  for (const project of onDeckProjects) {
    const previousUpdatedAt = priorMap.get(project.id);
    if (!previousUpdatedAt || previousUpdatedAt !== project.updatedAt) {
      changed.push(project.id);
    }
  }

  return changed;
}

function detectNewPrComments(onDeckProjects, sinceIso, ghRepo) {
  if (!ghRepo) {
    return [];
  }

  const trackedPrs = [...new Set(onDeckProjects.flatMap((project) => project.prs))];
  if (trackedPrs.length === 0) {
    return [];
  }

  const comments = [];
  for (const pr of trackedPrs) {
    const encodedSince = encodeURIComponent(sinceIso);
    const endpoint = `/repos/${ghRepo}/issues/${pr}/comments?since=${encodedSince}&per_page=100`;
    const result = runGhJson(endpoint);

    if (Array.isArray(result) && result.length > 0) {
      comments.push({ pr, count: result.length });
    }
  }

  return comments;
}

function detectFailedWorkflowRuns(sinceIso, ghRepo) {
  if (!ghRepo) {
    return [];
  }

  const endpoint = `/repos/${ghRepo}/actions/runs?status=completed&per_page=100`;
  const result = runGhJson(endpoint);
  const runs = Array.isArray(result?.workflow_runs) ? result.workflow_runs : [];
  const sinceMs = Date.parse(sinceIso);

  return runs
    .filter((run) => {
      const updatedMs = Date.parse(run?.updated_at ?? run?.created_at ?? 0);
      if (Number.isNaN(updatedMs) || updatedMs <= sinceMs) {
        return false;
      }

      return ["failure", "timed_out", "cancelled", "action_required", "startup_failure"].includes(
        run?.conclusion,
      );
    })
    .map((run) => ({
      id: run.id,
      name: run.name,
      runNumber: run.run_number,
      conclusion: run.conclusion,
      event: run.event,
      branch: run.head_branch,
      updatedAt: run.updated_at,
      url: run.html_url,
    }));
}

function getCurrentBranch() {
  const output = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output.trim();
}

function branchKey(name) {
  return String(name ?? "unknown").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function acquireBranchLock(branch) {
  const key = branchKey(branch);
  const lockPath = `.ai-dev-workflow/locks/${key}.lock.json`;

  if (existsSync(lockPath)) {
    const lock = readJsonFile(lockPath, null);
    throw new Error(
      `branch lock already held for ${branch} at ${lockPath}${lock ? ` (owner pid=${lock.pid}, startedAt=${lock.startedAt})` : ""}`,
    );
  }

  writeJsonFile(lockPath, {
    branch,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  });

  return lockPath;
}

function releaseBranchLock(lockPath) {
  if (!lockPath) {
    return;
  }

  if (existsSync(lockPath)) {
    rmSync(lockPath);
  }
}

function remediateFailedWorkflowRuns({ failedWorkflowRuns, ghRepo, statePath }) {
  const remediationCommand =
    process.env.AI_DEV_WORKFLOW_CI_REMEDIATION_CMD ?? "node automation/ai-workflow/scripts/ci-remediate.mjs";
  if (failedWorkflowRuns.length === 0) {
    return;
  }

  const currentBranch = getCurrentBranch();
  const autoFixAllBranches = process.env.AI_DEV_WORKFLOW_AUTO_FIX_ALL_BRANCHES === "1";
  const eligibleRuns = autoFixAllBranches
    ? failedWorkflowRuns
    : failedWorkflowRuns.filter((run) => run.branch === currentBranch);

  if (eligibleRuns.length === 0) {
    console.log("[ai-dev-workflow] CI failures detected, but none match current branch; skipping auto-remediation", {
      currentBranch,
      detectedBranches: [...new Set(failedWorkflowRuns.map((run) => run.branch).filter(Boolean))],
    });
    return;
  }

  const failurePayload = {
    repo: ghRepo ?? null,
    currentBranch,
    statePath,
    failedWorkflowRuns: eligibleRuns,
  };

  const payloadPath = ".ai-dev-workflow/ci-failures-latest.json";
  writeJsonFile(payloadPath, failurePayload);

  console.log("[ai-dev-workflow] running CI remediation command", {
    remediationCommand,
    eligibleRunCount: eligibleRuns.length,
    payloadPath,
  });

  execSync(remediationCommand, {
    stdio: "inherit",
    env: {
      ...process.env,
      GH_REPO: ghRepo ?? process.env.GH_REPO ?? "",
      AI_DEV_WORKFLOW_CURRENT_BRANCH: currentBranch,
      AI_DEV_WORKFLOW_FAILED_RUNS_FILE: payloadPath,
      AI_DEV_WORKFLOW_FAILED_RUNS_JSON: JSON.stringify(failurePayload),
    },
  });
}

function notifyError(message, error) {
  console.error(`[ai-dev-workflow:error] ${message}`);
  if (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }

  // TODO(credentials): Wire Telegram notifications when approved and safely configured.
  // Intentionally only used for error/exception paths.
}

function main() {
  const statePath = process.env.AI_DEV_WORKFLOW_STATE_PATH ?? defaultStatePath;
  const onDeckCommand = process.env.OPEN_INVITE_ON_DECK_CMD;
  const ghRepo = process.env.GH_REPO;
  const currentBranch = getCurrentBranch();
  const lockPath = acquireBranchLock(currentBranch);

  try {
    const priorState = readJsonFile(statePath, {
      lastCheckedAt: new Date(0).toISOString(),
      onDeckProjects: [],
    });

    const rawProjects = onDeckCommand ? runJsonCommand(onDeckCommand) : [];
    const onDeckProjects = normalizeProjects(rawProjects);

    const changedProjects = detectProjectChanges(onDeckProjects, priorState);
    const newComments = detectNewPrComments(onDeckProjects, priorState.lastCheckedAt, ghRepo);
    const failedWorkflowRuns = detectFailedWorkflowRuns(priorState.lastCheckedAt, ghRepo);

    const hasChanges = changedProjects.length > 0 || newComments.length > 0 || failedWorkflowRuns.length > 0;
    const nextState = {
      lastCheckedAt: new Date().toISOString(),
      onDeckProjects,
    };

    if (!hasChanges) {
      writeJsonFile(statePath, nextState);
      console.log("[ai-dev-workflow] no-op: no on_deck project changes, PR comment changes, or CI failures");
      return;
    }

    console.log("[ai-dev-workflow] change detected", {
      changedProjects,
      newComments,
      failedWorkflowRuns,
    });

    remediateFailedWorkflowRuns({
      failedWorkflowRuns,
      ghRepo,
      statePath,
    });

    writeJsonFile(statePath, nextState);
    console.log("[ai-dev-workflow] bootstrap mode: change detected and state persisted");
  } finally {
    releaseBranchLock(lockPath);
  }
}

try {
  main();
} catch (error) {
  notifyError("change detection loop failed", error);
  process.exit(1);
}
