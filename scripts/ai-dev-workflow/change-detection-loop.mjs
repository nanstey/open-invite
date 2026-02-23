#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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

  const priorState = readJsonFile(statePath, {
    lastCheckedAt: new Date(0).toISOString(),
    onDeckProjects: [],
  });

  const rawProjects = onDeckCommand ? runJsonCommand(onDeckCommand) : [];
  const onDeckProjects = normalizeProjects(rawProjects);

  const changedProjects = detectProjectChanges(onDeckProjects, priorState);
  const newComments = detectNewPrComments(onDeckProjects, priorState.lastCheckedAt, ghRepo);

  const hasChanges = changedProjects.length > 0 || newComments.length > 0;
  const nextState = {
    lastCheckedAt: new Date().toISOString(),
    onDeckProjects,
  };

  writeJsonFile(statePath, nextState);

  if (!hasChanges) {
    console.log("[ai-dev-workflow] no-op: no on_deck project changes or new PR comments");
    return;
  }

  console.log("[ai-dev-workflow] change detected", {
    changedProjects,
    newComments,
  });
  console.log("[ai-dev-workflow] bootstrap mode: no worker spawn yet");
}

try {
  main();
} catch (error) {
  notifyError("change detection loop failed", error);
  process.exit(1);
}
