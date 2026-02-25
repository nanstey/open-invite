#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function shell(command, { allowFail = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    encoding: "utf8",
  });

  if (!allowFail && result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${command}`);
  }

  return result.status ?? 1;
}

function shellOutput(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readFailurePayload() {
  const inline = process.env.AI_DEV_WORKFLOW_FAILED_RUNS_JSON;
  if (inline) {
    return JSON.parse(inline);
  }

  const filePath = process.env.AI_DEV_WORKFLOW_FAILED_RUNS_FILE;
  if (filePath && existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, "utf8"));
  }

  return { failedWorkflowRuns: [] };
}

function ensureWorkspaceStateDir() {
  const path = ".ai-dev-workflow";
  mkdirSync(path, { recursive: true });
  return path;
}

function writeSummary(payload, currentBranch) {
  const stateDir = ensureWorkspaceStateDir();
  const summaryPath = `${stateDir}/ci-remediation-summary.md`;

  const lines = [
    "# CI Remediation Summary",
    "",
    `- Branch: ${currentBranch}`,
    `- Timestamp: ${new Date().toISOString()}`,
    "",
    "## Failed runs considered",
  ];

  const failedRuns = Array.isArray(payload.failedWorkflowRuns) ? payload.failedWorkflowRuns : [];
  if (failedRuns.length === 0) {
    lines.push("- None");
  } else {
    for (const run of failedRuns) {
      lines.push(
        `- #${run.runNumber ?? "?"} ${run.name ?? "workflow"} (${run.conclusion ?? "unknown"}) [${run.branch ?? "?"}] ${run.url ?? ""}`,
      );
    }
  }

  lines.push("", "## Local remediation actions", "- pnpm lint:fix", "- pnpm format", "- pnpm lint", "- pnpm test", "- pnpm build", "");

  writeFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
  return summaryPath;
}

function main() {
  if (process.env.PAUSE_AUTONOMY === "1" || process.env.REVIEW_ONLY_MODE === "1") {
    console.log("[ai-dev-workflow] ci-remediate: disabled by PAUSE_AUTONOMY/REVIEW_ONLY_MODE");
    return;
  }

  const payload = readFailurePayload();
  const failedRuns = Array.isArray(payload.failedWorkflowRuns) ? payload.failedWorkflowRuns : [];
  if (failedRuns.length === 0) {
    console.log("[ai-dev-workflow] ci-remediate: no failed runs payload; nothing to do");
    return;
  }

  const currentBranch = shellOutput("git rev-parse --abbrev-ref HEAD");
  const targetBranch = process.env.AI_DEV_WORKFLOW_CURRENT_BRANCH || currentBranch;
  if (targetBranch !== currentBranch) {
    throw new Error(`branch mismatch: current=${currentBranch} target=${targetBranch}`);
  }

  // Keep scope safe: only auto-fix for failures on current branch.
  const branchScopedRuns = failedRuns.filter((run) => !run.branch || run.branch === currentBranch);
  if (branchScopedRuns.length === 0) {
    console.log("[ai-dev-workflow] ci-remediate: failed runs are not on current branch; skipping");
    return;
  }

  // Install deps only when needed.
  if (!existsSync("node_modules")) {
    shell("corepack pnpm install --frozen-lockfile", { allowFail: false });
  }

  // Apply common auto-remediations first.
  shell("corepack pnpm lint:fix", { allowFail: true });
  shell("corepack pnpm format", { allowFail: true });

  // Validate (non-zero means still broken; we still capture that outcome).
  const lintStatus = shell("corepack pnpm lint", { allowFail: true });
  const testStatus = shell("corepack pnpm test", { allowFail: true });
  const buildStatus = shell("corepack pnpm build", { allowFail: true });

  const summaryPath = writeSummary({ ...payload, failedWorkflowRuns: branchScopedRuns }, currentBranch);

  const hasChanges = shellOutput("git status --porcelain").length > 0;
  if (!hasChanges) {
    console.log("[ai-dev-workflow] ci-remediate: no file changes produced");
    return;
  }

  shell(`git add -A`);

  const runIds = branchScopedRuns.map((run) => run.id).filter(Boolean).slice(0, 5).join(",");
  const commitMsg = runIds
    ? `fix(ci): auto-remediate failing workflow runs (${runIds})`
    : "fix(ci): auto-remediate failing workflow runs";

  if (process.env.NO_COMMIT_MODE === "1") {
    console.log("[ai-dev-workflow] ci-remediate: NO_COMMIT_MODE enabled; changes staged but not committed/pushed");
    return;
  }

  shell(`git commit -m "${commitMsg.replace(/"/g, "'")}"`);

  const branchBeforePush = shellOutput("git rev-parse --abbrev-ref HEAD");
  if (branchBeforePush !== currentBranch || branchBeforePush !== targetBranch) {
    throw new Error(
      `branch identity assertion failed before push: current=${currentBranch} target=${targetBranch} beforePush=${branchBeforePush}`,
    );
  }

  shell(`git push origin ${currentBranch}`);

  console.log("[ai-dev-workflow] ci-remediate: pushed remediation commit", {
    currentBranch,
    lintStatus,
    testStatus,
    buildStatus,
    summaryPath,
  });
}

try {
  main();
} catch (error) {
  console.error("[ai-dev-workflow] ci-remediate failed");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
