import type { Diagnostic, DiagnosticKind } from "@/types/diagnostics";

export class LanguageError extends Error {
  readonly kind: DiagnosticKind;
  readonly code: string;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;

  constructor(
    kind: DiagnosticKind,
    code: string,
    message: string,
    line: number,
    column: number,
    endLine = line,
    endColumn = column + 1,
  ) {
    super(message);
    this.name = "LanguageError";
    this.kind = kind;
    this.code = code;
    this.line = line;
    this.column = column;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }

  toDiagnostic(): Diagnostic {
    return {
      kind: this.kind,
      code: this.code,
      message: this.message,
      line: this.line,
      column: this.column,
      endLine: this.endLine,
      endColumn: this.endColumn,
    };
  }
}

export class StoppedError extends Error {
  constructor() {
    super("Exécution arrêtée.");
    this.name = "StoppedError";
  }
}

export class ReturnSignal {
  constructor(readonly value: unknown) {}
}
