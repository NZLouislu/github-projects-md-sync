import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getTestConfig, ensureConfig } from "./env";
import { projectToMd, mdToProject } from "../project-sync";
import { expectSuccess } from "./assertions";
import { findItemByTitle, setItemStatus } from "./github-update";

type RunResult = { ok: boolean; details?: string };

async function ensureDir(p: string) {
  await fsp.mkdir(p, { recursive: true });
}

async function clearDir(p: string) {
  if (!fs.existsSync(p)) return;
  const entries = await fsp.readdir(p);
  await Promise.all(entries.map(e => fsp.rm(path.join(p, e), { recursive: true, force: true })));
}

async function listMdFiles(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  const all = await fsp.readdir(dir);
  return all.filter(f => f.toLowerCase().endsWith(".md")).sort();
}

async function readText(p: string) {
  const txt = await fsp.readFile(p, "utf8");
  return txt.replace(/\r\n/g, "\n").trim();
}

function setDiff(a: Set<string>, b: Set<string>) {
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  a.forEach(v => { if (!b.has(v)) onlyA.push(v); });
  b.forEach(v => { if (!a.has(v)) onlyB.push(v); });
  return { onlyA, onlyB };
}

async function compareDirs(a: string, b: string): Promise<{ equal: boolean; details?: string }> {
  const fa = (await listMdFiles(a)).sort();
  const fb = (await listMdFiles(b)).sort();
  if (fa.length !== fb.length) return { equal: false, details: `count mismatch: ${fa.length} vs ${fb.length}` };
  const sa = new Set(fa.map(x => x.toLowerCase()));
  const sb = new Set(fb.map(x => x.toLowerCase()));
  for (const x of Array.from(sa)) {
    if (!sb.has(x)) return { equal: false, details: `missing in B: ${x}` };
  }
  for (const x of Array.from(sb)) {
    if (!sa.has(x)) return { equal: false, details: `extra in B: ${x}` };
  }
  for (let i = 0; i < fa.length; i++) {
    const fn = fa[i];
    const ta = await readText(path.join(a, fn));
    const tb = await readText(path.join(b, fn));
    if (ta !== tb) return { equal: false, details: `content diff at ${fn}` };
  }
  return { equal: true };
}

/**
 * Story 1: MD -> Project
 */
export async function runStory1(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const itemsDir = path.join(cfg.dataDir, "items");
  const mdDir = path.join(cfg.dataDir, "md");
  if (!fs.existsSync(itemsDir) && !fs.existsSync(mdDir)) {
    return { ok: false, details: "no test data in examples/items or examples/md" };
  }
  const source = fs.existsSync(itemsDir) ? itemsDir : mdDir;
  const res = await mdToProject(cfg.testProjectId, cfg.githubToken, source, console, cfg.logLevel);
  expectSuccess(res);
  return { ok: !!(res.result as any).success, details: "md-to-project completed" };
}

/**
 * Story 2: Project -> MD
 */
export async function runStory2(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const out = cfg.outputDir;
  await ensureDir(out);
  await clearDir(out);
  const res = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
  expectSuccess(res);
  return { ok: !!(res.result as any).success, details: "project-to-md completed" };
}

/**
 * Story 3: Round-trip (MD -> Project -> MD)
 */
export async function runStory3(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const itemsDir = path.join(cfg.dataDir, "items");
  const mdDir = path.join(cfg.dataDir, "md");
  const baseDir = fs.existsSync(itemsDir) ? itemsDir : mdDir;
  if (!fs.existsSync(baseDir)) {
    return { ok: false, details: "no baseline data for round-trip" };
  }
  const baseFiles = (await listMdFiles(baseDir)).map(f => f.toLowerCase());
  const baseSet = new Set(baseFiles);

  const r1 = await runStory1();
  if (!r1.ok) return r1;

  await ensureDir(cfg.outputDir);
  await clearDir(cfg.outputDir);
  const r2 = await runStory2();
  if (!r2.ok) return r2;

  const outFiles = (await listMdFiles(cfg.outputDir)).map(f => f.toLowerCase());
  const outSet = new Set(outFiles);

  const { onlyA, onlyB } = setDiff(baseSet, outSet);
  if (onlyA.length || onlyB.length) {
    return { ok: false, details: `round-trip filename mismatch: missing=${onlyA.join(",")} extra=${onlyB.join(",")}` };
  }
  if (baseFiles.length !== outFiles.length) {
    return { ok: false, details: `round-trip count mismatch: base=${baseFiles.length} out=${outFiles.length}` };
  }
  return { ok: true, details: "round-trip filenames and counts match" };
}

