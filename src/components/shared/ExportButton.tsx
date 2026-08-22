"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { exportToCsv } from "@/lib/csv";

export function ExportButton({ filename, rows }: { filename: string; rows: Record<string, string | number>[] }) {
  const { t } = useLocale();
  return (
    <Button variant="outline" size="sm" onClick={() => exportToCsv(filename, rows)} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      {t.common.export}
    </Button>
  );
}
