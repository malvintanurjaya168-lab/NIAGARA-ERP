import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "DATABASE_URL atau DIRECT_URL belum diatur. Isi .env sebelum menjalankan seed.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const COMPANY_NAME = "Niagara Retail Nusantara";
const TIMEZONE = "Asia/Jakarta";

const DEMO_USERS = [
  { role: "OWNER", email: "owner@niagara.demo", password: "Owner#2026", fullName: "Rangga Pratama" },
  { role: "MANAGER", email: "manager@niagara.demo", password: "Manager#2026", fullName: "Sinta Maharani" },
  { role: "INVENTORY_STAFF", email: "inventory@niagara.demo", password: "Inventory#2026", fullName: "Budi Santoso" },
  { role: "CASHIER", email: "cashier@niagara.demo", password: "Cashier#2026", fullName: "Dewi Lestari" },
  { role: "FINANCE", email: "finance@niagara.demo", password: "Finance#2026", fullName: "Andi Wijaya" },
] as const;

const CATEGORIES = [
  { name: "Minuman", description: "Minuman siap saji dan kemasan." },
  { name: "Makanan Ringan", description: "Camilan dan makanan kemasan." },
  { name: "Sembako", description: "Kebutuhan pokok sehari-hari." },
  { name: "Perawatan Diri", description: "Produk kebersihan dan perawatan tubuh." },
  { name: "Perlengkapan Rumah", description: "Kebutuhan rumah tangga." },
  { name: "Kopi & Teh", description: "Kopi, teh, dan minuman seduh." },
] as const;

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  initialStock: number;
  minimumStock: number;
}

const PRODUCTS: SeedProduct[] = [
  { sku: "AM-600", name: "Air Mineral 600ml", category: "Minuman", unit: "botol", purchasePrice: 2500, sellingPrice: 4000, initialStock: 120, minimumStock: 24 },
  { sku: "TB-350", name: "Teh Botol 350ml", category: "Minuman", unit: "botol", purchasePrice: 3500, sellingPrice: 5000, initialStock: 80, minimumStock: 20 },
  { sku: "KS-GA", name: "Kopi Susu Gula Aren", category: "Minuman", unit: "botol", purchasePrice: 8000, sellingPrice: 12000, initialStock: 40, minimumStock: 10 },
  { sku: "JJ-250", name: "Jus Jeruk 250ml", category: "Minuman", unit: "botol", purchasePrice: 6000, sellingPrice: 9000, initialStock: 30, minimumStock: 8 },
  { sku: "SU-C250", name: "Susu UHT Cokelat 250ml", category: "Minuman", unit: "pcs", purchasePrice: 4500, sellingPrice: 6500, initialStock: 60, minimumStock: 12 },
  { sku: "KK-O68", name: "Keripik Kentang Original 68g", category: "Makanan Ringan", unit: "pack", purchasePrice: 9000, sellingPrice: 13500, initialStock: 45, minimumStock: 10 },
  { sku: "BC-120", name: "Biskuit Cokelat 120g", category: "Makanan Ringan", unit: "pack", purchasePrice: 7500, sellingPrice: 11000, initialStock: 50, minimumStock: 10 },
  { sku: "KG-100", name: "Kacang Goreng 100g", category: "Makanan Ringan", unit: "pack", purchasePrice: 5000, sellingPrice: 7500, initialStock: 35, minimumStock: 10 },
  { sku: "CB-65", name: "Cokelat Batang 65g", category: "Makanan Ringan", unit: "pcs", purchasePrice: 10000, sellingPrice: 15000, initialStock: 25, minimumStock: 8 },
  { sku: "BR-5", name: "Beras Premium 5kg", category: "Sembako", unit: "pack", purchasePrice: 65000, sellingPrice: 78000, initialStock: 20, minimumStock: 5 },
  { sku: "MG-1L", name: "Minyak Goreng 1L", category: "Sembako", unit: "botol", purchasePrice: 17000, sellingPrice: 21500, initialStock: 30, minimumStock: 8 },
  { sku: "GP-1", name: "Gula Pasir 1kg", category: "Sembako", unit: "pack", purchasePrice: 15000, sellingPrice: 18500, initialStock: 40, minimumStock: 10 },
  { sku: "TA-1", name: "Telur Ayam 1kg", category: "Sembako", unit: "kg", purchasePrice: 28000, sellingPrice: 33000, initialStock: 18, minimumStock: 5 },
  { sku: "TT-1", name: "Tepung Terigu 1kg", category: "Sembako", unit: "pack", purchasePrice: 12000, sellingPrice: 15500, initialStock: 25, minimumStock: 8 },
  { sku: "GH-500", name: "Garam Halus 500g", category: "Sembako", unit: "pack", purchasePrice: 4000, sellingPrice: 6000, initialStock: 50, minimumStock: 10 },
  { sku: "SM-450", name: "Sabun Mandi Cair 450ml", category: "Perawatan Diri", unit: "botol", purchasePrice: 18000, sellingPrice: 24500, initialStock: 20, minimumStock: 6 },
  { sku: "SH-340", name: "Shampo 340ml", category: "Perawatan Diri", unit: "botol", purchasePrice: 32000, sellingPrice: 42000, initialStock: 15, minimumStock: 5 },
  { sku: "PG-120", name: "Pasta Gigi 120g", category: "Perawatan Diri", unit: "pcs", purchasePrice: 12000, sellingPrice: 17000, initialStock: 22, minimumStock: 6 },
  { sku: "TS-50", name: "Tisu Basah 50 Lembar", category: "Perawatan Diri", unit: "pack", purchasePrice: 9000, sellingPrice: 13000, initialStock: 28, minimumStock: 8 },
  { sku: "SC-750", name: "Sabun Cuci Piring 750ml", category: "Perlengkapan Rumah", unit: "botol", purchasePrice: 14000, sellingPrice: 19000, initialStock: 18, minimumStock: 6 },
  { sku: "DB-800", name: "Deterjen Bubuk 800g", category: "Perlengkapan Rumah", unit: "pack", purchasePrice: 21000, sellingPrice: 28000, initialStock: 16, minimumStock: 5 },
  { sku: "SP-1", name: "Spons Cuci Piring", category: "Perlengkapan Rumah", unit: "pcs", purchasePrice: 3000, sellingPrice: 5000, initialStock: 40, minimumStock: 10 },
  { sku: "KB-AR250", name: "Kopi Bubuk Arabika 250g", category: "Kopi & Teh", unit: "pack", purchasePrice: 38000, sellingPrice: 52000, initialStock: 14, minimumStock: 5 },
  { sku: "TC-25", name: "Teh Celup 25 Kantong", category: "Kopi & Teh", unit: "box", purchasePrice: 8500, sellingPrice: 12000, initialStock: 24, minimumStock: 6 },
  { sku: "KB-RB250", name: "Kopi Bubuk Robusta 250g", category: "Kopi & Teh", unit: "pack", purchasePrice: 28000, sellingPrice: 38000, initialStock: 12, minimumStock: 5 },
];