/**
 * Story 4: Idempotency
 */
export async function runStory4(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const out1 = path.join(".tmp", "stories1");
  const out2 = path.join(".tmp", "stories2");

  const r1 = await runStory1();
  if (!r1.ok) return r1;

  await ensureDir(out1); await clearDir(out1);
  const e1 = await projectToMd(cfg.testProjectId, cfg.githubToken, out1, console, cfg.logLevel);
  expectSuccess(e1);

  const r1b = await runStory1();
  if (!r1b.ok) return r1b;

  await ensureDir(out2); await clearDir(out2);
  const e2 = await projectToMd(cfg.testProjectId, cfg.githubToken, out2, console, cfg.logLevel);
  expectSuccess(e2);

  const cmp = await compareDirs(out1, out2);
  if (!cmp.equal) return { ok: false, details: `idempotency failed: ${cmp.details}` };
  return { ok: true, details: "idempotency verified: exports identical" };
}

/**
 * Story 5: Conflict handling (MD as source of truth)
 */
export async function runStory5(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const targetFile = "a-new-backlog-story-for-testing.md";
  const targetTitleOriginal = "A new backlog story for testing";

  const mdSourceItems = path.join(cfg.dataDir, "items");
  const mdSource = fs.existsSync(mdSourceItems) ? mdSourceItems : path.join(cfg.dataDir, "md");
  const srcPath = path.join(mdSource, targetFile);
  if (!fs.existsSync(srcPath)) return { ok: false, details: `source not found: ${srcPath}` };

  const r1 = await runStory1();
  if (!r1.ok) return r1;

  const found = await findItemByTitle(cfg.testProjectId, cfg.githubToken, targetTitleOriginal);
  if (!found) return { ok: false, details: "target item not found on project" };

  await setItemStatus(cfg.testProjectId, cfg.githubToken, found.projectItemId, "Ready");

  const tmpDir = path.join(".tmp", "conflict-md");
  await fsp.mkdir(tmpDir, { recursive: true });
  if (fs.existsSync(tmpDir)) {
    const entries = await fsp.readdir(tmpDir);
    await Promise.all(entries.map(e => fsp.rm(path.join(tmpDir, e), { recursive: true, force: true })));
  }

  const raw = await fsp.readFile(srcPath, "utf8");
  let updated = raw;
  if (/^###\s*Status\s*$/mi.test(updated)) {
    updated = updated.replace(/(###\s*Status\s*\r?\n\r?\n)([^\r\n]+)/i, "$1In progress");
  } else {
    updated += "\n### Status\n\nIn progress\n";
  }
  await fsp.writeFile(path.join(tmpDir, targetFile), updated, "utf8");

  const syncRes = await mdToProject(cfg.testProjectId, cfg.githubToken, tmpDir, console, cfg.logLevel);
  expectSuccess(syncRes);

  const outDir = path.join(".tmp", "conflict-out");
  await fsp.mkdir(outDir, { recursive: true });
  if (fs.existsSync(outDir)) {
    const entries = await fsp.readdir(outDir);
    await Promise.all(entries.map(e => fsp.rm(path.join(outDir, e), { recursive: true, force: true })));
  }

  const exp = await projectToMd(cfg.testProjectId, cfg.githubToken, outDir, console, cfg.logLevel);
  expectSuccess(exp);

  const exported = await fsp.readFile(path.join(outDir, targetFile), "utf8");
  const statusOk = /###\s*Status\s*\r?\n\r?\nIn progress/m.test(exported);
  if (!statusOk) return { ok: false, details: "conflict resolution failed: MD status not applied" };

  const syncRes2 = await mdToProject(cfg.testProjectId, cfg.githubToken, tmpDir, console, cfg.logLevel);
  expectSuccess(syncRes2);

  return { ok: true, details: "conflict handled with MD priority and idempotent" };
}

/**
 * Story 6: Classification and filtering
 */
export async function runStory6(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);

  const r1 = await runStory1();
  if (!r1.ok) return r1;

  const out = path.join(".tmp", "classify-out");
  await ensureDir(out); await clearDir(out);
  const exp = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
  expectSuccess(exp);

  const files = await listMdFiles(out);
  if (!files.length) return { ok: false, details: "no markdown exported" };

  for (const f of await fsp.readdir(out)) {
    if (!f.toLowerCase().endsWith(".md")) {
      return { ok: false, details: `non-md file found: ${f}` };
    }
  }
  return { ok: true, details: `classification ok: ${files.length} md files` };
}

/**
 * Story 7: Status normalization mapping
 */
export async function runStory7(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const targetFile = "a-new-backlog-story-for-testing.md";
  const mdSourceItems = path.join(cfg.dataDir, "items");
  const mdSource = fs.existsSync(mdSourceItems) ? mdSourceItems : path.join(cfg.dataDir, "md");
  const srcPath = path.join(mdSource, targetFile);
  if (!fs.existsSync(srcPath)) return { ok: false, details: `source not found: ${srcPath}` };

  const base = await runStory1();
  if (!base.ok) return base;

  const tmpDir = path.join(".tmp", "status-md");
  await ensureDir(tmpDir); await clearDir(tmpDir);
  const raw = await fsp.readFile(srcPath, "utf8");
  let updated = raw;
  if (/^###\s*Status\s*$/mi.test(updated)) {
    updated = updated.replace(/(###\s*Status\s*\r?\n\r?\n)([^\r\n]+)/i, "$1in PROGRESS");
  } else {
    updated += "\n### Status\n\nin PROGRESS\n";
  }
  await fsp.writeFile(path.join(tmpDir, targetFile), updated, "utf8");

  const syncRes = await mdToProject(cfg.testProjectId, cfg.githubToken, tmpDir, console, cfg.logLevel);
  expectSuccess(syncRes);

  const out = path.join(".tmp", "status-out");
  await ensureDir(out); await clearDir(out);
  const exp = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
  expectSuccess(exp);

  const exported = await fsp.readFile(path.join(out, targetFile), "utf8");
  const ok = /###\s*Status\s*\r?\n\r?\nIn progress/m.test(exported);
  if (!ok) return { ok: false, details: "status normalization failed: expected 'In progress'" };

  return { ok: true, details: "status normalization ok: In progress" };
}

/**
 * Story 8: Snapshot export regression
 */
export async function runStory8(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);

  const out = path.join(".tmp", "snapshot-out");
  await ensureDir(out); await clearDir(out);
  const exp = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
  expectSuccess(exp);

  const files = await listMdFiles(out);
  if (!files.length) return { ok: false, details: "no markdown exported for snapshot" };

  const manifest: Record<string, string> = {};
  for (const f of files) {
    const txt = await readText(path.join(out, f));
    const hash = crypto.createHash("sha256").update(txt, "utf8").digest("hex");
    manifest[f] = hash;
  }

  const snapDir = path.join(".tmp", "snapshots");
  await ensureDir(snapDir);
  const baselinePath = path.join(snapDir, "baseline.json");

  if (!fs.existsSync(baselinePath)) {
    await fsp.writeFile(baselinePath, JSON.stringify(manifest, null, 2), "utf8");
    return { ok: true, details: "snapshot baseline created" };
  }

  const baselineRaw = await fsp.readFile(baselinePath, "utf8");
  const baseline = JSON.parse(baselineRaw) as Record<string, string>;

  const keysA = Object.keys(baseline).sort();
  const keysB = Object.keys(manifest).sort();
  if (keysA.length !== keysB.length) {
    return { ok: false, details: `snapshot file count mismatch: ${keysA.length} vs ${keysB.length}` };
  }
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) {
      return { ok: false, details: `snapshot filename mismatch at ${i}: ${keysA[i]} vs ${keysB[i]}` };
    }
    if (baseline[keysA[i]] !== manifest[keysB[i]]) {
      return { ok: false, details: `snapshot hash mismatch at ${keysA[i]}` };
    }
  }
  return { ok: true, details: "snapshot matched baseline" };
}

