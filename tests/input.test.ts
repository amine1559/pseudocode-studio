import { describe, expect, it } from "vitest";

import { runSource } from "@/lib/runtime/run";

describe("Lire interactif", () => {
  it("enchaîne plusieurs Lire sans redémarrer", async () => {
    const result = await runSource(
      `Algorithme Lectures
Variables
    a, b, somme : Entier
Début
    Lire(a)
    Lire(b)
    somme <- a + b
    Ecrire(somme)
Fin
`,
      { inputs: ["5", "7"] },
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["12"]);
  });

  it("rejette une valeur incorrecte puis reprend", async () => {
    const result = await runSource(
      `Algorithme Typage
Variables
    n : Entier
Début
    Lire(n)
    Ecrire(n)
Fin
`,
      { inputs: ["abc", "42"] },
    );
    expect(result.error).toBeUndefined();
    expect(result.output.some((line) => line.includes("Valeur incorrecte"))).toBe(true);
    expect(result.output.at(-1)).toBe("42");
  });
});
