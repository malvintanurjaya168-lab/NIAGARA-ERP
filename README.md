# NIAGARA ERP

NIAGARA ERP adalah aplikasi ERP Phase 1 untuk UMKM yang mencakup inventaris,
point of sale (POS), riwayat penjualan, laporan keuangan, serta pengelolaan
pengguna dan perusahaan. Aplikasi dibangun sebagai monolit Next.js dengan
autentikasi server-side, otorisasi berbasis peran, dan PostgreSQL (Supabase)
melalui Prisma.

Seluruh antarmuka menggunakan Bahasa Indonesia, mata uang IDR, dan zona waktu
`Asia/Jakarta`. Angka pada dasbor dan laporan dihitung langsung dari transaksi
yang tersimpan di database — tidak ada data statis atau fungsi palsu.

## Fitur

### Dasbor
- Pendapatan total dan hari ini, jumlah transaksi, produk aktif, stok menipis,
  dan laba kotor.
- Grafik performa penjualan (harian, mingguan, bulanan, kustom).
- Produk terlaris, peringatan stok, dan transaksi terbaru.

### Inventaris
- Daftar produk dengan pencarian, filter kategori/status, pengurutan, dan
  paginasi.
- Tambah/ubah produk, kategori, harga beli (HPP), harga jual, stok minimum.
- Penyesuaian stok (masuk, keluar, stok opname) dengan alasan wajib.
- Buku besar pergerakan stok yang immutable dan nilai persediaan.
- Halaman riwayat stok global dengan pencarian produk, filter jenis pergerakan,
  dan paginasi.

### Point of Sale
- Katalog produk aktif, pencarian, filter kategori, dan keranjang.
- Validasi stok di klien dan server.
- Checkout atomik: stok berkurang, transaksi dan item tersimpan, pergerakan
  stok tercatat dalam satu transaksi database.
- Idempotensi melalui `clientRequestId` untuk mencegah transaksi ganda.
- Snapshot nama, SKU, satuan, harga jual, dan HPP pada setiap item.

### Penjualan
- Riwayat transaksi dengan filter periode, metode pembayaran, status, kasir,
  dan pencarian nomor transaksi.
- Kasir hanya melihat transaksi miliknya; peran dengan `sales.viewAll` melihat
  seluruh transaksi perusahaan.
- Detail transaksi dan pembatalan (void) dengan alasan wajib; stok dikembalikan
  dan transaksi tidak lagi dihitung sebagai pendapatan.

### Laporan Keuangan
- Pendapatan, HPP, laba kotor, margin, jumlah transaksi, dan rata-rata.
- Tren pendapatan dan laba harian.
- Rincian metode pembayaran dan produk paling menguntungkan.
- Periode: hari ini, 7/30 hari, bulan ini, kuartal fiskal, tahun fiskal, dan
  rentang kustom.

### Pengguna & Pengaturan
- Manajemen akun tim, peran, status aktif, dan reset kata sandi.
- Profil perusahaan, awal tahun fiskal, serta perubahan kata sandi sendiri.
- Halaman **Profil Saya** untuk semua peran: informasi akun dan perubahan kata
  sandi tanpa akses ke pengaturan perusahaan.
- Matriks peran ditampilkan sebagai referensi.

## Peran dan akses

| Peran | Kemampuan utama |
| --- | --- |
| `OWNER` | Seluruh modul, pengguna, dan pengaturan perusahaan. |
| `MANAGER` | Dasbor, inventaris, POS, semua penjualan, void, laporan, HPP. |
| `INVENTORY_STAFF` | Inventaris, kategori, penyesuaian stok, pergerakan stok, HPP. |
| `CASHIER` | POS dan riwayat transaksi miliknya. HPP tidak ditampilkan. |
| `FINANCE` | Dasbor, semua penjualan, laporan keuangan, HPP. |

Izin diperiksa kembali di server pada setiap halaman dan Server Action. Peran
pada JWT tidak pernah dipercaya untuk keputusan otorisasi; data pengguna
diambil ulang dari database.

## Tumpukan teknologi

- Next.js `16.4.6` (App Router, Turbopack, Server Actions)
- React `19.3.0`, TypeScript strict
- Tailwind CSS `4.3.3` + shadcn/ui (`radix-nova`)
- Auth.js / NextAuth v5 beta (Credentials, JWT 12 jam)
- Prisma `7.10.1` + `@prisma/adapter-pg` + `pg`
- PostgreSQL (Supabase)
- bcryptjs, Zod, React Hook Form, Motion, Recharts, Sonner, Lucide

## Mulai cepat

Prasyarat: Node.js 20+, npm, dan project Supabase (PostgreSQL).

```bash
npm install
```

### 1. Konfigurasi environment

```bash
copy .env.example .env
```

Isi `.env`:

```env
DATABASE_URL="postgresql://...:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://...:5432/postgres?sslmode=require"
AUTH_SECRET="hasil-dari-npx-auth-secret"
```

- `DATABASE_URL` digunakan aplikasi saat runtime (disarankan Transaction
  pooler Supabase, port `6543`).
- `DIRECT_URL` digunakan Prisma CLI untuk migrasi/seed (Session pooler atau
  direct connection, port `5432`).
- Buat `AUTH_SECRET` dengan `npx auth secret` atau
  `openssl rand -base64 32`.

### 2. Siapkan database

Pilih salah satu:

**A. Migrasi Prisma (disarankan)**

```bash
npm run db:migrate
npm run db:seed
```

**B. SQL Editor Supabase**

Jalankan isi `supabase/schema.sql`, lalu tandai migrasi awal sebagai sudah
diterapkan dan isi data demo:

```bash
npm run db:baseline
npm run db:seed
```

Panduan lengkap: [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md).

### 3. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Akun demo

Data seed membuat satu perusahaan demo (`Niagara Retail Nusantara`), 25 produk,
kategori, dan transaksi 90 hari terakhir.

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Pemilik | `owner@niagara.demo` | `Owner#2026` |
| Manajer | `manager@niagara.demo` | `Manager#2026` |
| Staf Inventaris | `inventory@niagara.demo` | `Inventory#2026` |
| Kasir | `cashier@niagara.demo` | `Cashier#2026` |
| Keuangan | `finance@niagara.demo` | `Finance#2026` |

> Akun demo hanya untuk pengembangan. Hapus atau ganti sebelum produksi.

## Perintah

| Perintah | Keterangan |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan. |
| `npm run build` | Build produksi (Turbopack). |
| `npm run start` | Menjalankan hasil build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Pemeriksaan TypeScript. |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:migrate` | Migrasi pengembangan. |
| `npm run db:push` | Sinkronisasi schema tanpa migrasi (prototyping). |
| `npm run db:seed` | Mengisi data demo. |
| `npm run db:baseline` | Menandai migrasi `0_init` sudah diterapkan. |
| `npm run db:studio` | Prisma Studio. |

## Struktur proyek

```text
prisma/
  schema.prisma            # Model multi-tenant dan enum
  migrations/0_init/       # SQL migrasi awal
  seed.ts                  # Data demo deterministik
src/
  app/
    (app)/                 # Halaman terproteksi (dasbor, inventaris, POS, dll.)
    api/auth/              # Handler Auth.js
    login/                 # Halaman masuk
  components/              # UI, layout, motion, dan komponen fitur
  generated/prisma/        # Prisma Client (di-generate, tidak di-commit)
  lib/
    actions/               # Server Actions (auth, inventory, sales, users, ...)
    queries/               # Query baca yang selalu dibatasi companyId
    auth-guards.ts         # Pemeriksaan sesi + izin di server
    roles.ts               # Matriks RBAC
    periods.ts             # Periode Jakarta dan tahun fiskal
  auth.ts                  # Konfigurasi NextAuth
  proxy.ts                 # Pemeriksaan cookie sesi (Next.js 16 proxy)
supabase/
  schema.sql               # SQL lengkap untuk Supabase SQL Editor
docs/
  DATABASE_SETUP.md
  DATABASE_SCHEMA.md
```

## Aturan bisnis penting

- Semua data bisnis memiliki `company_id`; setiap query dan aksi memfilter
  `companyId` dari sesi pengguna.
- Uang disimpan sebagai `Decimal(18,2)` dan kuantitas sebagai
  `Decimal(18,3)`. Perhitungan server tidak menggunakan floating point.
- HPP dan harga jual disalin ke item transaksi (snapshot), sehingga perubahan
  harga produk tidak mengubah laporan historis.
- Transaksi `VOIDED` tidak dihitung dalam pendapatan, HPP, laba, maupun produk
  terlaris.
- Pembatalan mengembalikan stok dan menulis pergerakan `SALE_VOID`.
- Nomor transaksi berformat `TRX-YYYYMMDD-NNNN` per perusahaan per hari.
- Stok tidak pernah boleh negatif; checkout memakai update kondisional di
  dalam transaksi database.

## Keamanan

- Kata sandi di-hash dengan bcrypt.
- Sesi JWT ditandatangani `AUTH_SECRET`; cookie `httpOnly`.
- Server Actions memvalidasi sesi, peran, kepemilikan data, dan input Zod.
- HPP tidak pernah dikirim ke klien untuk peran `CASHIER`.
- Rahasia hanya berada di environment server; jangan commit `.env`.

## Deployment

1. Buat project Supabase dan jalankan migrasi/seed.
2. Deploy ke Vercel (atau platform Node.js lain).
3. Atur `DATABASE_URL`, `DIRECT_URL`, dan `AUTH_SECRET` di environment.
4. Gunakan Transaction pooler untuk runtime serverless.
5. Jalankan `npm run build` sebagai bagian dari pipeline.

## Batasan Phase 1

- Belum ada pencatatan biaya operasional di luar HPP, sehingga laporan
  menampilkan laba kotor (bukan laba bersih setelah biaya operasional).
- Belum ada impor/ekspor berkas, cetak struk thermal, atau integrasi pembayaran.
- Satu pengguna hanya terhubung ke satu perusahaan.
- Isolasi tenant ditegakkan di lapisan aplikasi; RLS Supabase tidak diaktifkan
  karena akses database hanya dari server.

## Dokumentasi

- [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md) — penyiapan Supabase,
  migrasi, seed, dan troubleshooting.
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — struktur tabel,
  relasi, index, dan aturan data.
- [`IMPLEMENTATION_REPORT.md`](IMPLEMENTATION_REPORT.md) — ringkasan
  implementasi dan hasil verifikasi.
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — status modul dan verifikasi
  terkini.
- [`TODO.md`](TODO.md) — pekerjaan Phase 1 yang tersisa.