/**
 * Story 9: Status vocabulary compliance check
 */
export async function runStory9(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);

  const out = path.join(".tmp", "status-vocab");
  await ensureDir(out); await clearDir(out);
  const exp = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
  expectSuccess(exp);

  const allowed = new Set(["Backlog", "Ready", "In progress", "In review", "Done"]);
  const files = await listMdFiles(out);
  if (!files.length) return { ok: false, details: "no markdown exported for vocab check" };

  const violations: string[] = [];
  for (const f of files) {
    const txt = await fsp.readFile(path.join(out, f), "utf8");
    const m = txt.match(/###\s*Status\s*\r?\n\r?\n([^\r\n]+)/m);
    if (!m) continue;
    const val = m[1].trim();
    if (!allowed.has(val)) {
      violations.push(`${f}: ${val}`);
    }
  }
  if (violations.length) {
    return { ok: false, details: `status vocab violations: ${violations.join(" | ")}` };
  }
  return { ok: true, details: "all statuses in allowed set" };
}

/**
 * Story 12: Rate limit and retry robustness
 */
export async function runStory12(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const itemsDir = path.join(cfg.dataDir, "items");
  const mdDir = path.join(cfg.dataDir, "md");
  const source = fs.existsSync(itemsDir) ? itemsDir : mdDir;

  for (let i = 0; i < 3; i++) {
    const r = await mdToProject(cfg.testProjectId, cfg.githubToken, source, console, cfg.logLevel);
    expectSuccess(r);
  }
  const out = path.join(".tmp", "rate-out");
  await ensureDir(out); await clearDir(out);
  for (let i = 0; i < 3; i++) {
    const e = await projectToMd(cfg.testProjectId, cfg.githubToken, out, console, cfg.logLevel);
    expectSuccess(e);
  }
  return { ok: true, details: "rapid sync cycles ok" };
}

