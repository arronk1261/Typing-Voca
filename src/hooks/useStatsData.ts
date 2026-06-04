"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadStatsData } from "@/lib/sync/userData";
import { readLocalSessions } from "@/lib/sync/localStats";
import { useUserStore } from "@/stores/userStore";
import type { Progress, StudySession } from "@/types";

export interface StatsData {
  loading: boolean;
  sessions: StudySession[];
  progressRows: Progress[];
}

export function useStatsData(): StatsData {
  const { loading: authLoading, user } = useAuth();
  const configured = useUserStore((s) => s.configured);
  const userId = useUserStore((s) => s.userId);
  const hydrated = useUserStore((s) => s.hydrated);
  const progress = useUserStore((s) => s.progress);
  const hydrate = useUserStore((s) => s.hydrate);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [progressRows, setProgressRows] = useState<Progress[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!hydrated) {
      void hydrate(user?.id ?? null);
      return;
    }
    let active = true;

    async function load() {
      if (configured && userId) {
        const data = await loadStatsData(userId);
        if (!active) return;
        setSessions(data.sessions);
        setProgressRows(data.progress);
      } else {
        if (!active) return;
        setSessions(readLocalSessions());
        setProgressRows(Object.values(progress));
      }
      if (active) setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [authLoading, hydrated, configured, userId, progress, hydrate, user?.id]);

  return { loading, sessions, progressRows };
}
