import type {
  AlgorithmDecl,
  Expression,
  FunctionDecl,
  LValue,
  ProcedureDecl,
  Program,
  Statement,
  VarDecl,
} from "@/lib/ast/nodes";
import { Environment, type VariableRecord } from "@/lib/interpreter/environment";
import {
  asNumber,
  cloneValue,
  coerceTo,
  defaultValue,
  displayValue,
  inspectorValue,
  isTruthy,
  parseInput,
  type RuntimeValue,
} from "@/lib/interpreter/values";
import { LanguageError, ReturnSignal, StoppedError } from "@/lib/runtime/errors";
import { DEFAULT_LIMITS, type ExecutionLimits } from "@/lib/runtime/limits";
import { resolveType, typeLabel, type ResolvedType } from "@/lib/semantic/types";
import type { SourceLocation } from "@/types/diagnostics";
import type {
  DebugCommand,
  DebugSnapshot,
  HistoryEntry,
  LoopCounter,
  PausePolicy,
  RuntimeHost,
} from "@/types/runtime";

export interface InterpreterOptions {
  debug?: boolean;
  breakpoints?: Iterable<number>;
  limits?: Partial<ExecutionLimits>;
  initialPolicy?: PausePolicy;
  source?: string;
}

interface CallFrame {
  name: string;
  line: number;
  env: Environment;
}

export class Interpreter {
  private readonly limits: ExecutionLimits;
  private readonly lines: string[];
  private readonly functions = new Map<string, FunctionDecl>();
  private readonly procedures = new Map<string, ProcedureDecl>();
  private readonly breakpoints = new Set<number>();
  private globalEnv: Environment = new Environment(null, "principal");
  private env: Environment = this.globalEnv;
  private callStack: CallFrame[] = [];
  private instructionCount = 0;
  private startedAt = 0;
  private step = 0;
  private outputChars = 0;
  private pausePolicy: PausePolicy;
  private stepOverDepth = 0;
  private history: HistoryEntry[] = [];
  private loops: LoopCounter[] = [];
  private currentLine = 1;

  constructor(
    private readonly program: Program,
    private readonly host: RuntimeHost,
    options: InterpreterOptions = {},
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.lines = (options.source ?? "").split(/\r?\n/);
    this.pausePolicy = options.initialPolicy ?? (options.debug ? "step-into" : "run");
    for (const line of options.breakpoints ?? []) {
      this.breakpoints.add(line);
    }
    for (const fn of program.functions) {
      this.functions.set(fn.name.name, fn);
    }
    for (const proc of program.procedures) {
      this.procedures.set(proc.name.name, proc);
    }
  }

  setBreakpoints(lines: Iterable<number>): void {
    this.breakpoints.clear();
    for (const line of lines) this.breakpoints.add(line);
  }

  async execute(): Promise<void> {
    this.startedAt = Date.now();
    this.globalEnv = new Environment(null, "principal");
    this.env = this.globalEnv;
    this.callStack = [
      {
        name: this.program.algorithm.name.raw,
        line: this.program.algorithm.loc.line,
        env: this.env,
      },
    ];
    this.declareVars(this.program.algorithm.variables, this.globalEnv);
    await this.execBlock(this.program.algorithm.body);
  }

  private declareVars(decls: VarDecl[], env: Environment): void {
    for (const decl of decls) {
      const type = resolveType(decl.type);
      this.assertArrayBudget(type, decl.loc);
      for (const name of decl.names) {
        env.declare(name.name, name.raw, type, defaultValue(type));
      }
    }
  }

  private assertArrayBudget(type: ResolvedType, loc: SourceLocation): void {
    if (type.kind !== "tableau") return;
    if (type.size > this.limits.maxArraySize) {
      throw this.runtime(
        loc,
        "tableau-trop-grand",
        `Allocation de tableau trop grande (${type.size} > ${this.limits.maxArraySize}).`,
      );
    }
    this.assertArrayBudget(type.elementType, loc);
  }

  private async execBlock(statements: Statement[]): Promise<void> {
    for (const stmt of statements) {
      await this.execStatement(stmt);
    }
  }

