#!/usr/bin/env node
/* apply.cjs — применятель воркфлоу apply-tmp-patch.
   Кладёт приложение из .tmp/payload в репозиторий, углубляет историю git
   (чтобы «git push origin HEAD:main» прошёл как fast-forward) и запускает
   нормализатор репозитория, который сам ставит запись в catalog.json. */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = process.cwd();
const PAY = path.join(ROOT, ".tmp", "payload");

function sh(cmd, args, fatal = true) {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || "").toString().trim();
    console.log(`! ${cmd} ${args.join(" ")} → ${msg.split("\n").slice(-3).join(" | ")}`);
    if (fatal) throw e;
    return "";
  }
}

/* 1. Раскладываем файлы приложения */
const manifest = JSON.parse(fs.readFileSync(path.join(PAY, "manifest.json"), "utf8"));
for (const f of manifest) {
  const dest = path.join(ROOT, f.dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const raw = fs.readFileSync(path.join(PAY, f.src));
  let out;
  if (f.encoding === "gzip+base64") {
    out = zlib.gunzipSync(Buffer.from(raw.toString("utf8").replace(/\s+/g, ""), "base64"));
  } else if (f.encoding === "base64") {
    out = Buffer.from(raw.toString("utf8").replace(/\s+/g, ""), "base64");
  } else {
    out = raw;
  }
  fs.writeFileSync(dest, out);
  console.log(`write ${f.dest} (${out.length} B)`);
}

/* 2. Углубляем историю: checkout делается с fetch-depth: 1, и без этого
   «git push origin HEAD:main» отклоняется как не-fast-forward. */
if (fs.existsSync(path.join(ROOT, ".git", "shallow"))) {
  sh("git", ["fetch", "--unshallow", "origin"], false);
}
if (!sh("git", ["rev-parse", "--verify", "HEAD"], false)) sh("git", ["fetch", "origin", "main", "--depth=500"], false);
sh("git", ["fetch", "origin", "main", "--depth=500"], false);
console.log("history:", sh("git", ["log", "--oneline", "-3"], false).trim().split("\n").join(" / "));

/* 3. Нормализатор репозитория: ставит added и вписывает запись в каталог */
sh("node", ["scripts/normalize.mjs"]);
sh("node", ["scripts/validate.mjs"], false);

/* 4. Контрольная проверка */
const cat = fs.readFileSync(path.join(ROOT, "catalog.json"), "utf8");
console.log("catalog has treendom:", cat.includes('"treendom"'));
console.log("src/index.html:", fs.statSync(path.join(ROOT, "apps/treendom/src/index.html")).size, "B");
for (const s of ["screenshot-1.webp", "screenshot-2.webp"]) {
  const p = path.join(ROOT, "apps/treendom/meta/screenshots", s);
  console.log(`screenshots/${s}:`, fs.existsSync(p) ? fs.statSync(p).size + " B" : "ОТСУТСТВУЕТ");
}
