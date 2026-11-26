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

## 9.1 COA backend (Phase 2, langkah 2)

- Izin baru `accounts.view` dan `accounts.manage` pada `src/lib/roles.ts`:
  OWNER penuh, MANAGER dan FINANCE hanya lihat, peran lain tanpa akses.
- `src/lib/queries/accounts.ts` — query baca terbatas `companyId`: daftar
  akun dengan filter jenis/pencarian/status, pohon hierarki, detail akun,
  daftar anak, dan opsi akun induk (mengecualikan akun itu sendiri serta
  seluruh turunannya).
- `src/lib/actions/accounts.ts` — Server Actions `accounts.manage`:
  `createAccountAction`, `updateAccountAction`, `activateAccountAction`, dan
  `deactivateAccountAction` dengan validasi Zod dan `ActionResult`.
- Aturan bisnis yang ditegakkan di server: kode akun unik per perusahaan;
  induk wajib satu perusahaan, berjenis sama, dan bukan akun posting;
  pencegahan induk-diri-sendiri dan hierarki melingkar; akun dengan anak
  tidak dapat bertipe posting atau berganti jenis; akun dengan anak tidak
  dapat dinonaktifkan. Penghapusan akun sengaja tidak disediakan.
- Pengujian: Vitest ditambahkan sebagai devDependency (`npm test`); 34 tes
  mencakup izin, isolasi tenant, pembuatan, duplikasi kode, relasi induk-anak,
  pencegahan siklus, pembaruan, serta aktivasi/nonaktivasi. Fixture memakai
  Prisma palsu in-memory (`src/test-utils/fake-prisma.ts`).
- Catatan: migrasi `20261124000000_add_accounts` belum diterapkan ke database;
  uji integrasi database nyata tetap pending.

## 9.2 COA UI dan template MSME (Phase 2, langkah 3)

- Halaman `/accounts` (Bagan Akun) dengan guard `accounts.view`: kartu metrik
  (total, aktif, nonaktif, akun posting), pohon hierarki yang dapat dibuka/
  tutup, pencarian kode/nama, filter jenis dan status — semuanya difilter di
  klien dari `getAccountHierarchy` tanpa query tambahan.
- `src/components/accounts/`: `AccountExplorer` (toolbar, pohon, aksi baris),
  `AccountFormDialog` (buat/ubah akun; opsi induk difilter menurut jenis,
  status aktif, non-posting, dan bebas siklus), dan `TemplateDialog`
  (pratinjau status per akun + konfirmasi sebelum menerapkan).
- Template COA UMKM (`src/lib/accounts-template.ts`): 35 akun dalam konvensi
  kode `1`, `1.1`, `1.1.01` untuk Aset, Utang, Modal, Pendapatan, dan Beban;
  akun kelompok non-posting, akun daun posting.
- `planCoaTemplate` menghitung rencana penerapan (create/exists/conflict/
  blocked) tanpa menimpa data; `applyCoaTemplateAction` menjalankannya dalam
  satu transaksi dan mengembalikan ringkasan dibuat/sudah ada/dilewati.
- Izin UI mengikuti RBAC server: OWNER mengelola, MANAGER/FINANCE hanya
  melihat, peran lain diarahkan ke `/unauthorized`.
- Verifikasi: `npx tsc --noEmit`, `npm run lint`, `npm run build`, dan
  `npx vitest run` (44 tes) lulus. Uji runtime halaman tetap menunggu migrasi
  COA diterapkan ke Supabase.

## 9.3 Penerapan migrasi dan verifikasi live (Phase 2, langkah 4)

- `npx prisma migrate status` sebelum penerapan menunjukkan `0_init` sudah
  tercatat dan hanya `20261124000000_add_accounts` yang tertunda.
- `npx prisma migrate deploy` berhasil; `migrate status` kemudian melaporkan
  skema database mutakhir.
- Verifikasi objek database langsung ke Supabase: enum `AccountType` (5 nilai),
  tabel `accounts` (10 kolom), 5 index, dan kedua foreign key termasuk FK
  komposit `(company_id, parent_id)` dengan `ON DELETE RESTRICT`.
- Data existing utuh: 1 perusahaan, 5 pengguna, 47 produk, 218 penjualan;
  tabel `accounts` kosong (0 baris).
