#!/usr/bin/env node
/**
 * scripts/backfill-dates.mjs — разовый бэкфилл дат добавления (поле `added`)
 * в будущий catalog.json. Запускается при миграции на каталог; историю
 * дат поддерживает дальше normalize (новые приложения получают момент
 * регистрации). Правило задокументировано в CONTRIBUTING.md.
 *
 * Правило бэкфилла:
 *   1. Для каждого приложения берётся коммит, ДОБАВИВШИЙ папку apps/<id>
 *      (git log --diff-filter=A, авторская дата).
 *   2. Приложения группируются по календарному дню (Europe/Moscow) этой даты.
 *   3. Внутри дня порядок — как в реестре apps.json (реестр хронологический).
 *   4. added = полночь этого дня по Москве + 1 секунда на каждую следующую
 *      запись: 2026-11-17T00:00:00+03:00, 2026-11-17T00:00:01+03:00, …
 *      Секунды — ПОРЯДКОВЫЙ НОМЕР, а не реальное время (договорённость,
 *      чтобы инвариант «added строго возрастает вниз по каталогу» не
 *      требовал придумывать минуты и часы).
 *   5. Инвариант: added строго возрастает в порядке реестра, без равенств.
 *
 * Запуск (из корня репозитория):
 *   node scripts/backfill-dates.mjs            # dry-run: таблица в stdout
 *   node scripts/backfill-dates.mjs --write    # + записать catalog.json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const TZ = 'Europe/Moscow';
const META_ORDER = ['title', 'description', 'info', 'icon', 'color', 'ai', 'platform', 'tags', 'languages', 'screenshots'];
const WRITE = process.argv.includes('--write');
// Порядок реестра: исторически apps.json; после миграции (apps.json удалён)
// — те же id из catalog.json, порядок «старые → новые» совпадает
const registry = fs.existsSync('apps.json')
  ? JSON.parse(fs.readFileSync('apps.json', 'utf8'))
  : JSON.parse(fs.readFileSync('catalog.json', 'utf8')).map(e => e.id);

function addedCommit(id) {
  // самый ранний коммит, добавивший что-либо по пути apps/<id>
  const out = execFileSync(
    'git',
    ['log', '--diff-filter=A', '--reverse', '--format=%aI%x1f%cI%x1f%s', '--', `apps/${id}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  const first = out.trim().split('\n')[0];
  if (!first) return null;
  const [author, committer, subject] = first.split('\x1f');
  return { author, committer, subject };
}

// Календарный день метки ISO в Europe/Moscow → 'YYYY-MM-DD'
function moscowDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`кривая дата: ${iso}`);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// --- 1–2: коммиты и дни ---
const rows = [];
for (const id of registry) {
  const c = addedCommit(id);
  if (!c) {
    console.error(`ОШИБКА: не найден коммит-добавление для «${id}»`);
    process.exit(1);
  }
  if (c.author !== c.committer) {
    console.warn(`⚠ ${id}: авторская и коммиттерская даты различаются (${c.author} / ${c.committer}) — использована авторская`);
  }
  rows.push({ id, commit: c, day: moscowDay(c.author) });
}

// --- 3–4: полночь + N секунд, порядок реестра ---
const seen = new Map();
for (const r of rows) {
  const n = seen.get(r.day) ?? 0;
  if (n >= 60) throw new Error(`день ${r.day}: больше 60 приложений — не влезает в «полночь + секунды»`);
  r.added = `${r.day}T00:00:${String(n).padStart(2, '0')}+03:00`;
  seen.set(r.day, n + 1);
}

// --- 5: инварианты ---
for (let i = 1; i < rows.length; i++) {
  if (!(rows[i - 1].added < rows[i].added)) {
    console.error(`ОШИБКА инварианта: added не возрастает на «${rows[i - 1].id}» → «${rows[i].id}» (${rows[i - 1].added} ≥ ${rows[i].added})`);
    process.exit(1);
  }
}
if (rows.length !== registry.length) {
  console.error(`ОШИБКА: обработано ${rows.length} из ${registry.length}`);
  process.exit(1);
}

// --- 6: отчёт (dry-run) ---
console.log(`Бэкфилл дат: ${rows.length} приложений, ${seen.size} дней (Europe/Moscow)\n`);
const days = [...new Set(rows.map(r => r.day))];
for (const day of days) {
  const group = rows.filter(r => r.day === day);
  console.log(`${day} — ${group.length} прил.:`);
  for (const r of group) {
    console.log(`  ${r.added}  ${r.id.padEnd(24)} ← ${r.commit.author}  ${r.commit.subject.slice(0, 60)}`);
  }
}
console.log('\nИнвариант «added строго возрастает по реестру»: ОК');
console.log(`Группы: ${days.map(d => `${d}×${rows.filter(r => r.day === d).length}`).join(', ')}`);

// --- 7: catalog.json (только с --write) ---
if (WRITE) {
  const entries = rows.map(r => {
    const meta = JSON.parse(fs.readFileSync(`apps/${r.id}/meta/meta.json`, 'utf8'));
    const e = { id: r.id, added: r.added };
    for (const k of META_ORDER) if (meta[k] !== undefined) e[k] = meta[k];
    return e;
  });
  fs.writeFileSync('catalog.json', JSON.stringify(entries, null, 2) + '\n');
  console.log(`\nЗаписан catalog.json (${entries.length} записей).`);
} else {
  console.log('\ndry-run: catalog.json НЕ записан (флаг --write).');
}
