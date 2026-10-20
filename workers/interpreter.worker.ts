import { Interpreter } from "@/lib/interpreter/interpreter";
import { compile } from "@/lib/runtime/compile";
import { LanguageError, StoppedError } from "@/lib/runtime/errors";
import type { DebugCommand, DebugSnapshot, InputRequest, RuntimeHost } from "@/types/runtime";
import type { MainToWorker, WorkerToMain } from "@/types/worker-protocol";

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}

class WorkerHost implements RuntimeHost {
  cancelled = false;
  inputGate = new Deferred<string>();
  pauseGate = new Deferred<DebugCommand>();
  interpreter: Interpreter | null = null;

  output(text: string): void {
    post({ type: "output", text });
  }

  async requestInput(request: InputRequest): Promise<string> {
    this.inputGate = new Deferred<string>();
    post({ type: "input-needed", request });
    const value = await this.inputGate.promise;
    if (this.cancelled) throw new StoppedError();
    return value;
  }

  async onPause(snapshot: DebugSnapshot): Promise<DebugCommand> {
    this.pauseGate = new Deferred<DebugCommand>();
    post({ type: "paused", snapshot });
    const command = await this.pauseGate.promise;
    if (this.cancelled || command === "stop") throw new StoppedError();
    return command;
  }

  onLine(line: number): void {
    post({ type: "line", line });
  }

  isCancelled(): boolean {
    return this.cancelled;
  }
}

const host = new WorkerHost();

function post(message: WorkerToMain): void {
  self.postMessage(message);
}

async function start(source: string, debug: boolean, breakpoints: number[]): Promise<void> {
  host.cancelled = false;
  const compiled = compile(source);
  if (!compiled.ok) {
    post({ type: "compile-error", diagnostics: compiled.errors });
    return;
  }

  const interpreter = new Interpreter(compiled.program, host, {
    debug,
    breakpoints,
    initialPolicy: debug ? "step-into" : "run",
    source,
  });
  host.interpreter = interpreter;

  try {
    await interpreter.execute();
    if (!host.cancelled) post({ type: "finished" });
  } catch (error) {
    if (error instanceof StoppedError || host.cancelled) {
      post({ type: "stopped" });
      return;
    }
    if (error instanceof LanguageError) {
      post({ type: "error", diagnostic: error.toDiagnostic() });
      return;
    }
    const message = error instanceof Error ? error.message : "Erreur interne d'exécution.";
    post({
      type: "error",
      diagnostic: {
        kind: "execution",
        code: "interne",
        message,
        line: 1,
        column: 1,
      },
    });
  }
}

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const message = event.data;
  switch (message.type) {
    case "start":
      void start(message.source, message.debug, message.breakpoints);
      break;
    case "input":
      host.inputGate.resolve(message.value);
      break;
    case "step-into":
    case "step-over":
    case "continue":
      host.pauseGate.resolve(message.type);
      break;
    case "stop":
      host.cancelled = true;
      host.inputGate.resolve("");
      host.pauseGate.resolve("stop");
      break;
    case "set-breakpoints":
      host.interpreter?.setBreakpoints(message.breakpoints);
      break;
    default:
      break;
  }
};