const VOID_REASONS = [
  "Salah input metode pembayaran",
  "Pelanggan membatalkan pesanan",
  "Terjadi kesalahan harga",
];

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260521);
const randomInt = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));
const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];

function jakartaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function jakartaStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0));
}

function paymentMethod():
  | "CASH"
  | "BANK_TRANSFER"
  | "QRIS"
  | "CARD"
  | "E_WALLET" {
  const roll = random();
  if (roll < 0.4) return "CASH";
  if (roll < 0.7) return "QRIS";
  if (roll < 0.85) return "BANK_TRANSFER";
  if (roll < 0.95) return "E_WALLET";
  return "CARD";
}

async function cleanupDemoCompany() {
  const existing = await prisma.company.findFirst({
    where: { name: COMPANY_NAME },
    select: { id: true },
  });

  if (!existing) return;

  console.log("Menghapus data demo sebelumnya…");
  await prisma.stockMovement.deleteMany({ where: { companyId: existing.id } });
  await prisma.saleItem.deleteMany({
    where: { sale: { companyId: existing.id } },
  });
  await prisma.sale.deleteMany({ where: { companyId: existing.id } });
  await prisma.product.deleteMany({ where: { companyId: existing.id } });
  await prisma.category.deleteMany({ where: { companyId: existing.id } });
  await prisma.user.deleteMany({ where: { companyId: existing.id } });
  await prisma.company.delete({ where: { id: existing.id } });
}

