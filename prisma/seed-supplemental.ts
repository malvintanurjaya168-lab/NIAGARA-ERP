import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "DATABASE_URL atau DIRECT_URL belum diatur. Isi .env sebelum menjalankan seed tambahan.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const COMPANY_NAME = "Niagara Retail Nusantara";
const TIMEZONE = "Asia/Jakarta";
const START_DAY_KEY = "2026-11-08";
const DAY_COUNT = 14;

type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "QRIS"
  | "CARD"
  | "E_WALLET";

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  initialStock: string;
  minimumStock: string;
  isActive?: boolean;
}

interface SalePlan {
  day: number;
  payment: PaymentMethod;
  cashier?: "CASHIER" | "MANAGER";
  voided?: boolean;
  items: { sku: string; quantity: string }[];
}

const PRODUCTS: SeedProduct[] = [
  { sku: "MI-GRG", name: "Mie Instan Goreng", category: "Sembako", unit: "pcs", purchasePrice: 2800, sellingPrice: 3500, initialStock: "150", minimumStock: "24" },
  { sku: "KC-MNS", name: "Kecap Manis 275ml", category: "Sembako", unit: "botol", purchasePrice: 9500, sellingPrice: 13500, initialStock: "48", minimumStock: "10" },
  { sku: "SB-SCH", name: "Sambal Sachet 20g", category: "Sembako", unit: "pcs", purchasePrice: 1500, sellingPrice: 2500, initialStock: "240", minimumStock: "40" },
  { sku: "KP-SCS", name: "Kopi Sachet Susu 20g", category: "Kopi & Teh", unit: "pcs", purchasePrice: 1800, sellingPrice: 3000, initialStock: "180", minimumStock: "30" },
  { sku: "TK-200", name: "Teh Kotak 200ml", category: "Minuman", unit: "pcs", purchasePrice: 3500, sellingPrice: 5000, initialStock: "96", minimumStock: "20" },
  { sku: "AM-1500", name: "Air Mineral 1.5L", category: "Minuman", unit: "botol", purchasePrice: 4500, sellingPrice: 7000, initialStock: "72", minimumStock: "12" },
  { sku: "RT-GDM", name: "Roti Tawar Gandum", category: "Makanan Ringan", unit: "pack", purchasePrice: 15000, sellingPrice: 21000, initialStock: "24", minimumStock: "5" },
  { sku: "KR-UDG", name: "Kerupuk Udang 100g", category: "Makanan Ringan", unit: "pack", purchasePrice: 6000, sellingPrice: 9000, initialStock: "60", minimumStock: "10" },
  { sku: "SL-REF1L", name: "Sabun Cair Refill 1L", category: "Perawatan Diri", unit: "pouch", purchasePrice: 25000, sellingPrice: 34000, initialStock: "24", minimumStock: "6" },
  { sku: "PL-800", name: "Pembersih Lantai 800ml", category: "Perlengkapan Rumah", unit: "botol", purchasePrice: 16000, sellingPrice: 23000, initialStock: "30", minimumStock: "6" },
  { sku: "TG-2PLY", name: "Tisu Gulung 2 Ply", category: "Perlengkapan Rumah", unit: "pack", purchasePrice: 12000, sellingPrice: 17000, initialStock: "36", minimumStock: "8" },
  { sku: "SD-155", name: "Sarden Kaleng 155g", category: "Sembako", unit: "kaleng", purchasePrice: 11000, sellingPrice: 15500, initialStock: "48", minimumStock: "10" },
  { sku: "SKM-370", name: "Susu Kental Manis 370g", category: "Minuman", unit: "kaleng", purchasePrice: 12000, sellingPrice: 16500, initialStock: "36", minimumStock: "8" },
  { sku: "BT-AA2", name: "Baterai AA 2pcs", category: "Perlengkapan Rumah", unit: "pack", purchasePrice: 9000, sellingPrice: 14000, initialStock: "6", minimumStock: "6" },
  { sku: "MK-10", name: "Masker Medis 10pcs", category: "Perawatan Diri", unit: "pack", purchasePrice: 8000, sellingPrice: 13000, initialStock: "48", minimumStock: "10" },
  { sku: "MD-SCH", name: "Madu Sachet 20g", category: "Sembako", unit: "pcs", purchasePrice: 2500, sellingPrice: 4000, initialStock: "120", minimumStock: "20" },
  { sku: "DK-SAPI", name: "Daging Sapi Giling", category: "Sembako", unit: "kg", purchasePrice: 120000, sellingPrice: 145000, initialStock: "18", minimumStock: "3" },
  { sku: "KP-LWK", name: "Kopi Bubuk Luwak 100g", category: "Kopi & Teh", unit: "pack", purchasePrice: 45000, sellingPrice: 65000, initialStock: "12", minimumStock: "3" },
  { sku: "TM-100", name: "Teh Melati 100g", category: "Kopi & Teh", unit: "pack", purchasePrice: 9000, sellingPrice: 14000, initialStock: "36", minimumStock: "8" },
  { sku: "BK-KLP", name: "Biskuit Kelapa 100g", category: "Makanan Ringan", unit: "pack", purchasePrice: 7000, sellingPrice: 10500, initialStock: "54", minimumStock: "10" },
  { sku: "KA-ALM", name: "Kacang Almond 100g", category: "Makanan Ringan", unit: "pack", purchasePrice: 18000, sellingPrice: 26000, initialStock: "24", minimumStock: "5" },
  { sku: "PR-INACT", name: "Plastik Kemasan 1kg", category: "Perlengkapan Rumah", unit: "pack", purchasePrice: 12000, sellingPrice: 18000, initialStock: "20", minimumStock: "5", isActive: false },
];

