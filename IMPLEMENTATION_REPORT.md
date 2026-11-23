# Laporan Implementasi — NIAGARA ERP Phase 1

Tanggal: 22 November 2026  
Status: **Phase 1 selesai dan lolos verifikasi build**

## 1. Ringkasan

NIAGARA ERP Phase 1 diimplementasikan sebagai aplikasi Next.js monolit dengan
PostgreSQL melalui Prisma. Seluruh modul inti yang diminta telah tersedia:
autentikasi, otorisasi berbasis peran, dasbor, inventaris, POS, penjualan,
laporan keuangan, pengguna, dan pengaturan perusahaan.

Tidak ada data mock di halaman produksi. Semua angka berasal dari query
database yang dibatasi `companyId` milik pengguna yang sedang masuk.

## 2. Hasil verifikasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | Lulus tanpa error |
| ESLint | `npm run lint` | Lulus; 1 warning tooling di `.opencode/plugins/graphify.js` |
| Build produksi | `npm run build` | Lulus, 20 route terbentuk |
| Prisma Client | `npm run db:generate` | Lulus |

Route yang terbentuk:

```text
/                            (redirect sesuai sesi)
/_not-found
/api/auth/[...nextauth]
/dashboard
/icon.svg
/inventory
/inventory/[id]
/inventory/[id]/edit
/inventory/categories
/inventory/movements
/inventory/new
/login
/pos
/profile
/reports/financial
/sales
/sales/[id]
/settings
/unauthorized
/users
```

