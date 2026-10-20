export interface Exercise {
  id: string;
  title: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  statement: string;
  starter: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: "ex-carre",
    title: "Carré d'un nombre",
    difficulty: "Facile",
    statement: "Lire un entier et afficher son carré.",
    starter: `Algorithme CarreNombre

Variables
    n, carre : Entier

Début
    Ecrire("Entrer un entier : ")
    Lire(n)
    // Calculez le carré puis affichez-le
Fin
`,
  },
  {
    id: "ex-absolu",
    title: "Valeur absolue",
    difficulty: "Facile",
    statement: "Lire un entier et afficher sa valeur absolue sans utiliser de fonction prédéfinie.",
    starter: `Algorithme ValeurAbsolue

Variables
    n : Entier

Début
    Ecrire("Entrer un entier : ")
    Lire(n)
    // Affichez la valeur absolue de n
Fin
`,
  },
  {
    id: "ex-notes",
    title: "Mention",
    difficulty: "Moyen",
    statement:
      "Lire une note réelle. Afficher « Très bien » si note >= 16, « Assez bien » si note >= 12, sinon « Insuffisant ».",
    starter: `Algorithme Mention

Variables
    note : Réel

Début
    Ecrire("Note : ")
    Lire(note)
    // Utilisez Si / SinonSi / Sinon
Fin
`,
  },
  {
    id: "ex-somme-n",
    title: "Somme de 1 à n",
    difficulty: "Moyen",
    statement: "Lire un entier n et afficher la somme 1 + 2 + ... + n.",
    starter: `Algorithme SommeJusquaN

Variables
    n, i, somme : Entier

Début
    Ecrire("n = ")
    Lire(n)
    somme <- 0
    // Boucle Pour
    Ecrire("Somme = ", somme)
Fin
`,
  },
  {
    id: "ex-inverse-tableau",
    title: "Inverser un tableau",
    difficulty: "Difficile",
    statement: "Remplir un tableau de 5 entiers puis l'afficher à l'envers.",
    starter: `Algorithme InverseTableau

Variables
    T : Tableau[5] de Entier
    i : Entier

Début
    Pour i <- 0 A 4 Faire
        Ecrire("T[", i, "] = ")
        Lire(T[i])
    FinPour

    // Affichez le tableau de T[4] vers T[0]
Fin
`,
  },
];

export const BLANK_ALGORITHM = `Algorithme NouvelAlgorithme

Variables
    x : Entier

Début
    Ecrire("Bienvenue dans PseudoCode Studio")
    x <- 0
    Ecrire("x = ", x)
Fin
`;

export const ACCEPTANCE_ALGORITHM = `Algorithme CalculMoyenne

Variables
    note1, note2, moyenne : Réel

Début
    Ecrire("Première note : ")
    Lire(note1)

    Ecrire("Deuxième note : ")
    Lire(note2)

    moyenne <- (note1 + note2) / 2

    Ecrire("Moyenne = ", moyenne)

    Si moyenne >= 10 Alors
        Ecrire("Admis")
    Sinon
        Ecrire("Non admis")
    FinSi
Fin
`;
