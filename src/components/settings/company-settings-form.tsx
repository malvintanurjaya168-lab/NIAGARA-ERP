"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { updateCompanyAction } from "@/lib/actions/settings";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { CompanySettings } from "@/lib/queries/settings";
import type { ActionResult } from "@/lib/errors";

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(2026, index, 1),
  ),
}));

export function CompanySettingsForm({ company }: { company: CompanySettings }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    updateCompanyAction,
    undefined,
  );

  useActionFeedback(state, { successMessage: "Pengaturan disimpan." });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-name">Nama Perusahaan</Label>
          <Input
            id="company-name"
            name="name"
            defaultValue={company.name}
            maxLength={120}
            required
            aria-invalid={Boolean(errors?.name)}
          />
          <FieldError messages={errors?.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-businessType">Jenis Usaha</Label>
          <Input
            id="company-businessType"
            name="businessType"
            defaultValue={company.businessType ?? ""}
            placeholder="Contoh: Retail, F&B, Distribusi"
            maxLength={80}
          />
          <FieldError messages={errors?.businessType} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-phone">Nomor Telepon</Label>
          <Input
            id="company-phone"
            name="phone"
            defaultValue={company.phone ?? ""}
            placeholder="08xx xxxx xxxx"
            maxLength={40}
          />
          <FieldError messages={errors?.phone} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-contactEmail">Email Kontak</Label>
          <Input
            id="company-contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={company.contactEmail ?? ""}
            placeholder="halo@perusahaan.com"
            maxLength={160}
            aria-invalid={Boolean(errors?.contactEmail)}
          />
          <FieldError messages={errors?.contactEmail} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="company-address">Alamat</Label>
          <Textarea
            id="company-address"
            name="address"
            defaultValue={company.address ?? ""}
            placeholder="Alamat lengkap perusahaan"
            rows={3}
            maxLength={300}
          />
          <FieldError messages={errors?.address} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fiscalYearStartMonth">Awal Tahun Fiskal</Label>
          <Select
            name="fiscalYearStartMonth"
            defaultValue={String(company.fiscalYearStartMonth)}
          >
            <SelectTrigger id="fiscalYearStartMonth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10.5px] text-muted-foreground">
            Digunakan pada preset “Tahun Fiskal” di laporan.
          </p>
          <FieldError messages={errors?.fiscalYearStartMonth} />
        </div>

        <div className="space-y-1.5">
          <Label>Mata Uang & Zona Waktu</Label>
          <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-[12px] text-muted-foreground">
            {company.currency} · {company.timezone}
          </div>
          <p className="text-[10.5px] text-muted-foreground">
            IDR dan Asia/Jakarta ditetapkan untuk Phase 1.
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-border/70 pt-4">
        <SubmitButton size="sm" pendingText="Menyimpan…">
          Simpan Pengaturan
        </SubmitButton>
      </div>
    </form>
  );
}
