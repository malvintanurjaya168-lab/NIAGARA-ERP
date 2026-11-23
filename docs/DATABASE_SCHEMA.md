# Skema Database

Dokumen ini menjelaskan model data NIAGARA ERP. Sumber kebenaran ada di
[`prisma/schema.prisma`](../prisma/schema.prisma); SQL migrasi awal ada di
[`prisma/migrations/0_init/migration.sql`](../prisma/migrations/0_init/migration.sql).

## Ringkasan relasi

```text
companies
  1 ─── N users
  1 ─── N categories
  1 ─── N products ─── N sale_items
  1 ─── N sales ─── N sale_items
  1 ─── N stock_movements

categories 1 ─── N products        (products.category_id, ON DELETE SET NULL)
users      1 ─── N sales           (sales.cashier_id)
users      1 ─── N sales           (sales.voided_by_id, opsional)
users      1 ─── N stock_movements (stock_movements.created_by_id)
products   1 ─── N sale_items
products   1 ─── N stock_movements
```

Semua tabel bisnis memiliki `company_id` kecuali `sale_items`; isolasi
`company_id` untuk item ditegakkan melalui `sales.company_id` dan
`products.company_id`.

## Enum

| Enum | Nilai |
| --- | --- |
| `Role` | `OWNER`, `MANAGER`, `INVENTORY_STAFF`, `CASHIER`, `FINANCE` |
| `PaymentMethod` | `CASH`, `BANK_TRANSFER`, `QRIS`, `CARD`, `E_WALLET` |
| `SaleStatus` | `COMPLETED`, `VOIDED` |
| `MovementType` | `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `SALE`, `SALE_VOID` |

## Tabel

### `companies`

Profil tenant. Satu baris mewakili satu usaha.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `name` | `text` | tidak | — | Nama usaha. |
| `business_type` | `text` | ya | — | Jenis usaha. |
| `address` | `text` | ya | — | Alamat. |
| `contact_email` | `text` | ya | — | Email kontak. |
| `phone` | `text` | ya | — | Telepon. |
| `currency` | `text` | tidak | `IDR` | Kode mata uang. |
| `fiscal_year_start_month` | `smallint` | tidak | `1` | Bulan awal tahun fiskal (1–12). |
| `timezone` | `text` | tidak | `Asia/Jakarta` | Zona waktu laporan. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `users`

Akun tim yang dapat masuk ke aplikasi. Satu pengguna terhubung ke satu
perusahaan.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `full_name` | `text` | tidak | — | Nama lengkap. |
| `email` | `text` | tidak | — | Unik global, disimpan lowercase. |
| `password_hash` | `text` | tidak | — | Hash bcrypt; tidak pernah dikirim ke klien. |
| `role` | `Role` | tidak | — | Peran RBAC. |
| `is_active` | `boolean` | tidak | `true` | Akun nonaktif tidak dapat masuk. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `categories`

Kategori produk per perusahaan.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `name` | `text` | tidak | — | Unik per perusahaan. |
| `description` | `text` | ya | — | Deskripsi. |
| `is_active` | `boolean` | tidak | `true` | Kategori nonaktif tidak dipakai untuk produk baru. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `products`

Master produk dan saldo stok saat ini.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `category_id` | `uuid` | ya | — | FK → `categories.id`, `SET NULL`. |
| `sku` | `text` | tidak | — | Unik per perusahaan. |
| `name` | `text` | tidak | — | Nama produk. |
| `unit` | `text` | tidak | `pcs` | Satuan jual. |
| `purchase_price` | `decimal(18,2)` | tidak | — | HPP terkini. |
| `selling_price` | `decimal(18,2)` | tidak | — | Harga jual terkini. |
| `stock_quantity` | `decimal(18,3)` | tidak | `0` | Saldo stok; tidak boleh negatif. |
| `minimum_stock` | `decimal(18,3)` | tidak | `0` | Ambang peringatan stok menipis. |
| `is_active` | `boolean` | tidak | `true` | Produk nonaktif tidak tampil di POS. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `sales`

Header transaksi penjualan.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `transaction_number` | `text` | tidak | — | `TRX-YYYYMMDD-NNNN`, unik per perusahaan. |
| `cashier_id` | `uuid` | tidak | — | FK → `users.id`, `RESTRICT`. |
| `payment_method` | `PaymentMethod` | tidak | — | Metode pembayaran. |
| `status` | `SaleStatus` | tidak | `COMPLETED` | `VOIDED` tidak dihitung di laporan. |
| `total_amount` | `decimal(18,2)` | tidak | — | Jumlah `subtotal` seluruh item. |
| `sold_at` | `timestamptz(6)` | tidak | `now()` | Waktu transaksi. |
| `voided_at` | `timestamptz(6)` | ya | — | Waktu pembatalan. |
| `voided_by_id` | `uuid` | ya | — | FK → `users.id`, `RESTRICT`. |
| `void_reason` | `text` | ya | — | Alasan pembatalan. |
| `client_request_id` | `text` | ya | — | Idempotency key dari POS; unik per perusahaan. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |

Catatan: PostgreSQL mengizinkan banyak nilai `NULL` pada unique index
`client_request_id`, sehingga transaksi lama tanpa idempotency key tetap sah.

### `sale_items`

Baris item transaksi dengan snapshot historis.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `sale_id` | `uuid` | tidak | — | FK → `sales.id`, `RESTRICT`. |
| `product_id` | `uuid` | tidak | — | FK → `products.id`, `RESTRICT`. |
| `product_name_snapshot` | `text` | tidak | — | Nama saat transaksi. |
| `sku_snapshot` | `text` | tidak | — | SKU saat transaksi. |
| `unit_snapshot` | `text` | tidak | — | Satuan saat transaksi. |
| `quantity` | `decimal(18,3)` | tidak | — | Kuantitas. |
| `selling_price_snapshot` | `decimal(18,2)` | tidak | — | Harga jual saat transaksi. |
| `purchase_cost_snapshot` | `decimal(18,2)` | tidak | — | HPP saat transaksi. |
| `subtotal` | `decimal(18,2)` | tidak | — | `quantity × selling_price_snapshot`. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |

Snapshot memastikan laporan historis tidak berubah ketika produk diubah atau
dinonaktifkan.

### `stock_movements`

Buku besar pergerakan stok yang hanya ditambah (append-only).

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `product_id` | `uuid` | tidak | — | FK → `products.id`, `RESTRICT`. |
| `movement_type` | `MovementType` | tidak | — | Jenis pergerakan. |
| `quantity_delta` | `decimal(18,3)` | tidak | — | Positif masuk, negatif keluar. |
| `previous_quantity` | `decimal(18,3)` | tidak | — | Saldo sebelum. |
| `new_quantity` | `decimal(18,3)` | tidak | — | Saldo sesudah. |
| `reason` | `text` | tidak | — | Alasan yang dapat dibaca manusia. |
| `reference_type` | `text` | ya | — | Mis. `SALE`, `SALE_VOID`. |
| `reference_id` | `text` | ya | — | ID referensi transaksi. |
| `created_by_id` | `uuid` | tidak | — | FK → `users.id`, `RESTRICT`. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu pergerakan. |

`previous_quantity` dan `new_quantity` memungkinkan audit stok tanpa menghitung
ulang seluruh ledger. Nilainya harus konsisten:
`previous_quantity + quantity_delta = new_quantity`.

## Index dan constraint

| Index | Tujuan |
| --- | --- |
| `users_email_key` (unique) | Login unik. |
| `users_company_id_role_idx` | Filter pengguna per peran. |
| `users_company_id_is_active_idx` | Filter pengguna aktif. |
| `categories_company_id_name_key` (unique) | Nama kategori unik per tenant. |
| `categories_company_id_is_active_idx` | Daftar kategori aktif. |
| `products_company_id_sku_key` (unique) | SKU unik per tenant. |
| `products_company_id_name_idx` | Pencarian/urut nama. |
| `products_company_id_category_id_idx` | Filter kategori. |
| `products_company_id_is_active_idx` | Katalog POS. |
| `sales_company_id_transaction_number_key` (unique) | Nomor transaksi unik per tenant. |
| `sales_company_id_client_request_id_key` (unique) | Idempotensi checkout. |
| `sales_company_id_sold_at_idx` | Laporan periode. |
| `sales_company_id_status_idx` | Pemisahan transaksi void. |
| `sales_cashier_id_idx` | Riwayat milik kasir. |
| `sale_items_sale_id_idx` | Detail transaksi. |
| `sale_items_product_id_idx` | Produk terlaris. |
| `stock_movements_company_id_created_at_idx` | Buku besar per periode. |
| `stock_movements_product_id_created_at_idx` | Riwayat per produk. |
| `stock_movements_company_id_movement_type_idx` | Filter jenis pergerakan. |
| `stock_movements_company_id_reference_type_reference_id_idx` | Audit per referensi. |

Semua foreign key memakai `ON DELETE RESTRICT` (kecuali
`products.category_id` → `SET NULL`), sehingga riwayat transaksi tidak dapat
terhapus secara tidak sengaja.

## Aturan data dan perhitungan

### Uang dan kuantitas
- Uang: `Decimal(18,2)` — maksimum 16 digit sebelum desimal.
- Kuantitas: `Decimal(18,3)`.
- Aplikasi menggunakan `Prisma.Decimal`; tidak ada aritmetika floating point
  untuk total, HPP, atau laba.
- `sales.total_amount = Σ sale_items.subtotal`.
- `subtotal = quantity × selling_price_snapshot`, dibulatkan ke 2 desimal.
- `laba kotor = Σ (subtotal − quantity × purchase_cost_snapshot)` untuk
  transaksi `COMPLETED`.

### Waktu
- Semua waktu disimpan sebagai `timestamptz(6)` (UTC di database).
- Batas hari/bulan/tahun dihitung di `Asia/Jakarta` (UTC+7), lalu dikonversi
  ke UTC untuk query.
- Tahun fiskal dimulai pada `companies.fiscal_year_start_month`.

### Stok
- Saldo utama ada di `products.stock_quantity`; ledger ada di
  `stock_movements`.
- `SALE` mengurangi stok; `SALE_VOID` menambah stok.
- `STOCK_IN` menambah; `STOCK_OUT` mengurangi; `ADJUSTMENT` dapat menambah
  atau mengurangi sesuai stok opname.
- Checkout memakai update kondisional
  (`stock_quantity >= quantity`) di dalam transaksi database, sehingga dua
  checkout bersamaan tidak dapat membuat stok negatif.
- Setiap perubahan stok wajib menulis satu baris `stock_movements`.

### Void
- Hanya `OWNER` dan `MANAGER` yang dapat membatalkan.
- Alasan wajib diisi.
- Status berubah `COMPLETED → VOIDED`, `voided_at`, `voided_by_id`, dan
  `void_reason` diisi.
- Stok dikembalikan dan pergerakan `SALE_VOID` dicatat.
- Baris transaksi tidak dihapus.
- Transaksi `VOIDED` dikecualikan dari pendapatan, HPP, laba, jumlah transaksi,
  metode pembayaran, dan produk terlaris.

### Idempotensi
- Klien POS mengirim `clientRequestId` (UUID) per percobaan checkout.
- Unique index `(company_id, client_request_id)` mencegah dua transaksi dari
  satu permintaan.
- Jika permintaan diulang, server mengembalikan transaksi yang sudah ada
  alih-alih membuat transaksi baru.

### Isolasi tenant
- Setiap query baca dan aksi tulis memakai `companyId` dari sesi yang
  diverifikasi.
- Mencari entitas hanya dengan `id` tanpa `companyId` dilarang.
- `sale_items` diakses melalui `sale` yang sudah difilter `companyId`.

## Seed

`prisma/seed.ts` membuat:

- 1 perusahaan: `Niagara Retail Nusantara`.
- 5 pengguna (satu per peran).
- 6 kategori.
- 25 produk, termasuk produk stok menipis dan habis.
- Transaksi 90 hari terakhir dengan distribusi metode pembayaran.
- Beberapa transaksi `VOIDED`.
- Pergerakan stok awal, penjualan, void, dan penyesuaian.

Seed dapat dijalankan ulang dan hanya mengganti data perusahaan demo.
