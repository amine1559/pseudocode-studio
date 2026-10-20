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
import { LanguageError } from "@/lib/runtime/errors";
import {
  commonNumericType,
  isAssignable,
  isNumeric,
  resolveType,
  type ResolvedType,
  typeLabel,
  typesEqual,
} from "@/lib/semantic/types";
import type { Diagnostic, SourceLocation } from "@/types/diagnostics";

interface SymbolInfo {
  name: string;
  raw: string;
  type: ResolvedType;
  loc: SourceLocation;
}

interface CallableInfo {
  kind: "fonction" | "procedure";
  name: string;
  params: ResolvedType[];
  returnType: ResolvedType;
  loc: SourceLocation;
}

class Scope {
  private readonly symbols = new Map<string, SymbolInfo>();

  constructor(private readonly parent: Scope | null = null) {}

  declare(info: SymbolInfo): void {
    if (this.symbols.has(info.name)) {
      throw new LanguageError(
        "semantique",
        "variable-redeclaree",
        `La variable « ${info.raw} » est déjà déclarée.`,
        info.loc.line,
        info.loc.column,
        info.loc.endLine,
        info.loc.endColumn,
      );
    }
    this.symbols.set(info.name, info);
  }

  lookup(name: string): SymbolInfo | null {
    return this.symbols.get(name) ?? this.parent?.lookup(name) ?? null;
  }
}

export function analyze(program: Program): Diagnostic[] {
  const analyzer = new SemanticAnalyzer(program);
  return analyzer.analyze();
}

class SemanticAnalyzer {
  private readonly callables = new Map<string, CallableInfo>();
  private readonly errors: Diagnostic[] = [];
  private currentReturn: ResolvedType | null = null;
  private inLoop = 0;

  constructor(private readonly program: Program) {}

  analyze(): Diagnostic[] {
    try {
      this.registerCallables();
      this.analyzeAlgorithm(this.program.algorithm);
      for (const fn of this.program.functions) {
        this.analyzeFunction(fn);
      }
      for (const proc of this.program.procedures) {
        this.analyzeProcedure(proc);
      }
    } catch (error) {
      if (error instanceof LanguageError) {
        this.errors.push(error.toDiagnostic());
      } else {
        throw error;
      }
    }
    return this.errors;
  }

  private registerCallables(): void {
    const names = new Set<string>();
    const register = (name: string, raw: string, loc: SourceLocation, info: CallableInfo) => {
      if (names.has(name)) {
        throw new LanguageError(
          "semantique",
          "symbole-redeclare",
          `« ${raw} » est déjà déclaré.`,
          loc.line,
          loc.column,
          loc.endLine,
          loc.endColumn,
        );
      }
      names.add(name);
      this.callables.set(name, info);
    };

    for (const fn of this.program.functions) {
      register(fn.name.name, fn.name.raw, fn.name.loc, {
        kind: "fonction",
        name: fn.name.name,
        params: fn.params.map((p) => resolveType(p.type)),
        returnType: resolveType(fn.returnType),
        loc: fn.loc,
      });
    }
    for (const proc of this.program.procedures) {
      register(proc.name.name, proc.name.raw, proc.name.loc, {
        kind: "procedure",
        name: proc.name.name,
        params: proc.params.map((p) => resolveType(p.type)),
        returnType: { kind: "void" },
        loc: proc.loc,
      });
    }
  }

  private analyzeAlgorithm(algorithm: AlgorithmDecl): void {
    const scope = new Scope();
    this.declareVars(scope, algorithm.variables);
    this.currentReturn = null;
    this.analyzeStatements(algorithm.body, scope);
  }

  private analyzeFunction(fn: FunctionDecl): void {
    const scope = new Scope();
    for (const param of fn.params) {
      scope.declare({
        name: param.name.name,
        raw: param.name.raw,
        type: resolveType(param.type),
        loc: param.loc,
      });
    }
    this.declareVars(scope, fn.variables);
    this.currentReturn = resolveType(fn.returnType);
    this.analyzeStatements(fn.body, scope);
  }

  private analyzeProcedure(proc: ProcedureDecl): void {
    const scope = new Scope();
    for (const param of proc.params) {
      scope.declare({
        name: param.name.name,
        raw: param.name.raw,
        type: resolveType(param.type),
        loc: param.loc,
      });
    }
    this.declareVars(scope, proc.variables);
    this.currentReturn = { kind: "void" };
    this.analyzeStatements(proc.body, scope);
  }

  private declareVars(scope: Scope, decls: VarDecl[]): void {
    for (const decl of decls) {
      const type = resolveType(decl.type);
      this.assertArrayLimit(type, decl.loc);
      for (const name of decl.names) {
        if (this.callables.has(name.name)) {
          this.fail(
            name.loc,
            "nom-reserve",
            `« ${name.raw} » est déjà utilisé comme fonction ou procédure.`,
          );
        }
        scope.declare({
          name: name.name,
          raw: name.raw,
          type,
          loc: name.loc,
        });
      }
    }
  }

