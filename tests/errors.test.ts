import { describe, expect, it } from "vitest";

import { runSource } from "@/lib/runtime/run";

describe("erreurs d'exécution", () => {
  it("coupe une boucle infinie", async () => {
    const result = await runSource(
      `Algorithme Infini
Variables
    x : Entier
Début
    x <- 1
    TantQue x > 0 Faire
        x <- 1
    FinTantQue
Fin
`,
      { limits: { maxInstructions: 200, maxLoopIterations: 50, maxMilliseconds: 2000 } },
    );
    expect(result.error?.code).toBe("boucle-infinie");
    expect(result.error?.message).toMatch(/Boucle infinie probable/i);
  });

  it("inclut le numéro de ligne", async () => {
    const result = await runSource(`Algorithme A
Variables
    x : Entier
Début
    x <- 1 / 0
Fin
`);
    expect(result.error?.line).toBeGreaterThan(0);
    expect(result.error?.column).toBeGreaterThan(0);
  });
});