const SALES: SalePlan[] = [
  { day: 0, payment: "CASH", items: [{ sku: "MI-GRG", quantity: "3" }, { sku: "KP-SCS", quantity: "2" }, { sku: "AM-1500", quantity: "1" }] },
  { day: 0, payment: "QRIS", items: [{ sku: "SB-SCH", quantity: "6" }, { sku: "MD-SCH", quantity: "4" }] },
  { day: 1, payment: "BANK_TRANSFER", voided: true, items: [{ sku: "KC-MNS", quantity: "1" }, { sku: "SD-155", quantity: "2" }, { sku: "MI-GRG", quantity: "2" }] },
  { day: 1, payment: "CASH", items: [{ sku: "TK-200", quantity: "2" }, { sku: "KR-UDG", quantity: "1" }] },
  { day: 2, payment: "E_WALLET", items: [{ sku: "RT-GDM", quantity: "1" }, { sku: "SKM-370", quantity: "1" }] },
  { day: 2, payment: "QRIS", items: [{ sku: "MI-GRG", quantity: "4" }, { sku: "SB-SCH", quantity: "8" }] },
  { day: 2, payment: "CARD", items: [{ sku: "KP-LWK", quantity: "1" }, { sku: "TM-100", quantity: "1" }] },
  { day: 3, payment: "CASH", items: [{ sku: "AM-1500", quantity: "2" }, { sku: "MI-GRG", quantity: "3" }] },
  { day: 3, payment: "QRIS", voided: true, items: [{ sku: "DK-SAPI", quantity: "0.5" }, { sku: "SB-SCH", quantity: "4" }] },
  { day: 4, payment: "BANK_TRANSFER", items: [{ sku: "PL-800", quantity: "1" }, { sku: "TG-2PLY", quantity: "1" }] },
  { day: 4, payment: "CASH", items: [{ sku: "BK-KLP", quantity: "2" }, { sku: "MD-SCH", quantity: "4" }] },
  { day: 5, payment: "E_WALLET", items: [{ sku: "MI-GRG", quantity: "2" }, { sku: "TK-200", quantity: "1" }, { sku: "BT-AA2", quantity: "6" }] },
  { day: 5, payment: "QRIS", items: [{ sku: "KA-ALM", quantity: "1" }, { sku: "KP-LWK", quantity: "1" }] },
  { day: 6, payment: "CASH", items: [{ sku: "KC-MNS", quantity: "2" }, { sku: "SD-155", quantity: "1" }] },
  { day: 6, payment: "CARD", items: [{ sku: "SL-REF1L", quantity: "1" }, { sku: "MK-10", quantity: "1" }] },
  { day: 7, payment: "BANK_TRANSFER", voided: true, items: [{ sku: "MI-GRG", quantity: "5" }, { sku: "KP-SCS", quantity: "3" }] },
  { day: 7, payment: "QRIS", items: [{ sku: "RT-GDM", quantity: "1" }, { sku: "SKM-370", quantity: "1" }, { sku: "BK-KLP", quantity: "2" }] },
  { day: 8, payment: "CASH", items: [{ sku: "DK-SAPI", quantity: "0.75" }, { sku: "SB-SCH", quantity: "6" }] },
  { day: 8, payment: "E_WALLET", items: [{ sku: "AM-1500", quantity: "1" }, { sku: "TM-100", quantity: "1" }] },
  { day: 9, payment: "QRIS", items: [{ sku: "MI-GRG", quantity: "3" }, { sku: "MD-SCH", quantity: "4" }] },
  { day: 9, payment: "CASH", voided: true, items: [{ sku: "PL-800", quantity: "1" }, { sku: "TG-2PLY", quantity: "1" }] },
  { day: 10, payment: "BANK_TRANSFER", items: [{ sku: "KP-LWK", quantity: "1" }, { sku: "KA-ALM", quantity: "1" }] },
  { day: 10, payment: "CARD", items: [{ sku: "SL-REF1L", quantity: "1" }, { sku: "MK-10", quantity: "1" }] },
  { day: 11, payment: "CASH", items: [{ sku: "MI-GRG", quantity: "4" }, { sku: "SB-SCH", quantity: "10" }] },
  { day: 11, payment: "QRIS", items: [{ sku: "TK-200", quantity: "2" }, { sku: "KR-UDG", quantity: "1" }] },
  { day: 12, payment: "E_WALLET", cashier: "MANAGER", items: [{ sku: "DK-SAPI", quantity: "1.25" }, { sku: "KC-MNS", quantity: "1" }] },
  { day: 12, payment: "CASH", voided: true, items: [{ sku: "RT-GDM", quantity: "1" }, { sku: "BK-KLP", quantity: "1" }] },
  { day: 13, payment: "BANK_TRANSFER", items: [{ sku: "MI-GRG", quantity: "3" }, { sku: "KP-SCS", quantity: "2" }] },
  { day: 13, payment: "QRIS", items: [{ sku: "AM-1500", quantity: "2" }, { sku: "MD-SCH", quantity: "4" }] },
  { day: 13, payment: "CASH", cashier: "MANAGER", items: [{ sku: "SD-155", quantity: "1" }, { sku: "SKM-370", quantity: "1" }] },
];

