"use client";

import { useMemo } from "react";
import { studyCalendar } from "@/lib/stats/aggregate";
import type { StudySession } from "@/types";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function intensityClass(words: number): string {
  if (words <= 0) return "bg-surface-muted";
  if (words < 6) return "bg-brand/30";
  if (words < 12) return "bg-brand/60";
  return "bg-brand";
}

export function StudyCalendar({ sessions }: { sessions: StudySession[] }) {
  const cells = useMemo(() => studyCalendar(sessions, undefined, 70), [sessions]);
  const leadPad = useMemo(() => {
    if (cells.length === 0) return 0;
    return new Date(`${cells[0].date}T00:00:00`).getDay();
  }, [cells]);
  const studiedDays = cells.filter((c) => c.studied).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">학습 캘린더</p>
        <p className="text-xs text-ink-soft">최근 10주 · {studiedDays}일 학습</p>
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-1 pr-0.5 text-[10px] leading-none text-ink-soft">
          {WEEKDAY.map((d, i) => (
            <span key={d} className="flex h-3.5 items-center">
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={`최근 10주 동안 ${studiedDays}일 학습했어요`}
        >
          {Array.from({ length: leadPad }).map((_, i) => (
            <span key={`pad-${i}`} className="h-3.5 w-3.5" />
          ))}
          {cells.map((cell) => (
            <span
              key={cell.date}
              className={`h-3.5 w-3.5 rounded-[3px] ${intensityClass(cell.words)}`}
              title={`${cell.date} · ${cell.words}단어`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-soft">
        <span>적음</span>
        <span className="h-3 w-3 rounded-[3px] bg-surface-muted" />
        <span className="h-3 w-3 rounded-[3px] bg-brand/30" />
        <span className="h-3 w-3 rounded-[3px] bg-brand/60" />
        <span className="h-3 w-3 rounded-[3px] bg-brand" />
        <span>많음</span>
      </div>
    </div>
  );
}
