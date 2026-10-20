export interface ExampleAlgorithm {
  id: string;
  title: string;
  description: string;
  source: string;
}

export const EXAMPLE_ALGORITHMS: ExampleAlgorithm[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "Affiche un message de bienvenue.",
    source: `Algorithme HelloWorld

Début
    Ecrire("Bonjour le monde")
Fin
`,
  },
  {
    id: "addition",
    title: "Somme de deux nombres",
    description: "Lit deux entiers et affiche leur somme.",
    source: `Algorithme SommeDeuxNombres

Variables
    a, b, somme : Entier

Début
    Ecrire("Entrer le premier nombre : ")
    Lire(a)

    Ecrire("Entrer le deuxième nombre : ")
    Lire(b)

    somme <- a + b

    Ecrire("La somme est : ", somme)
Fin
`,
  },
  {
    id: "moyenne",
    title: "Moyenne de trois notes",
    description: "Calcule la moyenne de trois notes réelles.",
    source: `Algorithme MoyenneTroisNotes

Variables
    n1, n2, n3, moyenne : Réel

Début
    Ecrire("Première note : ")
    Lire(n1)
    Ecrire("Deuxième note : ")
    Lire(n2)
    Ecrire("Troisième note : ")
    Lire(n3)

    moyenne <- (n1 + n2 + n3) / 3
    Ecrire("Moyenne = ", moyenne)
Fin
`,
  },
  {
    id: "pair-impair",
    title: "Pair ou impair",
    description: "Détermine si un entier est pair ou impair.",
    source: `Algorithme PairOuImpair

Variables
    n : Entier

Début
    Ecrire("Entrer un entier : ")
    Lire(n)

    Si n MOD 2 = 0 Alors
        Ecrire(n, " est pair")
    Sinon
        Ecrire(n, " est impair")
    FinSi
Fin
`,
  },
  {
    id: "max-deux",
    title: "Maximum de deux nombres",
    description: "Compare deux entiers et affiche le plus grand.",
    source: `Algorithme MaxDeuxNombres

Variables
    a, b : Entier

Début
    Ecrire("Premier nombre : ")
    Lire(a)
    Ecrire("Deuxième nombre : ")
    Lire(b)

    Si a > b Alors
        Ecrire("Le maximum est ", a)
    SinonSi a < b Alors
        Ecrire("Le maximum est ", b)
    Sinon
        Ecrire("Les deux nombres sont égaux")
    FinSi
Fin
`,
  },
  {
    id: "max-trois",
    title: "Maximum de trois nombres",
    description: "Trouve le plus grand parmi trois entiers.",
    source: `Algorithme MaxTroisNombres

Variables
    a, b, c, max : Entier

Début
    Ecrire("a = ")
    Lire(a)
    Ecrire("b = ")
    Lire(b)
    Ecrire("c = ")
    Lire(c)

    max <- a
    Si b > max Alors
        max <- b
    FinSi
    Si c > max Alors
        max <- c
    FinSi

    Ecrire("Le maximum est ", max)
Fin
`,
  },
  {
    id: "factorielle",
    title: "Factorielle",
    description: "Calcule n! avec une boucle Pour.",
    source: `Algorithme Factorielle

Variables
    n, i, fact : Entier

Début
    Ecrire("n = ")
    Lire(n)

    fact <- 1
    Pour i <- 1 A n Faire
        fact <- fact * i
    FinPour

    Ecrire(n, "! = ", fact)
Fin
`,
  },
  {
    id: "fibonacci",
    title: "Fibonacci",
    description: "Affiche les n premiers termes de Fibonacci.",
    source: `Algorithme Fibonacci

Variables
    n, i, a, b, suivant : Entier

Début
    Ecrire("Nombre de termes : ")
    Lire(n)

    a <- 0
    b <- 1

    Pour i <- 1 A n Faire
        Ecrire(a)
        suivant <- a + b
        a <- b
        b <- suivant
    FinPour
Fin
`,
  },
  {
    id: "table-multiplication",
    title: "Table de multiplication",
    description: "Affiche la table de multiplication d'un entier.",
    source: `Algorithme TableMultiplication

Variables
    n, i : Entier

Début
    Ecrire("Table de : ")
    Lire(n)

    Pour i <- 1 A 10 Faire
        Ecrire(n, " x ", i, " = ", n * i)
    FinPour
Fin
`,
  },
  {
    id: "premier",
    title: "Nombre premier",
    description: "Teste si un entier est un nombre premier.",
    source: `Algorithme NombrePremier

Variables
    n, i : Entier
    premier : Booléen

Début
    Ecrire("Entrer un entier : ")
    Lire(n)

    Si n <= 1 Alors
        premier <- Faux
    Sinon
        premier <- Vrai
        Pour i <- 2 A n - 1 Faire
            Si n MOD i = 0 Alors
                premier <- Faux
            FinSi
        FinPour
    FinSi

    Si premier Alors
        Ecrire(n, " est premier")
    Sinon
        Ecrire(n, " n'est pas premier")
    FinSi
Fin
`,
  },
  {
    id: "somme-tableau",
    title: "Somme d'un tableau",
    description: "Calcule la somme des éléments d'un tableau.",
    source: `Algorithme SommeTableau

Variables
    T : Tableau[5] de Entier
    i, somme : Entier

Début
    T[0] <- 4
    T[1] <- 8
    T[2] <- 15
    T[3] <- 16
    T[4] <- 23

    somme <- 0
    Pour i <- 0 A 4 Faire
        somme <- somme + T[i]
    FinPour

    Ecrire("Somme = ", somme)
Fin
`,
  },
  {
    id: "max-tableau",
    title: "Maximum d'un tableau",
    description: "Trouve la plus grande valeur d'un tableau.",
    source: `Algorithme MaxTableau

Variables
    T : Tableau[5] de Entier
    i, max : Entier

Début
    T[0] <- 4
    T[1] <- 18
    T[2] <- 7
    T[3] <- 25
    T[4] <- 9

    max <- T[0]
    Pour i <- 1 A 4 Faire
        Si T[i] > max Alors
            max <- T[i]
        FinSi
    FinPour

    Ecrire("Maximum = ", max)
Fin
`,
  },
  {
    id: "recherche-lineaire",
    title: "Recherche linéaire",
    description: "Cherche une valeur dans un tableau non trié.",
    source: `Algorithme RechercheLineaire

Variables
    T : Tableau[6] de Entier
    i, x, position : Entier

Début
    T[0] <- 12
    T[1] <- 5
    T[2] <- 9
    T[3] <- 20
    T[4] <- 7
    T[5] <- 14

    x <- 20
    position <- -1

    Pour i <- 0 A 5 Faire
        Si T[i] = x Alors
            position <- i
        FinSi
    FinPour

    Si position = -1 Alors
        Ecrire(x, " est introuvable")
    Sinon
        Ecrire(x, " se trouve à l'indice ", position)
    FinSi
Fin
`,
  },
  {
    id: "recherche-dichotomique",
    title: "Recherche dichotomique",
    description: "Recherche binaire dans un tableau trié.",
    source: `Algorithme RechercheDichotomique

Variables
    T : Tableau[7] de Entier
    gauche, droite, milieu, x : Entier
    trouve : Booléen

Début
    T[0] <- 2
    T[1] <- 5
    T[2] <- 8
    T[3] <- 12
    T[4] <- 16
    T[5] <- 23
    T[6] <- 31

    x <- 16
    gauche <- 0
    droite <- 6
    trouve <- Faux

    TantQue gauche <= droite ET NON trouve Faire
        milieu <- (gauche + droite) DIV 2
        Si T[milieu] = x Alors
            trouve <- Vrai
        SinonSi T[milieu] < x Alors
            gauche <- milieu + 1
        Sinon
            droite <- milieu - 1
        FinSi
    FinTantQue

    Si trouve Alors
        Ecrire(x, " trouvé à l'indice ", milieu)
    Sinon
        Ecrire(x, " est introuvable")
    FinSi
Fin
`,
  },
  {
    id: "tri-bulle",
    title: "Tri à bulles",
    description: "Trie un tableau par le tri à bulles.",
    source: `Algorithme TriABulles

Variables
    T : Tableau[6] de Entier
    i, j, tmp : Entier

Début
    T[0] <- 5
    T[1] <- 1
    T[2] <- 4
    T[3] <- 2
    T[4] <- 8
    T[5] <- 3

    Pour i <- 0 A 4 Faire
        Pour j <- 0 A 4 - i Faire
            Si T[j] > T[j + 1] Alors
                tmp <- T[j]
                T[j] <- T[j + 1]
                T[j + 1] <- tmp
            FinSi
        FinPour
    FinPour

    Pour i <- 0 A 5 Faire
        Ecrire(T[i])
    FinPour
Fin
`,
  },
  {
    id: "tri-selection",
    title: "Tri par sélection",
    description: "Trie un tableau par sélection du minimum.",
    source: `Algorithme TriSelection

Variables
    T : Tableau[6] de Entier
    i, j, min, tmp : Entier

Début
    T[0] <- 29
    T[1] <- 10
    T[2] <- 14
    T[3] <- 37
    T[4] <- 13
    T[5] <- 6

    Pour i <- 0 A 4 Faire
        min <- i
        Pour j <- i + 1 A 5 Faire
            Si T[j] < T[min] Alors
                min <- j
            FinSi
        FinPour
        tmp <- T[i]
        T[i] <- T[min]
        T[min] <- tmp
    FinPour

    Pour i <- 0 A 5 Faire
        Ecrire(T[i])
    FinPour
Fin
`,
  },
  {
    id: "tri-insertion",
    title: "Tri par insertion",
    description: "Trie un tableau par insertion successive.",
    source: `Algorithme TriInsertion

Variables
    T : Tableau[6] de Entier
    i, j, cle : Entier

Début
    T[0] <- 9
    T[1] <- 3
    T[2] <- 7
    T[3] <- 1
    T[4] <- 8
    T[5] <- 4

    Pour i <- 1 A 5 Faire
        cle <- T[i]
        j <- i - 1
        TantQue j >= 0 ET T[j] > cle Faire
            T[j + 1] <- T[j]
            j <- j - 1
        FinTantQue
        T[j + 1] <- cle
    FinPour

    Pour i <- 0 A 5 Faire
        Ecrire(T[i])
    FinPour
Fin
`,
  },
  {
    id: "pgcd",
    title: "PGCD d'Euclide",
    description: "Calcule le PGCD de deux entiers par l'algorithme d'Euclide.",
    source: `Algorithme PGCDEuclide

Variables
    a, b, resultat : Entier

Début
    a <- 48
    b <- 18
    resultat <- PGCD(a, b)
    Ecrire("PGCD(", a, ", ", b, ") = ", resultat)
Fin

Fonction PGCD(x : Entier, y : Entier) : Entier
Variables
    r : Entier
Début
    TantQue y <> 0 Faire
        r <- x MOD y
        x <- y
        y <- r
    FinTantQue
    Retourner x
FinFonction
`,
  },
  {
    id: "palindrome",
    title: "Détection de palindrome",
    description: "Vérifie si un entier est un palindrome.",
    source: `Algorithme Palindrome

Variables
    n, original, inverse, chiffre : Entier

Début
    Ecrire("Entrer un entier : ")
    Lire(n)

    original <- n
    inverse <- 0

    TantQue n > 0 Faire
        chiffre <- n MOD 10
        inverse <- inverse * 10 + chiffre
        n <- n DIV 10
    FinTantQue

    Si original = inverse Alors
        Ecrire(original, " est un palindrome")
    Sinon
        Ecrire(original, " n'est pas un palindrome")
    FinSi
Fin
`,
  },
  {
    id: "factorielle-recursive",
    title: "Factorielle récursive",
    description: "Calcule n! à l'aide d'une fonction récursive.",
    source: `Algorithme FactorielleRecursive

Variables
    n, resultat : Entier

Début
    n <- 6
    resultat <- Fact(n)
    Ecrire(n, "! = ", resultat)
Fin

Fonction Fact(k : Entier) : Entier
Début
    Si k <= 1 Alors
        Retourner 1
    Sinon
        Retourner k * Fact(k - 1)
    FinSi
FinFonction
`,
  },
];
