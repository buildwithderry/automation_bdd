const fs = require('fs');
const path = require('path');

const { Parser, AstBuilder, GherkinClassicTokenMatcher } = require('@cucumber/gherkin');
const { IdGenerator } = require('@cucumber/messages');

/**
 * Pemeriksa STANDAR BDD untuk seluruh feature file.
 *
 * Kenapa perlu ada, dan kenapa bukan sekadar code review: standar BDD itu
 * bentuknya aturan-aturan kecil yang masing-masing sepele dan semuanya mudah
 * terlewat — satu skenario tanpa tag @TC-, satu Background yang menyelipkan
 * When, satu ekspresi step dengan garis miring telanjang. Sepele satu per satu,
 * tapi akibatnya tidak: tag @TC- yang hilang membuat tombol Retry tidak bisa
 * memilih skenario itu, dan garis miring yang lupa di-escape diperlakukan
 * Cucumber sebagai ALTERNASI sehingga step-nya tidak pernah cocok.
 *
 * Acuannya spreadsheet Three Amigos (`Panduan BDD`) plus pelajaran yang sudah
 * dibayar di repo ini sendiri. Tiap aturan di bawah menyebut alasannya; aturan
 * tanpa alasan tidak layak ditegakkan.
 *
 *   node scripts/cek_standar_bdd.js            # galat + peringatan
 *   node scripts/cek_standar_bdd.js --galat    # galat saja (dipakai CI)
 *
 * Keluar dengan kode 1 kalau ada GALAT. Peringatan tidak menjatuhkan.
 */

const AKAR = path.join(process.cwd(), 'features');
const HANYA_GALAT = process.argv.includes('--galat');

/** Tag identitas test case. Satu skenario = tepat satu tag ini. */
const POLA_TC = /^@TC-[A-Z]+-[A-Z]+-\d+$/;
/** Tag suite: menentukan skenario ini ikut run yang mana. */
const TAG_SUITE = ['@smoke', '@regression'];
/** Batas panjang skenario sebelum dianggap mengerjakan terlalu banyak hal. */
const MAKS_LANGKAH = 16;
/** Background yang panjang berarti penyiapannya sudah jadi cerita tersendiri. */
const MAKS_LATAR = 5;

const galat = [];
const peringatan = [];

const catat = (daftar, berkas, baris, aturan, pesan) =>
  daftar.push({ berkas, baris, aturan, pesan });

function semuaFeature(dir, keluar = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) semuaFeature(p, keluar);
    else if (f.name.endsWith('.feature')) keluar.push(p);
  }
  return keluar.sort();
}

/** Kumpulkan skenario beserta konteksnya (rule induk, background sefitur). */
function bongkar(feature) {
  const hasil = { latar: null, skenario: [] };

  const telusuri = (anak, aturan) => {
    for (const c of anak) {
      if (c.background) {
        /* Gherkin membolehkan Background per Rule; yang dipakai repo ini hanya
         * satu per fitur, dan itu yang diperiksa. */
        hasil.latar = c.background;
        continue;
      }
      if (c.rule) {
        telusuri(c.rule.children, c.rule);
        continue;
      }
      if (c.scenario) hasil.skenario.push({ s: c.scenario, aturan });
    }
  };

  telusuri(feature.children, null);
  return hasil;
}

/** Given/When/Then efektif: And & But melanjutkan langkah sebelumnya. */
function jenisEfektif(langkah) {
  const tetap = new Set(['Given ', 'When ', 'Then ']);
  let terakhir = null;
  return langkah.map((s) => {
    if (tetap.has(s.keyword)) terakhir = s.keyword.trim();
    return { s, jenis: terakhir };
  });
}

const semuaTc = new Map();
const semuaJudul = new Map();
let jumlahSkenario = 0;
let jumlahLangkah = 0;

