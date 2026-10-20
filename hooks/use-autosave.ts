"use client";

import { useEffect } from "react";

import { listAlgorithms, saveAlgorithm } from "@/lib/storage/indexeddb";
import { useStudioStore } from "@/store/studio-store";

export function useAutosave(): void {
  const source = useStudioStore((s) => s.source);
  const currentId = useStudioStore((s) => s.currentId);
  const currentName = useStudioStore((s) => s.currentName);
  const dirty = useStudioStore((s) => s.dirty);

  useEffect(() => {
    if (!currentId || !dirty) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const existing = useStudioStore.getState().algorithms.find((item) => item.id === currentId);
      void saveAlgorithm({
        id: currentId,
        name: currentName,
        source,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }).then(async () => {
        useStudioStore.getState().setDirty(false);
        useStudioStore.getState().setAlgorithms(await listAlgorithms());
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [source, currentId, currentName, dirty]);
}

export async function refreshAlgorithms(): Promise<void> {
  useStudioStore.getState().setAlgorithms(await listAlgorithms());
}
