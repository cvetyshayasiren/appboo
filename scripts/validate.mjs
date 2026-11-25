#!/usr/bin/env node
/* validate.mjs — проверка контракта приложений appboo v3 (каталог catalog.json).
   Только чтение. MUST-нарушения → exit 1; SHOULD-долги → warnings, exit 0.
   Запуск: node scripts/validate.mjs */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(new URL("..", import.meta.url).pathname);
const APPS = join(ROOT, "apps");

const META_KEYS = ["title", "description", "info", "icon", "color", "ai", "platform", "tags", "languages", "screenshots"];
const KEBCASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PLATFORMS = new Set(["desktop", "mobile", "both"]);
const SHOT_EXT = new Set([".webp", ".jpg", ".jpeg", ".png"]);

/* Мягкий парс: как в плеере — обычный JSON.parse, при ошибке повтор после
   удаления комментариев и висячих запятых. Возвращает { value, strict, error }. */
function softParseJson(text) {
  try { return { value: JSON.parse(text), strict: true }; }
  catch { /* продолжаем мягко */ }
  try {
    const cleaned = stripComments(text);
    return { value: JSON.parse(stripTrailingCommas(cleaned)), strict: false };
  } catch (e) {
    return { value: null, strict: false, error: e.message };
  }
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

const errors = [];
const warnings = [];

function must(where, msg) { errors.push(`${where}: ${msg}`); }
function should(where, msg) { warnings.push(`${where}: ${msg}`); }

/* --- Каталог --- */
let registry = []; // id из каталога, в порядке файла (старые → новые)
const catalogById = new Map();
{
  if (existsSync(join(ROOT, "apps.json")))
    must("apps.json", "файл устарел — реестр теперь catalog.json (normalize.mjs удалит его)");
  const path = join(ROOT, "catalog.json");
  if (!existsSync(path)) must("catalog.json", "файл отсутствует в корне");
  else {
    const parsed = softParseJson(readFileSync(path, "utf8"));
    if (!parsed.value) must("catalog.json", `JSON не парсится даже мягко — ${parsed.error}`);
    else if (!Array.isArray(parsed.value)) must("catalog.json", "не является массивом");
    else {
      if (!parsed.strict) should("catalog.json", "нестрогий JSON (комментарии/висячие запятые) — прогоните normalize.mjs");
      const ADD_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/;
      let prev = null; // {id, added} предыдущей записи — для проверки монотонности
      const seen = new Set();
      parsed.value.forEach((raw, i) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          must("catalog.json", `запись №${i + 1} не объект`);
          return;
        }
        const id = typeof raw.id === "string" ? raw.id.trim() : "";
        if (!id) { must("catalog.json", `запись №${i + 1} без id`); return; }
        if (seen.has(id)) { must("catalog.json", `дубликат записи «${id}»`); return; }
        seen.add(id);
        catalogById.set(id, raw);
        if (!existsSync(join(APPS, id))) must("catalog.json", `запись «${id}» без папки apps/${id}/`);
        else if (!existsSync(join(APPS, id, "src", "index.html")))
          must(`apps/${id}`, "нет src/index.html (MUST)");
        if (typeof raw.added !== "string" || !ADD_RE.test(raw.added.trim()))
          must("catalog.json", `запись «${id}»: added ${JSON.stringify(raw.added)} не в формате 2026-11-17T00:00:00+03:00`);
        else {
          const added = raw.added.trim();
          if (prev && !(prev.added < added))
            must("catalog.json", `инвариант: added не возрастает — «${prev.id}» (${prev.added}) → «${id}» (${added})`);
          prev = { id, added };
        }
        for (const key of META_KEYS) if (!(key in raw))
          should("catalog.json", `запись «${id}»: нет поля «${key}» (SHOULD — все поля meta)`);
        if (!KEBCASE_RE.test(id)) should(`apps/${id}`, "имя папки не kebab-case (легаси не переименовываем)");
      });
      registry = [...seen];
      // Папки без записи в каталоге
      for (const name of readdirSync(APPS)) {
        if (!statSync(join(APPS, name)).isDirectory()) continue;
        if (!seen.has(name)) should(`apps/${name}`, "папка без записи в catalog.json (normalize добавит в конец с датой регистрации)");
      }
    }
  }
}