/**
 * Story 13: Small-scale expansion robustness (copy as new items)
 */
export async function runStory13(): Promise<RunResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  const baseOut = path.join(".tmp", "bulk-base");
  await ensureDir(baseOut); await clearDir(baseOut);
  const e1 = await projectToMd(cfg.testProjectId, cfg.githubToken, baseOut, console, cfg.logLevel);
  expectSuccess(e1);
  const baseFiles = await listMdFiles(baseOut);
  if (baseFiles.length < 5) return { ok: false, details: "not enough baseline files (<5)" };

  const tmpDir = path.join(".tmp", "bulk-md");
  await ensureDir(tmpDir); await clearDir(tmpDir);

  function stripIds(md: string): string {
    let t = md;
    t = t.replace(/(^|\n)###\s*Story\s*ID[\s\S]*?(?=\n###\s|\n#\s|$)/gi, "$1");
    t = t.replace(/^\s*Story\s*ID\s*:\s*.*$/gim, "");
    t = t.replace(/^\s*(?:ID|Item\s*ID|Project\s*Item\s*ID)\s*:\s*.*$/gim, "");
    t = t.replace(/<!--\s*story[-_ ]?id:.*?-->/gim, "");
    t = t.replace(/\bPVTI_[A-Za-z0-9_-]+\b/g, "");
    t = t.replace(/\bDI_[A-Za-z0-9_-]+\b/g, "");
    return t;
  }

  function forceNewHeader(md: string, unique: string): string {
    let t = md;
    t = t.replace(/^#\s+.*$/gm, "");
    t = t.replace(/^\s*Story\s*:\s*.*$/gm, "");
    t = t.replace(/^\s*Title\s*:\s*.*$/gm, "");
    t = t.replace(/^\s*\[(?:x| )\]\s+.*$/m, "");
    t = t.replace(/^\s*\n+/, "");
    return `# ${unique}\n\nStory: ${unique}\n\n` + t;
  }

  for (let i = 0; i < 5; i++) {
    const fn = baseFiles[i];
    let txt = await fsp.readFile(path.join(baseOut, fn), "utf8");
    txt = stripIds(txt);
    const unique = `Bulk ${i+1} - ${Date.now()}`;
    txt = forceNewHeader(txt, unique);
    await fsp.writeFile(path.join(tmpDir, fn.replace(/\.md$/i, `-bulk-${i+1}.md`)), txt, "utf8");
  }

  const s = await mdToProject(cfg.testProjectId, cfg.githubToken, tmpDir, console, cfg.logLevel);
  expectSuccess(s);

  const curOut = path.join(".tmp", "bulk-cur");
  await ensureDir(curOut); await clearDir(curOut);
  const e2 = await projectToMd(cfg.testProjectId, cfg.githubToken, curOut, console, cfg.logLevel);
  expectSuccess(e2);
  const curFiles = await listMdFiles(curOut);
  if (curFiles.length < baseFiles.length + 5) {
    return { ok: false, details: `bulk size insufficient: ${curFiles.length} < ${baseFiles.length + 5}` };
  }
  return { ok: true, details: "bulk growth ok (+5)" };
}

if (require.main === module) {
  const story = process.argv[2] || "1";
  const run = async () => {
    if (story === "1") return runStory1();
    if (story === "2") return runStory2();
    if (story === "3") return runStory3();
    if (story === "4") return runStory4();
    if (story === "5") return runStory5();
    if (story === "6") return runStory6();
    if (story === "7") return runStory7();
    if (story === "8") return runStory8();
    if (story === "9") return runStory9();
    if (story === "12") return runStory12();
    if (story === "13") return runStory13();
    return { ok: false, details: "unknown story" };
  };
  run().then(r => {
    if (!r.ok) {
      console.error("E2E failed:", r.details || "");
      process.exit(1);
    } else {
      console.log("E2E ok:", r.details || "");
    }
  });
}