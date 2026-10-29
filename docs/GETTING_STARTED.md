# Getting Started

## Prerequisites

| Tool | Versi Minimum | Cek |
|---|---|---|
| Node.js | 18.x | `node -v` |
| npm | 8.x | `npm -v` |
| Git | apapun | `git -v` |

> **Windows:** Tidak perlu WSL. PowerShell atau Git Bash keduanya berfungsi.

---

## Instalasi

```bash
git clone https://github.com/buildwithderry/automation_bdd.git
cd automation_bdd
npm install
npx playwright install chromium
```

Untuk pengujian cross-browser (Firefox, WebKit, mobile):
```bash
npx playwright install
```

---

## Konfigurasi Environment

```bash
# Salin template env
cp .env.example .env.dev
```

Untuk SauceDemo, `.env.dev` tidak perlu diubah — semua sudah ada defaultnya di `config/env.js`.

Untuk aplikasi sendiri, edit `.env.dev`:
```bash
BASE_URL=https://app.Anda.com
USERNAME=user@Anda.com
PASSWORD=password_Anda
```

---

## Jalankan Test Pertama

```bash
# Run semua test (headless)
npm test

# Hanya smoke test
npm run test:smoke

# Lihat browser bergerak (headed)
npm run test:headed
```

### Contoh Output Terminal

```
Running 17 tests using 4 workers

  ✓ [saucedemo-desktop] › saucedemo/auth/login › TC-SD-AUTH-001 › Login berhasil (2.3s)
  ✓ [saucedemo-desktop] › saucedemo/auth/login › TC-SD-AUTH-003 › Login ditolak akun terkunci (1.8s)
  ✓ [saucedemo-desktop] › saucedemo/cart/cart › TC-SD-CART-001 › Tambah satu produk (2.1s)
  ...
  17 passed (12s)
```

### Lihat Laporan HTML

```bash
npm run report       # Generate Allure report
npm run report:open  # Generate + buka di browser

# Atau Playwright built-in report:
npm run report:html
```

---

## Jalankan Test Spesifik

```bash
# Berdasarkan tag
npm run test:tag -- --grep @smoke
npm run test:tag -- --grep "@checkout and @core"

# Berdasarkan file feature
npx bddgen && playwright test --grep "Login"

# Test yang gagal di run sebelumnya
npm run test:gagal

# Debug mode (buka Playwright Inspector)
npm run test:debug
```

---

## Menambahkan Feature Baru

1. **Buat feature file** di `features/<app>/<module>/`:
   ```gherkin
   @modul-baru @smoke
   Feature: Fitur Baru

     @TC-APP-MOD-001 @smoke
     Scenario: Contoh skenario
       Given pengguna membuka halaman X
       When pengguna melakukan Y
       Then Z terjadi
   ```

2. **Buat/update step definitions** di `steps/<app>/`:
   ```js
   const { Given, When, Then } = require('../../fixtures/saucedemo.bdd.fixture');

   Given('pengguna membuka halaman X', async ({ page }) => {
     await page.goto('/x');
   });
   ```

3. **Buat Page Object** di `pages/<app>/` jika diperlukan.

4. **Jalankan** untuk memverifikasi:
   ```bash
   npm run bdd   # cek apakah bddgen berhasil
   npm test
   ```

---

## Troubleshooting

### `bddgen` error: "step not found"
- Pastikan step definition di-`require` dari fixture yang benar (`saucedemo.bdd.fixture.js`)
- Jalankan `npm run cek:step` untuk cek duplikat

### Test gagal karena timeout
- Naikkan `TIMEOUT_ACTION` di `.env.dev` (default: 15000ms)
- Untuk koneksi lambat: `TIMEOUT_NAVIGATION=60000`

### Browser tidak terbuka (`HEADLESS=false` tidak bekerja)
- Pastikan `.env.dev` sudah ada dan `HEADLESS=false` (bukan `true`)
- Atau gunakan: `cross-env HEADLESS=false npm test`

### Allure report kosong
- Pastikan sudah run test dulu (bukan `--list`)
- Jalankan `npm run report:clean` lalu run test ulang
