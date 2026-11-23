# Penyiapan Database (Supabase)

Panduan ini menjelaskan cara menyiapkan PostgreSQL Supabase untuk NIAGARA ERP,
menjalankan schema, mengisi data demo, dan memverifikasi hasilnya.

## 1. Buat project Supabase

1. Masuk ke [supabase.com](https://supabase.com) dan buat project baru.
2. Simpan **database password** yang Anda buat.
3. Tunggu hingga project selesai disiapkan.
4. Buka **Project Settings → Database** atau tombol **Connect** untuk melihat
   connection string.

## 2. Ambil connection string

NIAGARA ERP memakai dua koneksi:

| Variabel | Kegunaan | Rekomendasi Supabase |
| --- | --- | --- |
| `DATABASE_URL` | Runtime aplikasi (Prisma + `pg`) | **Transaction pooler**, port `6543` |
| `DIRECT_URL` | Prisma CLI (migrasi/seed) | **Session pooler** atau direct, port `5432` |

Contoh bentuk URI:

```env
DATABASE_URL="postgresql://postgres.abcdefgh:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.abcdefgh:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Catatan:

- Selalu sertakan `sslmode=require`.
- Jika jaringan Anda tidak mendukung IPv6, gunakan **Session pooler** untuk
  `DIRECT_URL` (bukan direct connection yang hanya IPv6).
- Jangan menambahkan `schema=public` jika URI Supabase sudah mengarah ke
  database `postgres`; schema default sudah `public`.
- Jangan pernah commit nilai sebenarnya. `.env` sudah diabaikan Git.

## 3. Buat `.env`

```bash
copy .env.example .env
```

Isi ketiga variabel:

```env
DATABASE_URL="..."
DIRECT_URL="..."
AUTH_SECRET="..."
```

Buat `AUTH_SECRET`:

```bash
npx auth secret
# atau
openssl rand -base64 32
```

## 4. Terapkan schema

Ada dua jalur yang sah. Pilih salah satu, jangan mencampur keduanya pada
database yang sama.

### Jalur A — Supabase SQL Editor (paling sederhana)

1. Buka **SQL Editor** di dashboard Supabase.
2. Salin seluruh isi [`supabase/schema.sql`](../supabase/schema.sql).
3. Jalankan.
4. Tandai migrasi awal sebagai sudah diterapkan:

```bash
npm run db:baseline
```

Perintah ini menjalankan `prisma migrate resolve --applied 0_init` sehingga
Prisma tidak mencoba membuat ulang tabel.

5. Isi data demo:

```bash
npm run db:seed
```

### Jalur B — Prisma Migrate

```bash
npm run db:migrate
npm run db:seed
```

`db:migrate` menjalankan `prisma migrate dev`, menerapkan
`prisma/migrations/0_init/migration.sql`, lalu menjalankan seed otomatis.
Prisma Migrate membutuhkan hak membuat shadow database; jika akun Supabase
tidak mengizinkannya, gunakan Jalur A.

### Alternatif prototyping

```bash
npm run db:push
npm run db:seed
```

`db:push` menyinkronkan schema tanpa membuat riwayat migrasi. Jangan gunakan
pada database produksi.

## 5. Isi data demo

```bash
npm run db:seed
```

Seed bersifat deterministik dan **mengganti data demo lama**:

- Menghapus perusahaan bernama `Niagara Retail Nusantara` beserta seluruh
  pengguna, kategori, produk, transaksi, dan pergerakan stoknya.
- Membuat ulang perusahaan, 5 pengguna demo, 6 kategori, 25 produk.
- Membuat transaksi 90 hari terakhir (termasuk beberapa transaksi dibatalkan).
- Menulis pergerakan stok awal, penjualan, pembatalan, dan penyesuaian stok
  opname.

Data perusahaan lain tidak disentuh.

Akun demo:

| Peran | Email | Kata sandi |
| --- | --- | --- |
| `OWNER` | `owner@niagara.demo` | `Owner#2026` |
| `MANAGER` | `manager@niagara.demo` | `Manager#2026` |
| `INVENTORY_STAFF` | `inventory@niagara.demo` | `Inventory#2026` |
| `CASHIER` | `cashier@niagara.demo` | `Cashier#2026` |
| `FINANCE` | `finance@niagara.demo` | `Finance#2026` |

## 6. Verifikasi

Jalankan query berikut di SQL Editor:

```sql
-- Jumlah data utama
select
  (select count(*) from companies) as companies,
  (select count(*) from users) as users,
  (select count(*) from categories) as categories,
  (select count(*) from products) as products,
  (select count(*) from sales) as sales,
  (select count(*) from sale_items) as sale_items,
  (select count(*) from stock_movements) as stock_movements;

-- Pastikan tidak ada stok negatif
select sku, name, stock_quantity
from products
where stock_quantity < 0;

-- Pastikan total transaksi sama dengan jumlah item
select s.transaction_number, s.total_amount, sum(si.subtotal) as items_total
from sales s
join sale_items si on si.sale_id = s.id
group by s.id
having s.total_amount <> sum(si.subtotal);
```

Kedua query validasi harus mengembalikan nol baris.

Uji login di aplikasi dengan akun pemilik, lalu buka Dasbor, Inventaris, POS,
Penjualan, dan Laporan Keuangan.

## 7. Isolasi multi-tenant dan RLS

Aplikasi hanya mengakses database dari server menggunakan connection string
rahasia. Setiap query dan Server Action memfilter `company_id` dari sesi
pengguna yang sudah diverifikasi.

Supabase Row Level Security (RLS) **tidak diaktifkan** pada schema ini karena:

- Koneksi berasal dari server tepercaya, bukan dari browser/`anon key`.
- Tidak ada akses langsung klien ke PostgREST.
- Kebijakan RLS tanpa `auth.uid()` yang terhubung ke tabel `users` aplikasi
  akan rumit dan berisiko memberi rasa aman palsu.

Jika nanti aplikasi membuka akses langsung dari klien, aktifkan RLS dan buat
kebijakan berbasis `company_id` sebelum mengekspos `anon key`.

## 8. Reset database

Untuk mengulang dari awal:

```bash
npm run db:seed
```

Untuk menghapus seluruh objek (hati-hati, hanya untuk database pengembangan),
jalankan di SQL Editor:

```sql
drop schema public cascade;
create schema public;
```

Lalu terapkan ulang schema dan seed.

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| `P1001: Can't reach database server` | Host/port salah, IPv6 tidak didukung, atau project pause | Gunakan Session pooler port `5432`, aktifkan project, periksa password |
| `password authentication failed` | Password salah atau karakter khusus tidak di-encode | Encode karakter khusus di URI atau reset password |
| `prepared statement already exists` | Transaction pooler tidak cocok untuk mode tertentu | Gunakan Session pooler untuk `DIRECT_URL` dan/atau port `5432` |
| `relation "companies" does not exist` | Schema belum diterapkan | Jalankan `supabase/schema.sql` atau `npm run db:migrate` |
| `The table main.Company does not exist` (Prisma) | Nama tabel salah/schema kosong | Terapkan schema; jangan mengubah `@@map` |
| `AUTH_SECRET` missing | `.env` belum diisi | Isi `AUTH_SECRET`, restart server |
| Login selalu gagal | Seed belum dijalankan | `npm run db:seed` |
| `PrismaClientInitializationError` saat build | `DATABASE_URL` kosong | Build tidak butuh koneksi, tetapi variabel harus ada; isi `.env` |
| Perubahan schema tidak terbaca | Prisma Client belum di-generate | `npm run db:generate` lalu restart |

## Referensi

- Struktur tabel dan aturan data: [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)
- Schema Prisma: [`prisma/schema.prisma`](../prisma/schema.prisma)
- SQL lengkap: [`supabase/schema.sql`](../supabase/schema.sql)
