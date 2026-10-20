import type { PrimitiveTypeName, TypeNode } from "@/lib/ast/nodes";

export type ResolvedType =
  | { kind: "primitive"; name: PrimitiveTypeName }
  | { kind: "tableau"; size: number; elementType: ResolvedType }
  | { kind: "void" };

export function resolveType(node: TypeNode): ResolvedType {
  if (node.kind === "primitive") {
    return { kind: "primitive", name: node.name };
  }
  return {
    kind: "tableau",
    size: node.size,
    elementType: resolveType(node.elementType),
  };
}

export function typeLabel(type: ResolvedType): string {
  if (type.kind === "void") return "Vide";
  if (type.kind === "primitive") {
    switch (type.name) {
      case "entier":
        return "Entier";
      case "reel":
        return "Réel";
      case "chaine":
        return "Chaîne";
      case "caractere":
        return "Caractère";
      case "booleen":
        return "Booléen";
    }
  }
  return `Tableau[${type.size}] de ${typeLabel(type.elementType)}`;
}

export function typesEqual(a: ResolvedType, b: ResolvedType): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "void" || b.kind === "void") return a.kind === b.kind;
  if (a.kind === "primitive" && b.kind === "primitive") return a.name === b.name;
  if (a.kind === "tableau" && b.kind === "tableau") {
    return a.size === b.size && typesEqual(a.elementType, b.elementType);
  }
  return false;
}

export function isNumeric(type: ResolvedType): boolean {
  return type.kind === "primitive" && (type.name === "entier" || type.name === "reel");
}

export function isAssignable(from: ResolvedType, to: ResolvedType): boolean {
  if (typesEqual(from, to)) return true;
  if (from.kind === "primitive" && to.kind === "primitive") {
    if (from.name === "entier" && to.name === "reel") return true;
    if (from.name === "caractere" && to.name === "chaine") return true;
  }
  return false;
}

export function commonNumericType(a: ResolvedType, b: ResolvedType): ResolvedType | null {
  if (!isNumeric(a) || !isNumeric(b)) return null;
  if (a.kind === "primitive" && b.kind === "primitive") {
    if (a.name === "reel" || b.name === "reel") return { kind: "primitive", name: "reel" };
    return { kind: "primitive", name: "entier" };
  }
  return null;
}