- Uji live `/accounts` dengan sesi demo: OWNER melihat tombol kelola,
  MANAGER/FINANCE hanya lihat, INVENTORY_STAFF/CASHIER dialihkan ke
  `/unauthorized`.
- Probe tulis live (transien, langsung dibersihkan): insert sukses, duplikasi
  kode ditolak P2002, induk tidak valid ditolak P2003; tabel kembali kosong.
- Template MSME sengaja belum diterapkan — diserahkan ke pengguna melalui UI.
- Verifikasi otomatis tetap hijau: 44 tes Vitest, `prisma validate`,
  `tsc --noEmit`, `lint`, dan `build` (21 route).

## 9.4 Multi-warehouse: fondasi database (Phase 3, langkah 1)

- Model baru di `prisma/schema.prisma`: `Warehouse`, `ProductStock`,
  `StockTransfer`, `StockTransferItem`; enum `TransferStatus`
  (`DRAFT`/`COMPLETED`/`CANCELLED`); `MovementType` ditambah
  `TRANSFER_OUT`/`TRANSFER_IN`; kolom nullable `warehouse_id` pada `sales`
  dan `stock_movements` serta `transfer_id` pada `stock_movements`.
- Migrasi additive `20261125000000_add_multi_warehouse` (belum diterapkan):
  - Backfill deterministik: satu gudang `Gudang Utama` (`is_default`) per
    perusahaan dengan UUID turunan `md5(company_id)`; satu baris
    `product_stocks` per produk yang menyalin `stock_quantity`; `warehouse_id`
    penjualan dan mutasi stok lama diarahkan ke gudang default.
  - `ProductStock` menjadi saldo otoritatif per gudang;
    `products.stock_quantity` tetap total perusahaan untuk kompatibilitas
    baca (dashboard, POS, laporan).
  - Isolasi tenant lewat FK komposit `(company_id, …)`; `CHECK` untuk stok
    non-negatif, kuantitas transfer positif, dan gudang asal ≠ tujuan;
    partial unique index `warehouses_one_default_per_company`.
- `supabase/schema.sql` diperbarui untuk instalasi baru.
- Belum ada perubahan kode aplikasi; penulisan stok existing tetap hanya
  menyentuh `products.stock_quantity` sampai langkah integrasi berikutnya.
- Catatan seed: `prisma/seed.ts` dan seed suplementer masih menulis
  `stock_quantity` langsung — perlu diperbarui pada langkah backend agar
  produk baru mendapat baris `product_stocks` di gudang default.

## 9.5 Multi-warehouse: migrasi, CRUD gudang, dan UI (Phase 3, langkah 2)

- `npx prisma migrate deploy` menerapkan `20261125000000_add_multi_warehouse`;
  `migrate status` melaporkan skema mutakhir.
- Verifikasi live: 1 gudang `Gudang Utama` (default, aktif), 47 baris
  `product_stocks` dengan kuantitas identik `products.stock_quantity`,
  218 penjualan dan 606 mutasi stok memiliki `warehouse_id`; tidak ada
  ketidakcocokan atau referensi lintas perusahaan.
- Izin baru: `warehouses.view` / `warehouses.manage` — OWNER & MANAGER penuh,
  INVENTORY_STAFF lihat saja, CASHIER & FINANCE tanpa akses.
- `src/lib/queries/warehouses.ts`: daftar dengan pencarian/status/halaman,
  statistik, detail, gudang default, dan opsi gudang aktif — semuanya
  ter-scope `companyId` dari sesi.
- `src/lib/actions/warehouses.ts`: buat, ubah, aktifkan, nonaktifkan, dan
  tetapkan default. Kode unik per perusahaan, gudang default tidak dapat
  dinonaktifkan, pergantian default dalam transaksi (unset lalu set),
  tanpa penghapusan gudang.
- Route `/warehouses` ("Manajemen Gudang"): kartu metrik, pencarian, filter
  status, tabel dengan badge Default, serta dialog form dan konfirmasi
  untuk nonaktifkan/ganti default. Nav "Gudang" ditambahkan.
- Tes: 73 Vitest lulus (tambahan 29 untuk gudang), `tsc`, `lint`, dan
  `build` hijau; query live ke Supabase terverifikasi.

## 9.6 Multi-warehouse: integrasi penulisan stok (Phase 3, langkah 3A)

