"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLocale } from "@/lib/i18n";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/**
 * Generic list view: client-side search across `searchFields` + pagination.
 * Domain-specific filters (status, class, category, date range) are the
 * caller's responsibility — pass pre-filtered `data` in. Keeps this
 * component reusable across ~10 modules without a filter-config DSL.
 */
export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchFields,
  searchPlaceholder,
  pageSize = 15,
  rowHref,
  toolbar,
  emptyTitle,
  emptyDescription,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  searchFields?: (row: T) => string[];
  searchPlaceholder?: string;
  pageSize?: number;
  rowHref?: (row: T) => string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim() || !searchFields) return data;
    const needle = search.trim().toLowerCase();
    return data.filter((row) => searchFields(row).some((field) => field?.toLowerCase().includes(needle)));
  }, [data, search, searchFields]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchFields && (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder ?? t.common.search}
              className="pe-9"
            />
          </div>
        )}
        {toolbar}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle ?? t.common.noData} description={search ? t.common.noResults : emptyDescription} />
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TableRow
                    key={row.id}
                    className={href ? "cursor-pointer" : undefined}
                    onClick={href ? () => (window.location.href = href) : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} میں سے {currentPage * pageSize + 1}–{Math.min(filtered.length, (currentPage + 1) * pageSize)}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