  private async execStatement(stmt: Statement): Promise<void> {
    this.guard();
    this.currentLine = stmt.loc.line;
    this.callStack[this.callStack.length - 1]!.line = stmt.loc.line;
    this.host.onLine(stmt.loc.line);
    await this.maybePause(stmt);

    switch (stmt.kind) {
      case "assign": {
        const value = await this.evalExpression(stmt.value);
        await this.assign(stmt.target, value, stmt.loc);
        break;
      }
      case "call":
        await this.callCallable(stmt.callee.name, stmt.callee.raw, stmt.args, stmt.loc, false);
        break;
      case "lire":
        for (const target of stmt.targets) {
          await this.execLire(target, stmt.loc);
        }
        break;
      case "ecrire": {
        const parts: string[] = [];
        for (const arg of stmt.args) {
          parts.push(displayValue(await this.evalExpression(arg)));
        }
        this.writeLine(parts.join(""));
        break;
      }
      case "si": {
        let matched = false;
        for (const branch of stmt.branches) {
          const test = await this.evalExpression(branch.test);
          if (isTruthy(test)) {
            await this.execBlock(branch.body);
            matched = true;
            break;
          }
        }
        if (!matched && stmt.elseBody) {
          await this.execBlock(stmt.elseBody);
        }
        break;
      }
      case "pour":
        await this.execPour(stmt);
        break;
      case "tantque":
        await this.execTantQue(stmt);
        break;
      case "repeter":
        await this.execRepeter(stmt);
        break;
      case "retourner": {
        const value = stmt.value ? await this.evalExpression(stmt.value) : { type: "undefined" as const };
        throw new ReturnSignal(value);
      }
    }

    this.recordHistory(stmt);
  }

  private async execPour(stmt: Extract<Statement, { kind: "pour" }>): Promise<void> {
    const start = asNumber(await this.evalExpression(stmt.start));
    const end = asNumber(await this.evalExpression(stmt.end));
    const step = stmt.step ? asNumber(await this.evalExpression(stmt.step)) : 1;
    if (step === 0) {
      throw this.runtime(stmt.loc, "pas-nul", "Le pas d'une boucle Pour ne peut pas être 0.");
    }
    const counter = this.requireVar(stmt.variable.name, stmt.variable.raw, stmt.variable.loc);
    const loopName = `Pour ${stmt.variable.raw}`;
    const loop = { name: loopName, iteration: 0, line: stmt.loc.line };
    this.loops.push(loop);

    const goingUp = step > 0;
    for (let value = start, iterations = 0; goingUp ? value <= end : value >= end; value += step) {
      iterations += 1;
      loop.iteration = iterations;
      this.assertLoop(stmt.loc, iterations);
      const typed: RuntimeValue =
        counter.type.kind === "primitive" && counter.type.name === "reel"
          ? { type: "reel", value }
          : { type: "entier", value: Math.trunc(value) };
      counter.value = typed;
      await this.execBlock(stmt.body);
    }
    this.loops.pop();
  }

  private async execTantQue(stmt: Extract<Statement, { kind: "tantque" }>): Promise<void> {
    const loop = { name: "TantQue", iteration: 0, line: stmt.loc.line };
    this.loops.push(loop);
    while (isTruthy(await this.evalExpression(stmt.test))) {
      loop.iteration += 1;
      this.assertLoop(stmt.loc, loop.iteration);
      await this.execBlock(stmt.body);
    }
    this.loops.pop();
  }

  private async execRepeter(stmt: Extract<Statement, { kind: "repeter" }>): Promise<void> {
    const loop = { name: "Répéter", iteration: 0, line: stmt.loc.line };
    this.loops.push(loop);
    do {
      loop.iteration += 1;
      this.assertLoop(stmt.loc, loop.iteration);
      await this.execBlock(stmt.body);
    } while (!isTruthy(await this.evalExpression(stmt.test)));
    this.loops.pop();
  }

