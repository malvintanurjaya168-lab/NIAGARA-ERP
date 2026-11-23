import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/inventory/product-form";
import { requirePagePermission } from "@/lib/auth-guards";
import { getCategoryOptions, getProductDetail } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Ubah Produk" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePagePermission("inventory.manage");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductDetail(user.companyId, id),
    getCategoryOptions(user.companyId),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={product.sku}
        title="Ubah Produk"
        description="Perubahan harga hanya berlaku untuk transaksi berikutnya. Transaksi lama menyimpan snapshot harga."
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href={`/inventory/${product.id}`}>
              <ArrowLeft className="size-3.5" />
              Kembali
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Informasi Produk"
        description="Jumlah stok tidak dapat diubah di sini agar setiap perubahan tercatat di buku besar."
      >
        <ProductForm
          categories={categories}
          product={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            categoryId: product.category?.id ?? null,
            unit: product.unit,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stockQuantity: product.stockQuantity,
            minimumStock: product.minimumStock,
            isActive: product.isActive,
          }}
        />
      </SectionCard>
    </div>
  );
}
