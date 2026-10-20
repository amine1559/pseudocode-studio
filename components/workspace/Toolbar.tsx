"use client";

import { Bug, Play, RotateCcw, Save, Square, StepForward, Sun, Moon, Redo2 } from "lucide-react";
import { useTheme } from "next-themes";

import { DownloadButton } from "@/components/algorithms/Sidebar";
import { Button } from "@/components/ui/button";
import { createAlgorithmId, listAlgorithms, saveAlgorithm } from "@/lib/storage/indexeddb";
import { useStudioStore } from "@/store/studio-store";

interface ToolbarProps {
  onRun: (debug: boolean) => void;
  onStop: () => void;
  onStepInto: () => void;
  onStepOver: () => void;
  onContinue: () => void;
  onReset: () => void;
}

export function Toolbar({
  onRun,
  onStop,
  onStepInto,
  onStepOver,
  onContinue,
  onReset,
}: ToolbarProps): React.ReactElement {
  const status = useStudioStore((s) => s.status);
  const currentName = useStudioStore((s) => s.currentName);
  const dirty = useStudioStore((s) => s.dirty);
  const { resolvedTheme, setTheme } = useTheme();
  const busy = status === "running" || status === "waiting-input" || status === "paused";

  const save = async () => {
    const state = useStudioStore.getState();
    const now = Date.now();
    const id = state.currentId ?? createAlgorithmId();
    const existing = state.algorithms.find((item) => item.id === id);
    await saveAlgorithm({
      id,
      name: state.currentName,
      source: state.source,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    state.setCurrentId(id);
    state.setDirty(false);
    state.setAlgorithms(await listAlgorithms());
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3">
      <div className="mr-2 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-cyan-600 font-mono text-xs font-bold text-white">
          PS
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-100">PseudoCode Studio</div>
          <div className="text-[10px] text-zinc-500">
            {currentName}
            {dirty ? " • non enregistré" : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" onClick={() => onRun(false)} disabled={status === "running" || status === "waiting-input"}>
          <Play className="size-4" />
          Exécuter
        </Button>
        <Button size="sm" variant="destructive" onClick={onStop} disabled={!busy}>
          <Square className="size-4" />
          Arrêter
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onRun(true)} disabled={busy}>
          <Bug className="size-4" />
          Déboguer
        </Button>
        <Button size="sm" variant="outline" onClick={onStepInto} disabled={status !== "paused"}>
          <StepForward className="size-4" />
          Étape suivante
        </Button>
        <Button size="sm" variant="outline" onClick={onStepOver} disabled={status !== "paused"}>
          <Redo2 className="size-4" />
          Passer
        </Button>
        <Button size="sm" variant="outline" onClick={onContinue} disabled={status !== "paused"}>
          Continuer
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset}>
          <RotateCcw className="size-4" />
          Réinitialiser
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={() => void save()}>
          <Save className="size-4" />
          Enregistrer
        </Button>
        <DownloadButton />
        <Button
          size="icon"
          variant="ghost"
          title="Changer de thème"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
