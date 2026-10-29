# Architecture — Automation BDD Template

## Layer Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Feature Files (.feature)              │
│  Gherkin — dibaca PO/BA/dev — bahasa Indonesia           │
│  features/<app>/<module>/<topic>.feature                 │
└──────────────────────────┬──────────────────────────────┘
                           │ bddgen (playwright-bdd)
                           ▼
┌─────────────────────────────────────────────────────────┐
│               .features-gen/  (auto-generated)           │
│  Playwright spec biasa — JANGAN edit manual              │
└──────────────────────────┬──────────────────────────────┘
                           │ playwright test
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Step Definitions                       │
│  steps/<app>/<module>.steps.js                          │
│  Implements Given/When/Then dari fixture BDD             │
└──────────────────────────┬──────────────────────────────┘
                           │ fixture chain
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  BDD Fixture                             │
│  fixtures/<app>.bdd.fixture.js                          │
│  createBdd(test) — menyediakan page objects + data       │
│  User pool per worker: workerIndex % pool.length         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Page Objects (POM)                      │
│  pages/<app>/<Page>.js                                  │
│  Encapsulate locators + interactions per halaman         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Core Utilities                          │
│  core/store.js         — simpan data ke fixtures/output  │
│  core/network_recorder.js — rekam API calls             │
│  core/resolver.js      — self-healing locator            │
│  core/selector_policy.js — kebijakan selector priority   │
└─────────────────────────────────────────────────────────┘
```

## Alur Eksekusi

```
npm test
  │
  ├── bddgen
  │     └── Scan features/**/*.feature
  │         Parse Gherkin → generate .features-gen/**/*.spec.js
  │
  └── playwright test
        ├── globalSetup   → bersihkan allure-results, tulis metadata
        ├── [N workers parallel]
        │     ├── Worker 0: user = pool[0 % 4] = standard_user
        │     ├── Worker 1: user = pool[1 % 4] = problem_user
        │     ├── Worker 2: user = pool[2 % 4] = visual_user
        │     └── Worker 3: user = pool[3 % 4] = error_user
        └── globalTeardown → cleanup resource
```

## Keputusan Arsitektur

### `fullyParallel: true`
Aman karena SauceDemo stateless per user. Untuk aplikasi dengan shared state (mis. database tunggal), turunkan ke `false` atau isolasi data per worker.

### Fixture Chain (`createBdd`)
`playwright-bdd` mengharuskan step definitions menggunakan `Given/When/Then` dari **fixture yang sama** dengan yang disebutkan di `playwright.config.js`. Satu aplikasi = satu fixture BDD = satu `createBdd(test)`.

### Page Objects tanpa Locator Registry
Template ini memakai locator langsung (Playwright `data-test` attribute) karena SauceDemo punya `data-test` yang konsisten. Untuk aplikasi tanpa `data-test`, lihat `core/resolver.js` yang mengimplementasikan fallback locator berperingkat.

### Output ke `fixtures/output/`
`core/store.js` menyimpan data test (akun dibuat, ID resource, token) ke JSON di `fixtures/output/<bucket>/`. Pola ini memungkinkan:
- Test berikutnya **reuse** data yang sudah ada tanpa buat ulang
- Allure report melampirkan data sebagai attachment
- Manual trace untuk debugging

File-file ini masuk `.gitignore` karena bisa berisi kredensial atau PII.