  private assertArrayLimit(type: ResolvedType, loc: SourceLocation): void {
    if (type.kind !== "tableau") return;
    if (type.size > 10_000) {
      this.fail(loc, "tableau-trop-grand", "La taille du tableau dépasse la limite autorisée (10000).");
    }
    this.assertArrayLimit(type.elementType, loc);
  }

  private analyzeStatements(statements: Statement[], scope: Scope): void {
    for (const stmt of statements) {
      this.analyzeStatement(stmt, scope);
    }
  }

  private analyzeStatement(stmt: Statement, scope: Scope): void {
    switch (stmt.kind) {
      case "assign": {
        const targetType = this.analyzeLValue(stmt.target, scope);
        const valueType = this.analyzeExpression(stmt.value, scope);
        if (!isAssignable(valueType, targetType)) {
          this.fail(
            stmt.loc,
            "type-incompatible",
            `Type incompatible : impossible d'affecter ${typeLabel(valueType)} à ${typeLabel(targetType)}.`,
          );
        }
        break;
      }
      case "call":
        this.analyzeCall(stmt.callee.name, stmt.callee.raw, stmt.args, stmt.loc, scope, false);
        break;
      case "lire":
        for (const target of stmt.targets) {
          const type = this.analyzeLValue(target, scope);
          if (type.kind !== "primitive") {
            this.fail(target.loc, "lire-tableau", "Lire() attend une variable primitive, pas un tableau entier.");
          }
        }
        break;
      case "ecrire":
        for (const arg of stmt.args) {
          this.analyzeExpression(arg, scope);
        }
        break;
      case "si":
        for (const branch of stmt.branches) {
          const testType = this.analyzeExpression(branch.test, scope);
          this.expectBoolean(testType, branch.test.loc);
          this.analyzeStatements(branch.body, scope);
        }
        if (stmt.elseBody) this.analyzeStatements(stmt.elseBody, scope);
        break;
      case "pour": {
        const counter = scope.lookup(stmt.variable.name);
        if (!counter) {
          this.undeclared(stmt.variable.raw, stmt.variable.loc);
          break;
        }
        if (!(counter.type.kind === "primitive" && (counter.type.name === "entier" || counter.type.name === "reel"))) {
          this.fail(stmt.variable.loc, "compteur-type", "Le compteur d'une boucle Pour doit être numérique.");
        }
        this.expectNumeric(this.analyzeExpression(stmt.start, scope), stmt.start.loc);
        this.expectNumeric(this.analyzeExpression(stmt.end, scope), stmt.end.loc);
        if (stmt.step) this.expectNumeric(this.analyzeExpression(stmt.step, scope), stmt.step.loc);
        this.inLoop += 1;
        this.analyzeStatements(stmt.body, scope);
        this.inLoop -= 1;
        break;
      }
      case "tantque":
        this.expectBoolean(this.analyzeExpression(stmt.test, scope), stmt.test.loc);
        this.inLoop += 1;
        this.analyzeStatements(stmt.body, scope);
        this.inLoop -= 1;
        break;
      case "repeter":
        this.inLoop += 1;
        this.analyzeStatements(stmt.body, scope);
        this.inLoop -= 1;
        this.expectBoolean(this.analyzeExpression(stmt.test, scope), stmt.test.loc);
        break;
      case "retourner":
        if (this.currentReturn === null) {
          this.fail(stmt.loc, "retour-interdit", "Retourner n'est autorisé que dans une fonction ou une procédure.");
          break;
        }
        if (this.currentReturn.kind === "void") {
          if (stmt.value) {
            this.fail(stmt.loc, "retour-procedure", "Une procédure ne peut pas retourner de valeur.");
          }
        } else if (!stmt.value) {
          this.fail(stmt.loc, "retour-manquant", "La fonction doit retourner une valeur.");
        } else {
          const valueType = this.analyzeExpression(stmt.value, scope);
          if (!isAssignable(valueType, this.currentReturn)) {
            this.fail(
              stmt.loc,
              "type-incompatible",
              `Type de retour incompatible : ${typeLabel(valueType)} au lieu de ${typeLabel(this.currentReturn)}.`,
            );
          }
        }
        break;
    }
  }

  private analyzeLValue(target: LValue, scope: Scope): ResolvedType {
    if (target.kind === "identifier") {
      const symbol = scope.lookup(target.name);
      if (!symbol) {
        this.undeclared(target.raw, target.loc);
        return { kind: "primitive", name: "entier" };
      }
      return symbol.type;
    }
    const array = scope.lookup(target.array.name);
    if (!array) {
      this.undeclared(target.array.raw, target.array.loc);
      return { kind: "primitive", name: "entier" };
    }
    if (array.type.kind !== "tableau") {
      this.fail(target.array.loc, "pas-un-tableau", `« ${target.array.raw} » n'est pas un tableau.`);
      return { kind: "primitive", name: "entier" };
    }
    this.expectNumeric(this.analyzeExpression(target.index, scope), target.index.loc);
    return array.type.elementType;
  }