- `src/lib/stock.ts` — `applyStockDelta(tx, …)`: memperbarui
  `product_stocks` (saldo per gudang, otoritatif) dan
  `products.stock_quantity` (total perusahaan) secara atomik dalam transaksi
  pemanggil. Guard konkurensi via `updateMany` kondisional (`quantity >=
  decrement` dan `stock_quantity >= decrement`); baris saldo dibuat otomatis
  bila belum ada; mode `setQuantity` untuk stok opname.
- `checkoutAction` — memakai gudang default aktif perusahaan, menyimpan
  `sale.warehouseId`, mengurangi `ProductStock` + total per baris, dan
  mencatat mutasi `SALE` ber-`warehouseId`. Idempotensi `clientRequestId`
  dan retry P2002 dipertahankan; kegagalan saldo gudang menggugurkan seluruh
  transaksi.
- `voidSaleAction` — mengembalikan stok ke `sale.warehouseId` (fallback ke
  gudang default untuk data lama tanpa referensi), mutasi `SALE_VOID`
  ber-`warehouseId`; proteksi void ganda dipertahankan.
- `adjustStockAction` — parameter `warehouseId` opsional (default gudang
  default), validasi kepemilikan + status aktif, `previous/newQuantity`
  mutasi kini saldo per gudang.
- `createProductAction` — stok awal dialokasikan ke gudang default:
  baris `product_stocks` + mutasi `STOCK_IN` ber-`warehouseId`.
- `updateProductAction` sudah tidak mengizinkan ubah stok langsung — tidak
  ada perubahan diperlukan.
- UI: `stock-adjust-dialog` memiliki pemilih gudang (dari
  `getProductWarehouseStocks` di halaman detail produk); seed `seed.ts` dan
  `seed-supplemental.ts` diperbarui membuat gudang default, baris
  `product_stocks`, dan mutasi/penjualan ber-tag gudang.
- Tes: 93 Vitest lulus (tambahan uji `applyStockDelta`, adjust, buat produk,
  checkout, dan void termasuk isolasi tenant dan rollback); `tsc`, `lint`,
  `build` hijau. Verifikasi live Supabase: invarian
  `SUM(product_stocks) = products.stock_quantity` 0 mismatch dan probe
  rollback transaksi sukses tanpa mengubah data.
- Belum dikerjakan (sesuai scope): pemilih gudang di POS, modul transfer
  stok, tampilan/laporan per gudang, costing FIFO/rata-rata.

## 9.7 Multi-warehouse: pemilihan gudang POS (Phase 3, langkah 3B)

- `src/lib/queries/pos.ts`: `getPosWarehouses` (gudang aktif, default
  diutamakan — tetap di bawah izin `pos.use` halaman, tanpa perlu
  `warehouses.view`) dan `getPosCatalog(companyId, warehouseId)` yang kini
  mengambil `stockQuantity` dari `product_stocks` gudang terpilih (0 bila
  belum ada baris); `products.stock_quantity` tetap agregat perusahaan.
- `/pos?gudang=<id>`: param divalidasi ke gudang aktif perusahaan, fallback
  ke gudang default; katalog di-render ulang server-side setiap ganti
  gudang sehingga stok tidak pernah basi.
- `PosTerminal`: pemilih gudang (kode — nama, penanda "(Default)"), nama
  gudang tampil di header keranjang, `warehouseId` dikirim ke
  `checkoutAction`; pergantian gudang dengan keranjang terisi meminta
  konfirmasi lalu mengosongkan keranjang.
- `checkoutAction`: `warehouseId` opsional (uuid, preprocess null/kosong);
  bila diisi divalidasi same-company + aktif, bila kosong dipakai gudang
  default — semua jaminan atomik Step 3A dipertahankan.
- Tampilan transaksi: detail penjualan menampilkan baris "Gudang"
  (kode — nama); daftar penjualan memiliki kolom Gudang (tersembunyi di
  layar kecil, `—` untuk data lama tanpa gudang).
- Tes: 99 Vitest lulus (tambahan checkout gudang non-default, penolakan
  gudang lintas perusahaan/nonaktif, ketersediaan per gudang, gudang
  nonaktif tersembunyi dari opsi POS); `tsc`, `lint`, `build` hijau.
  Verifikasi live: 1 gudang aktif, katalog 46 produk dengan stok per
  gudang, invarian tetap 0 mismatch.
- Belum dikerjakan (sesuai scope): modul transfer stok, tampilan/laporan
  per gudang, costing FIFO/rata-rata.

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
