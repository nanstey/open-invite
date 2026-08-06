#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_OUTPUT_DIR = "artifacts/crap";

function fail(message) {
  console.error(`[crap-backlog] ${message}`);
  process.exit(1);
}

function run(command, args, { capture = false, allowedStatuses = [0] } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) fail(`could not run ${command}: ${result.error.message}`);
  if (!allowedStatuses.includes(result.status ?? 1)) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} exited with ${result.status ?? "unknown"}`);
  }

  return result.stdout ?? "";
}

function normalizeTarget(value) {
  const target = relative(process.cwd(), resolve(value)).replaceAll("\\", "/").replace(/\/$/, "");
  if (!target || target === ".." || target.startsWith("../")) fail("--target must be inside the repository");
  return target;
}

function parseArgs(argv) {
  const options = { outputDir: DEFAULT_OUTPUT_DIR, limit: 25, refreshCoverage: true, target: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--help") {
      console.log(`Usage: pnpm crap:backlog [--target <file-or-folder>] [--limit <n>] [--output <dir>] [--skip-coverage]

Generates a fresh CRAP backlog and selects exactly one highest-risk file for a remediation run.`);
      process.exit(0);
    }
    if (argument === "--target" || argument === "--output" || argument === "--limit") {
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      index += 1;
      if (argument === "--target") options.target = normalizeTarget(value);
      if (argument === "--output") options.outputDir = value;
      if (argument === "--limit") {
        options.limit = Number(value);
        if (!Number.isInteger(options.limit) || options.limit < 1) fail("--limit must be a positive integer");
      }
      continue;
    }
    if (argument === "--skip-coverage") {
      options.refreshCoverage = false;
      continue;
    }
    fail(`unknown argument: ${argument}`);
  }

  return options;
}

function runReport(reportPath) {
  // Redirect to a file rather than a Node pipe: crap4ts can emit a report larger
  // than the child-process pipe buffer and otherwise leave truncated JSON.
  const result = spawnSync(
    "sh",
    [
      "-c",
      'exec "$@" > "$CRAP_REPORT"',
      "crap4ts-report",
      "pnpm",
      "exec",
      "crap4ts",
      "--coverage",
      "coverage/coverage-final.json",
      "--format",
      "json",
    ],
    { cwd: process.cwd(), env: { ...process.env, CRAP_REPORT: reportPath }, stdio: "inherit" },
  );
  if (result.error) fail(`could not run crap4ts: ${result.error.message}`);
  if (![0, 1].includes(result.status ?? 1)) fail(`crap4ts exited with ${result.status ?? "unknown"}`);
  return readFileSync(reportPath, "utf8");
}

function parseReport(stdout) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`crap4ts did not return JSON: ${error.message}`);
  }
}

function inTarget(filePath, target) {
  return !target || filePath === target || filePath.startsWith(`${target}/`);
}

function summarize(report, target) {
  const files = new Map();
  for (const entry of report.functions ?? []) {
    if (!entry.exceeds || !entry.scored) continue;
    const { identity, cyclomaticComplexity, coveragePercent, crap } = entry.scored;
    if (!inTarget(identity.filePath, target)) continue;

    const file = files.get(identity.filePath) ?? { path: identity.filePath, maxCrap: 0, functions: [] };
    const functionSummary = {
      name: identity.qualifiedName,
      startLine: identity.span.startLine,
      endLine: identity.span.endLine,
      crap: crap.value,
      complexity: cyclomaticComplexity,
      coverage: coveragePercent,
    };
    file.functions.push(functionSummary);
    file.maxCrap = Math.max(file.maxCrap, functionSummary.crap);
    files.set(identity.filePath, file);
  }

  return [...files.values()]
    .map((file) => ({
      ...file,
      functions: file.functions.sort((left, right) => right.crap - left.crap),
    }))
    .sort((left, right) => right.maxCrap - left.maxCrap || right.functions.length - left.functions.length || left.path.localeCompare(right.path));
}

function markdown(backlog, target, limit) {
  const visible = backlog.slice(0, limit);
  const lines = [
    "# CRAP remediation backlog",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Scope: ${target ?? "domains, services, lib, pages"}`,
    `Files above threshold: ${backlog.length}`,
    "",
    "## Next target",
    "",
  ];

  if (backlog[0]) {
    const next = backlog[0];
    lines.push(`- **${next.path}** — max CRAP ${next.maxCrap}; ${next.functions.length} function(s) above threshold.`);
    for (const fn of next.functions) lines.push(`  - ${fn.name}:${fn.startLine} — CRAP ${fn.crap}, complexity ${fn.complexity}, coverage ${fn.coverage}%`);
  } else {
    lines.push("No functions exceed the configured threshold.");
  }

  lines.push("", `## Top ${visible.length} files`, "", "| File | Max CRAP | Functions over threshold |", "| --- | ---: | ---: |");
  for (const file of visible) lines.push(`| ${file.path} | ${file.maxCrap} | ${file.functions.length} |`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.refreshCoverage) run("pnpm", ["test:coverage"]);

  const outputDir = resolve(options.outputDir);
  mkdirSync(outputDir, { recursive: true });
  // crap4ts exits 1 when it finds threshold violations; that is expected while
  // building a remediation backlog, as long as it still emitted valid JSON.
  const report = parseReport(runReport(resolve(outputDir, "raw-report.json")));
  const files = summarize(report, options.target);

  const backlog = {
    generatedAt: new Date().toISOString(),
    scope: options.target ?? null,
    threshold: report.config?.defaultThreshold ?? 16,
    summary: report.summary ?? {},
    files,
  };
  writeFileSync(resolve(outputDir, "backlog.json"), `${JSON.stringify(backlog, null, 2)}\n`);
  writeFileSync(resolve(outputDir, "backlog.md"), markdown(files, options.target, options.limit));

  const next = files[0] ?? null;
  const target = {
    generatedAt: backlog.generatedAt,
    path: next?.path ?? null,
    maxCrap: next?.maxCrap ?? null,
    functions: next?.functions ?? [],
    instruction: next
      ? `Remediate only ${next.path}; preserve behavior and reduce its CRAP score with targeted tests and/or small extractions.`
      : "No CRAP remediation target remains in this scope.",
  };
  writeFileSync(resolve(outputDir, "next-target.json"), `${JSON.stringify(target, null, 2)}\n`);
  writeFileSync(resolve(outputDir, "next-target.md"), markdown(next ? [next] : [], options.target, 1));

  console.log(`[crap-backlog] wrote ${relative(process.cwd(), outputDir) || basename(outputDir)}/backlog.{json,md}`);
  if (next) console.log(`[crap-backlog] next target: ${next.path} (max CRAP ${next.maxCrap})`);
  else console.log("[crap-backlog] no functions exceed the configured threshold");
}

main();
