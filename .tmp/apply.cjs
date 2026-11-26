#!/usr/bin/env node
/* apply.cjs — одноразовый скрипт применения правок приложения maprandom.
   Запускается воркфлоу .github/workflows/apply-tmp-patch.yml из корня репозитория:
   файлы приезжают в .tmp/, оттуда раскладываются по местам. Контрольные суммы
   бинарных файлов проверяются — при несовпадении скрипт падает и коммит не создаётся. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

/* текстовые файлы — копируются байт-в-байт */
const TEXT = [
  ['.tmp/README.md', 'README.md'],
  ['.tmp/catalog.json', 'catalog.json'],
  ['.tmp/index.html', 'apps/maprandom/src/index.html'],
  ['.tmp/meta.json', 'apps/maprandom/meta/meta.json'],
  ['.tmp/icon.svg', 'apps/maprandom/meta/icon.svg'],
];

/* бинарные файлы — base64 в .tmp, здесь декодируются */
const BIN = [
  ['.tmp/shot1.b64', 'apps/maprandom/meta/screenshots/screenshot-1.webp',
    'a2f6c7048a7e707144fd9dada8effc62157dce2fdc4ea0ff2a097ca4c21bddcb'],
  ['.tmp/shot2.b64', 'apps/maprandom/meta/screenshots/screenshot-2.webp',
    'cebf791c28f748fdb26be3ae65cbd5c934594ebe95f4db2873b694b380cd9dda'],
];

for (const [src, dst] of TEXT) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('write', dst, fs.statSync(dst).size, 'bytes');
}

for (const [src, dst, expect] of BIN) {
  const buf = Buffer.from(fs.readFileSync(src, 'utf8').replace(/\s+/g, ''), 'base64');
  const got = sha256(buf);
  if (got !== expect) {
    console.error('FAIL: несовпадение sha256 для', dst, got, '!=', expect);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, buf);
  console.log('write', dst, buf.length, 'bytes (sha256 совпал)');
}

console.log('apply: всё применено');