Catatan: verifikasi di atas tidak memerlukan koneksi database. Migrasi dan seed
belum dijalankan karena tidak ada kredensial Supabase pada lingkungan ini.
Validasi integrasi database harus dilakukan setelah mengikuti
[`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md).

## 3. Arsitektur

- **Next.js App Router** dengan Server Components untuk pembacaan data dan
  Server Actions untuk mutasi.
- **Auth.js v5** dengan Credentials provider dan strategi JWT 12 jam.
- **Prisma 7** dengan `@prisma/adapter-pg`; koneksi runtime memakai
  `DATABASE_URL`, CLI memakai `DIRECT_URL`.
- **Zod** memvalidasi seluruh input Server Action.
- **RBAC terpusat** di `src/lib/roles.ts`; pemeriksaan sesi dan izin di
  `src/lib/auth-guards.ts`.
- **Query terpisah** di `src/lib/queries/*` dan aksi tulis di
  `src/lib/actions/*`.
- **Proxy Next.js 16** (`src/proxy.ts`) hanya memeriksa keberadaan cookie
  sesi. Otorisasi sebenarnya selalu dilakukan di server.

## 4. Modul yang diimplementasikan

### Autentikasi dan sesi
- Halaman login dengan validasi, pesan error, dan redirect.
- Password bcrypt; pesan login gagal tidak membocorkan apakah email terdaftar.
- Pengguna nonaktif tidak dapat masuk.
- Sesi memuat `id`, `companyId`, `role`, dan nama; `getCurrentUser()` selalu
  membaca ulang pengguna dari database.
- Logout dan perlindungan route.

### Dasbor
- KPI pendapatan total, pendapatan hari ini, transaksi, produk aktif, stok
  menipis, dan laba kotor.
- Grafik performa penjualan dengan periode harian/mingguan/bulanan/kustom.
- Produk terlaris, daftar stok menipis, dan transaksi terbaru.
- Loading state skeleton.

### Inventaris
- Daftar produk dengan pencarian, filter kategori/status, pengurutan, dan
  paginasi server-side.
- Form tambah/ubah produk dengan validasi SKU unik per perusahaan.
- Kategori: daftar, tambah, ubah, aktif/nonaktif, dan hapus dengan proteksi
  relasi.
- Penyesuaian stok: stok masuk, stok keluar, dan stok opname.
- Setiap penyesuaian menulis `stock_movements` dengan saldo sebelum/sesudah.
- Detail produk menampilkan informasi, nilai persediaan, dan riwayat
  pergerakan stok.
- Halaman riwayat stok global (`/inventory/movements`) menampilkan buku besar
  lintas produk dengan pencarian nama/SKU, filter jenis pergerakan, paginasi,
  saldo sebelum/sesudah, serta referensi transaksi.
- HPP hanya terlihat oleh peran yang memiliki izin `costs.view`.

### Point of Sale
- Katalog produk aktif dengan pencarian dan filter kategori.
- Keranjang, ubah kuantitas, hapus item, dan perhitungan total real-time.
- Pilihan metode pembayaran: tunai, transfer bank, QRIS, kartu, e-wallet.
- Validasi stok klien dan server.
- Checkout atomik dalam satu `prisma.$transaction`:
  1. Verifikasi produk aktif dan milik perusahaan.
  2. Update stok kondisional agar tidak negatif.
  3. Buat `sales` dan `sale_items` dengan snapshot.
  4. Tulis `stock_movements` bertipe `SALE`.
  5. Commit.
- Idempotensi `clientRequestId` mencegah transaksi ganda.
- Nomor transaksi `TRX-YYYYMMDD-NNNN` per perusahaan per hari.

### Penjualan
- Riwayat dengan filter periode, metode pembayaran, status, kasir, dan
  pencarian nomor transaksi.
- Kasir hanya melihat transaksi miliknya.
- Detail transaksi: item, snapshot harga/HPP, pembayaran, kasir, dan status.
- Void transaksi oleh `OWNER`/`MANAGER` dengan alasan wajib:
  - status menjadi `VOIDED`;
  - stok dikembalikan;
  - `SALE_VOID` dicatat;
  - transaksi tidak dihapus dan tidak dihitung di laporan.

### Laporan keuangan
- Pendapatan, HPP, laba kotor, margin, jumlah transaksi, dan rata-rata.
- Tren pendapatan dan laba harian.
- Rincian metode pembayaran dan produk paling menguntungkan.
- Periode: hari ini, 7 hari, 30 hari, bulan ini, kuartal fiskal, tahun fiskal,
  dan rentang kustom.
- Menggunakan snapshot HPP historis dan mengecualikan transaksi `VOIDED`.
- Batas periode dihitung di `Asia/Jakarta`.

### Pengguna
- Daftar pengguna, status aktif, peran, dan tanggal dibuat.
- Tambah pengguna, ubah profil/peran, aktif/nonaktif, dan reset kata sandi.
- Proteksi agar pengguna tidak menonaktifkan atau menurunkan peran pemilik
  terakhir secara tidak sengaja.
- Hanya `OWNER` yang dapat mengelola pengguna.

### Pengaturan
- Profil perusahaan: nama, jenis usaha, alamat, email, telepon, dan awal tahun
  fiskal.
- Perubahan kata sandi sendiri dengan verifikasi kata sandi lama.
- Halaman `/profile` tersedia untuk semua peran, menampilkan informasi akun dan
  form perubahan kata sandi tanpa memerlukan izin `settings.manage`.
- Menu pengguna di topbar memiliki tautan “Profil Saya”; tautan pengaturan
  perusahaan diperbaiki dari `/settings/company` ke `/settings`.
- Matriks izin peran sebagai referensi.

### Halaman akses ditolak
- Halaman `/unauthorized` yang menjelaskan peran pengguna dan tindakan yang
  dapat dilakukan.

## 5. Model data

Schema mencakup:

- `companies`
- `users`
- `categories`
- `products`
- `sales`
- `sale_items`
- `stock_movements`

Detail kolom, index, constraint, dan aturan ada di
[`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

Keputusan penting:

- UUID untuk seluruh primary key.
- `Decimal(18,2)` untuk uang dan `Decimal(18,3)` untuk kuantitas.
- `timestamptz(6)` untuk waktu.
- Snapshot nama/SKU/satuan/harga/HPP pada `sale_items`.
- Ledger stok append-only dengan saldo sebelum dan sesudah.
- Unique index `(company_id, sku)`, `(company_id, transaction_number)`, dan
  `(company_id, client_request_id)`.
- Foreign key `RESTRICT` untuk melindungi riwayat.

## 6. Keamanan dan RBAC

Matriks izin:

| Izin | OWNER | MANAGER | INVENTORY_STAFF | CASHIER | FINANCE |
| --- | --- | --- | --- | --- | --- |
| `dashboard.view` | ✓ | ✓ | — | — | ✓ |
| `inventory.view` | ✓ | ✓ | ✓ | — | — |
| `inventory.manage` | ✓ | ✓ | ✓ | — | — |
| `inventory.movements` | ✓ | ✓ | ✓ | — | — |
| `pos.use` | ✓ | ✓ | — | ✓ | — |
| `sales.view` | ✓ | ✓ | — | ✓ | ✓ |
| `sales.viewAll` | ✓ | ✓ | — | — | ✓ |
| `sales.void` | ✓ | ✓ | — | — | — |
| `reports.view` | ✓ | ✓ | — | — | ✓ |
| `users.manage` | ✓ | — | — | — | — |
| `settings.manage` | ✓ | — | — | — | — |
| `costs.view` | ✓ | ✓ | ✓ | — | ✓ |

Langkah pengamanan:

- Setiap halaman memanggil guard yang memeriksa sesi dan izin.
- Setiap Server Action memeriksa ulang sesi, izin, dan `companyId`.
- Entitas tidak pernah diambil hanya berdasarkan `id`; selalu disertai
  `companyId`.
- HPP tidak dikirim ke klien untuk kasir.
- Password hash tidak pernah masuk payload UI.
- `AUTH_SECRET` hanya di environment server.

## 7. Seed dan SQL

- `prisma/seed.ts`: data demo deterministik (perusahaan, 5 pengguna, 6
  kategori, 25 produk, transaksi 90 hari, void, pergerakan stok).
- `prisma/migrations/0_init/migration.sql`: migrasi awal Prisma.
- `prisma/migrations/migration_lock.toml`: lock provider PostgreSQL.
- `supabase/schema.sql`: schema lengkap untuk SQL Editor Supabase.
- `docs/DATABASE_SETUP.md`: panduan setup, migrasi, seed, verifikasi, dan
  troubleshooting.

Seed hanya mengganti perusahaan demo `Niagara Retail Nusantara`; data tenant
lain tidak disentuh.

## 8. UI/UX

- Bahasa Indonesia, format Rupiah, dan tanggal `id-ID`.
- Palet teal/mint konsisten, sidebar gelap, dan layout responsif.
- Komponen shadcn/ui dengan Tailwind CSS 4.
- Loading skeleton, empty state, toast, dialog konfirmasi, dan pesan validasi
  per field.
- Animasi angka dan transisi halaman yang menghormati `prefers-reduced-motion`.
- Tabel dapat digulir pada layar kecil dan navigasi mobile tersedia.

## 9. Catatan teknis dan perbaikan

- `package.json` sempat memiliki UTF-8 BOM yang membuat Turbopack gagal
  membaca file. BOM telah dihapus. Jika error serupa muncul lagi, hapus folder
  `.next` karena Turbopack menyimpan hasil parsing.
- `next.config.ts` menandai `pg` dan `@prisma/adapter-pg` sebagai
  `serverExternalPackages`.
- `prisma.config.ts` memakai `DIRECT_URL ?? DATABASE_URL` agar perintah CLI
  tetap dapat dijalankan tanpa kredensial.
- Efek yang memanggil `setState` secara sinkron telah dihapus; dialog memakai
  hook `useActionFeedback`, dan preferensi sidebar memakai
  `useSyncExternalStore`.

## 10. Batasan dan tindak lanjut

Belum diverifikasi karena tidak ada database aktif:

- `prisma migrate deploy` / `db:migrate`.
- `npm run db:seed`.
- Login end-to-end dan alur POS dengan data nyata.
- Query laporan pada data 90 hari.

Batasan Phase 1:

- Laba yang ditampilkan adalah laba kotor; belum ada biaya operasional.
- Belum ada impor/ekspor, cetak struk, atau integrasi pembayaran.
- Satu pengguna hanya terhubung ke satu perusahaan.
- RLS Supabase tidak diaktifkan karena akses database hanya dari server.
- Belum ada automated test suite; verifikasi saat ini berupa lint, typecheck,
  build, dan review alur.

Langkah berikutnya setelah database tersedia:

1. Isi `.env` dengan kredensial Supabase.
2. Jalankan schema dan seed sesuai `docs/DATABASE_SETUP.md`.
3. Uji login kelima peran.
4. Uji checkout, overselling, idempotensi, dan void.
5. Bandingkan total laporan dengan query SQL verifikasi.
6. Ganti akun demo dan `AUTH_SECRET` sebelum produksi.
