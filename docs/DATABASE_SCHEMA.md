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
  1 ─── N accounts ─── N accounts (parent_id, self-reference)
  1 ─── N warehouses ─── N product_stocks
  1 ─── N stock_transfers ─── N stock_transfer_items

categories 1 ─── N products        (products.category_id, ON DELETE SET NULL)
users      1 ─── N sales           (sales.cashier_id)
users      1 ─── N sales           (sales.voided_by_id, opsional)
users      1 ─── N stock_movements (stock_movements.created_by_id)
users      1 ─── N stock_transfers (stock_transfers.created_by_id)
products   1 ─── N sale_items
products   1 ─── N stock_movements
products   1 ─── N product_stocks
products   1 ─── N stock_transfer_items
warehouses 1 ─── N product_stocks  (product_stocks.warehouse_id, komposit company_id)
warehouses 1 ─── N stock_movements (stock_movements.warehouse_id, opsional)
warehouses 1 ─── N sales           (sales.warehouse_id, opsional)
warehouses 1 ─── N stock_transfers (from_warehouse_id / to_warehouse_id)
accounts   1 ─── N accounts         (accounts.parent_id → accounts, hirarki COA)
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
| `MovementType` | `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `SALE`, `SALE_VOID`, `TRANSFER_OUT`, `TRANSFER_IN` |
| `AccountType` | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE` |
| `TransferStatus` | `DRAFT`, `COMPLETED`, `CANCELLED` |

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
| `warehouse_id` | `uuid` | ya | — | FK komposit `(company_id, warehouse_id)` → `warehouses(company_id, id)`, `RESTRICT`; gudang asal stok. Diisi backfill ke gudang default untuk data lama. |
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
| `reference_type` | `text` | ya | — | Mis. `SALE`, `SALE_VOID`, `TRANSFER`. |
| `reference_id` | `text` | ya | — | ID referensi transaksi. |
| `warehouse_id` | `uuid` | ya | — | FK komposit `(company_id, warehouse_id)` → `warehouses(company_id, id)`, `RESTRICT`; gudang tempat saldo berubah. Diisi backfill ke gudang default untuk data lama. |
| `transfer_id` | `uuid` | ya | — | FK komposit `(company_id, transfer_id)` → `stock_transfers(company_id, id)`, `RESTRICT`; terisi untuk pergerakan transfer. |
| `created_by_id` | `uuid` | tidak | — | FK → `users.id`, `RESTRICT`. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu pergerakan. |

`previous_quantity` dan `new_quantity` memungkinkan audit stok tanpa menghitung
ulang seluruh ledger. Nilainya harus konsisten:
`previous_quantity + quantity_delta = new_quantity`.

### `accounts`

Akun pada Chart of Accounts (COA), tersusun hierarki per perusahaan.
Dibuat oleh migrasi additive `20261124000000_add_accounts`.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `code` | `text` | tidak | — | Kode akun; unik per perusahaan. |
| `name` | `text` | tidak | — | Nama akun. |
| `type` | `AccountType` | tidak | — | Klasifikasi akun. |
| `parent_id` | `uuid` | ya | — | FK komposit `(company_id, parent_id)` → `accounts(company_id, id)`, `RESTRICT`; memastikan induk selalu satu perusahaan. |
| `is_postable` | `boolean` | tidak | `true` | Akun yang dapat menerima posting jurnal (idealnya hanya akun daun). |
| `is_active` | `boolean` | tidak | `true` | Akun nonaktif tidak dipakai untuk transaksi baru. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

Relasi induk–anak ditegakkan oleh foreign key komposit
`(company_id, parent_id) → accounts(company_id, id)`, sehingga akun induk
tidak mungkin berada di perusahaan lain. Semua foreign key memakai
`ON DELETE RESTRICT`; akun yang direferensikan sebagai induk (dan kelak oleh
entri jurnal) tidak dapat dihapus.

### `warehouses`

Lokasi penyimpanan per perusahaan. Dibuat oleh migrasi additive
`20261125000000_add_multi_warehouse`; setiap perusahaan mendapat satu
gudang default `Gudang Utama` melalui backfill.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `code` | `text` | tidak | — | Kode gudang; unik per perusahaan. |
| `name` | `text` | tidak | — | Nama gudang. |
| `address` | `text` | ya | — | Alamat opsional. |
| `is_active` | `boolean` | tidak | `true` | Gudang nonaktif tidak dipakai transaksi baru. |
| `is_default` | `boolean` | tidak | `false` | Gudang utama; maksimal satu per perusahaan aktif (partial unique index). |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `product_stocks`

Saldo stok otoritatif per produk per gudang. Dibuat oleh migrasi
`20261125000000_add_multi_warehouse`; setiap produk mendapat satu baris di
gudang default yang diisi dari `products.stock_quantity`.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `product_id` | `uuid` | tidak | — | FK komposit `(company_id, product_id)` → `products(company_id, id)`, `RESTRICT`. |
| `warehouse_id` | `uuid` | tidak | — | FK komposit `(company_id, warehouse_id)` → `warehouses(company_id, id)`, `RESTRICT`. |
| `quantity` | `decimal(18,3)` | tidak | `0` | Saldo gudang; `CHECK (quantity >= 0)`. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

