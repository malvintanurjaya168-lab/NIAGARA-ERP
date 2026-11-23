"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/inventory";
import type { CategoryRow } from "@/lib/queries/inventory";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          Kategori Baru
        </Button>
      </div>

      <SectionCard
        title="Daftar Kategori"
        description={`${categories.length} kategori terdaftar untuk perusahaan Anda.`}
      >
        {categories.length === 0 ? (
          <EmptyState
            icon={<Tags className="size-5" />}
            title="Belum ada kategori"
            description="Kategori membantu Anda mengelompokkan produk dan memfilter inventaris."
            action={
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="size-3.5" />
                Kategori Baru
              </Button>
            }
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12.5px] font-medium">
                      {category.name}
                    </p>
                    {!category.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-[9px] text-muted-foreground"
                      >
                        Nonaktif
                      </Badge>
                    ) : null}
                  </div>
                  {category.description ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                    {category.productCount} produk
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    onClick={() => openEdit(category)}
                    aria-label={`Ubah kategori ${category.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <DeleteCategoryButton category={category} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CategoryFormDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        category={editing}
      />
    </>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    category ? updateCategoryAction : createCategoryAction,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Kategori disimpan.",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{category ? "Ubah Kategori" : "Kategori Baru"}</DialogTitle>
          <DialogDescription>
            Kelompokkan produk agar lebih mudah dicari dan difilter.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {category ? (
            <input type="hidden" name="categoryId" value={category.id} />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nama Kategori</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={category?.name}
              placeholder="Contoh: Minuman"
              maxLength={80}
              required
              aria-invalid={Boolean(errors?.name)}
            />
            <FieldError messages={errors?.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description">Deskripsi (opsional)</Label>
            <Textarea
              id="category-description"
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder="Keterangan singkat kategori"
              maxLength={500}
              rows={3}
            />
            <FieldError messages={errors?.description} />
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={category?.isActive ?? true}
              className="size-3.5 accent-primary"
            />
            Kategori aktif
          </label>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              {category ? "Simpan Perubahan" : "Tambah Kategori"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryButton({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    deleteCategoryAction,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Kategori dihapus.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={`Hapus kategori ${category.name}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus kategori “{category.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {category.productCount > 0
              ? `Kategori ini masih digunakan oleh ${category.productCount} produk. Pindahkan produk tersebut terlebih dahulu.`
              : "Tindakan ini permanen dan tidak dapat dibatalkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <SubmitButton
              size="sm"
              variant="destructive"
              pendingText="Menghapus…"
              disabled={category.productCount > 0}
            >
              Hapus Kategori
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