  private analyzeExpression(expr: Expression, scope: Scope): ResolvedType {
    switch (expr.kind) {
      case "identifier": {
        const symbol = scope.lookup(expr.name);
        if (!symbol) {
          this.undeclared(expr.raw, expr.loc);
          return { kind: "primitive", name: "entier" };
        }
        return symbol.type;
      }
      case "literal":
        return { kind: "primitive", name: expr.literalKind };
      case "unary": {
        const operand = this.analyzeExpression(expr.operand, scope);
        if (expr.operator === "non") {
          this.expectBoolean(operand, expr.loc);
          return { kind: "primitive", name: "booleen" };
        }
        this.expectNumeric(operand, expr.loc);
        return operand;
      }
      case "binary":
        return this.analyzeBinary(expr.operator, expr.left, expr.right, expr.loc, scope);
      case "index":
        return this.analyzeLValue(expr, scope);
      case "call":
        return this.analyzeCall(expr.callee.name, expr.callee.raw, expr.args, expr.loc, scope, true);
    }
  }

  private analyzeBinary(
    operator: string,
    leftExpr: Expression,
    rightExpr: Expression,
    loc: SourceLocation,
    scope: Scope,
  ): ResolvedType {
    const left = this.analyzeExpression(leftExpr, scope);
    const right = this.analyzeExpression(rightExpr, scope);

    if (operator === "et" || operator === "ou") {
      this.expectBoolean(left, leftExpr.loc);
      this.expectBoolean(right, rightExpr.loc);
      return { kind: "primitive", name: "booleen" };
    }

    if (["=", "<>", "<", ">", "<=", ">="].includes(operator)) {
      const comparable =
        typesEqual(left, right) ||
        (isNumeric(left) && isNumeric(right)) ||
        (left.kind === "primitive" &&
          right.kind === "primitive" &&
          ((left.name === "chaine" && right.name === "caractere") ||
            (left.name === "caractere" && right.name === "chaine")));
      if (!comparable) {
        this.fail(loc, "comparaison-invalide", `Impossible de comparer ${typeLabel(left)} et ${typeLabel(right)}.`);
      }
      return { kind: "primitive", name: "booleen" };
    }

    if (operator === "+" && (this.isText(left) || this.isText(right))) {
      return { kind: "primitive", name: "chaine" };
    }

    const numeric = commonNumericType(left, right);
    if (!numeric) {
      this.fail(loc, "arithmetique-invalide", `Opération arithmétique invalide entre ${typeLabel(left)} et ${typeLabel(right)}.`);
      return { kind: "primitive", name: "entier" };
    }
    if (operator === "/") return { kind: "primitive", name: "reel" };
    if (operator === "div" || operator === "mod") return { kind: "primitive", name: "entier" };
    return numeric;
  }

  private analyzeCall(
    name: string,
    raw: string,
    args: Expression[],
    loc: SourceLocation,
    scope: Scope,
    asExpression: boolean,
  ): ResolvedType {
    const callable = this.callables.get(name);
    if (!callable) {
      this.fail(loc, "fonction-inconnue", `Fonction ou procédure non déclarée : « ${raw} ».`);
      return { kind: "primitive", name: "entier" };
    }
    if (asExpression && callable.kind === "procedure") {
      this.fail(loc, "procedure-en-expression", `« ${raw} » est une procédure et ne retourne pas de valeur.`);
    }
    if (args.length !== callable.params.length) {
      this.fail(
        loc,
        "arguments",
        `« ${raw} » attend ${callable.params.length} argument(s), reçu ${args.length}.`,
      );
    }
    const count = Math.min(args.length, callable.params.length);
    for (let i = 0; i < count; i += 1) {
      const argType = this.analyzeExpression(args[i]!, scope);
      const paramType = callable.params[i]!;
      if (!isAssignable(argType, paramType)) {
        this.fail(
          args[i]!.loc,
          "type-incompatible",
          `Argument ${i + 1} : ${typeLabel(argType)} incompatible avec ${typeLabel(paramType)}.`,
        );
      }
    }
    return callable.returnType;
  }

  private isText(type: ResolvedType): boolean {
    return type.kind === "primitive" && (type.name === "chaine" || type.name === "caractere");
  }

  private expectBoolean(type: ResolvedType, loc: SourceLocation): void {
    if (!(type.kind === "primitive" && type.name === "booleen")) {
      this.fail(loc, "booleen-attendu", `Une expression booléenne est attendue, pas ${typeLabel(type)}.`);
    }
  }

  private expectNumeric(type: ResolvedType, loc: SourceLocation): void {
    if (!isNumeric(type)) {
      this.fail(loc, "nombre-attendu", `Une expression numérique est attendue, pas ${typeLabel(type)}.`);
    }
  }

  private undeclared(raw: string, loc: SourceLocation): void {
    this.fail(loc, "variable-non-declaree", `Variable non déclarée : « ${raw} ».`);
  }

  private fail(loc: SourceLocation, code: string, message: string): void {
    this.errors.push({
      kind: "semantique",
      code,
      message,
      line: loc.line,
      column: loc.column,
      endLine: loc.endLine,
      endColumn: loc.endColumn,
    });
  }
}
