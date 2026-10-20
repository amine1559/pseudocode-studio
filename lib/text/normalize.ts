export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeKeyword(value: string): string {
  return stripAccents(value).replace(/['’]/g, "").toUpperCase();
}

export function normalizeIdentifier(value: string): string {
  return stripAccents(value).toLowerCase();
}