const VOID_REASONS = [
  "Pelanggan membatalkan pesanan",
  "Salah input metode pembayaran",
  "Terjadi kesalahan harga",
  "Item tidak tersedia saat pengemasan",
];

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function jakartaStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0));
}

function atJakartaTime(key: string, hour: number, minute: number): Date {
  return new Date(jakartaStart(key).getTime() + (hour * 60 + minute) * 60000);
}

function dayKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildPlans() {
  const dayKeys = Array.from({ length: DAY_COUNT }, (_, index) =>
    addDaysKey(START_DAY_KEY, index),
  );
  const counters = new Map<string, number>();

  return SALES.map((plan) => {
    const dayKey = dayKeys[plan.day];
    if (!dayKey) throw new Error(`Hari rencana tidak valid: ${plan.day}`);

    const sequence = (counters.get(dayKey) ?? 0) + 1;
    counters.set(dayKey, sequence);

    const slot = sequence - 1;
    const hour = 9 + slot * 3 + (plan.day % 2);
    const minute = (plan.day * 7 + slot * 13 + 5) % 60;
    const soldAt = atJakartaTime(dayKey, hour, minute);
    const transactionNumber = `TRX-${dayKey.replaceAll("-", "")}-9${String(
      sequence,
    ).padStart(3, "0")}`;

    return {
      ...plan,
      dayKey,
      soldAt,
      transactionNumber,
      voidedAt: plan.voided
        ? new Date(soldAt.getTime() + 45 * 60000)
        : null,
    };
  });
}

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: COMPANY_NAME },
    select: { id: true, name: true },
  });

  if (!company) {
    throw new Error(
      `Perusahaan demo "${COMPANY_NAME}" tidak ditemukan. Jalankan seed utama terlebih dahulu.`,
    );
  }

  const warehouse =
    (await prisma.warehouse.findFirst({
      where: { companyId: company.id, isDefault: true, isActive: true },
      select: { id: true },
    })) ??
    (await prisma.warehouse.create({
      data: {
        companyId: company.id,
        code: "DEFAULT",
        name: "Gudang Utama",
        isActive: true,
        isDefault: true,
      },
      select: { id: true },
    }));

  const plans = buildPlans();
  const skus = PRODUCTS.map((product) => product.sku);
  const transactionNumbers = plans.map((plan) => plan.transactionNumber);

  const [existingProducts, existingSales] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id, sku: { in: skus } },
      select: { sku: true },
    }),
    prisma.sale.findMany({
      where: {
        companyId: company.id,
        transactionNumber: { in: transactionNumbers },
      },
      select: { transactionNumber: true },
    }),
  ]);

  if (existingProducts.length > 0 || existingSales.length > 0) {
    console.log("Seed tambahan sudah pernah diterapkan. Tidak ada data baru.");
    console.log(
      `  Produk tambahan ditemukan : ${existingProducts.length}/${skus.length}`,
    );
    console.log(
      `  Transaksi tambahan ditemukan: ${existingSales.length}/${transactionNumbers.length}`,
    );
    return;
  }

  const users = await prisma.user.findMany({
    where: { companyId: company.id, isActive: true },
    select: { id: true, role: true, fullName: true },
  });
  const userByRole = new Map(users.map((user) => [user.role, user]));

  const inventoryUser = userByRole.get("INVENTORY_STAFF");
  const cashier = userByRole.get("CASHIER");
  const manager = userByRole.get("MANAGER");

  if (!inventoryUser || !cashier || !manager) {
    throw new Error(
      "Pengguna INVENTORY_STAFF, CASHIER, dan MANAGER aktif wajib tersedia.",
    );
  }

  const categories = await prisma.category.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
  });
  const categoryByName = new Map(
    categories.map((category) => [category.name, category.id]),
  );

  for (const product of PRODUCTS) {
    if (!categoryByName.has(product.category)) {
      throw new Error(
        `Kategori "${product.category}" tidak ditemukan untuk produk ${product.sku}.`,
      );
    }
  }

  const before = await getCounts(company.id);
  const existingStockBefore = await prisma.product.findMany({
    where: { companyId: company.id, sku: { notIn: skus } },
    select: { id: true, sku: true, stockQuantity: true },
  });

  const summary = await prisma.$transaction(
    async (tx) => {
      const runtimeProducts = new Map<
        string,
        {
          id: string;
          sku: string;
          name: string;
          unit: string;
          purchasePrice: Prisma.Decimal;
          sellingPrice: Prisma.Decimal;
        }
      >();
      const stock = new Map<string, Prisma.Decimal>();
      const initialMovementAt = atJakartaTime(
        addDaysKey(START_DAY_KEY, -1),
        9,
        0,
      );

      for (const product of PRODUCTS) {
        const categoryId = categoryByName.get(product.category);
        if (!categoryId) throw new Error(`Kategori hilang: ${product.category}`);

        const initialStock = new Prisma.Decimal(product.initialStock);
        const created = await tx.product.create({
          data: {
            companyId: company.id,
            categoryId,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            purchasePrice: new Prisma.Decimal(product.purchasePrice),
            sellingPrice: new Prisma.Decimal(product.sellingPrice),
            stockQuantity: initialStock,
            minimumStock: new Prisma.Decimal(product.minimumStock),
            isActive: product.isActive ?? true,
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

        runtimeProducts.set(created.sku, created);
        stock.set(created.id, initialStock);

        await tx.productStock.create({
          data: {
            companyId: company.id,
            productId: created.id,
            warehouseId: warehouse.id,
            quantity: initialStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId: company.id,
            productId: created.id,
            movementType: "STOCK_IN",
            quantityDelta: initialStock,
            previousQuantity: new Prisma.Decimal(0),
            newQuantity: initialStock,
            reason: "Stok awal data demonstrasi tambahan",
            referenceType: "SEED_SUPPLEMENTAL",
            referenceId: created.id,
            warehouseId: warehouse.id,
            createdById: inventoryUser.id,
            createdAt: initialMovementAt,
          },
        });
      }

      let saleCount = 0;
      let saleItemCount = 0;
      let voidedCount = 0;

      for (const plan of plans) {
        const lines = plan.items.map((item) => {
          const product = runtimeProducts.get(item.sku);
          if (!product) throw new Error(`Produk rencana tidak ditemukan: ${item.sku}`);
          const quantity = new Prisma.Decimal(item.quantity);
          const subtotal = product.sellingPrice.mul(quantity);
          return { product, quantity, subtotal };
        });

        const totalAmount = lines.reduce(
          (sum, line) => sum.add(line.subtotal),
          new Prisma.Decimal(0),
        );

        const saleCashier =
          plan.cashier === "MANAGER" ? manager : cashier;

        const sale = await tx.sale.create({
          data: {
            companyId: company.id,
            transactionNumber: plan.transactionNumber,
            cashierId: saleCashier.id,
            paymentMethod: plan.payment,
            status: plan.voided ? "VOIDED" : "COMPLETED",
            totalAmount,
            soldAt: plan.soldAt,
            createdAt: plan.soldAt,
            warehouseId: warehouse.id,
            ...(plan.voided
              ? {
                  voidedAt: plan.voidedAt,
                  voidedById: manager.id,
                  voidReason:
                    VOID_REASONS[saleCount % VOID_REASONS.length],
                }
              : {}),
            clientRequestId: `supplemental-${plan.transactionNumber}`,
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
                createdAt: plan.soldAt,
              })),
            },
          },
          select: { id: true, transactionNumber: true },
        });

        saleCount += 1;
        saleItemCount += lines.length;
        if (plan.voided) voidedCount += 1;

        for (const line of lines) {
          const previous = stock.get(line.product.id);
          if (!previous) {
            throw new Error(`Saldo stok hilang untuk ${line.product.sku}.`);
          }

          const next = previous.sub(line.quantity);
          if (next.lt(0)) {
            throw new Error(
              `Stok ${line.product.sku} tidak cukup: ${previous.toString()} - ${line.quantity.toString()}.`,
            );
          }
          stock.set(line.product.id, next);

          await tx.stockMovement.create({
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
              warehouseId: warehouse.id,
              createdById: saleCashier.id,
              createdAt: plan.soldAt,
            },
          });

          if (plan.voided) {
            const voidedAt = plan.voidedAt;
            if (!voidedAt) {
              throw new Error(
                `Waktu pembatalan hilang untuk ${sale.transactionNumber}.`,
              );
            }

            const restored = next.add(line.quantity);
            stock.set(line.product.id, restored);
            await tx.stockMovement.create({
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
                warehouseId: warehouse.id,
                createdById: manager.id,
                createdAt: voidedAt,
              },
            });
          }
        }
      }

      const stockOutProduct = runtimeProducts.get("PL-800");
      if (stockOutProduct) {
        const previous = stock.get(stockOutProduct.id);
        if (!previous) throw new Error("Saldo PL-800 tidak ditemukan.");
        const quantity = new Prisma.Decimal(2);
        const next = previous.sub(quantity);
        if (next.lt(0)) throw new Error("Stok PL-800 tidak cukup untuk STOCK_OUT.");
        stock.set(stockOutProduct.id, next);

        await tx.stockMovement.create({
          data: {
            companyId: company.id,
            productId: stockOutProduct.id,
            movementType: "STOCK_OUT",
            quantityDelta: quantity.neg(),
            previousQuantity: previous,
            newQuantity: next,
            reason: "Barang rusak saat penyimpanan",
            referenceType: "SEED_SUPPLEMENTAL",
            referenceId: stockOutProduct.id,
            warehouseId: warehouse.id,
            createdById: inventoryUser.id,
            createdAt: atJakartaTime("2026-11-20", 17, 0),
          },
        });
      }

      const adjustmentProduct = runtimeProducts.get("KP-LWK");
      if (adjustmentProduct) {
        const previous = stock.get(adjustmentProduct.id);
        if (!previous) throw new Error("Saldo KP-LWK tidak ditemukan.");
        const next = new Prisma.Decimal(2);
        stock.set(adjustmentProduct.id, next);

        await tx.stockMovement.create({
          data: {
            companyId: company.id,
            productId: adjustmentProduct.id,
            movementType: "ADJUSTMENT",
            quantityDelta: next.sub(previous),
            previousQuantity: previous,
            newQuantity: next,
            reason: "Stok opname: selisih hitung persediaan",
            referenceType: "SEED_SUPPLEMENTAL",
            referenceId: adjustmentProduct.id,
            warehouseId: warehouse.id,
            createdById: inventoryUser.id,
            createdAt: atJakartaTime("2026-11-21", 18, 0),
          },
        });
      }

      for (const product of runtimeProducts.values()) {
        const finalStock =
          stock.get(product.id) ?? new Prisma.Decimal(0);
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: finalStock },
        });
        await tx.productStock.updateMany({
          where: {
            companyId: company.id,
            productId: product.id,
            warehouseId: warehouse.id,
          },
          data: { quantity: finalStock },
        });
      }

      return {
        products: runtimeProducts.size,
        sales: saleCount,
        saleItems: saleItemCount,
        voided: voidedCount,
      };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  const after = await getCounts(company.id);
  const existingStockAfter = await prisma.product.findMany({
    where: { companyId: company.id, sku: { notIn: skus } },
    select: { id: true, sku: true, stockQuantity: true },
  });

  const existingStockBeforeById = new Map(
    existingStockBefore.map((product) => [
      product.id,
      product.stockQuantity.toString(),
    ]),
  );
  const changedExisting = existingStockAfter.filter(
    (product) =>
      existingStockBeforeById.get(product.id) !== product.stockQuantity.toString(),
  );

  const verification = await verifySupplementalData(
    company.id,
    skus,
    transactionNumbers,
  );

  console.log("Seed tambahan selesai.");
  console.log(`  Perusahaan          : ${company.name}`);
  console.log(`  Produk baru         : ${summary.products}`);
  console.log(`  Transaksi baru      : ${summary.sales} (${summary.voided} void)`);
  console.log(`  Item transaksi baru : ${summary.saleItems}`);
  console.log("");
  console.log("Perubahan jumlah record:");
  for (const key of Object.keys(after) as (keyof typeof after)[]) {
    const delta = after[key] - before[key];
    console.log(
      `  ${key.padEnd(16)} ${String(before[key]).padStart(6)} -> ${String(
        after[key],
      ).padStart(6)} (${delta >= 0 ? "+" : ""}${delta})`,
    );
  }
  console.log(`  Stok produk lama berubah: ${changedExisting.length}`);
  console.log("");
  console.log("Verifikasi:");
  for (const [label, value] of Object.entries(verification)) {
    console.log(`  ${label.padEnd(34)} ${value}`);
  }

  if (changedExisting.length > 0) {
    console.error(
      "PERINGATAN: stok produk lama berubah:",
      changedExisting.map((product) => product.sku).join(", "),
    );
    process.exitCode = 1;
  }
}

