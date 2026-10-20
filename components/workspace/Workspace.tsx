"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { Sidebar } from "@/components/algorithms/Sidebar";
import { ExecutionConsole } from "@/components/console/ExecutionConsole";
import { VariableInspector } from "@/components/debugger/VariableInspector";
import { Toolbar } from "@/components/workspace/Toolbar";
import { useAutosave, refreshAlgorithms } from "@/hooks/use-autosave";
import { useInterpreter } from "@/hooks/use-interpreter";
import { compile } from "@/lib/runtime/compile";
import { useStudioStore } from "@/store/studio-store";

const MonacoEditor = dynamic(
  () => import("@/components/editor/MonacoEditor").then((mod) => mod.MonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Chargement de l&apos;éditeur…
      </div>
    ),
  },
);

export function Workspace(): React.ReactElement {
  const source = useStudioStore((s) => s.source);
  const { start, stop, submitInput, stepInto, stepOver, continueRun } = useInterpreter();
  useAutosave();

  useEffect(() => {
    void refreshAlgorithms();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = compile(source);
      useStudioStore.getState().setDiagnostics(result.ok ? [] : result.errors);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [source]);

  const reset = () => {
    stop();
    useStudioStore.getState().clearConsole();
    useStudioStore.getState().resetExecution();
    useStudioStore.getState().appendConsole({
      kind: "system",
      text: "Environnement réinitialisé. Prêt à exécuter.",
    });
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <Toolbar
        onRun={start}
        onStop={stop}
        onStepInto={stepInto}
        onStepOver={stepOver}
        onContinue={continueRun}
        onReset={reset}
      />
      <div className="min-h-0 flex-1">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize="20" minSize="14" maxSize="32">
            <Sidebar />
          </Panel>
          <Separator className="w-1 bg-zinc-800 hover:bg-cyan-500" />
          <Panel minSize="40">
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize="70" minSize="35">
                <Group orientation="horizontal" className="h-full">
                  <Panel minSize="40">
                    <div className="h-full min-h-0">
                      <MonacoEditor />
                    </div>
                  </Panel>
                  <Separator className="w-1 bg-zinc-800 hover:bg-cyan-500" />
                  <Panel defaultSize="26" minSize="18" maxSize="40">
                    <VariableInspector />
                  </Panel>
                </Group>
              </Panel>
              <Separator className="h-1 bg-zinc-800 hover:bg-cyan-500" />
              <Panel defaultSize="30" minSize="18">
                <ExecutionConsole onSubmit={submitInput} />
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