for (const berkas of semuaFeature(AKAR)) {
  const rel = path.relative(process.cwd(), berkas).split(path.sep).join('/');
  const isi = fs.readFileSync(berkas, 'utf8');

  /* ── 1. Dialek ────────────────────────────────────────────────────────
   * Kata kunci Inggris, teks langkah Indonesia. Spesifikasi datang dari
   * spreadsheet Three Amigos yang sudah berbentuk begitu; feature file yang
   * bisa ditempel apa adanya dari sana jauh lebih mungkin tetap sepadan
   * dengan spesifikasinya daripada yang harus diterjemahkan tiap kali. */
  const barisBahasa = isi.split(/\r?\n/).findIndex((b) => /^\s*#\s*language:/i.test(b));
  if (barisBahasa >= 0) {
    catat(galat, rel, barisBahasa + 1, 'dialek', 'Masih ada baris `# language:`. Kata kunci Gherkin dipakai dalam bahasa Inggris.');
  }

  let doc;
  try {
    doc = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher('en')).parse(isi);
  } catch (e) {
    catat(galat, rel, 1, 'sintaks', `Tidak bisa diurai: ${String(e.message).split('\n')[0]}`);
    continue;
  }
  if (!doc.feature) {
    catat(galat, rel, 1, 'sintaks', 'Tidak ada Feature di berkas ini.');
    continue;
  }

  const { latar, skenario } = bongkar(doc.feature);

  /* ── 2. Background hanya menyiapkan ───────────────────────────────────
   * Background berjalan sebelum SETIAP skenario di fiturnya. Menaruh When
   * atau Then di sana berarti satu aksi dijalankan berulang-ulang dan satu
   * pemeriksaan dihitung berkali-kali — dan kalau ia gagal, yang roboh bukan
   * satu skenario melainkan seluruh fitur, dengan pesan yang menunjuk ke
   * skenario yang sebenarnya tidak bersalah. */
  if (latar) {
    for (const { s, jenis } of jenisEfektif(latar.steps)) {
      if (jenis && jenis !== 'Given') {
        catat(galat, rel, s.location.line, 'background-given', `Background memuat ${jenis}: "${s.keyword.trim()} ${s.text}". Background hanya boleh menyiapkan konteks.`);
      }
    }
    if (latar.steps.length > MAKS_LATAR) {
      catat(peringatan, rel, latar.location.line, 'background-panjang', `Background ${latar.steps.length} langkah (>${MAKS_LATAR}). Penyiapan sepanjang ini biasanya lebih tepat jadi satu langkah bermakna bisnis.`);
    }
  }

  if (!skenario.length) {
    catat(galat, rel, doc.feature.location.line, 'kosong', 'Feature tanpa satu pun Scenario.');
  }

  const judulDiBerkas = new Set();

  for (const { s, aturan } of skenario) {
    jumlahSkenario += 1;
    jumlahLangkah += s.steps.length;

    const tag = s.tags.map((t) => t.name);
    const baris = s.location.line;

    /* ── 3. Identitas test lestari ──────────────────────────────────────
     * Tag @TC- dipakai Allure, portal SPECQA (`automationKey`), dan `--grep`
     * saat tombol Retry ditekan. Judul skenario boleh berubah, tagnya tidak.
     * Skenario tanpa tag ini tidak bisa diulang sendirian. */
    const tc = tag.filter((t) => POLA_TC.test(t));
    if (tc.length === 0) {
      catat(galat, rel, baris, 'tag-tc', `Tidak punya tag @TC-. Skenario ini tidak bisa dipilih ulang saat Retry.`);
    } else if (tc.length > 1) {
      catat(galat, rel, baris, 'tag-tc', `Punya ${tc.length} tag @TC- (${tc.join(', ')}). Satu skenario = satu identitas.`);
    } else {
      const sudah = semuaTc.get(tc[0]);
      if (sudah) {
        catat(galat, rel, baris, 'tag-tc-ganda', `${tc[0]} sudah dipakai di ${sudah}. Retry akan menjalankan keduanya.`);
      } else {
        semuaTc.set(tc[0], `${rel}:${baris}`);
      }
    }

    /* ── 4. Tag suite ───────────────────────────────────────────────────
     * Portal menjalankan run lewat `--grep` atas tag suite. Skenario tanpa
     * @smoke maupun @regression tidak pernah ikut run mana pun — ia lolos
     * dari perhatian tanpa pernah dinyatakan dilewati. */
    if (!TAG_SUITE.some((t) => tag.includes(t))) {
      catat(galat, rel, baris, 'tag-suite', `Tidak punya ${TAG_SUITE.join(' maupun ')}. Skenario ini tidak ikut run mana pun.`);
    }

    /* ── 5. Judul unik ──────────────────────────────────────────────────
     * Judul yang sama di satu berkas membuat laporan tidak bisa dibaca:
     * dua baris identik dengan hasil berbeda. */
    const judul = s.name.trim();
    if (!judul) {
      catat(galat, rel, baris, 'judul', 'Scenario tanpa judul.');
    } else if (judulDiBerkas.has(judul)) {
      catat(galat, rel, baris, 'judul-ganda', `Judul "${judul}" muncul dua kali di berkas ini.`);
    } else {
      judulDiBerkas.add(judul);
      const lain = semuaJudul.get(judul);
      if (lain) {
        catat(peringatan, rel, baris, 'judul-ganda-global', `Judul "${judul}" juga dipakai di ${lain}.`);
      } else {
        semuaJudul.set(judul, `${rel}:${baris}`);
      }
    }

    /* ── 6. Aturan (Acceptance Criteria) ────────────────────────────────
     * Spreadsheet Three Amigos memberi tiap baris sebuah AC. Skenario yang
     * tidak berada di bawah Rule kehilangan tautan ke kriteria yang
     * seharusnya ia buktikan. */
    if (!aturan) {
      catat(peringatan, rel, baris, 'tanpa-rule', 'Skenario di luar Rule — tidak jelas acceptance criteria mana yang dibuktikannya.');
    }

    /* ── 7. Bentuk Given-When-Then ──────────────────────────────────────
     * Skenario tanpa When tidak menguji aksi apa pun; tanpa Then tidak
     * memeriksa apa pun. Given boleh tidak ada kalau Background sudah
     * menyediakan konteksnya. */
    const efektif = jenisEfektif(s.steps);
    const punya = new Set(efektif.map((x) => x.jenis).filter(Boolean));

    if (efektif.length && !efektif[0].jenis) {
      catat(galat, rel, efektif[0].s.location.line, 'awalan-and', `Langkah pertama "${efektif[0].s.keyword.trim()}" — And/But tidak bisa jadi langkah pertama, tidak ada yang dilanjutkannya.`);
    }
    /*
     * Tanpa When = PERINGATAN, bukan galat. Sebagian skenario memang audit
     * keadaan murni ("Given prasyaratnya ada, Then bentuknya begini") dan tidak
     * punya aksi apa pun. Menuntut When di situ hanya melahirkan kalimat karangan
     * yang tidak sepadan dengan apa yang benar-benar dikerjakan test-nya — dan
     * spesifikasi yang mengarang lebih buruk daripada spesifikasi yang pendek.
     *
     * Tanpa Then tetap GALAT: skenario yang tidak memeriksa apa pun tidak
     * membuktikan apa pun, berapa pun banyak langkahnya.
     */
    if (!punya.has('When')) {
      catat(peringatan, rel, baris, 'tanpa-when', 'Tidak ada When — pastikan ini memang audit keadaan, bukan aksi yang lupa ditulis.');
    }
    if (!punya.has('Then')) {
      catat(galat, rel, baris, 'tanpa-then', 'Tidak ada Then. Skenario ini tidak memeriksa apa pun.');
    }

    /* Given SESUDAH When: konteks yang disiapkan di tengah aksi hampir selalu
     * tanda dua skenario yang tergabung jadi satu. */
    const iWhen = efektif.findIndex((x) => x.jenis === 'When');
    if (iWhen >= 0) {
      const givenTelat = efektif.findIndex((x, i) => i > iWhen && x.s.keyword.trim() === 'Given');
      if (givenTelat >= 0) {
        catat(peringatan, rel, efektif[givenTelat].s.location.line, 'given-telat', 'Given muncul sesudah When — biasanya tanda dua skenario tergabung jadi satu.');
      }
    }

    if (s.steps.length > MAKS_LANGKAH) {
      catat(peringatan, rel, baris, 'skenario-panjang', `${s.steps.length} langkah (>${MAKS_LANGKAH}). Skenario sepanjang ini sulit dibaca dan sulit dicari sebab gagalnya.`);
    }

    /* ── 8. Kalimat langkah ─────────────────────────────────────────────
     *
     * Garis miring TIDAK diperiksa di sini, dan itu koreksi atas versi pertama
     * pemeriksa ini. Ia sempat menandai 13 langkah yang sebenarnya baik-baik
     * saja — "17/05/1990", "debit/kredit" — dengan alasan Cucumber membaca "/"
     * sebagai alternasi. Alternasi itu berlaku pada EKSPRESI di step
     * definition, bukan pada kalimat di feature file: begitu definisinya
     * meng-escape slash-nya (`debit\/kredit`), kalimatnya cocok sempurna.
     *
     * Buktinya ada dan murah: `bddgen` GAGAL kalau satu langkah saja tidak
     * cocok, dan ia berhasil untuk ketiga belasnya. Pemeriksaan yang lebih
     * lemah daripada yang sudah dijalankan generator setiap kali tidak layak
     * dipertahankan. Aturannya pindah ke `cekDefinisi()` di bawah, tempat
     * bahayanya benar-benar ada.
     */
    for (const st of s.steps) {
      const teks = st.text.trim();
      if (/[.]$/.test(teks)) {
        catat(peringatan, rel, st.location.line, 'titik-akhir', `Diakhiri titik: "${teks}"`);
      }
      if (!teks) {
        catat(galat, rel, st.location.line, 'langkah-kosong', 'Langkah tanpa kalimat.');
      }
    }
  }
}

