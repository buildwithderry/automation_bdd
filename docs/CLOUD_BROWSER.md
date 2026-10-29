# Cloud Browser — BrowserStack Integration

Template ini menyediakan konfigurasi BrowserStack sebagai **Playwright project terpisah** — bukan menggantikan local run. Local run tetap cepat; BrowserStack dipakai untuk cross-browser validation dan real device testing.

---

## Setup

### 1. Dapatkan Kredensial

Daftar atau login di [automate.browserstack.com](https://automate.browserstack.com/).  
Kredensial ada di **Account > Settings > Access Keys**.

### 2. Set Environment Variables

```bash
# .env.dev — JANGAN commit file ini
BROWSERSTACK_USERNAME=your_bs_username
BROWSERSTACK_ACCESS_KEY=your_bs_access_key
BROWSERSTACK_BUILD_NAME=my-build-001
BROWSERSTACK_PROJECT_NAME=automation-bdd-template
```

**Untuk CI (GitHub Actions):** Simpan di GitHub Secrets, bukan di `.env.dev`:
```
Settings → Secrets and variables → Actions → New repository secret
```

### 3. Aktifkan Project BrowserStack di `playwright.config.js`

Uncomment blok `browserstack-chrome` di `playwright.config.js`:

```js
{
  name: 'browserstack-chrome',
  testDir: bddSaucedemo,
  use: {
    ...commonUse,
    ...desktop,
    baseURL: env.baseUrl.app,
    actionTimeout: 30000,     // 2x lokal karena latency cloud
    navigationTimeout: 60000,
    connectOptions: {
      wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${
        encodeURIComponent(JSON.stringify({
          browser: 'chrome',
          browser_version: 'latest',
          os: 'Windows',
          os_version: '11',
          'browserstack.username': process.env.BROWSERSTACK_USERNAME,
          'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
          'browserstack.local': false,
          name: 'SauceDemo E2E',
          build: process.env.BROWSERSTACK_BUILD_NAME || 'local-build',
          project: process.env.BROWSERSTACK_PROJECT_NAME || 'automation-bdd-template',
        }))
      }`,
    },
  },
  metadata: { app: 'saucedemo', device: 'browserstack-chrome' },
},
```

### 4. Jalankan

```bash
npm run test:bs           # Chrome di Windows 11
npm run test:bs:mobile    # (konfigurasi mobile — tambahkan sendiri)
```

---

## Capabilities Populer

```js
// Chrome terbaru di Windows 11
{ browser: 'chrome', browser_version: 'latest', os: 'Windows', os_version: '11' }

// Safari terbaru di macOS Sonoma
{ browser: 'safari', browser_version: 'latest', os: 'OS X', os_version: 'Sonoma' }

// Firefox terbaru di Windows 10
{ browser: 'firefox', browser_version: 'latest', os: 'Windows', os_version: '10' }

// Real device — iPhone 15 Pro
{ 'device': 'iPhone 15 Pro', 'os_version': '17', 'browserstack.local': false }
```

Referensi lengkap: [BrowserStack Capabilities Generator](https://www.browserstack.com/automate/capabilities)

---

## BrowserStack Local (untuk localhost / staging internal)

Jika aplikasi berjalan di localhost atau intranet (tidak bisa diakses internet):

```bash
# Download dan jalankan BrowserStack Local binary
./BrowserStackLocal --key $BROWSERSTACK_ACCESS_KEY &
```

Set di capabilities:
```js
'browserstack.local': true,
'browserstack.localIdentifier': 'MyLocalTunnel',
```

---

## Integrasi GitHub Actions

```yaml
# .github/workflows/e2e-browserstack.yml
name: E2E BrowserStack

on:
  workflow_dispatch:        # trigger manual
  schedule:
    - cron: '0 1 * * *'    # nightly jam 01:00 UTC

jobs:
  browserstack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:bs
        env:
          BROWSERSTACK_USERNAME:   ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BROWSERSTACK_BUILD_NAME: ${{ github.run_id }}
```

---

## Catatan Biaya & Risiko

| Hal | Detail |
|---|---|
| **Trial** | 100 menit — gunakan tag `@smoke` saja |
| **Latency** | +2-5 detik per navigasi vs lokal → naikkan timeout 2x |
| **Concurrent** | Tergantung plan; trial biasanya 1-2 concurrent session |
| **Credentials di CI** | WAJIB GitHub Secrets — jangan expose di log |
| **Scope** | Jalankan hanya `@smoke` di cloud; `@regression` tetap lokal atau dedicated CI |

**[TBD — perlu disepakati dengan tim]:**
- Berapa concurrent session yang diizinkan plan yang dipakai?
- Apakah perlu BrowserStack Local untuk staging environment?
- Browser apa saja yang harus di-cover (Chrome minimum, atau Safari + Firefox juga)?
