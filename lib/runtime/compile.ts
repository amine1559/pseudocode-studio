import { analyze } from "@/lib/semantic/analyzer";
import { tokenize } from "@/lib/lexer/tokenize";
import { parse } from "@/lib/parser/parser";
import { LanguageError } from "@/lib/runtime/errors";
import type { CompileResult } from "@/types/runtime";

export function compile(source: string): CompileResult {
  try {
    const tokens = tokenize(source);
    const program = parse(tokens);
    const errors = analyze(program);
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    return { ok: true, program };
  } catch (error) {
    if (error instanceof LanguageError) {
      return { ok: false, errors: [error.toDiagnostic()] };
    }
    throw error;
  }
}
