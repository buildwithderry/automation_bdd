# Data Strategy

Tiga pola data yang dipakai di template ini, dipilih sesuai kebutuhan skenario.

---

## Pola 1: Static Pool (Data Tetap)

**Kapan:** Data tidak berubah antar run. Hanya dibaca, tidak dimodifikasi.

**Contoh:** `fixtures/data/users.json`

```json
{
  "pool": [
    { "username": "standard_user", "password": "secret_sauce" },
    { "username": "problem_user",  "password": "secret_sauce" }
  ]
}
```

**Cara pakai di fixture:**
```js
const POOL = require('./data/users.json').pool;

const test = base.test.extend({
  currentUser: async ({}, use, workerInfo) => {
    const user = POOL[workerInfo.workerIndex % POOL.length];
    await use(user);
  },
});
```

Setiap worker mendapat user berbeda → aman untuk `fullyParallel: true`.

---

## Pola 2: Seed Data (Dibuat Sebelum Suite)

**Kapan:** Data perlu ada di database sebelum test berjalan, dibuat via API (bukan UI).

**Keunggulan:** Cepat, tidak bergantung pada UI flow yang bisa berubah.  
**Trade-off:** Perlu cleanup strategy; data bisa accumulate antar run.

**Struktur script:**
```js
// scripts/seed_example.js
const { env } = require('../config/env');

async function seed() {
  // 1. Login dapat token
  const token = await apiLogin(env.cred.username, env.cred.password);

  // 2. Buat resource yang dibutuhkan
  const resource = await apiCreateResource(token, { name: 'Test Resource' });

  // 3. Simpan ke fixtures/output/ untuk dipakai test
  const { saveRecord } = require('../core/store');
  saveRecord('resources', resource.name, resource);

  console.log('[seed] Selesai:', resource.id);
}

seed().catch(console.error);
```

**Di package.json:**
```json
"data:seed": "node scripts/seed_example.js"
```

**Cara pakai di test:**
```js
const { latest } = require('../core/store');
const resource = latest('resources');
```

**Cleanup strategy pilihan:**
- **Biarkan accumulate** — cocok jika aplikasi tidak punya endpoint hapus
- **Hapus setelah suite** — di `globalTeardown.js`
- **Tandai dengan timestamp** — hapus yang lebih dari N hari via script

---

## Pola 3: Fresh Data Per Test (Faker)

**Kapan:** Data harus unik per eksekusi untuk menghindari collision (email, username, nomor identitas).

**Keunggulan:** Tidak ada state leak antar test; run bisa diulang kapan saja.  
**Trade-off:** Sedikit lebih lambat; perlu cleanup jika aplikasi tidak mendukung hapus.

**Contoh di step definition:**
```js
const { faker } = require('@faker-js/faker');

When('pengguna mengisi informasi checkout', async ({ checkoutPage }) => {
  await checkoutPage.fillInformation({
    firstName: faker.person.firstName(),
    lastName:  faker.person.lastName(),
    zipCode:   faker.location.zipCode('#####'),
  });
});
```

**Faker helpers yang sering dipakai:**
```js
faker.person.firstName()              // "John"
faker.person.lastName()               // "Doe"
faker.internet.email()                // "john.doe@example.com"
faker.phone.number('+62 8## ####-####') // nomor HP Indonesia
faker.location.zipCode('#####')       // "12345"
faker.company.name()                  // "Acme Corp"
faker.string.alphanumeric(8)          // "a3Kd9mP2"
```

---

## Pola Mana yang Dipilih?

| Kondisi | Pola |
|---|---|
| Kredensial aplikasi (username/password) | Static pool |
| Master data yang dibuat sekali (produk, kategori) | Seed data |
| Data transaksional yang harus unik (email, username) | Fresh data (Faker) |
| Akun untuk E2E yang butuh flow aktivasi | Seed data + simpan ke `fixtures/output/` |
| Test negatif (data salah dengan format tertentu) | Fresh data inline |

---

## `core/store.js` — Simpan Data Hasil Test

```js
const { saveRecord, updateRecord, latest, readRecord } = require('../core/store');

// Simpan satu record ke bucket
const { slug } = saveRecord('users', 'john-doe', { email: 'john@example.com', id: 123 });

// Update record yang sudah ada (misal setelah aktivasi)
updateRecord('users', slug, { status: 'active' });

// Ambil record terakhir dari bucket
const user = latest('users');

// Ambil dengan filter
const activeUser = latest('users', (r) => r.status === 'active');
```

Data disimpan di `fixtures/output/<bucket>/<slug>-<timestamp>.json` (gitignored).