async function getCounts(companyId: string) {
  const [users, categories, products, sales, saleItems, stockMovements] =
    await Promise.all([
      prisma.user.count({ where: { companyId } }),
      prisma.category.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.sale.count({ where: { companyId } }),
      prisma.saleItem.count({ where: { sale: { companyId } } }),
      prisma.stockMovement.count({ where: { companyId } }),
    ]);

  return { users, categories, products, sales, saleItems, stockMovements };
}

async function verifySupplementalData(
  companyId: string,
  skus: string[],
  transactionNumbers: string[],
) {
  const products = await prisma.product.findMany({
    where: { companyId, sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      stockQuantity: true,
      minimumStock: true,
      isActive: true,
    },
  });

  const sales = await prisma.sale.findMany({
    where: { companyId, transactionNumber: { in: transactionNumbers } },
    select: {
      id: true,
      transactionNumber: true,
      status: true,
      paymentMethod: true,
      totalAmount: true,
      voidedAt: true,
      voidedById: true,
      voidReason: true,
      items: { select: { subtotal: true } },
    },
  });

  const movements = await prisma.stockMovement.findMany({
    where: { companyId, productId: { in: products.map((product) => product.id) } },
    select: {
      productId: true,
      movementType: true,
      quantityDelta: true,
      previousQuantity: true,
      newQuantity: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const movementsByProduct = new Map<
    string,
    typeof movements
  >();
  for (const movement of movements) {
    const list = movementsByProduct.get(movement.productId) ?? [];
    list.push(movement);
    movementsByProduct.set(movement.productId, list);
  }

  let stockMismatches = 0;
  let ledgerMismatches = 0;
  for (const product of products) {
    const productMovements = movementsByProduct.get(product.id) ?? [];
    let running = new Prisma.Decimal(0);
    let ledgerOk = productMovements.length > 0;

    for (const movement of productMovements) {
      if (!movement.previousQuantity.eq(running)) ledgerOk = false;
      const next = running.add(movement.quantityDelta);
      if (!next.eq(movement.newQuantity)) ledgerOk = false;
      running = next;
    }

    if (!ledgerOk || !running.eq(product.stockQuantity)) {
      ledgerMismatches += 1;
    }
    if (
      !productMovements.length ||
      !productMovements[productMovements.length - 1].newQuantity.eq(
        product.stockQuantity,
      )
    ) {
      stockMismatches += 1;
    }
  }

  const saleTotalMismatches = sales.filter((sale) => {
    const total = sale.items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );
    return !total.eq(sale.totalAmount);
  }).length;

  const voided = sales.filter((sale) => sale.status === "VOIDED");
  const completed = sales.filter((sale) => sale.status === "COMPLETED");
  const paymentMethods = [
    ...new Set(sales.map((sale) => sale.paymentMethod)),
  ].sort();
  const movementTypes = [
    ...new Set(movements.map((movement) => movement.movementType)),
  ].sort();
  const negativeStock = products.filter((product) =>
    product.stockQuantity.lt(0),
  ).length;
  const lowStock = products.filter(
    (product) =>
      product.isActive &&
      product.stockQuantity.gt(0) &&
      product.stockQuantity.lte(product.minimumStock),
  ).length;
  const outOfStock = products.filter(
    (product) => product.isActive && product.stockQuantity.lte(0),
  ).length;
  const inactive = products.filter((product) => !product.isActive).length;
  const voidedIncomplete = voided.filter(
    (sale) => !sale.voidedAt || !sale.voidedById || !sale.voidReason,
  ).length;

  return {
    "produk tambahan": `${products.length}/${skus.length}`,
    "transaksi tambahan": `${sales.length}/${transactionNumbers.length}`,
    "transaksi selesai": completed.length,
    "transaksi dibatalkan": voided.length,
    "void tanpa metadata": voidedIncomplete,
    "metode pembayaran": paymentMethods.join(", "),
    "jenis pergerakan": movementTypes.join(", "),
    "stok negatif": negativeStock,
    "stok menipis": lowStock,
    "stok habis": outOfStock,
    "produk nonaktif": inactive,
    "saldo vs ledger": ledgerMismatches === 0 ? "OK" : `${ledgerMismatches} salah`,
    "stok vs pergerakan terakhir":
      stockMismatches === 0 ? "OK" : `${stockMismatches} salah`,
    "total sale vs item":
      saleTotalMismatches === 0 ? "OK" : `${saleTotalMismatches} salah`,
    "tanggal data": `${dayKeyOf(plansStart())} s/d ${dayKeyOf(plansEnd())}`,
  };
}

function plansStart(): Date {
  return atJakartaTime(START_DAY_KEY, 0, 0);
}

function plansEnd(): Date {
  return atJakartaTime(addDaysKey(START_DAY_KEY, DAY_COUNT - 1), 23, 59);
}

main()
  .catch((error) => {
    console.error("Seed tambahan gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
