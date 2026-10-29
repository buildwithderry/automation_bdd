const fs = require('fs');
const path = require('path');

/**
 * Deteksi step definition GANDA di seluruh `steps/`.
 *
 * `playwright-bdd` menolak generate begitu satu kalimat Gherkin cocok dengan
 * dua definisi — dan ia berhenti pada tabrakan PERTAMA, jadi menemukannya
 * lewat `bddgen` berarti satu putaran per tabrakan. Skrip ini melaporkan
 * semuanya sekaligus.
 *
 * Kenapa ini sering terjadi, dan kenapa jawabannya bukan sekadar menghapus
 * salah satu: kalimat seperti "baris di layar cocok dengan data server"
 * memang benar untuk BANYAK halaman. Yang perlu diperbaiki KALIMATNYA —
 * disebutkan halamannya — karena kalimat samar juga menyulitkan pembacanya,
 * bukan hanya generatornya.
 *
 *   node scripts/cek_step_ganda.js
 */

function berkasJs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkasJs(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const POLA = /^\s*(?:Given|When|Then|Step)\(\s*(['"`])([\s\S]*?)\1/gm;

const peta = new Map();
for (const berkas of berkasJs('steps')) {
  const isi = fs.readFileSync(berkas, 'utf8');
  let m;
  POLA.lastIndex = 0;
  while ((m = POLA.exec(isi))) {
    const kalimat = m[2];
    if (!peta.has(kalimat)) peta.set(kalimat, []);
    peta.get(kalimat).push(berkas);
  }
}

let ganda = 0;
for (const [kalimat, berkas] of peta) {
  if (berkas.length < 2) continue;
  ganda++;
  console.log(`GANDA: "${kalimat}"`);
  for (const b of berkas) console.log(`   ${b}`);
  console.log('');
}

console.log(ganda ? `${ganda} kalimat terdefinisi lebih dari sekali.` : `Bersih — ${peta.size} step, tidak ada yang ganda.`);
process.exitCode = ganda ? 1 : 0;
