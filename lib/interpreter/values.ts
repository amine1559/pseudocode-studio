import type { PrimitiveTypeName } from "@/lib/ast/nodes";
import type { ResolvedType } from "@/lib/semantic/types";
import { typeLabel } from "@/lib/semantic/types";

export type RuntimeValue =
  | { type: "entier"; value: number }
  | { type: "reel"; value: number }
  | { type: "chaine"; value: string }
  | { type: "caractere"; value: string }
  | { type: "booleen"; value: boolean }
  | { type: "tableau"; elementType: ResolvedType; elements: RuntimeValue[] }
  | { type: "undefined" };

export function defaultValue(type: ResolvedType): RuntimeValue {
  if (type.kind === "void") return { type: "undefined" };
  if (type.kind === "tableau") {
    return {
      type: "tableau",
      elementType: type.elementType,
      elements: Array.from({ length: type.size }, () => defaultValue(type.elementType)),
    };
  }
  switch (type.name) {
    case "entier":
      return { type: "entier", value: 0 };
    case "reel":
      return { type: "reel", value: 0 };
    case "chaine":
      return { type: "chaine", value: "" };
    case "caractere":
      return { type: "caractere", value: "\0" };
    case "booleen":
      return { type: "booleen", value: false };
  }
}

export function cloneValue(value: RuntimeValue): RuntimeValue {
  if (value.type === "tableau") {
    return {
      type: "tableau",
      elementType: value.elementType,
      elements: value.elements.map(cloneValue),
    };
  }
  return { ...value };
}

export function displayValue(value: RuntimeValue): string {
  switch (value.type) {
    case "undefined":
      return "-";
    case "entier":
      return String(value.value);
    case "reel":
      return Number.isInteger(value.value) ? String(value.value) : String(value.value);
    case "chaine":
      return value.value;
    case "caractere":
      return value.value;
    case "booleen":
      return value.value ? "Vrai" : "Faux";
    case "tableau":
      return `[${value.elements.map(displayValue).join(", ")}]`;
  }
}

export function inspectorValue(value: RuntimeValue): string {
  switch (value.type) {
    case "chaine":
      return `"${value.value}"`;
    case "caractere":
      return `'${value.value}'`;
    default:
      return displayValue(value);
  }
}

export function valueTypeLabel(value: RuntimeValue): string {
  if (value.type === "undefined") return "Indéfini";
  if (value.type === "tableau") {
    return `Tableau[${value.elements.length}] de ${typeLabel(value.elementType)}`;
  }
  return typeLabel({ kind: "primitive", name: value.type });
}

export function coerceTo(value: RuntimeValue, type: ResolvedType): RuntimeValue {
  if (type.kind === "tableau") return cloneValue(value);
  if (type.kind === "void") return { type: "undefined" };
  if (value.type === "undefined") return defaultValue(type);
  if (type.name === "reel" && value.type === "entier") {
    return { type: "reel", value: value.value };
  }
  if (type.name === "chaine" && value.type === "caractere") {
    return { type: "chaine", value: value.value };
  }
  return cloneValue(value);
}

export function isTruthy(value: RuntimeValue): boolean {
  return value.type === "booleen" && value.value;
}

export function asNumber(value: RuntimeValue): number {
  if (value.type === "entier" || value.type === "reel") return value.value;
  throw new Error("Valeur numérique attendue.");
}

export function parseInput(raw: string, type: PrimitiveTypeName): RuntimeValue {
  const text = raw.trim();
  switch (type) {
    case "entier": {
      if (!/^[+-]?\d+$/.test(text)) {
        throw new Error("Un entier est attendu.");
      }
      return { type: "entier", value: Number(text) };
    }
    case "reel": {
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) {
        throw new Error("Un nombre réel est attendu.");
      }
      return { type: "reel", value: Number(text) };
    }
    case "chaine":
      return { type: "chaine", value: raw };
    case "caractere": {
      if (text.length !== 1) {
        throw new Error("Un seul caractère est attendu.");
      }
      return { type: "caractere", value: text };
    }
    case "booleen": {
      const normalized = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      if (["vrai", "v", "1", "oui", "true"].includes(normalized)) {
        return { type: "booleen", value: true };
      }
      if (["faux", "f", "0", "non", "false"].includes(normalized)) {
        return { type: "booleen", value: false };
      }
      throw new Error("Une valeur booléenne est attendue (Vrai ou Faux).");
    }
  }
}
