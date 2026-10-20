import { describe, expect, it } from "vitest";

import { compile } from "@/lib/runtime/compile";

const valid = `Algorithme Test
Variables
    x : Entier
Début
    x <- 1
    Ecrire(x)
Fin
`;

describe("parser et analyse sémantique", () => {
  it("compile un algorithme minimal", () => {
    const result = compile(valid);
    expect(result.ok).toBe(true);
  });

  it("détecte un FinSi manquant", () => {
    const result = compile(`Algorithme A
Variables
    x : Entier
Début
    x <- 1
    Si x = 1 Alors
        Ecrire("ok")
Fin
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toMatch(/FinSi/i);
    }
  });

  it("détecte une variable non déclarée", () => {
    const result = compile(`Algorithme A
Début
    x <- 1
Fin
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toMatch(/non déclarée/i);
    }
  });

  it("détecte un type incompatible", () => {
    const result = compile(`Algorithme A
Variables
    x : Entier
Début
    x <- "texte"
Fin
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("type-incompatible");
    }
  });
});
