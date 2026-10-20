import type { PrimitiveTypeName } from "@/lib/ast/nodes";
import type { Diagnostic } from "@/types/diagnostics";

export type PausePolicy = "run" | "step-into" | "step-over" | "continue";

export type DebugCommand = "step-into" | "step-over" | "continue" | "stop";

export interface VariableSnapshot {
  name: string;
  type: string;
  value: string;
  scope: string;
}

export interface CallFrameSnapshot {
  name: string;
  line: number;
}

export interface HistoryEntry {
  step: number;
  line: number;
  instruction: string;
  variables: Record<string, string>;
}

export interface LoopCounter {
  name: string;
  iteration: number;
  line: number;
}

export interface DebugSnapshot {
  line: number;
  instruction: string;
  step: number;
  variables: VariableSnapshot[];
  callStack: CallFrameSnapshot[];
  history: HistoryEntry[];
  loops: LoopCounter[];
}

export interface InputRequest {
  name: string;
  type: PrimitiveTypeName;
  typeLabel: string;
  line: number;
}

export interface RuntimeHost {
  output(text: string): void;
  requestInput(request: InputRequest): Promise<string>;
  onPause(snapshot: DebugSnapshot): Promise<DebugCommand>;
  onLine(line: number): void;
  isCancelled(): boolean;
}

export type CompileResult =
  | { ok: true; program: import("@/lib/ast/nodes").Program }
  | { ok: false; errors: Diagnostic[] };
