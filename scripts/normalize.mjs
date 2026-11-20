#!/usr/bin/env node
/* normalize.mjs — идемпотентный фиксер контракта приложений appboo v2.
   Флаги:
     --dry-run   только показать план, ничего не менять
     --convert   конвертировать скриншоты в WebP (нужен sharp — опц. devDependency)
     --lossless  lossless WebP (пиксель-арт); без флага — q≈85
   Запуск: node scripts/normalize.mjs [--dry-run] [--convert] [--lossless]
   Повторный запуск без изменений → пустой git diff. */

import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, mkdirSync, unlinkSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = join(new URL("..", import.meta.url).pathname).replace(/[\\/]+$/, "");
const APPS = join(ROOT, "apps");
const dryRun = process.argv.includes("--dry-run");
const wantConvert = process.argv.includes("--convert");
const lossless = process.argv.includes("--lossless");

const require = createRequire(pathToFileURL(join(ROOT, "package.json")));
let sharp = null;
if (wantConvert) {
  try { sharp = require("sharp"); }
  catch {
    console.warn("⚠ --convert: sharp не найден (npm i). Скриншоты будут переименованы без конвертации.");
  }
}

const META_ORDER = ["title", "description", "info", "icon", "color", "ai", "platform", "tags", "languages", "screenshots"];
const ICON_PRIORITY = [".svg", ".png", ".webp", ".jpg", ".jpeg"];
const SHOT_EXT = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const PAGES = "https://cvetyshayasiren.github.io/appboo";

const actions = [];
const debts = [];
const act = msg => actions.push(msg);
function mv(from, to) {
  if (dryRun) { act(`mv ${rel(from)} → ${rel(to)}`); return; }
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  act(`mv ${rel(from)} → ${rel(to)}`);
}
function writeFile(file, content, label) {
  let old = null;
  try { old = readFileSync(file, "utf8"); } catch {}
  if (old === content) return false;
  if (dryRun) { act(`write ${label || rel(file)}`); return true; }
  writeFileSync(file, content);
  act(`write ${label || rel(file)}`);
  return true;
}
const rel = p => p.slice(ROOT.length + 1);
const dirname = p => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

/* Мягкий парс (как в плеере) */
function softParseJson(text) {
  try { return JSON.parse(text); } catch {}
  return JSON.parse(stripTrailingCommas(stripComments(text)));
}
function stripComments(text) {
  let out = "", i = 0, inStr = false;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\") { if (i + 1 < text.length) { out += text[i + 1]; i++; } }
      else if (ch === '"') inStr = false;
      i++; continue;
    }
    if (ch === '"') { inStr = true; out += ch; i++; continue; }
    if (ch === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (ch === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); i = e === -1 ? text.length : e + 2; continue; }
    if (ch === "#") { while (i < text.length && text[i] !== "\n") i++; continue; }
    out += ch; i++;
  }
  return out;
}
function stripTrailingCommas(text) {
  let out = "", inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\") { if (i + 1 < text.length) { out += text[i + 1]; i++; } }
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === ",") {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === "}" || text[j] === "]")) continue;
    }
    out += ch;
  }
  return out;
}

/* Естественная сортировка: по числу в имени, иначе по алфавиту */
function naturalCompare(a, b) {
  const na = a.match(/(\d+)/), nb = b.match(/(\d+)/);
  if (na && nb) {
    const d = parseInt(na[1], 10) - parseInt(nb[1], 10);
    if (d !== 0) return d;
  }
  return a.localeCompare(b, "en");
}

