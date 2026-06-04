"use client";

import { useMemo } from "react";
import { categoryMastery } from "@/lib/stats/aggregate";
import { categoryLabel } from "@/lib/words/categories";
import { wordCategoryMap } from "@/lib/stats/categoryMap";
import type { Progress } from "@/types";

export function CategoryMasteryList({
  progressRows,
}: {
  progressRows: Progress[];
}) {
  const rows = useMemo(
    () => categoryMastery(progressRows, wordCategoryMap, categoryLabel),
    [progressRows],
  );

  if (rows.length === 0) {
    return (
      <p className="py-2 text-sm text-ink-soft">
        아직 학습한 카테고리가 없어요. 학습을 시작하면 분야별 숙련도가 쌓여요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const percent = Math.round(row.ratio * 100);
        return (
          <li key={row.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="text-xs text-ink-soft">
                졸업 {row.graduated}/{row.studied} · {percent}%
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${row.label} 숙련도 ${percent}%`}
            >
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
