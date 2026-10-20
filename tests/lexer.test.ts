import { describe, expect, it } from "vitest";

import { tokenize } from "@/lib/lexer/tokenize";
import { LanguageError } from "@/lib/runtime/errors";

describe("lexer", () => {
  it("reconnaît les mots-clés accentués", () => {
    const kinds = tokenize('Algorithme X Début Ecrire("ok") Fin').map((t) => t.kind);
    expect(kinds).toEqual(["ALGORITHME", "IDENTIFIER", "DEBUT", "ECRIRE", "LPAREN", "STRING", "RPAREN", "FIN", "EOF"]);
  });

  it("accepte <- et ←", () => {
    const tokens = tokenize("x <- 1 y ← 2");
    expect(tokens.filter((t) => t.kind === "ASSIGN")).toHaveLength(2);
  });

  it("fusionne Fin Si et Sinon Si", () => {
    const kinds = tokenize("Sinon Si x Fin Si").map((t) => t.kind);
    expect(kinds).toContain("SINONSI");
    expect(kinds).toContain("FINSI");
  });

  it("reconnaît Jusqu'à", () => {
    const tokens = tokenize("Jusqu'à x > 0");
    expect(tokens[0]?.kind).toBe("JUSQUA");
  });

  it("signale une chaîne non terminée", () => {
    expect(() => tokenize('Ecrire("oups')).toThrow(LanguageError);
  });
});