function escapeCell(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/* ================= Этап 1: структура папок ================= */
const folders = readdirSync(APPS).filter(n => statSync(join(APPS, n)).isDirectory()).sort((a, b) => a.localeCompare(b, "en"));

for (const id of folders) {
  const dir = join(APPS, id);
  const entries = readdirSync(dir);
  const hasSrc = entries.includes("src");
  const rootHtml = entries.filter(e => e.toLowerCase().endsWith(".html"));
  const rootIndex = entries.find(e => e === "index.html");

  // index.html в корне → перенести ВСЕ корневые файлы (кроме meta/) в src/
  if (!hasSrc && rootIndex) {
    for (const e of entries) {
      if (e === "meta") continue;
      mv(join(dir, e), join(dir, "src", e));
    }
    continue; // остальные шаги ниже применяем к уже перенесённой структуре
  }

  // Одиночный *.html в корне с другим именем → src/index.html
  if (!hasSrc && rootHtml.length === 1 && !rootIndex) {
    mv(join(dir, rootHtml[0]), join(dir, "src", "index.html"));
    for (const e of readdirSync(dir)) {
      if (e === "meta" || e === "src" || e === rootHtml[0]) continue;
      mv(join(dir, e), join(dir, "src", e));
    }
    continue;
  }

  if (hasSrc) {
    // корневые icon.* → meta/; screenshot*.* → meta/screenshots/
    for (const e of readdirSync(dir)) {
      const lower = e.toLowerCase();
      if (lower.startsWith("icon.") && [".svg", ".png", ".webp", ".jpg", ".jpeg"].includes(extname(lower))) {
        mv(join(dir, e), join(dir, "meta", e));
      } else if (lower.startsWith("screenshot") && SHOT_EXT.has(extname(lower))) {
        mv(join(dir, e), join(dir, "meta", "screenshots", e));
      }
    }
    // одиночный *.html в src/ с именем не index.html → src/index.html
    const srcFiles = readdirSync(join(dir, "src"));
    const srcHtml = srcFiles.filter(f => f.toLowerCase().endsWith(".html"));
    if (!srcFiles.includes("index.html") && srcHtml.length === 1) {
      mv(join(dir, "src", srcHtml[0]), join(dir, "src", "index.html"));
    } else if (!srcFiles.includes("index.html")) {
      debts.push(`apps/${id}: в src/ нет index.html — точка входа не опознана (MUST, нужен человек)`);
    }
    // прочее в корне приложения (не src/, не meta/) — не трогаем, репорт
    const leftover = readdirSync(dir).filter(e => e !== "src" && e !== "meta");
    if (leftover.length) debts.push(`apps/${id}: лишнее в корне папки, не перенесено — ${leftover.join(", ")}`);
  }
}

/* ================= Этап 2–4: meta.json, иконка, скриншоты ================= */
function extractTitle(htmlPath) {
  try {
    const html = readFileSync(htmlPath, "utf8");
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : "";
  } catch { return ""; }
}

const catalogRows = [];

for (const id of folders) {
  const dir = join(APPS, id);
  const srcDir = join(dir, "src");
  const metaDir = join(dir, "meta");
  const metaPath = join(metaDir, "meta.json");
  const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id);
  if (!kebab) debts.push(`apps/${id}: имя не kebab-case (легаси не переименовываем)`);

  if (!existsSync(join(srcDir, "index.html"))) continue; // MUST-проблема, validate скажет

  // --- meta.json ---
  let meta = {};
  if (existsSync(metaPath)) {
    try { meta = softParseJson(readFileSync(metaPath, "utf8")); } catch { meta = {}; }
  }
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) meta = {};
  const unknown = {};
  for (const k of Object.keys(meta)) if (!META_ORDER.includes(k)) unknown[k] = meta[k];

  const iconFiles = existsSync(metaDir)
    ? readdirSync(metaDir).filter(f => /^icon\.[a-z0-9]+$/i.test(f))
    : [];
  // приоритет svg > png > webp > jpg
  const iconBest = ICON_PRIORITY.map(ext => iconFiles.find(f => extname(f).toLowerCase() === ext)).find(Boolean);
  if (iconFiles.filter(f => f !== iconBest).length)
    act(`apps/${id}: иконка ${iconBest}, лишние форматы оставлены (${iconFiles.filter(f => f !== iconBest).join(", ")})`);

  const defaults = {
    title: extractTitle(join(srcDir, "index.html")) || id,
    description: "",
    info: "",
    icon: iconBest || "",
    color: "",
    ai: "",
    platform: "",
    tags: [],
    languages: ["ru"],
    screenshots: []
  };

  const norm = {};
  for (const key of META_ORDER) {
    let v = meta[key];
    switch (key) {
      case "title": norm.title = v == null ? defaults.title : String(v); break;
      case "description": case "info": case "color": case "ai":
        norm[key] = v == null ? defaults[key] : String(v); break;
      case "icon": norm.icon = v == null ? defaults.icon : String(v); break;
      case "platform":
        norm.platform = (typeof v === "string" && ["desktop", "mobile", "both"].includes(v.trim())) ? v.trim() : ""; break;
      case "tags":
        if (typeof v === "string") v = v.split(",");
        norm.tags = Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []; break;
      case "languages":
        if (typeof v === "string") v = v.split(",");
        norm.languages = Array.isArray(v)
          ? [...new Set(v.map(x => String(x).trim().toLowerCase()).filter(Boolean))]
          : defaults.languages;
        if (!norm.languages.length) norm.languages = [];
        break;
      case "screenshots":
        norm.screenshots = Array.isArray(v) ? v.map(String).filter(Boolean) : []; break;
    }
  }
  for (const k of Object.keys(unknown)) norm[k] = unknown[k];

  if (!norm.description) debts.push(`apps/${id}: пустое description (нужен человек)`);
  if (meta.languages == null || (Array.isArray(meta.languages) && !meta.languages.length))
    debts.push(`apps/${id}: languages не задан — проставлен дефолт ["ru"]`);

  // --- скриншоты ---
  const shotsDir = join(metaDir, "screenshots");
  let shotFiles = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter(f => SHOT_EXT.has(extname(f).toLowerCase())).sort(naturalCompare)
    : [];

  if (shotFiles.length) {
    const renamed = [];
    let n = 0;
    for (const f of shotFiles) {
      n++;
      const ext = extname(f).toLowerCase();
      const targetBase = `screenshot-${n}`;
      let target = join(shotsDir, targetBase + ext);
      const needWebp = wantConvert && sharp && ext !== ".webp";
      if (needWebp) target = join(shotsDir, targetBase + ".webp");
      if (needWebp) {
        if (dryRun) act(`convert ${rel(join(shotsDir, f))} → ${rel(target)} (${lossless ? "lossless" : "q≈85"})`);
        else {
          const pipeline = sharp(join(shotsDir, f)).webp(lossless ? { lossless: true } : { quality: 85 });
          writeFileSync(target, await pipeline.toBuffer());
          unlinkSync(join(shotsDir, f));
          act(`convert ${rel(join(shotsDir, f))} → ${rel(target)} (${lossless ? "lossless" : "q≈85"})`);
        }
        renamed.push(`screenshots/${targetBase}.webp`);
      } else if (basename(f) !== targetBase + ext) {
        mv(join(shotsDir, f), target);
        renamed.push(`screenshots/${targetBase}${ext}`);
      } else {
        renamed.push(`screenshots/${f}`);
      }
    }
    if (!wantConvert) {
      const nonWebp = renamed.filter(s => !s.endsWith(".webp"));
      if (nonWebp.length) debts.push(`apps/${id}: не-WebP скриншоты (${nonWebp.join(", ")}) — запустите с --convert при установленном sharp`);
    }
    if (renamed.length !== 2) debts.push(`apps/${id}: скриншотов ${renamed.length} (SHOULD — 2)`);
    // в meta.json только фактически присутствующие, в порядке показа
    const present = renamed.filter(s => existsSync(join(metaDir, s)));
    if (JSON.stringify(norm.screenshots) !== JSON.stringify(present)) {
      act(`apps/${id}: screenshots → [${present.join(", ")}]`);
      norm.screenshots = present;
    }
  } else {
    if (norm.screenshots.length) { norm.screenshots = []; act(`apps/${id}: screenshots очищен (файлов нет)`); }
    debts.push(`apps/${id}: нет скриншотов (SHOULD — 2)`);
  }

  // --- запись meta.json (только при реальных изменениях) ---
  const ordered = {};
  for (const k of META_ORDER) ordered[k] = norm[k];
  const content = JSON.stringify(ordered, null, 2) + "\n";
  const oldContent = existsSync(metaPath) ? readFileSync(metaPath, "utf8") : "";
  if (content !== oldContent) {
    if (dryRun) act(`write ${rel(metaPath)}`);
    else { mkdirSync(metaDir, { recursive: true }); writeFileSync(metaPath, content); act(`write ${rel(metaPath)}`); }
  }

  // --- строка каталога README ---
  const enc = encodeURI(`${PAGES}/apps/${id}/src/index.html`);
  const encIcon = encodeURI(`${PAGES}/apps/${id}/meta/${norm.icon}`);
  const iconCell = norm.icon
    ? (/\.(svg|png|webp|jpe?g)$/i.test(norm.icon) ? `<img src="${encIcon}" width="32">` : escapeCell(norm.icon))
    : "";
  catalogRows.push(`| ${iconCell} | [${escapeCell(norm.title)}](${enc}) | ${escapeCell(norm.description) || "—"} |`);
}

