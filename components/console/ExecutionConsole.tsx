"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/store/studio-store";

export function ExecutionConsole({
  onSubmit,
}: {
  onSubmit: (value: string) => void;
}): React.ReactElement {
  const lines = useStudioStore((s) => s.consoleLines);
  const inputRequest = useStudioStore((s) => s.inputRequest);
  const status = useStudioStore((s) => s.status);
  const [value, setValue] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    if (status === "waiting-input") {
      inputRef.current?.focus();
    }
  }, [status, inputRequest]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5 text-xs uppercase tracking-wide text-zinc-400">
        <span>Console d&apos;exécution</span>
        <span className="normal-case text-zinc-500">
          {status === "waiting-input" ? "En attente d'une valeur pour Lire()" : statusLabel(status)}
        </span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[13px] leading-6">
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "whitespace-pre-wrap",
              line.kind === "error" && "text-red-400",
              line.kind === "success" && "text-emerald-400",
              line.kind === "system" && "text-cyan-300",
              line.kind === "input" && "text-amber-300",
              line.kind === "output" && "text-zinc-100",
            )}
          >
            {line.text}
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t border-zinc-800 p-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== "waiting-input") return;
          onSubmit(value);
          setValue("");
        }}
      >
        <span className="font-mono text-sm text-cyan-400">{">"}</span>
        <Input
          ref={inputRef}
          value={value}
          disabled={status !== "waiting-input"}
          placeholder={
            inputRequest
              ? `Saisir ${inputRequest.name} (${inputRequest.typeLabel}) puis Entrée`
              : "La saisie s'active lorsque Lire() est exécuté"
          }
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={status !== "waiting-input"}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "running":
      return "En cours";
    case "paused":
      return "En pause (débogage)";
    case "finished":
      return "Terminé";
    case "error":
      return "Erreur";
    default:
      return "Prêt";
  }
}
