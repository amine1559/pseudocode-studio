# PseudoCode Studio

Éditeur et interpréteur de **pseudo-code algorithmique français**. L'application n'exécute pas JavaScript, Python, Java, C ni C++ : elle analyse et interprète uniquement le langage pédagogique défini ci-dessous.

## Installation

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

```bash
npm test          # tests unitaires (lexer, parser, interpréteur, exemples)
npm run build     # compilation de production
npm start         # serveur de production
```

Aucun serveur d'exécution dédié n'est nécessaire : l'interpréteur tourne dans un Web Worker du navigateur.

## Architecture

```text
Source
  → Lexer
  → Parseur (AST)
  → Analyse sémantique
  → Interpréteur (Web Worker)
  → Console interactive
```

- **Pas de `eval()`**, pas de `Function()`, pas de traduction vers JavaScript exécutable.
- `Lire()` suspend l'interpréteur, affiche un champ dans la console, valide le type, puis reprend au même endroit.
- Limites : nombre d'instructions, durée, profondeur de récursion, taille des tableaux, volume de sortie.
- Arrêt immédiat : le Worker est terminé.

Les algorithmes sont stockés localement dans **IndexedDB** (création, enregistrement, renommage, duplication, suppression, import `.algo` / `.txt`, export).

## Grammaire

```text
Algorithme Nom

Variables
    identifiant, identifiant : Type
    T : Tableau[n] de Type

Début
    instructions
Fin

Fonction Nom(x : Type) : Type
Variables
    ...
Début
    Retourner expression
FinFonction

Procédure Nom(x : Type)
Début
    ...
FinProcédure
```

Types : `Entier`, `Réel`, `Chaîne`, `Caractère`, `Booléen`, `Tableau[n] de Type`.

Affectation : `x <- 10` ou `x ← 10`.

Opérateurs : `+ - * / DIV MOD ^`, comparaisons `= <> < > <= >=`, logiques `ET OU NON`.

Instructions : `Lire`, `Ecrire`, `Si / SinonSi / Sinon / FinSi`, `Pour / FinPour`, `TantQue / FinTantQue`, `Répéter / JusquA`.

Les indices de tableaux commencent à **0**. Les commentaires sont `//` et `/* */`.

Les mots-clés acceptent les variantes accentuées (`Début`, `Réel`, `Répéter`, `Jusqu'à`, `Procédure`, …).

## Débogage

- Points d'arrêt dans la marge de l'éditeur
- Étape suivante, passer, continuer
- Inspecteur de variables, pile d'appels, compteurs de boucles, historique

## Licence pédagogique

Projet éducatif local, sans compte utilisateur et sans base de données distante.