Unik per `(company_id, product_id, warehouse_id)`. Ke depan, seluruh penulisan
stok wajib memperbarui `product_stocks` dan `products.stock_quantity`
( total perusahaan ) secara atomik dalam satu transaksi.

### `stock_transfers`

Header mutasi stok antar-gudang dalam satu perusahaan.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `transfer_number` | `text` | tidak | — | Nomor transfer; unik per perusahaan. |
| `from_warehouse_id` | `uuid` | tidak | — | FK komposit → `warehouses(company_id, id)`; gudang asal. |
| `to_warehouse_id` | `uuid` | tidak | — | FK komposit → `warehouses(company_id, id)`; gudang tujuan. `CHECK (from <> to)`. |
| `status` | `TransferStatus` | tidak | `DRAFT` | `DRAFT`, `COMPLETED`, `CANCELLED`. |
| `note` | `text` | ya | — | Catatan opsional. |
| `created_by_id` | `uuid` | tidak | — | FK → `users.id`, `RESTRICT`. |
| `completed_at` | `timestamptz(6)` | ya | — | Waktu penyelesaian. |
| `cancelled_at` | `timestamptz(6)` | ya | — | Waktu pembatalan. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |
| `updated_at` | `timestamptz(6)` | tidak | — | Diperbarui aplikasi. |

### `stock_transfer_items`

Baris item transfer.

| Kolom | Tipe | Null | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | tidak | — | Primary key. |
| `company_id` | `uuid` | tidak | — | FK → `companies.id`, `RESTRICT`. |
| `transfer_id` | `uuid` | tidak | — | FK komposit `(company_id, transfer_id)` → `stock_transfers(company_id, id)`, `RESTRICT`. |
| `product_id` | `uuid` | tidak | — | FK komposit `(company_id, product_id)` → `products(company_id, id)`, `RESTRICT`. |
| `quantity` | `decimal(18,3)` | tidak | — | Kuantitas; `CHECK (quantity > 0)`. Unik per `(transfer_id, product_id)`. |
| `created_at` | `timestamptz(6)` | tidak | `now()` | Waktu dibuat. |

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
| `accounts_company_id_id_key` (unique) | Target FK komposit induk–anak. |
| `accounts_company_id_code_key` (unique) | Kode akun unik per tenant. |
| `accounts_company_id_type_idx` | Filter/kelompok akun per klasifikasi. |
| `accounts_company_id_parent_id_idx` | Traversal hirarki COA. |
| `accounts_company_id_is_active_idx` | Daftar akun aktif. |
| `products_company_id_id_key` (unique) | Target FK komposit `product_stocks`/`stock_transfer_items`. |
| `warehouses_company_id_id_key` (unique) | Target FK komposit gudang. |
| `warehouses_company_id_code_key` (unique) | Kode gudang unik per tenant. |
| `warehouses_one_default_per_company` (unique parsial) | Maksimal satu gudang default aktif per perusahaan. |
| `warehouses_company_id_is_active_idx` | Daftar gudang aktif. |
| `warehouses_company_id_is_default_idx` | Pencarian gudang default. |
| `product_stocks_company_id_product_id_warehouse_id_key` (unique) | Satu saldo per produk per gudang. |
| `product_stocks_company_id_warehouse_id_idx` | Saldo per gudang. |
| `product_stocks_company_id_product_id_idx` | Saldo per produk. |
| `stock_transfers_company_id_transfer_number_key` (unique) | Nomor transfer unik per tenant. |
| `stock_transfers_company_id_id_key` (unique) | Target FK komposit item/movement transfer. |
| `stock_transfers_company_id_status_idx` | Filter status transfer. |
| `stock_transfers_company_id_created_at_idx` | Riwayat transfer per periode. |
| `stock_transfer_items_transfer_id_product_id_key` (unique) | Satu baris produk per transfer. |
| `stock_transfer_items_company_id_product_id_idx` | Riwayat per produk. |

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
- `product_stocks` adalah saldo otoritatif per gudang;
  `products.stock_quantity` tetap total perusahaan untuk kompatibilitas.
  Keduanya wajib diperbarui atomik dalam satu transaksi.
- Ledger ada di `stock_movements`; `warehouse_id` mencatat gudang tempat
  saldo berubah dan `transfer_id` menautkan ke transfer terkait.
- `SALE` mengurangi stok; `SALE_VOID` menambah stok.
- `STOCK_IN` menambah; `STOCK_OUT` mengurangi; `ADJUSTMENT` dapat menambah
  atau mengurangi sesuai stok opname.
- `TRANSFER_OUT`/`TRANSFER_IN` mencatat kaki keluar/masuk pada transfer
  antar-gudang.
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
