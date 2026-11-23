import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CategoryManager } from "@/components/inventory/category-manager";
import { requirePagePermission } from "@/lib/auth-guards";
import { getCategories } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Kategori Produk" };

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await requirePagePermission("inventory.manage");
  const categories = await getCategories(user.companyId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inventaris"
        title="Kategori Produk"
        description="Atur pengelompokan produk. Kategori yang masih digunakan tidak dapat dihapus."
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/inventory">
              <ArrowLeft className="size-3.5" />
              Kembali
            </Link>
          </Button>
        }
      />
      <CategoryManager categories={categories} />
    </div>
  );
}
