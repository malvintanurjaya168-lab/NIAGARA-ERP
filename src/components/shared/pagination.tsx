import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}

function pageWindow(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(value);
  });
  return result;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  buildHref,
}: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = pageWindow(page, pageCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-muted-foreground">
        Menampilkan{" "}
        <span className="font-medium text-foreground">
          {start}–{end}
        </span>{" "}
        dari <span className="font-medium text-foreground">{total}</span> data
      </p>

      <nav className="flex items-center gap-1" aria-label="Navigasi halaman">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            aria-label="Halaman sebelumnya"
            className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground/35">
            <ChevronLeft className="size-4" />
          </span>
        )}

        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="grid size-8 place-items-center text-[12px] text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "grid size-8 place-items-center rounded-lg border text-[12px] font-medium transition-colors",
                item === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {item}
            </Link>
          ),
        )}

        {page < pageCount ? (
          <Link
            href={buildHref(page + 1)}
            aria-label="Halaman berikutnya"
            className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground/35">
            <ChevronRight className="size-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
