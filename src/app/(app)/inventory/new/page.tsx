import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/inventory/product-form";
import { requirePagePermission } from "@/lib/auth-guards";
import { getCategoryOptions } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Tambah Produk" };

export default async function NewProductPage() {
  const user = await requirePagePermission("inventory.manage");
  const categories = await getCategoryOptions(user.companyId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inventaris"
        title="Tambah Produk"
        description="Lengkapi data produk. SKU harus unik di dalam perusahaan Anda."
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/inventory">
              <ArrowLeft className="size-3.5" />
              Kembali
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Informasi Produk"
        description="Harga beli digunakan untuk menghitung HPP dan laba kotor."
      >
        <ProductForm categories={categories} />
      </SectionCard>
    </div>
  );
}