  private async execLire(target: LValue, loc: SourceLocation): Promise<void> {
    const record = this.lvalueRecord(target);
    const type = record.type.kind === "tableau" ? record.type.elementType : record.type;
    if (type.kind !== "primitive") {
      throw this.runtime(loc, "lire-invalide", "Lire() ne peut pas remplir un tableau entier.");
    }
    const name = target.kind === "identifier" ? target.raw : `${target.array.raw}[...]`;
    let parsed: RuntimeValue | null = null;
    while (!parsed) {
      const raw = await this.host.requestInput({
        name,
        type: type.name,
        typeLabel: typeLabel(type),
        line: loc.line,
      });
      try {
        parsed = parseInput(raw, type.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Valeur incorrecte pour Lire().";
        this.writeLine(`⚠ Valeur incorrecte pour Lire() : ${message}`);
      }
    }
    await this.assign(target, parsed, loc);
  }

  private async assign(target: LValue, value: RuntimeValue, loc: SourceLocation): Promise<void> {
    if (target.kind === "identifier") {
      const record = this.requireVar(target.name, target.raw, target.loc);
      record.value = coerceTo(value, record.type);
      return;
    }
    const array = this.requireVar(target.array.name, target.array.raw, target.array.loc);
    if (array.value.type !== "tableau") {
      throw this.runtime(target.array.loc, "pas-un-tableau", `« ${target.array.raw} » n'est pas un tableau.`);
    }
    const index = this.indexValue(await this.evalExpression(target.index), array.value.elements.length, loc);
    array.value.elements[index] = coerceTo(value, array.value.elementType);
  }

  private lvalueRecord(target: LValue): { type: ResolvedType } {
    if (target.kind === "identifier") {
      return this.requireVar(target.name, target.raw, target.loc);
    }
    const array = this.requireVar(target.array.name, target.array.raw, target.array.loc);
    if (array.type.kind !== "tableau") {
      throw this.runtime(target.array.loc, "pas-un-tableau", `« ${target.array.raw} » n'est pas un tableau.`);
    }
    return { type: array.type.elementType };
  }

  private async evalExpression(expr: Expression): Promise<RuntimeValue> {
    this.guard();
    switch (expr.kind) {
      case "identifier":
        return cloneValue(this.requireVar(expr.name, expr.raw, expr.loc).value);
      case "literal":
        return this.literalValue(expr);
      case "unary": {
        const operand = await this.evalExpression(expr.operand);
        if (expr.operator === "non") {
          return { type: "booleen", value: !isTruthy(operand) };
        }
        const n = asNumber(operand);
        return operand.type === "reel" ? { type: "reel", value: -n } : { type: "entier", value: -Math.trunc(n) };
      }
      case "binary":
        if (expr.operator === "et") {
          const left = await this.evalExpression(expr.left);
          if (!isTruthy(left)) return { type: "booleen", value: false };
          return { type: "booleen", value: isTruthy(await this.evalExpression(expr.right)) };
        }
        if (expr.operator === "ou") {
          const left = await this.evalExpression(expr.left);
          if (isTruthy(left)) return { type: "booleen", value: true };
          return { type: "booleen", value: isTruthy(await this.evalExpression(expr.right)) };
        }
        return this.evalBinary(expr.operator, await this.evalExpression(expr.left), await this.evalExpression(expr.right), expr.loc);
      case "index": {
        const array = this.requireVar(expr.array.name, expr.array.raw, expr.array.loc);
        if (array.value.type !== "tableau") {
          throw this.runtime(expr.array.loc, "pas-un-tableau", `« ${expr.array.raw} » n'est pas un tableau.`);
        }
        const index = this.indexValue(await this.evalExpression(expr.index), array.value.elements.length, expr.loc);
        return cloneValue(array.value.elements[index]!);
      }
      case "call":
        return (await this.callCallable(expr.callee.name, expr.callee.raw, expr.args, expr.loc, true)) ?? {
          type: "undefined",
        };
    }
  }

  private literalValue(expr: Extract<Expression, { kind: "literal" }>): RuntimeValue {
    switch (expr.literalKind) {
      case "entier":
        return { type: "entier", value: expr.value as number };
      case "reel":
        return { type: "reel", value: expr.value as number };
      case "chaine":
        return { type: "chaine", value: expr.value as string };
      case "caractere":
        return { type: "caractere", value: expr.value as string };
      case "booleen":
        return { type: "booleen", value: expr.value as boolean };
    }
  }

  private evalBinary(
    operator: string,
    left: RuntimeValue,
    right: RuntimeValue,
    loc: SourceLocation,
  ): RuntimeValue {
    if (operator === "et") return { type: "booleen", value: isTruthy(left) && isTruthy(right) };
    if (operator === "ou") return { type: "booleen", value: isTruthy(left) || isTruthy(right) };

    if (["=", "<>", "<", ">", "<=", ">="].includes(operator)) {
      const cmp = this.compare(left, right, loc);
      switch (operator) {
        case "=":
          return { type: "booleen", value: cmp === 0 };
        case "<>":
          return { type: "booleen", value: cmp !== 0 };
        case "<":
          return { type: "booleen", value: cmp < 0 };
        case ">":
          return { type: "booleen", value: cmp > 0 };
        case "<=":
          return { type: "booleen", value: cmp <= 0 };
        default:
          return { type: "booleen", value: cmp >= 0 };
      }
    }

    if (operator === "+" && (left.type === "chaine" || right.type === "chaine" || left.type === "caractere" || right.type === "caractere")) {
      return { type: "chaine", value: displayValue(left) + displayValue(right) };
    }

    const a = asNumber(left);
    const b = asNumber(right);
    if ((operator === "/" || operator === "div" || operator === "mod") && b === 0) {
      throw this.runtime(loc, "division-zero", "Division par zéro.");
    }

    switch (operator) {
      case "+":
        return this.numeric(left, right, a + b, false);
      case "-":
        return this.numeric(left, right, a - b, false);
      case "*":
        return this.numeric(left, right, a * b, false);
      case "/":
        return { type: "reel", value: a / b };
      case "div":
        return { type: "entier", value: Math.trunc(a / b) };
      case "mod":
        return { type: "entier", value: a % b };
      case "^":
        return this.numeric(left, right, a ** b, false);
      default:
        throw this.runtime(loc, "operateur-inconnu", `Opérateur inconnu : ${operator}.`);
    }
  }

  private numeric(left: RuntimeValue, right: RuntimeValue, value: number, forceReal: boolean): RuntimeValue {
    if (forceReal || left.type === "reel" || right.type === "reel" || !Number.isInteger(value)) {
      return { type: "reel", value };
    }
    return { type: "entier", value };
  }

  private compare(left: RuntimeValue, right: RuntimeValue, loc: SourceLocation): number {
    if ((left.type === "entier" || left.type === "reel") && (right.type === "entier" || right.type === "reel")) {
      return asNumber(left) - asNumber(right);
    }
    if (left.type === "booleen" && right.type === "booleen") {
      return Number(left.value) - Number(right.value);
    }
    if (
      (left.type === "chaine" || left.type === "caractere") &&
      (right.type === "chaine" || right.type === "caractere")
    ) {
      return displayValue(left).localeCompare(displayValue(right), "fr");
    }
    throw this.runtime(loc, "comparaison-invalide", "Comparaison impossible entre ces types.");
  }

  private async callCallable(
    name: string,
    raw: string,
    args: Expression[],
    loc: SourceLocation,
    asExpression: boolean,
  ): Promise<RuntimeValue | null> {
    if (this.callStack.length >= this.limits.maxRecursionDepth) {
      throw this.runtime(
        loc,
        "recursion",
        `Limite de récursion atteinte (${this.limits.maxRecursionDepth}).`,
      );
    }
    const fn = this.functions.get(name);
    const proc = this.procedures.get(name);
    if (!fn && !proc) {
      throw this.runtime(loc, "fonction-inconnue", `Fonction ou procédure inconnue : « ${raw} ».`);
    }
    const decl = (fn ?? proc)!;
    const values: RuntimeValue[] = [];
    for (const arg of args) {
      values.push(await this.evalExpression(arg));
    }
    const child = new Environment(null, decl.name.raw);
    decl.params.forEach((param, index) => {
      const type = resolveType(param.type);
      child.declare(param.name.name, param.name.raw, type, coerceTo(values[index]!, type));
    });
    this.declareVars(decl.variables, child);
    const previous = this.env;
    this.env = child;
    this.callStack.push({ name: decl.name.raw, line: loc.line, env: child });
    try {
      await this.execBlock(decl.body);
      if (fn) {
        throw this.runtime(loc, "retour-manquant", `La fonction « ${raw} » s'est terminée sans Retourner.`);
      }
      return null;
    } catch (error) {
      if (error instanceof ReturnSignal) {
        if (!fn) return null;
        return coerceTo(error.value as RuntimeValue, resolveType(fn.returnType));
      }
      throw error;
    } finally {
      this.callStack.pop();
      this.env = previous;
    }
    void asExpression;
  }

  private requireVar(name: string, raw: string, loc: SourceLocation): VariableRecord {
    const record = this.env.get(name);
    if (!record) {
      throw this.runtime(loc, "variable-non-declaree", `Variable non déclarée : « ${raw} ».`);
    }
    return record;
  }

  private indexValue(value: RuntimeValue, length: number, loc: SourceLocation): number {
    const index = Math.trunc(asNumber(value));
    if (index < 0 || index >= length) {
      throw this.runtime(
        loc,
        "indice-invalide",
        `Indice de tableau invalide : ${index}. Les indices valides vont de 0 à ${length - 1}.`,
      );
    }
    return index;
  }

  private async maybePause(stmt: Statement): Promise<void> {
    if (this.host.isCancelled()) throw new StoppedError();
    const depth = this.callStack.length;
    const hitBreakpoint = this.breakpoints.has(stmt.loc.line);
    const shouldPause =
      this.pausePolicy === "step-into" ||
      (this.pausePolicy === "step-over" && depth <= this.stepOverDepth) ||
      (this.pausePolicy !== "run" && hitBreakpoint) ||
      (this.pausePolicy === "continue" && hitBreakpoint) ||
      (this.pausePolicy === "run" && hitBreakpoint);

    if (!shouldPause) return;
    const command = await this.host.onPause(this.snapshot(stmt.loc.line));
    this.applyCommand(command, depth);
  }

  private applyCommand(command: DebugCommand, depth: number): void {
    switch (command) {
      case "step-into":
        this.pausePolicy = "step-into";
        break;
      case "step-over":
        this.pausePolicy = "step-over";
        this.stepOverDepth = depth;
        break;
      case "continue":
        this.pausePolicy = "continue";
        break;
      case "stop":
        throw new StoppedError();
    }
  }

  private snapshot(line: number): DebugSnapshot {
    const variables = this.collectVariables();
    return {
      line,
      instruction: this.lineText(line),
      step: this.step,
      variables,
      callStack: this.callStack.map((frame) => ({ name: frame.name, line: frame.line })),
      history: this.history.slice(-80),
      loops: this.loops.map((loop) => ({ ...loop })),
    };
  }

  private collectVariables() {
    const result: DebugSnapshot["variables"] = [];
    for (const record of this.globalEnv.locals()) {
      result.push({
        name: record.raw,
        type: typeLabel(record.type),
        value: inspectorValue(record.value),
        scope: this.program.algorithm.name.raw,
      });
    }
    for (const frame of this.callStack.slice(1)) {
      for (const record of frame.env.locals()) {
        result.push({
          name: record.raw,
          type: typeLabel(record.type),
          value: inspectorValue(record.value),
          scope: frame.name,
        });
      }
    }
    return result;
  }

  private recordHistory(stmt: Statement): void {
    this.step += 1;
    const variables: Record<string, string> = {};
    for (const record of this.env.snapshot()) {
      variables[record.raw] = inspectorValue(record.value);
    }
    this.history.push({
      step: this.step,
      line: stmt.loc.line,
      instruction: this.lineText(stmt.loc.line),
      variables,
    });
    if (this.history.length > 200) this.history.shift();
  }

  private lineText(line: number): string {
    return this.lines[line - 1]?.trim() || `ligne ${line}`;
  }

  private writeLine(text: string): void {
    this.outputChars += text.length + 1;
    if (this.outputChars > this.limits.maxOutputChars) {
      throw this.runtime(
        { line: this.currentLine, column: 1, endLine: this.currentLine, endColumn: 1 },
        "sortie-limite",
        "La sortie console a dépassé la taille maximale autorisée.",
      );
    }
    this.host.output(text);
  }

  private guard(): void {
    if (this.host.isCancelled()) throw new StoppedError();
    this.instructionCount += 1;
    if (this.instructionCount > this.limits.maxInstructions) {
      throw this.runtime(
        { line: this.currentLine, column: 1, endLine: this.currentLine, endColumn: 1 },
        "boucle-infinie",
        "Boucle infinie probable : la limite d'instructions a été atteinte.",
      );
    }
    if (Date.now() - this.startedAt > this.limits.maxMilliseconds) {
      throw this.runtime(
        { line: this.currentLine, column: 1, endLine: this.currentLine, endColumn: 1 },
        "temps-depasse",
        "Temps d'exécution maximal dépassé.",
      );
    }
  }

  private assertLoop(loc: SourceLocation, iteration: number): void {
    this.guard();
    if (iteration > this.limits.maxLoopIterations) {
      throw this.runtime(
        loc,
        "boucle-infinie",
        "Boucle infinie probable : trop d'itérations.",
      );
    }
  }

  private runtime(loc: SourceLocation, code: string, message: string): LanguageError {
    return new LanguageError("execution", code, message, loc.line, loc.column, loc.endLine, loc.endColumn);
  }
}

export function algorithmName(algorithm: AlgorithmDecl): string {
  return algorithm.name.raw;
}
