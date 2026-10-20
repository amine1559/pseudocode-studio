"use client";

import { useCallback, useEffect, useRef } from "react";

import { DIAGNOSTIC_LABELS } from "@/types/diagnostics";
import type { MainToWorker, WorkerToMain } from "@/types/worker-protocol";
import { useStudioStore } from "@/store/studio-store";

function formatDiagnostic(kind: keyof typeof DIAGNOSTIC_LABELS, message: string, line: number, column: number): string {
  return `${DIAGNOSTIC_LABELS[kind]} (ligne ${line}, colonne ${column}) : ${message}`;
}

export function useInterpreter() {
  const workerRef = useRef<Worker | null>(null);

  const recreateWorker = useCallback(() => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL("../workers/interpreter.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<WorkerToMain>) => {
      const store = useStudioStore.getState();
      const message = event.data;
      switch (message.type) {
        case "output":
          store.appendConsole({ kind: "output", text: message.text });
          break;
        case "input-needed":
          store.setStatus("waiting-input");
          store.setInputRequest(message.request);
          store.appendConsole({
            kind: "system",
            text: `? ${message.request.name} (${message.request.typeLabel}) :`,
          });
          break;
        case "paused":
          store.setStatus("paused");
          store.applySnapshot(message.snapshot);
          break;
        case "line":
          store.setCurrentLine(message.line);
          break;
        case "finished":
          store.setStatus("finished");
          store.setInputRequest(null);
          store.setCurrentLine(null);
          store.appendConsole({ kind: "success", text: "✓ Exécution terminée." });
          break;
        case "stopped":
          store.setStatus("idle");
          store.setInputRequest(null);
          store.setCurrentLine(null);
          store.appendConsole({ kind: "system", text: "■ Exécution arrêtée." });
          break;
        case "error":
          store.setStatus("error");
          store.setInputRequest(null);
          store.setDiagnostics([message.diagnostic]);
          store.setCurrentLine(message.diagnostic.line);
          store.appendConsole({
            kind: "error",
            text: formatDiagnostic(
              message.diagnostic.kind,
              message.diagnostic.message,
              message.diagnostic.line,
              message.diagnostic.column,
            ),
          });
          break;
        case "compile-error":
          store.setStatus("error");
          store.setDiagnostics(message.diagnostics);
          store.appendConsole({
            kind: "error",
            text: formatDiagnostic(
              message.diagnostics[0]!.kind,
              message.diagnostics[0]!.message,
              message.diagnostics[0]!.line,
              message.diagnostics[0]!.column,
            ),
          });
          break;
        default:
          break;
      }
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    recreateWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [recreateWorker]);

  const post = useCallback((message: MainToWorker) => {
    workerRef.current?.postMessage(message);
  }, []);

  const start = useCallback(
    (debug: boolean) => {
      const store = useStudioStore.getState();
      store.clearConsole();
      store.resetExecution();
      store.appendConsole({
        kind: "system",
        text: debug ? "▶ Débogage de l'algorithme..." : "▶ Exécution de l'algorithme...",
      });
      store.setStatus("running");
      const worker = recreateWorker();
      worker.postMessage({
        type: "start",
        source: store.source,
        debug,
        breakpoints: store.breakpoints,
      } satisfies MainToWorker);
    },
    [recreateWorker],
  );

  const stop = useCallback(() => {
    post({ type: "stop" });
    workerRef.current?.terminate();
    workerRef.current = null;
    const store = useStudioStore.getState();
    store.setStatus("idle");
    store.setInputRequest(null);
    store.setCurrentLine(null);
    store.appendConsole({ kind: "system", text: "■ Exécution arrêtée." });
    recreateWorker();
  }, [post, recreateWorker]);

  const submitInput = useCallback(
    (value: string) => {
      const store = useStudioStore.getState();
      store.appendConsole({ kind: "input", text: `> ${value}` });
      store.setInputRequest(null);
      store.setStatus("running");
      post({ type: "input", value });
    },
    [post],
  );

  const stepInto = useCallback(() => post({ type: "step-into" }), [post]);
  const stepOver = useCallback(() => post({ type: "step-over" }), [post]);
  const continueRun = useCallback(() => {
    useStudioStore.getState().setStatus("running");
    post({ type: "continue" });
  }, [post]);

  return { start, stop, submitInput, stepInto, stepOver, continueRun };
}
