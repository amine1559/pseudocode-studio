import { cloneValue, defaultValue, type RuntimeValue } from "@/lib/interpreter/values";
import type { ResolvedType } from "@/lib/semantic/types";

export interface VariableRecord {
  name: string;
  raw: string;
  type: ResolvedType;
  value: RuntimeValue;
}

export class Environment {
  private readonly values = new Map<string, VariableRecord>();

  constructor(
    private readonly parent: Environment | null = null,
    readonly label = "global",
  ) {}

  declare(name: string, raw: string, type: ResolvedType, value: RuntimeValue = defaultValue(type)): void {
    this.values.set(name, { name, raw, type, value });
  }

  get(name: string): VariableRecord | null {
    return this.values.get(name) ?? this.parent?.get(name) ?? null;
  }

  set(name: string, value: RuntimeValue): VariableRecord {
    const local = this.values.get(name);
    if (local) {
      local.value = value;
      return local;
    }
    if (this.parent) return this.parent.set(name, value);
    throw new Error(`Variable non déclarée : ${name}`);
  }

  locals(): VariableRecord[] {
    return [...this.values.values()].map((record) => ({
      ...record,
      value: cloneValue(record.value),
    }));
  }

  snapshot(): VariableRecord[] {
    const records: VariableRecord[] = this.parent ? this.parent.snapshot() : [];
    records.push(...this.locals());
    return records;
  }
}
