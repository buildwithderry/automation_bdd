# Tagging Convention

Tag Gherkin adalah mekanisme utama untuk **filter eksekusi** dan **traceability**. Semua tag ditulis lowercase dengan tanda `@`.

---

## Struktur Tag per Skenario

```gherkin
@TC-SD-AUTH-001 @smoke @core
Scenario: Login berhasil dengan akun standard_user
```

Setiap skenario WAJIB punya:
1. **TC tag** — ID unik untuk traceability
2. **Scope tag** — minimal satu dari `@smoke` atau `@regression`

---

## TC Tag (Test Case ID)

Format: `@TC-<APP>-<MODULE>-<NNN>`

| Segmen | Contoh | Keterangan |
|---|---|---|
| `APP` | `SD` (SauceDemo), `ADM` (Admin) | 2-4 huruf kapital identitas aplikasi |
| `MODULE` | `AUTH`, `CART`, `CHK` (Checkout) | Nama modul disingkat |
| `NNN` | `001`, `042` | Nomor urut 3 digit |

**Contoh:**
- `@TC-SD-AUTH-001` — SauceDemo, modul Auth, test ke-1
- `@TC-ADM-USR-015` — Admin, modul User, test ke-15

TC tag dipakai sebagai kunci di test management tool (XRAY, TestRail, dll.) untuk sinkronisasi hasil.

---

## Scope Tags

| Tag | Kapan Dijalankan | Target runtime |
|---|---|---|
| `@smoke` | Setiap build / push | < 5 menit — cepat, tutup risiko terbesar |
| `@regression` | Nightly / sebelum release | Lengkap, boleh lambat |
| `@core` | Ditandai sebagai fungsionalitas inti | Subset @smoke; gagal = blocker |

**Hierarki:** `@core` ⊂ `@smoke` ⊂ `@regression`

```bash
npm run test:smoke       # hanya @smoke
npm run test:regression  # hanya @regression
npm run test:tag -- --grep "@smoke and @core"  # intersection
```

---

## Module Tags

Tag modul dipakai untuk menjalankan subset per area:

```gherkin
@auth       # semua test di modul Auth
@products   # semua test di modul Products
@cart       # semua test di modul Cart
@checkout   # semua test di modul Checkout
@e2e        # flow end-to-end lintas modul
```

```bash
# Jalankan hanya modul cart
npm run test:tag -- --grep @cart

# Jalankan checkout end-to-end
npm run test:tag -- --grep @e2e
```

---

## Feature Tags

Tag level feature diterapkan ke semua skenario di dalam file:

```gherkin
@auth          ← tag feature (diwariskan ke semua skenario)
Feature: Login SauceDemo

  @TC-SD-AUTH-001 @smoke @core  ← tag skenario (tambahan)
  Scenario: Login berhasil
```

---

## Tags yang Perlu Dihindari

| Yang Dihindari | Alternatif |
|---|---|
| Tag duplikat satu skenario (`@smoke @smoke`) | Cek dengan `npm run cek:step` |
| Tag terlalu umum (`@test`, `@new`, `@todo`) | Pakai TC tag yang spesifik |
| Tag tanpa definisi (`@wip` tanpa excluded di config) | Tambahkan `tags: 'not @wip'` di config jika belum siap dirun |
| Tag yang menjadi stale (`@kira-kira`) | Hapus setelah test stabil |

---

## Filter Kompleks

```bash
# AND: harus punya kedua tag
--grep "@smoke and @auth"

# OR: salah satu
--grep "@auth or @cart"

# NOT: kecualikan
--grep "not @regression"

# Kombinasi
--grep "(@smoke or @core) and not @wip"
```

---

## Checklist Tag per Skenario Baru

- [ ] Ada TC tag unik (`@TC-<APP>-<MODULE>-<NNN>`)
- [ ] Ada salah satu dari `@smoke` atau `@regression`
- [ ] Ditambahkan `@core` jika ini adalah happy path fungsionalitas inti
- [ ] Module tag sudah sesuai dengan folder feature file
- [ ] ID tidak bentrok dengan skenario lain (`npm run cek:bdd`)
