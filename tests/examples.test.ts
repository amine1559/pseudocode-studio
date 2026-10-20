import { describe, expect, it } from "vitest";

import { EXAMPLE_ALGORITHMS } from "@/lib/algorithms/examples";
import { compile } from "@/lib/runtime/compile";
import { runSource } from "@/lib/runtime/run";

const INPUTS: Record<string, string[]> = {
  addition: ["3", "5"],
  moyenne: ["10", "12", "14"],
  "pair-impair": ["7"],
  "max-deux": ["4", "9"],
  "max-trois": ["1", "8", "3"],
  factorielle: ["5"],
  fibonacci: ["6"],
  "table-multiplication": ["3"],
  premier: ["11"],
  palindrome: ["121"],
};

describe("bibliothèque d'exemples", () => {
  it("compile tous les exemples", () => {
    for (const example of EXAMPLE_ALGORITHMS) {
      const result = compile(example.source);
      expect(result.ok, `${example.title} doit compiler`).toBe(true);
    }
  });

  it("exécute tous les exemples", async () => {
    for (const example of EXAMPLE_ALGORITHMS) {
      const result = await runSource(example.source, { inputs: INPUTS[example.id] ?? [] });
      expect(result.error, `${example.title} : ${result.error?.message ?? ""}`).toBeUndefined();
    }
  });
});