/* ── 9. Ekspresi step definition ───────────────────────────────────────────
 *
 * DI SINILAH garis miring berbahaya, bukan di feature file.
 *
 * Cucumber Expression membaca `debit/kredit` sebagai ALTERNASI: ekspresinya
 * cocok dengan "debit" atau "kredit", tapi tidak dengan "debit/kredit". Kalimat
 * di feature file boleh memuat slash sebanyak apa pun — yang harus meng-escape
 * adalah ekspresinya (`debit\/kredit`).
 *
 * Kegagalannya memang keras (`bddgen` menolak generate), jadi ia tidak akan
 * lolos ke produksi. Yang mahal adalah pesannya: "no matching step definition"
 * untuk kalimat yang terlihat sama persis dengan definisinya, dan orang bisa
 * menghabiskan setengah jam sebelum menyadari sebabnya satu karakter.
 */
function cekDefinisi() {
  const dir = path.join(process.cwd(), 'steps');
  if (!fs.existsSync(dir)) return;

  const berkasJs = (d, out = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) berkasJs(p, out);
      else if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
  };

  /* Hanya literal string; definisi berbasis RegExp punya aturan sendiri. */
  const POLA = /^[ \t]*(?:Given|When|Then|Step)\(\s*(['"])((?:[^\\]|\\.)*?)\1/gm;

  for (const berkas of berkasJs(dir)) {
    const rel = path.relative(process.cwd(), berkas).split(path.sep).join('/');
    const isi = fs.readFileSync(berkas, 'utf8');
    const sebelum = isi.split(/\r?\n/);

    POLA.lastIndex = 0;
    let m;
    while ((m = POLA.exec(isi))) {
      const mentah = m[2];
      /* `\\/` di sumber JS = slash yang sudah di-escape di ekspresinya. */
      if (!/(^|[^\\])\//.test(mentah.replace(/\\\\\//g, 'ESCAPED'))) continue;

      const baris = sebelum.findIndex((b) => b.includes(mentah.slice(0, 40))) + 1;
      catat(
        galat,
        rel,
        baris || 1,
        'slash-tak-diescape',
        `Ekspresi memuat "/" telanjang — Cucumber membacanya sebagai alternasi. Tulis "\\\\/": "${mentah.slice(0, 70)}"`
      );
    }
  }
}

cekDefinisi();

/* ── laporan ─────────────────────────────────────────────────────────────── */

function cetak(judul, daftar) {
  if (!daftar.length) return;
  console.log(`\n${judul} (${daftar.length})`);
  const perAturan = new Map();
  for (const t of daftar) {
    if (!perAturan.has(t.aturan)) perAturan.set(t.aturan, []);
    perAturan.get(t.aturan).push(t);
  }
  for (const [aturan, temuan] of [...perAturan.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  [${aturan}] ${temuan.length}`);
    for (const t of temuan.slice(0, 12)) console.log(`    ${t.berkas}:${t.baris}  ${t.pesan}`);
    if (temuan.length > 12) console.log(`    … dan ${temuan.length - 12} lagi`);
  }
}

console.log(
  `${semuaFeature(AKAR).length} feature · ${jumlahSkenario} skenario · ${jumlahLangkah} langkah · ${semuaTc.size} tag @TC- unik`
);

cetak('GALAT — harus diperbaiki', galat);
if (!HANYA_GALAT) cetak('PERINGATAN — perlu ditinjau', peringatan);

if (!galat.length) console.log(`\nSemua aturan wajib terpenuhi.${peringatan.length && HANYA_GALAT ? ` (${peringatan.length} peringatan disembunyikan)` : ''}`);
process.exit(galat.length ? 1 : 0);
