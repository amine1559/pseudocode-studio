export type DiagnosticKind =
  | "lexicale"
  | "syntaxe"
  | "semantique"
  | "execution";

export interface SourceLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface Diagnostic {
  kind: DiagnosticKind;
  code: string;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export const DIAGNOSTIC_LABELS: Record<DiagnosticKind, string> = {
  lexicale: "Erreur lexicale",
  syntaxe: "Erreur de syntaxe",
  semantique: "Erreur sémantique",
  execution: "Erreur d'exécution",
};
