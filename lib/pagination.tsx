import Link from "next/link";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type PaginationInput = {
  page?: unknown;
  pageSize?: unknown;
};

export type Pagination = {
  page: number;
  pageSize: number;
  offset: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePagination(input: PaginationInput = {}): Pagination {
  const requestedPage = positiveInteger(input.page);
  const requestedSize = positiveInteger(input.pageSize);
  const pageSize = requestedSize && PAGE_SIZE_OPTIONS.includes(requestedSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? Math.min(requestedSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const page = requestedPage ?? 1;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

type PaginationControlsProps = {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  query?: Record<string, string | undefined>;
};

function href(pathname: string, query: Record<string, string | undefined>, page: number, pageSize: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${pathname}?${params.toString()}`;
}

export function PaginationControls({ pathname, page, pageSize, total, query = {} }: PaginationControlsProps) {
  if (total <= pageSize && pageSize === DEFAULT_PAGE_SIZE) return null;
  const pages = pageCount(total, pageSize);
  const currentPage = Math.min(page, pages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm text-bodytext sm:flex-row sm:items-center sm:justify-between">
      <span>แสดง {from.toLocaleString("th-TH")}–{to.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} รายการ</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1">แสดงต่อหน้า</span>
        {PAGE_SIZE_OPTIONS.map((size) => (
          <Link key={size} className={`rounded border px-2.5 py-1 ${size === pageSize ? "border-primary bg-lightprimary font-semibold text-primary" : "border-border hover:border-primary"}`} href={href(pathname, query, 1, size)}>
            {size}
          </Link>
        ))}
        <Link aria-disabled={currentPage <= 1} className={`rounded border px-3 py-1 ${currentPage <= 1 ? "pointer-events-none opacity-50" : "border-border hover:border-primary"}`} href={href(pathname, query, currentPage - 1, pageSize)}>ก่อนหน้า</Link>
        <span className="px-1">หน้า {currentPage} / {pages}</span>
        <Link aria-disabled={currentPage >= pages} className={`rounded border px-3 py-1 ${currentPage >= pages ? "pointer-events-none opacity-50" : "border-border hover:border-primary"}`} href={href(pathname, query, currentPage + 1, pageSize)}>ถัดไป</Link>
      </div>
    </div>
  );
}
