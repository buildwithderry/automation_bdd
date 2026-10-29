const { expect } = require('@playwright/test');
const { resolve } = require('../core/resolver');

/**
 * BasePage: semua interaksi lewat resolver (self-healing) + helper khusus
 * komponen Element Plus (el-select, el-date-picker, el-message, el-dialog).
 */
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  // ---------------------------------------------------------------- resolver
  /** Ambil Locator dari entri registry (dengan fallback berperingkat). */
  async loc(entry, opts = {}) {
    return resolve(opts.scope || this.page, entry, opts);
  }

  /** Dialog Element Plus yang sedang tampil (dipakai sebagai scope). */
  visibleDialog(hasText) {
    const base = this.page.locator('[role="dialog"]:visible');
    return hasText ? base.filter({ hasText }) : base;
  }

  // ------------------------------------------------------------------ aksi
  async click(entry, opts = {}) {
    const l = await this.loc(entry, opts);
    await l.click({ timeout: opts.timeout });
    return l;
  }

  async fill(entry, value, opts = {}) {
    if (value === undefined || value === null || value === '') return null;
    const l = await this.loc(entry, opts);
    await l.click({ timeout: opts.timeout }).catch(() => {});
    await l.fill(String(value), { timeout: opts.timeout });
    return l;
  }

  /**
   * Kosongkan sebuah field — SENGAJA terpisah dari `fill()`.
   *
   * `fill()` melewati string kosong supaya pabrik data boleh menyerahkan field
   * opsional sebagai `''` tanpa menyentuh isinya. Akibatnya `fill(entry, '')`
   * TIDAK mengosongkan apa pun, dan skenario negatif yang memakainya akan
   * mengira aplikasi menolak pengosongan padahal fieldnya tak pernah dikosongi.
   * Pakai method ini untuk menguji
   * field wajib.
   */
  async kosongkan(entry, opts = {}) {
    const l = await this.loc(entry, opts);
    await l.click({ timeout: opts.timeout }).catch(() => {});
    await l.fill('', { timeout: opts.timeout });
    return l;
  }

  /** Ketik pelan (untuk field bermask seperti NPWP). */
  async type(entry, value, opts = {}) {
    if (!value) return null;
    const l = await this.loc(entry, opts);
    await l.click();
    await l.fill('');
    await l.pressSequentially(String(value), { delay: opts.delay ?? 35 });
    return l;
  }

  async textOf(entry, opts = {}) {
    const l = await this.loc(entry, opts);
    return (await l.innerText()).trim();
  }

  async isVisible(entry, opts = {}) {
    try {
      const l = await this.loc(entry, { ...opts, timeout: opts.timeout ?? 3000 });
      return await l.isVisible();
    } catch {
      return false;
    }
  }

  // -------------------------------------------------- komponen Element Plus
  /**
   * Pilih opsi pada el-select.
   * @param {object} entry entri registry yang menunjuk root .el-select
   * @param {string|RegExp|{index:number}} option teks opsi, atau {index:0} untuk opsi ke-n
   */
  async selectOption(entry, option, opts = {}) {
    const select = await this.loc(entry, opts);
    const wrapper = select.locator('.el-select__wrapper');
    await (await wrapper.count() ? wrapper : select).click();

    const list = await this._openDropdown(select);
    let item;
    if (typeof option === 'object' && option !== null && 'index' in option) {
      await expect(list.locator('.el-select-dropdown__item').first()).toBeVisible({ timeout: 10000 });
      item = list.locator('.el-select-dropdown__item').nth(option.index);
    } else if (option instanceof RegExp) {
      item = list.locator('.el-select-dropdown__item').filter({ hasText: option }).first();
    } else {
      item = list.locator('.el-select-dropdown__item').filter({ hasText: option }).first();
    }
    await item.waitFor({ state: 'visible', timeout: 10000 });
    const chosen = (await item.innerText()).trim();
    await item.click();
    await this.page.waitForTimeout(250);
    return chosen;
  }

  /**
   * Pilih BEBERAPA opsi pada el-select bertipe multiple.
   * Dropdown dibuka sekali, semua opsi diklik, lalu ditutup.
   *
   * @param {object} entry entri registry yang menunjuk root .el-select
   * @param {Array<string|RegExp>} pilihan daftar teks opsi
   * @returns {Promise<string[]>} teks opsi yang benar-benar terpilih
   */
  async selectOptions(entry, pilihan = [], opts = {}) {
    const select = await this.loc(entry, opts);
    const wrapper = select.locator('.el-select__wrapper');
    await ((await wrapper.count()) ? wrapper : select).click();
    const list = await this._openDropdown(select);
    await expect(list.locator('.el-select-dropdown__item').first()).toBeVisible({ timeout: 10000 });

    const terpilih = [];
    for (const p of pilihan) {
      const item = list.locator('.el-select-dropdown__item').filter({ hasText: p }).first();
      await item.waitFor({ state: 'visible', timeout: 10000 });
      const teks = (await item.innerText()).trim();
      // dropdown tetap terbuka pada mode multiple; lewati kalau sudah tercentang
      const sudah = (await item.getAttribute('aria-selected')) === 'true';
      if (!sudah) await item.click();
      terpilih.push(teks);
      await this.page.waitForTimeout(250);
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    return terpilih;
  }

  /** Daftar teks opsi sebuah el-select (dropdown dibuka lalu ditutup lagi). */
  async optionsOf(entry, opts = {}) {
    const select = await this.loc(entry, opts);
    const wrapper = select.locator('.el-select__wrapper');
    await (await wrapper.count() ? wrapper : select).click();
    const list = await this._openDropdown(select);
    await this.page.waitForTimeout(400);
    const texts = await list.locator('.el-select-dropdown__item').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  /**
   * Cari <ul> dropdown milik select ini lewat aria-controls (paling presisi:
   * id-nya dibaca runtime, bukan di-hardcode), fallback ke dropdown yang visible.
   */
  async _openDropdown(select) {
    const input = select.locator('input[role="combobox"]').first();
    let listId = null;
    try {
      listId = await input.getAttribute('aria-controls', { timeout: 2000 });
    } catch { /* tanpa aria-controls */ }
    if (listId) {
      const byAria = this.page.locator(`ul[id="${listId}"]`);
      if (await byAria.count()) return byAria;
    }
    return this.page.locator('.el-select-dropdown:visible').last();
  }

  /** Isi el-date-picker dengan format DD/MM/YYYY. */
  async pickDate(entry, ddmmyyyy, opts = {}) {
    const l = await this.loc(entry, opts);
    await l.click();
    await l.fill(ddmmyyyy);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
    // tutup panel kalender kalau masih terbuka
    if (await this.page.locator('.el-picker-panel:visible').count()) {
      await this.page.keyboard.press('Escape');
    }
    return l;
  }

  /** Ambil isi el-message / notifikasi terakhir. */
  async messageText(timeout = 10000) {
    const msg = this.page.locator('.el-message, .el-notification, [role="alert"]').filter({ hasText: /\S/ }).first();
    await msg.waitFor({ state: 'visible', timeout }).catch(() => {});
    return (await msg.count()) ? (await msg.innerText()).replace(/\s+/g, ' ').trim() : '';
  }

  /** Error validasi form yang sedang tampil. */
  async formErrors() {
    const errs = this.page.locator('.el-form-item__error:visible');
    return (await errs.count()) ? (await errs.allInnerTexts()).map((t) => t.trim()) : [];
  }

  async waitIdle(timeout = 15000) {
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  async screenshot(name) {
    return this.page.screenshot({ fullPage: true, path: `artifacts/screenshots/${name}.png` });
  }

  /**
   * Dialog konfirmasi "Apakah data ... sudah benar?" yang muncul SEBELUM
   * aplikasi mengirim request.
   *
   * Dialog ini bukan `el-dialog` dan tidak punya test-id; yang menandainya
   * hanyalah tombol afirmatif ("Ya, Simpan" / "Ya, Lanjutkan"). Selama tombol
   * itu belum diklik, aplikasi TIDAK mengirim apa pun — sempat terbaca sebagai
   * "tombol simpan rusak" — ternyata salah baca dari sisi test.
   *
   * @param {RegExp} [pola] teks tombol afirmatif
   * @returns {Promise<boolean>} true kalau dialognya memang muncul dan diklik
   */
  async konfirmasiDialog(pola = /^(Ya,|Setujui|Konfirmasi|Lanjutkan)/i, { timeout = 4000 } = {}) {
    /**
     * Dicari DI DALAM overlay-nya, bukan di seluruh halaman: form di baliknya
     * masih punya tombol aksi sendiri ("Proses Setoran"), dan mengkliknya
     * hanya berujung pada overlay yang memblokir pointer.
     */
    const overlay = this.page.locator('div.fixed.inset-0').filter({ has: this.page.getByRole('button', { name: pola }) }).last();
    const tombol = (await overlay.count())
      ? overlay.getByRole('button', { name: pola }).last()
      : this.page.getByRole('button', { name: pola }).last();
    try {
      await tombol.waitFor({ state: 'visible', timeout });
    } catch {
      return false;
    }
    await tombol.click();
    await this.page.waitForTimeout(600);
    return true;
  }

  /**
   * Tekan "Batal" pada dialog konfirmasi yang sedang tampil.
   * @returns {Promise<boolean>} true kalau dialognya memang ada
   */
  async batalDialog(pola = /^(Batal|Batalkan)$/i) {
    const overlay = this.page.locator('div.fixed.inset-0').filter({ has: this.page.getByRole('button', { name: pola }) }).last();
    const tombol = (await overlay.count())
      ? overlay.getByRole('button', { name: pola }).last()
      : this.page.getByRole('button', { name: pola }).last();
    if (!(await tombol.count())) return false;
    await tombol.click();
    await this.page.waitForTimeout(800);
    return true;
  }

  /**
   * Response TERAKHIR yang cocok selama sebuah aksi berjalan.
   *
   * Bedanya dengan `waitForResponse`: aksi yang menyentuh BEBERAPA field filter
   * menerbitkan satu request per perubahan, dan `waitForResponse` berhenti pada
   * yang PERTAMA — sehingga parameter yang terbaca masih setengah jadi
   * (mis. `to_date` masih nilai lama saat `from_date` baru diganti).
   *
   * @param {() => Promise<any>} aksi
   * @param {string} endpoint potongan URL yang dicocokkan
   * @returns {Promise<import('@playwright/test').Response|null>}
   */
  async responsTerakhirSaat(aksi, endpoint, { settle = 2000 } = {}) {
    const terkumpul = [];
    const pantau = (res) => {
      if (res.url().includes(endpoint)) terkumpul.push(res);
    };
    this.page.on('response', pantau);
    try {
      await aksi();
      await this.page.waitForTimeout(settle);
    } finally {
      this.page.off('response', pantau);
    }
    return terkumpul.length ? terkumpul[terkumpul.length - 1] : null;
  }

  /**
   * Request API non-GET yang benar-benar dikirim selama sebuah aksi berjalan.
   *
   * Dipakai untuk membedakan "aplikasi menolak" dari "aplikasi tidak mengirim
   * apa pun" — pembedaan yang menentukan waktu menilai tombol yang tampak
   * diam.
   *
   * @param {() => Promise<any>} aksi
   * @returns {Promise<string[]>} daftar "METHOD /api/..." (kosong = tidak ada)
   */
  async requestSaat(aksi, { tunggu = 4000 } = {}) {
    const terkirim = [];
    const pantau = (req) => {
      if (req.method() !== 'GET' && req.url().includes('/api/')) {
        terkirim.push(`${req.method()} ${req.url().split('/api/')[1].split('?')[0]}`);
      }
    };
    this.page.on('request', pantau);
    try {
      await aksi();
      await this.page.waitForTimeout(tunggu);
    } finally {
      this.page.off('request', pantau);
    }
    return terkirim;
  }

  /** Judul + pertanyaan pada dialog konfirmasi yang sedang tampil. */
  /**
   * @param {RegExp} [pola] pola tombol afirmatif dialognya. Perlu disebut kalau
   *   tombolnya tidak berpola umum ("Approve" pada persetujuan Permohonan
   *   Berhenti), ATAU kalau halaman di belakang dialog punya tombol yang ikut
   *   cocok dengan pola bawaan — kasus itu membuat isi dialog terbaca dari
   *   tombol yang salah.
   */
  async isiDialogKonfirmasi(pola = /^(Ya,|Setujui|Konfirmasi)/i, { timeout = 6000 } = {}) {
    /**
     * Ditunggu, bukan dibaca sekali lalu dianggap tidak ada.
     *
     * Dialog konfirmasi dirender setelah animasi, dan lamanya berbeda-beda per
     * panel. Versi tanpa penantian kadang membaca DOM sebelum dialognya ada dan
     * mengembalikan `null` — testnya lalu gagal pada dialog yang sebenarnya
     * muncul beberapa ratus milidetik kemudian.
     */
    const batas = Date.now() + timeout;
    for (;;) {
      const ada = await this.page.evaluate(
        (p) => [...document.querySelectorAll('button')].some((b) => new RegExp(p.source, p.flags).test(b.innerText.trim())),
        { source: pola.source, flags: pola.flags }
      );
      if (ada || Date.now() > batas) break;
      await this.page.waitForTimeout(250);
    }

    return this.page.evaluate((sumberPola) => {
      const uji = new RegExp(sumberPola.source, sumberPola.flags);
      /**
       * Diambil yang TERAKHIR: dialog dirender sesudah halaman, jadi tombolnya
       * ada di belakang dalam urutan DOM. Mengambil yang pertama memungut
       * tombol halaman yang tertutup dialog.
       */
      const cocok = [...document.querySelectorAll('button')].filter((b) => uji.test(b.innerText.trim()));
      const tombol = cocok[cocok.length - 1];
      if (!tombol) return null;
      /**
       * Naik dari tombol mencari kotak yang benar-benar memuat isi dialognya.
       * Berhenti di pembungkus terdekat hanya memungut baris tombolnya saja
       * ("Batalkan | Setujui & Proses"), sementara naik terlalu jauh memungut
       * seluruh halaman. Jadi diambil leluhur BERTEKS TERPANJANG yang masih
       * masuk akal sebagai dialog dan belum menyentuh kerangka halaman.
       */
      let kotak = tombol.parentElement;
      let terbaik = kotak;
      for (let i = 0; i < 8 && kotak; i++) {
        const teks = (kotak.innerText || '').trim();
        if (teks.length > 600 || /Ganti Modul/.test(teks)) break;
        if (teks.length > (terbaik.innerText || '').trim().length) terbaik = kotak;
        kotak = kotak.parentElement;
      }
      kotak = terbaik;
      const baris = (kotak.innerText || '').split(String.fromCharCode(10)).map((t) => t.trim()).filter(Boolean);
      return { baris, teks: baris.join(' | ') };
    }, { source: pola.source, flags: pola.flags });
  }
}

module.exports = { BasePage };
