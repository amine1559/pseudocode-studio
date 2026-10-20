import type { Diagnostic } from "@/types/diagnostics";
import type { DebugSnapshot, InputRequest } from "@/types/runtime";

export type MainToWorker =
  | {
      type: "start";
      source: string;
      debug: boolean;
      breakpoints: number[];
    }
  | { type: "input"; value: string }
  | { type: "step-into" }
  | { type: "step-over" }
  | { type: "continue" }
  | { type: "stop" }
  | { type: "set-breakpoints"; breakpoints: number[] };

export type WorkerToMain =
  | { type: "output"; text: string }
  | { type: "input-needed"; request: InputRequest }
  | { type: "paused"; snapshot: DebugSnapshot }
  | { type: "line"; line: number }
  | { type: "finished" }
  | { type: "stopped" }
  | { type: "error"; diagnostic: Diagnostic }
  | { type: "compile-error"; diagnostics: Diagnostic[] };
