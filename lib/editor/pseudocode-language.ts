import type { Monaco } from "@monaco-editor/react";
import type { editor, languages } from "monaco-editor";

import type { Diagnostic } from "@/types/diagnostics";

const LANGUAGE_ID = "pseudocode-fr";
let registered = false;

const KEYWORDS = [
  "Algorithme",
  "Variables",
  "Début",
  "Debut",
  "Fin",
  "Entier",
  "Réel",
  "Reel",
  "Chaîne",
  "Chaine",
  "Caractère",
  "Caractere",
  "Booléen",
  "Booleen",
  "Tableau",
  "de",
  "Lire",
  "Ecrire",
  "Si",
  "Alors",
  "Sinon",
  "SinonSi",
  "FinSi",
  "Pour",
  "Pas",
  "Faire",
  "FinPour",
  "TantQue",
  "FinTantQue",
  "Répéter",
  "Repeter",
  "JusquA",
  "Jusqu'à",
  "Fonction",
  "FinFonction",
  "Procédure",
  "Procedure",
  "FinProcédure",
  "FinProcedure",
  "Retourner",
  "Vrai",
  "Faux",
  "ET",
  "OU",
  "NON",
  "DIV",
  "MOD",
];

export function registerPseudocodeLanguage(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: LANGUAGE_ID, extensions: [".algo", ".txt"], aliases: ["Pseudo-code"] });

  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /(Alors|Faire|Début|Debut|Sinon|SinonSi|Répéter|Repeter|Variables)\s*$/,
      decreaseIndentPattern: /^\s*(FinSi|FinPour|FinTantQue|FinFonction|FinProcédure|FinProcedure|Fin|Sinon|SinonSi|JusquA|Jusqu'à)/,
    },
  });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    defaultToken: "",
    ignoreCase: true,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)'/, "string"],
        [/\d+\.\d+/, "number"],
        [/\d+/, "number"],
        [/<-|←/, "operator"],
        [/<>|<=|>=|=|<|>|\+|-|\*|\/|\^/, "operator"],
        [/[():,\[\]]/, "delimiter"],
        [
          /[A-Za-zÀ-ÿ_][\wÀ-ÿ']*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "identifier",
            },
          },
        ],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
    keywords: KEYWORDS,
  } as languages.IMonarchLanguage);

  monaco.editor.defineTheme("pseudocode-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "5eead4", fontStyle: "bold" },
      { token: "identifier", foreground: "e2e8f0" },
      { token: "number", foreground: "fbbf24" },
      { token: "string", foreground: "86efac" },
      { token: "comment", foreground: "64748b", fontStyle: "italic" },
      { token: "operator", foreground: "38bdf8" },
      { token: "delimiter", foreground: "94a3b8" },
    ],
    colors: {
      "editor.background": "#0b1220",
      "editor.foreground": "#e2e8f0",
      "editorLineNumber.foreground": "#64748b",
      "editorLineNumber.activeForeground": "#5eead4",
      "editor.selectionBackground": "#155e7544",
      "editor.lineHighlightBackground": "#164e6355",
      "editorGutter.background": "#0b1220",
      "editorCursor.foreground": "#5eead4",
    },
  });

  monaco.editor.defineTheme("pseudocode-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "0f766e", fontStyle: "bold" },
      { token: "identifier", foreground: "0f172a" },
      { token: "number", foreground: "b45309" },
      { token: "string", foreground: "166534" },
      { token: "comment", foreground: "64748b", fontStyle: "italic" },
      { token: "operator", foreground: "0369a1" },
    ],
    colors: {
      "editor.background": "#f8fafc",
      "editor.lineHighlightBackground": "#ccfbf155",
    },
  });
}

export function applyDiagnostics(
  monaco: Monaco,
  model: editor.ITextModel,
  diagnostics: Diagnostic[],
): void {
  const markers: editor.IMarkerData[] = diagnostics.map((diagnostic) => ({
    severity: monaco.MarkerSeverity.Error,
    message: diagnostic.message,
    startLineNumber: diagnostic.line,
    startColumn: diagnostic.column,
    endLineNumber: diagnostic.endLine ?? diagnostic.line,
    endColumn: diagnostic.endColumn ?? diagnostic.column + 1,
  }));
  monaco.editor.setModelMarkers(model, LANGUAGE_ID, markers);
}

export { LANGUAGE_ID };
