"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { AttendanceStatus } from "@/domain/schema/attendance";

const STATUSES: { value: AttendanceStatus; tone: string }[] = [
  { value: "present", tone: "data-[active=true]:bg-success data-[active=true]:text-white" },
  { value: "absent", tone: "data-[active=true]:bg-danger data-[active=true]:text-white" },
  { value: "leave", tone: "data-[active=true]:bg-info data-[active=true]:text-white" },
  { value: "late", tone: "data-[active=true]:bg-warning data-[active=true]:text-white" },
];

/** One row of this = one student/teacher's attendance for the day — kept to a single tap per status, no per-person dialog. */
export function AttendanceStatusPicker({ value, onChange }: { value?: AttendanceStatus; onChange: (status: AttendanceStatus) => void }) {
  const { t } = useLocale();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {STATUSES.map((s, i) => (
        <button
          key={s.value}
          type="button"
          data-active={value === s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted",
            i > 0 && "border-s border-border",
            s.tone,
          )}
        >
          {t.attendance.status[s.value]}
        </button>
      ))}
    </div>
  );
}