/* ================= Этап 5: реестр ================= */
{
  const regPath = join(ROOT, "apps.json");
  let raw = [];
  try { raw = softParseJson(readFileSync(regPath, "utf8")); } catch { raw = []; }
  if (!Array.isArray(raw)) raw = [];
  const cleaned = [];
  const seen = new Set();
  for (const item of raw) {
    if (typeof item !== "string") { act(`apps.json: отброшена не-строка ${JSON.stringify(item)}`); continue; }
    const id = item.trim();
    if (!id) { act("apps.json: отброшена пустая запись"); continue; }
    if (seen.has(id)) { act(`apps.json: убран дубликат «${id}»`); continue; }
    if (!existsSync(join(APPS, id))) { act(`apps.json: запись без папки удалена — «${id}»`); continue; }
    seen.add(id);
    cleaned.push(id);
  }
  for (const id of folders) {
    if (!seen.has(id)) { cleaned.push(id); act(`apps.json: папка без записи добавлена в конец — «${id}»`); seen.add(id); }
  }
  const regContent = JSON.stringify(cleaned, null, 2) + "\n";
  writeFile(regPath, regContent, "apps.json");
}

/* ================= Этап 6: README-таблица ================= */
{
  const readmePath = join(ROOT, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf8");
    const table = `<!-- catalog:start -->\n| | Приложение | Описание |\n|---|---|---|\n${catalogRows.join("\n")}\n<!-- catalog:end -->`;
    const re = /<!-- catalog:start -->[\s\S]*?<!-- catalog:end -->/;
    let next;
    if (re.test(readme)) next = readme.replace(re, table);
    else next = readme.replace(/\s*$/, "") + "\n\n## Каталог приложений\n\n" + table + "\n";
    writeFile(readmePath, next, "README.md (каталог)");
  } else {
    debts.push("README.md отсутствует — каталог не вписан");
  }
}

/* ================= Отчёт ================= */
console.log(dryRun ? "ПЛАН (dry-run):" : "Выполнено:");
if (actions.length) actions.forEach(a => console.log("  • " + a));
else console.log("  (изменений не требуется)");
if (debts.length) {
  console.log(`\nSHOULD-долги, требующие человека (${debts.length}):`);
  [...new Set(debts)].forEach(d => console.log("  ⚠ " + d));
}
console.log(dryRun ? "\ndry-run: ничего не изменено" : "\nnormalize завершён");
