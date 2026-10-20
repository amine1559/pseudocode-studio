import { Interpreter } from "@/lib/interpreter/interpreter";
import { compile } from "@/lib/runtime/compile";
import { LanguageError, StoppedError } from "@/lib/runtime/errors";
import type { ExecutionLimits } from "@/lib/runtime/limits";
import type { Diagnostic } from "@/types/diagnostics";
import type { DebugCommand, DebugSnapshot, RuntimeHost } from "@/types/runtime";

export interface RunResult {
  output: string[];
  error?: Diagnostic;
  stopped?: boolean;
  snapshots: DebugSnapshot[];
}

export interface RunOptions {
  inputs?: string[];
  debug?: boolean;
  breakpoints?: number[];
  limits?: Partial<ExecutionLimits>;
  onPause?: (snapshot: DebugSnapshot) => DebugCommand | Promise<DebugCommand>;
}

class ScriptedHost implements RuntimeHost {
  readonly outputLines: string[] = [];
  readonly snapshots: DebugSnapshot[] = [];
  private cancelled = false;

  constructor(
    private readonly inputs: string[],
    private readonly onPauseFn?: RunOptions["onPause"],
  ) {}

  output(text: string): void {
    this.outputLines.push(text);
  }

  async requestInput(): Promise<string> {
    if (this.inputs.length === 0) {
      throw new LanguageError(
        "execution",
        "entree-manquante",
        "Valeur incorrecte pour Lire() : aucune entrée n'a été fournie.",
        1,
        1,
      );
    }
    return this.inputs.shift()!;
  }

  async onPause(snapshot: DebugSnapshot): Promise<DebugCommand> {
    this.snapshots.push(snapshot);
    if (this.onPauseFn) return this.onPauseFn(snapshot);
    return "continue";
  }

  onLine(): void {}

  isCancelled(): boolean {
    return this.cancelled;
  }

  cancel(): void {
    this.cancelled = true;
  }
}

export async function runSource(source: string, options: RunOptions = {}): Promise<RunResult> {
  const compiled = compile(source);
  if (!compiled.ok) {
    return { output: [], error: compiled.errors[0], snapshots: [] };
  }

  const host = new ScriptedHost([...(options.inputs ?? [])], options.onPause);
  const interpreter = new Interpreter(compiled.program, host, {
    debug: options.debug,
    breakpoints: options.breakpoints,
    limits: options.limits,
    initialPolicy: options.debug ? "step-into" : "run",
    source,
  });

  try {
    await interpreter.execute();
    return { output: host.outputLines, snapshots: host.snapshots };
  } catch (error) {
    if (error instanceof StoppedError) {
      return { output: host.outputLines, stopped: true, snapshots: host.snapshots };
    }
    if (error instanceof LanguageError) {
      return { output: host.outputLines, error: error.toDiagnostic(), snapshots: host.snapshots };
    }
    throw error;
  }
}