/* --- Приложения --- */
for (const id of registry) {
  if (typeof id !== "string" || !id.trim() || !existsSync(join(APPS, id))) continue;
  const dir = join(APPS, id);
  const srcDir = join(dir, "src");
  const metaDir = join(dir, "meta");
  const metaPath = join(metaDir, "meta.json");

  let meta = null, strict = true;
  if (existsSync(metaPath)) {
    const parsed = softParseJson(readFileSync(metaPath, "utf8"));
    if (!parsed.value) must(`apps/${id}/meta/meta.json`, `JSON не парсится даже мягко — ${parsed.error}`);
    else {
      if (!parsed.strict) should(`apps/${id}/meta/meta.json`, "нестрогий JSON (комментарии/висячие запятые) — прогоните normalize.mjs");
      meta = parsed.value;
      strict = parsed.strict;
      if (typeof meta !== "object" || Array.isArray(meta)) { must(`apps/${id}/meta/meta.json`, "не объект"); meta = null; }
    }
  } else {
    should(`apps/${id}`, "meta/meta.json отсутствует (MUST достаточно, SHOULD — полный meta)");
  }

  const fields = meta || {};

  // Рассинхрон каталога с meta.json: метаданные записей освежает normalize
  const entry = catalogById.get(id);
  if (entry && meta) {
    for (const key of META_KEYS) {
      if (!(key in entry)) continue;
      const norm = v => Array.isArray(v) ? v.filter(Boolean).map(String) : (v == null ? "" : String(v));
      if (JSON.stringify(norm(entry[key])) !== JSON.stringify(norm(meta[key]))) {
        should("catalog.json", `запись «${id}»: поле «${key}» отстаёт от meta.json — прогоните normalize.mjs`);
        break;
      }
    }
  }
  for (const key of META_KEYS) if (!(key in fields)) should(`apps/${id}/meta/meta.json`, `нет поля «${key}» (SHOULD — все поля)`);
  if (fields.platform && !PLATFORMS.has(fields.platform))
    should(`apps/${id}/meta/meta.json`, `platform «${fields.platform}» вне desktop|mobile|both`);
  if (fields.color && !/^#[0-9a-fA-F]{6}$/.test(String(fields.color)))
    should(`apps/${id}/meta/meta.json`, `color «${fields.color}» не в формате #RRGGBB`);
  if ("languages" in fields && !Array.isArray(fields.languages))
    should(`apps/${id}/meta/meta.json`, "languages не массив");

  // Объявленные файлы
  for (const shot of Array.isArray(fields.screenshots) ? fields.screenshots : []) {
    const p = join(metaDir, String(shot));
    if (!existsSync(p)) should(`apps/${id}`, `скриншот «${shot}» объявлен, но не существует`);
    else if (!SHOT_EXT.has(extname(p).toLowerCase())) should(`apps/${id}`, `скриншот «${shot}» не webp/jpg/png`);
    else if (extname(p).toLowerCase() !== ".webp") should(`apps/${id}`, `скриншот «${shot}» не WebP (целевой формат)`);
  }
  const shots = Array.isArray(fields.screenshots) ? fields.screenshots.filter(Boolean) : [];
  if (shots.length > 0 && shots.length < 2) should(`apps/${id}`, `скриншотов ${shots.length} (SHOULD — ровно 2)`);
  if (shots.length === 0 && existsSync(metaDir)) should(`apps/${id}`, "скриншоты не объявлены (SHOULD — 2 шт.)");

  if (typeof fields.icon === "string" && /\.[a-z0-9]{2,4}$/i.test(fields.icon.trim()) && !/^(https?:)?\/\//.test(fields.icon)) {
    const p = join(metaDir, fields.icon.trim());
    if (!existsSync(p)) should(`apps/${id}`, `иконка «${fields.icon}» объявлена, но не существует`);
  }

  // README-синхронизация проверяем отдельно после сбора списка
}

/* --- README: рассинхрон каталога --- */
{
  const readmePath = join(ROOT, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf8");
    const starts = (readme.match(/<!-- catalog:start -->/g) || []).length;
    const ends = (readme.match(/<!-- catalog:end -->/g) || []).length;
    if (!starts || !ends) should("README.md", "нет маркеров <!-- catalog:start/end --> (normalize перегенерирует таблицу)");
    else {
      // Ровно один блок: дубликат выводит каталог дважды, а проверка ниже
      // видит только первое вхождение и молча пропускает рассинхрон в остальных.
      if (starts > 1 || ends > 1)
        should("README.md", `блок каталога задублирован (${starts}×start / ${ends}×end) — таблица выводится дважды, прогоните normalize.mjs`);
      // Маркеры — на отдельных строках: мусор вокруг маркера (например, backtick
      // от соседнего предложения) рвёт таблицу и абзац вокруг неё.
      const ownLine = (readme.match(/^[ \t]*<!-- catalog:(?:start|end) -->[ \t]*$/gm) || []).length;
      if (ownLine !== starts + ends)
        should("README.md", "маркеры каталога должны стоять на отдельных строках без окружающего текста");
      const m = readme.match(/<!-- catalog:start -->([\s\S]*?)<!-- catalog:end -->/);
      const table = m ? m[1] : "";
      for (const id of registry) {
        if (typeof id !== "string" || !id.trim()) continue;
        const enc = encodeURIComponent(id);
        if (!table.includes(`/apps/${enc}/src/index.html`))
          should("README.md", `в каталоге нет ссылки на «${id}»`);
      }
    }
  } else should("README.md", "файл отсутствует");
}

/* --- Отчёт --- */
console.log(`validate: ${registry.length} записей каталога`);
if (warnings.length) {
  console.log(`\nSHOULD-долги (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ⚠ ${w}`));
}
if (errors.length) {
  console.log(`\nMUST-нарушения (${errors.length}):`);
  errors.forEach(e => console.log(`  ✗ ${e}`));
  console.log("\nРезультат: FAIL");
  process.exit(1);
}
console.log("\nРезультат: OK (MUST соблюдён)");