async function main() {
  await cleanupDemoCompany();

  const company = await prisma.company.create({
    data: {
      name: COMPANY_NAME,
      businessType: "Retail & F&B",
      address: "Jl. Merdeka No. 88, Bandung, Jawa Barat",
      contactEmail: "halo@niagara.demo",
      phone: "022-4231888",
      currency: "IDR",
      timezone: TIMEZONE,
      fiscalYearStartMonth: 1,
    },
    select: { id: true, name: true },
  });

  console.log(`Perusahaan dibuat: ${company.name}`);

  const users: Record<string, { id: string; fullName: string }> = {};
  for (const demo of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(demo.password, 10);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        fullName: demo.fullName,
        email: demo.email,
        passwordHash,
        role: demo.role,
        isActive: true,
      },
      select: { id: true, fullName: true },
    });
    users[demo.role] = user;
  }

  const inventoryUser = users.INVENTORY_STAFF;
  const cashier = users.CASHIER;
  const manager = users.MANAGER;

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        companyId: company.id,
        name: category.name,
        description: category.description,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    categoryIds.set(created.name, created.id);
  }

  const products: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    purchasePrice: Prisma.Decimal;
    sellingPrice: Prisma.Decimal;
  }[] = [];
  const stock = new Map<string, Prisma.Decimal>();
  const productBySku = new Map<string, (typeof products)[number]>();

  for (const product of PRODUCTS) {
    const created = await prisma.product.create({
      data: {
        companyId: company.id,
        categoryId: categoryIds.get(product.category) ?? null,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        purchasePrice: new Prisma.Decimal(product.purchasePrice),
        sellingPrice: new Prisma.Decimal(product.sellingPrice),
        stockQuantity: new Prisma.Decimal(product.initialStock),
        minimumStock: new Prisma.Decimal(product.minimumStock),
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    });

    products.push(created);
    productBySku.set(created.sku, created);
    stock.set(created.id, new Prisma.Decimal(product.initialStock));

    await prisma.stockMovement.create({
      data: {
        companyId: company.id,
        productId: created.id,
        movementType: "STOCK_IN",
        quantityDelta: new Prisma.Decimal(product.initialStock),
        previousQuantity: new Prisma.Decimal(0),
        newQuantity: new Prisma.Decimal(product.initialStock),
        reason: "Stok awal produk",
        referenceType: "SEED",
        createdById: inventoryUser.id,
      },
    });
  }

  console.log(`${products.length} produk dan stok awal dibuat.`);

  const today = jakartaDayKey(new Date());
  const nowHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  let saleCount = 0;
  let voidedCount = 0;

  for (let dayOffset = 89; dayOffset >= 0; dayOffset -= 1) {
    const key = addDaysKey(today, -dayOffset);
    const isToday = dayOffset === 0;
    const maxHour = isToday ? Math.min(20, nowHour) : 20;
    if (isToday && maxHour < 9) continue;

    const dayStart = jakartaStart(key);
    const transactionsToday = randomInt(2, isToday ? 4 : 5);
    const counter = { value: 0 };

    for (let t = 0; t < transactionsToday; t += 1) {
      const lineTotal = randomInt(1, 4);
      const available = products.filter((product) =>
        stock.get(product.id)?.gt(0),
      );
      if (available.length === 0) break;

      const chosen = [...available]
        .sort(() => random() - 0.5)
        .slice(0, Math.min(lineTotal, available.length));

      const lines: {
        product: (typeof products)[number];
        quantity: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      for (const product of chosen) {
        const current = stock.get(product.id) ?? new Prisma.Decimal(0);
        const maxQuantity = Math.max(1, Math.min(3, Math.floor(Number(current))));
        const quantity = new Prisma.Decimal(randomInt(1, maxQuantity));
        if (current.lt(quantity)) continue;
        lines.push({
          product,
          quantity,
          subtotal: product.sellingPrice.mul(quantity),
        });
      }

      if (lines.length === 0) continue;

      const totalAmount = lines.reduce(
        (sum, line) => sum.add(line.subtotal),
        new Prisma.Decimal(0),
      );

      const hour = randomInt(8, maxHour);
      const minute = randomInt(0, 59);
      let soldAt = new Date(dayStart.getTime() + (hour * 60 + minute) * 60000);
      if (soldAt.getTime() > Date.now() - 2 * 60000) {
        soldAt = new Date(Date.now() - randomInt(3, 90) * 60000);
      }

      counter.value += 1;
      const transactionNumber = `TRX-${key.replaceAll("-", "")}-${String(
        counter.value,
      ).padStart(4, "0")}`;

      const voided = random() < 0.025;

      const sale = await prisma.sale.create({
        data: {
          companyId: company.id,
          transactionNumber,
          cashierId: random() < 0.8 ? cashier.id : manager.id,
          paymentMethod: paymentMethod(),
          status: voided ? "VOIDED" : "COMPLETED",
          totalAmount,
          soldAt,
          ...(voided
            ? {
                voidedAt: new Date(soldAt.getTime() + 45 * 60000),
                voidedById: manager.id,
                voidReason: pick(VOID_REASONS),
              }
            : {}),
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              productNameSnapshot: line.product.name,
              skuSnapshot: line.product.sku,
              unitSnapshot: line.product.unit,
              quantity: line.quantity,
              sellingPriceSnapshot: line.product.sellingPrice,
              purchaseCostSnapshot: line.product.purchasePrice,
              subtotal: line.subtotal,
            })),
          },
        },
        select: { id: true, transactionNumber: true },
      });

      saleCount += 1;
      if (voided) voidedCount += 1;

      for (const line of lines) {
        const previous = stock.get(line.product.id) ?? new Prisma.Decimal(0);
        const next = previous.sub(line.quantity);
        stock.set(line.product.id, next);

        await prisma.stockMovement.create({
          data: {
            companyId: company.id,
            productId: line.product.id,
            movementType: "SALE",
            quantityDelta: line.quantity.neg(),
            previousQuantity: previous,
            newQuantity: next,
            reason: `Penjualan ${sale.transactionNumber}`,
            referenceType: "SALE",
            referenceId: sale.id,
            createdById: cashier.id,
            createdAt: soldAt,
          },
        });

        if (voided) {
          const restored = next.add(line.quantity);
          stock.set(line.product.id, restored);
          await prisma.stockMovement.create({
            data: {
              companyId: company.id,
              productId: line.product.id,
              movementType: "SALE_VOID",
              quantityDelta: line.quantity,
              previousQuantity: next,
              newQuantity: restored,
              reason: `Pembatalan ${sale.transactionNumber}`,
              referenceType: "SALE_VOID",
              referenceId: sale.id,
              createdById: manager.id,
              createdAt: new Date(soldAt.getTime() + 45 * 60000),
            },
          });
        }
      }
    }
  }

  console.log(`${saleCount} transaksi dibuat (${voidedCount} dibatalkan).`);

  const adjustments: { sku: string; target: number }[] = [
    { sku: "CB-65", target: 3 },
    { sku: "KB-RB250", target: 0 },
    { sku: "SH-340", target: 4 },
  ];

  for (const adjustment of adjustments) {
    const product = productBySku.get(adjustment.sku);
    if (!product) continue;
    const previous = stock.get(product.id) ?? new Prisma.Decimal(0);
    const next = new Prisma.Decimal(adjustment.target);
    if (previous.eq(next)) continue;

    await prisma.stockMovement.create({
      data: {
        companyId: company.id,
        productId: product.id,
        movementType: "ADJUSTMENT",
        quantityDelta: next.sub(previous),
        previousQuantity: previous,
        newQuantity: next,
        reason: "Stok opname akhir bulan",
        referenceType: "SEED",
        createdById: inventoryUser.id,
      },
    });
    stock.set(product.id, next);
  }

  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: stock.get(product.id) ?? new Prisma.Decimal(0) },
    });
  }

  const [saleTotal, itemTotal, movementTotal, lowStock] = await Promise.all([
    prisma.sale.count({ where: { companyId: company.id } }),
    prisma.saleItem.count({ where: { sale: { companyId: company.id } } }),
    prisma.stockMovement.count({ where: { companyId: company.id } }),
    prisma.product.count({
      where: {
        companyId: company.id,
        isActive: true,
        stockQuantity: { lte: prisma.product.fields.minimumStock },
      },
    }),
  ]);

  console.log("");
  console.log("Seed selesai.");
  console.log(`  Perusahaan : ${company.name}`);
  console.log(`  Pengguna   : ${DEMO_USERS.length}`);
  console.log(`  Kategori   : ${CATEGORIES.length}`);
  console.log(`  Produk     : ${products.length}`);
  console.log(`  Transaksi  : ${saleTotal} (${voidedCount} dibatalkan)`);
  console.log(`  Item       : ${itemTotal}`);
  console.log(`  Pergerakan : ${movementTotal}`);
  console.log(`  Stok kritis: ${lowStock}`);
  console.log("");
  console.log("Akun demo:");
  for (const demo of DEMO_USERS) {
    console.log(`  ${demo.role.padEnd(16)} ${demo.email} / ${demo.password}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
