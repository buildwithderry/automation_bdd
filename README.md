# Automation BDD Template

> **Playwright + playwright-bdd + Allure** — template E2E siap pakai dengan contoh SauceDemo.

Framework ini adalah titik awal untuk proyek E2E BDD baru. Contoh di dalamnya menggunakan **[SauceDemo](https://www.saucedemo.com)** (toko demo publik Sauce Labs) — ganti dengan aplikasi Anda sendiri dan ikuti panduan di `docs/`.

---

## Quick Start

```bash
# 1. Install dependencies
npm install
npx playwright install chromium

# 2. Salin .env.example dan sesuaikan (opsional untuk SauceDemo — sudah ada default)
cp .env.example .env.dev

# 3. Generate spec + jalankan
npm test
```

Hasil di `artifacts/playwright-report/index.html` (buka dengan `npm run report:html`).

---

## Struktur Project

```
automation_bdd/
├── features/             # Feature files Gherkin (BDD spec)
│   └── saucedemo/
│       ├── auth/
│       ├── products/
│       ├── cart/
│       └── checkout/
├── steps/                # Step definitions (Given/When/Then)
│   └── saucedemo/
├── pages/                # Page Object Model (POM)
│   ├── base.page.js      # Base class untuk Element Plus apps
│   └── saucedemo/
├── fixtures/             # Playwright fixtures (test context + data)
│   ├── saucedemo.bdd.fixture.js
│   ├── data/users.json   # User pool untuk parallel execution
│   └── output/           # Data hasil test (gitignored)
├── config/               # Konfigurasi: env loader, global setup/teardown
├── core/                 # Utilitas generik: store, resolver, network recorder
├── scripts/              # CLI utilities: allure, BDD checker
├── reporters/            # Custom Playwright reporter
├── .features-gen/        # Auto-generated (bddgen output, gitignored)
├── artifacts/            # Hasil run (gitignored)
├── playwright.config.js
└── docs/                 # Panduan lengkap
```

---

## Script Utama

| Command | Keterangan |
|---|---|
| `npm test` | Generate + run semua test (desktop) |
| `npm run test:smoke` | Hanya test bertag `@smoke` |
| `npm run test:regression` | Hanya test bertag `@regression` |
| `npm run test:tag -- --grep @checkout` | Filter berdasarkan tag bebas |
| `npm run test:headed` | Buka browser (tidak headless) |
| `npm run test:debug` | Mode debug + Playwright Inspector |
| `npm run test:ui` | Playwright UI mode |
| `npm run report` | Generate Allure report |
| `npm run report:open` | Generate + buka Allure report |
| `npm run cek:bdd` | Cek standar penulisan feature file |
| `npm run cek:step` | Cek step definition duplikat |

---

## Konvensi Tagging

```gherkin
@TC-SD-AUTH-001 @smoke @core
Scenario: Login berhasil dengan akun standard_user
```

| Tag | Fungsi |
|---|---|
| `@TC-<APP>-<MODULE>-<NNN>` | ID unik test case (untuk traceability) |
| `@smoke` | Fast sanity check — dijalankan di setiap build |
| `@regression` | Regression suite lengkap |
| `@core` | Fungsionalitas inti — gagal di sini = blocker |
| `@e2e` | End-to-end flow lintas modul |

Detail di [docs/TAGGING_CONVENTION.md](docs/TAGGING_CONVENTION.md).

---

## Mengganti Target Aplikasi

1. Hapus `features/saucedemo/`, `steps/saucedemo/`, `pages/saucedemo/`
2. Buat folder baru untuk aplikasi Anda dengan pola yang sama
3. Update `playwright.config.js` — ganti `bddSaucedemo` dengan config Anda
4. Update `fixtures/saucedemo.bdd.fixture.js` — ganti page objects dan data pool
5. Update `config/env.js` — sesuaikan `baseUrl` dan credential keys
6. Update `.env.example`

---

## Dokumentasi Lengkap

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Diagram layer BDD dan fixture chain
- [GETTING_STARTED.md](docs/GETTING_STARTED.md) — Prerequisites, install, first run
- [DATA_STRATEGY.md](docs/DATA_STRATEGY.md) — Seed data, data pooling, fresh data
- [PARALLEL_EXECUTION.md](docs/PARALLEL_EXECUTION.md) — Worker isolation dan konfigurasi
- [CLOUD_BROWSER.md](docs/CLOUD_BROWSER.md) — BrowserStack integration
- [TAGGING_CONVENTION.md](docs/TAGGING_CONVENTION.md) — Konvensi tag lengkap

---

## Tech Stack

| Library | Versi | Fungsi |
|---|---|---|
| `@playwright/test` | ^1.62 | Test runner + browser automation |
| `playwright-bdd` | ^9.2 | BDD layer — Gherkin → Playwright spec |
| `allure-playwright` | ^3.11 | Rich reporting dengan screenshot per langkah |
| `@faker-js/faker` | ^9.9 | Generate data uji unik (fresh data pattern) |
| `dotenv` | ^17 | Env loader per environment |
| `cross-env` | ^10 | Cross-platform env variable injection |

---

## CI/CD

Lihat `.github/workflows/` untuk template GitHub Actions (akan ditambahkan).  
Untuk BrowserStack, lihat [docs/CLOUD_BROWSER.md](docs/CLOUD_BROWSER.md).

---

## License

MIT
