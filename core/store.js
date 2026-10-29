/**
 * Penyimpan data hasil test -> JSON, supaya bisa di-reuse flow lain.
 * Semua file mendarat di fixtures/output/<bucket>/.
 *   - <bucket>/<slug>.json          : 1 record
 *   - <bucket>/_index.json          : daftar semua record (append), termasuk yang terbaru
 */
const fs = require('fs');
const path = require('path');

const OUT_ROOT = path.resolve(__dirname, '..', 'fixtures', 'output');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function stampSlug(prefix) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${slugify(prefix)}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Simpan 1 record ke bucket, sekaligus append ke _index.json. */
function saveRecord(bucket, name, data) {
  const dir = path.join(OUT_ROOT, bucket);
  fs.mkdirSync(dir, { recursive: true });
  const slug = stampSlug(name);
  const file = path.join(dir, `${slug}.json`);
  const record = { _id: slug, _savedAt: new Date().toISOString(), ...data };
  fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');

  const indexFile = path.join(dir, '_index.json');
  let index = [];
  if (fs.existsSync(indexFile)) {
    try { index = JSON.parse(fs.readFileSync(indexFile, 'utf8')); } catch { index = []; }
  }
  index.push(record);
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
  return { file, slug, record };
}

/** Update record yang sudah ada (mis. setelah aktivasi: state inactive -> active). */
function updateRecord(bucket, slug, patch) {
  const dir = path.join(OUT_ROOT, bucket);
  const file = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(file)) throw new Error(`[store] record ${bucket}/${slug} tidak ditemukan`);
  const record = { ...JSON.parse(fs.readFileSync(file, 'utf8')), ...patch, _updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');

  const indexFile = path.join(dir, '_index.json');
  if (fs.existsSync(indexFile)) {
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const i = index.findIndex((r) => r._id === slug);
    if (i >= 0) index[i] = record; else index.push(record);
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
  }
  return record;
}

/** Ambil record terakhir dari bucket, optional filter. */
function latest(bucket, predicate) {
  const indexFile = path.join(OUT_ROOT, bucket, '_index.json');
  if (!fs.existsSync(indexFile)) return null;
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  const filtered = predicate ? index.filter(predicate) : index;
  return filtered.length ? filtered[filtered.length - 1] : null;
}

function readRecord(bucket, slug) {
  const file = path.join(OUT_ROOT, bucket, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { saveRecord, updateRecord, latest, readRecord, slugify, stampSlug, OUT_ROOT };
