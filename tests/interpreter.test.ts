import { describe, expect, it } from "vitest";

import { ACCEPTANCE_ALGORITHM } from "@/lib/algorithms/exercises";
import { runSource } from "@/lib/runtime/run";

describe("interpréteur", () => {
  it("évalue les expressions arithmétiques", async () => {
    const result = await runSource(`Algorithme Calc
Variables
    x : Entier
Début
    x <- 2 + 3 * 4
    Ecrire(x)
    Ecrire(10 DIV 3)
    Ecrire(10 MOD 3)
    Ecrire(2 ^ 3)
Fin
`);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["14", "3", "1", "8"]);
  });

  it("exécute les conditions imbriquées", async () => {
    const result = await runSource(`Algorithme Cond
Variables
    n : Entier
Début
    n <- 16
    Si n >= 16 Alors
        Ecrire("Très bien")
    SinonSi n >= 12 Alors
        Ecrire("Assez bien")
    Sinon
        Ecrire("Insuffisant")
    FinSi
Fin
`);
    expect(result.output).toEqual(["Très bien"]);
  });

  it("exécute les boucles Pour, TantQue et Répéter", async () => {
    const result = await runSource(`Algorithme Boucles
Variables
    i, x : Entier
Début
    Pour i <- 1 A 3 Faire
        Ecrire(i)
    FinPour
    Pour i <- 3 A 1 Pas -1 Faire
        Ecrire(i)
    FinPour
    x <- 0
    TantQue x < 2 Faire
        x <- x + 1
    FinTantQue
    Ecrire(x)
    x <- 0
    Répéter
        x <- x + 1
    JusquA x = 2
    Ecrire(x)
Fin
`);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["1", "2", "3", "3", "2", "1", "2", "2"]);
  });

  it("respecte les bornes des tableaux", async () => {
    const result = await runSource(`Algorithme Tab
Variables
    T : Tableau[2] de Entier
Début
    T[0] <- 1
    Ecrire(T[2])
Fin
`);
    expect(result.error?.code).toBe("indice-invalide");
  });

  it("détecte la division par zéro", async () => {
    const result = await runSource(`Algorithme DivZero
Variables
    x : Entier
Début
    x <- 5 DIV 0
Fin
`);
    expect(result.error?.message).toMatch(/Division par zéro/);
  });

  it("exécute fonctions, procédures et récursion", async () => {
    const result = await runSource(`Algorithme Rec
Variables
    n : Entier
Début
    Afficher(Fact(4))
Fin

Fonction Fact(k : Entier) : Entier
Début
    Si k <= 1 Alors
        Retourner 1
    Sinon
        Retourner k * Fact(k - 1)
    FinSi
FinFonction

Procédure Afficher(x : Entier)
Début
    Ecrire(x)
FinProcédure
`);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["24"]);
  });

  it("autorise un Si imbriqué après Sinon", async () => {
    const result = await runSource(`Algorithme Nid
Variables
    x, y : Entier
Début
    x <- 1
    y <- 2
    Si x = 0 Alors
        Ecrire("a")
    Sinon
        Si y = 2 Alors
            Ecrire("b")
        FinSi
    FinSi
Fin
`);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["b"]);
  });

  it("réussit le test d'acceptation CalculMoyenne", async () => {
    const result = await runSource(ACCEPTANCE_ALGORITHM, { inputs: ["14", "12"] });
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(["Première note : ", "Deuxième note : ", "Moyenne = 13", "Admis"]);
  });
});
