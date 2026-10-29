# Parallel Execution

## Konfigurasi Default

```js
// playwright.config.js
fullyParallel: true,
workers: Number(process.env.WORKERS) || 4,
retries: process.env.CI ? 2 : 0,
```

Override dari command line:
```bash
WORKERS=1 npm test          # serial — untuk debugging
WORKERS=8 npm run test:smoke  # lebih banyak worker
```

---

## `fullyParallel: true` vs `false`

| Mode | Kapan | Konsekuensi |
|---|---|---|
| `true` | Aplikasi stateless per user — tiap user punya isolated state | Tiap **test** berjalan di worker berbeda. Paling cepat. |
| `false` | Test dalam satu file berbagi state (data dibuat di step 1 dipakai step 5) | Tiap **file** berjalan di worker berbeda. Test dalam file tetap serial. |

**SauceDemo:** `fullyParallel: true` aman — cart reset setelah logout, tidak ada shared state.

**Aplikasi nyata dengan database shared:** Gunakan `false` + **worker isolation via data pool**.

---

## Worker Isolation via Data Pool

Prinsip: setiap worker menggunakan **resource yang berbeda** sehingga tidak ada race condition.

### Pola User Pool

```js
// fixtures/data/users.json
{
  "pool": [
    { "username": "user_1", "password": "pass" },
    { "username": "user_2", "password": "pass" },
    { "username": "user_3", "password": "pass" },
    { "username": "user_4", "password": "pass" }
  ]
}

// fixture.js
currentUser: async ({}, use, workerInfo) => {
  const user = POOL[workerInfo.workerIndex % POOL.length];
  await use(user);
}
```

Worker 0 → user_1, Worker 1 → user_2, Worker 2 → user_3, Worker 3 → user_4.  
Jika workers > pool.length, user dipakai ulang secara rotasi — pastikan test tidak saling interferensi.

### Pola Resource Pool (untuk aplikasi dengan shared database)

```js
// fixtures/data/accounts.json
{
  "pool": [
    { "username": "admin_1", "password": "pass", "org": "org-a" },
    { "username": "admin_2", "password": "pass", "org": "org-b" }
  ]
}

// fixture.js
activeAccount: async ({}, use, workerInfo) => {
  const account = POOL[workerInfo.workerIndex % POOL.length];
  await use(account);
}
```

Setiap worker menulis ke resource (org/akun) yang berbeda → aman meski test memodifikasi data.

---

## Berapa Worker yang Optimal?

**Faktor penentu:**
1. **Backend throttle** — beberapa API menolak request berlebihan (rate limit)
2. **Database contention** — menulis ke tabel yang sama dari banyak worker bisa deadlock
3. **Pool size** — workers tidak boleh lebih dari pool.length jika data harus isolated
4. **Mesin CI** — umumnya 2-4 CPU di free tier GitHub Actions

**Panduan:**
| Environment | Workers | Keterangan |
|---|---|---|
| Lokal (laptop 8 core) | 4 | Default — cukup cepat, tidak berlebihan |
| CI (GitHub Actions, 2 CPU) | 2 | `WORKERS=2` di workflow |
| Cloud Browser (BrowserStack) | Sesuai plan | Trial = 2 concurrent session |
| Debug / investigasi gagal | 1 | `WORKERS=1 npm run test:gagal` |

---

## Test Timeout

```bash
# .env.dev
TIMEOUT_TEST=120000     # per test (2 menit)
TIMEOUT_ACTION=15000    # per klik/fill (15 detik)
TIMEOUT_NAVIGATION=30000 # per page.goto (30 detik)
TIMEOUT_EXPECT=10000    # per expect assertion (10 detik)
```

Untuk cloud browser (BrowserStack), naikkan semua menjadi 2x karena latency jaringan.

---

## Retries

```js
retries: process.env.CI ? 2 : 0
```

- **CI:** 2 retry — mengurangi false positive akibat flakiness jaringan
- **Lokal:** 0 retry — feedback lebih cepat; retry lokal menyembunyikan masalah

Test yang gagal 3 kali berturut-turut (1 run + 2 retry) dianggap benar-benar gagal.

---

## Menjalankan Ulang Hanya yang Gagal

```bash
npm run test:gagal
```

Playwright menyimpan daftar test yang gagal di `.last-run.json` dan memakai `--last-failed`.  
Berguna saat debugging: tidak perlu menjalankan seluruh suite ulang.
