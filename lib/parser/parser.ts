import type {
  AlgorithmDecl,
  BinaryOperator,
  Declaration,
  Expression,
  FunctionDecl,
  IdentifierNode,
  LValue,
  Parameter,
  ProcedureDecl,
  Program,
  Statement,
  TypeNode,
  VarDecl,
} from "@/lib/ast/nodes";
import { BLOCK_END_KINDS } from "@/lib/lexer/keywords";
import { LanguageError } from "@/lib/runtime/errors";
import { normalizeIdentifier } from "@/lib/text/normalize";
import type { SourceLocation } from "@/types/diagnostics";
import type { Token, TokenKind } from "@/types/tokens";

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Program {
    const declarations: Declaration[] = [];
    const start = this.current();

    while (!this.check("EOF")) {
      if (this.check("ALGORITHME")) {
        declarations.push(this.parseAlgorithm());
      } else if (this.check("FONCTION")) {
        declarations.push(this.parseFunction());
      } else if (this.check("PROCEDURE")) {
        declarations.push(this.parseProcedure());
      } else {
        throw this.error(
          "declaration-inattendue",
          `Déclaration inattendue « ${this.current().lexeme} ». Un algorithme, une fonction ou une procédure est attendu.`,
        );
      }
    }

    const algorithms = declarations.filter((d): d is AlgorithmDecl => d.kind === "algorithme");
    if (algorithms.length === 0) {
      throw this.error("algorithme-manquant", "Un algorithme principal est obligatoire.");
    }
    if (algorithms.length > 1) {
      throw this.errorAt(
        algorithms[1]!.loc,
        "algorithme-multiple",
        "Un seul algorithme principal est autorisé.",
      );
    }

    return {
      kind: "program",
      algorithm: algorithms[0]!,
      functions: declarations.filter((d): d is FunctionDecl => d.kind === "fonction"),
      procedures: declarations.filter((d): d is ProcedureDecl => d.kind === "procedure"),
      loc: this.span(start, this.previous()),
    };
  }

  private parseAlgorithm(): AlgorithmDecl {
    const start = this.consume("ALGORITHME", "Le mot-clé Algorithme est attendu.");
    const name = this.parseIdentifier("Le nom de l'algorithme est attendu.");
    const variables = this.parseOptionalVariables();
    this.consume("DEBUT", "Le mot-clé Début est attendu.");
    const body = this.parseStatements();
    const end = this.consume("FIN", "Le mot-clé Fin est attendu pour clôturer l'algorithme.");
    return {
      kind: "algorithme",
      name,
      variables,
      body,
      loc: this.span(start, end),
    };
  }

  private parseFunction(): FunctionDecl {
    const start = this.consume("FONCTION", "Le mot-clé Fonction est attendu.");
    const name = this.parseIdentifier("Le nom de la fonction est attendu.");
    this.consume("LPAREN", "Une parenthèse ouvrante est attendue après le nom de la fonction.");
    const params = this.parseParameters();
    this.consume("RPAREN", "Une parenthèse fermante est attendue après les paramètres.");
    this.consume("COLON", "Le symbole « : » est attendu avant le type de retour.");
    const returnType = this.parseType();
    const variables = this.parseOptionalVariables();
    this.consume("DEBUT", "Le mot-clé Début est attendu dans la fonction.");
    const body = this.parseStatements();
    const end = this.consume("FINFONCTION", "FinFonction est manquant.");
    return {
      kind: "fonction",
      name,
      params,
      returnType,
      variables,
      body,
      loc: this.span(start, end),
    };
  }

  private parseProcedure(): ProcedureDecl {
    const start = this.consume("PROCEDURE", "Le mot-clé Procédure est attendu.");
    const name = this.parseIdentifier("Le nom de la procédure est attendu.");
    this.consume("LPAREN", "Une parenthèse ouvrante est attendue après le nom de la procédure.");
    const params = this.parseParameters();
    this.consume("RPAREN", "Une parenthèse fermante est attendue après les paramètres.");
    const variables = this.parseOptionalVariables();
    this.consume("DEBUT", "Le mot-clé Début est attendu dans la procédure.");
    const body = this.parseStatements();
    const end = this.consume("FINPROCEDURE", "FinProcédure est manquant.");
    return {
      kind: "procedure",
      name,
      params,
      variables,
      body,
      loc: this.span(start, end),
    };
  }

  private parseOptionalVariables(): VarDecl[] {
    if (!this.match("VARIABLES")) return [];
    const decls: VarDecl[] = [];
    while (this.check("IDENTIFIER")) {
      decls.push(this.parseVarDecl());
    }
    if (decls.length === 0) {
      throw this.error("variables-vides", "Au moins une déclaration de variable est attendue après Variables.");
    }
    return decls;
  }

  private parseVarDecl(): VarDecl {
    const names = [this.parseIdentifier("Un identifiant de variable est attendu.")];
    while (this.match("COMMA")) {
      names.push(this.parseIdentifier("Un identifiant de variable est attendu."));
    }
    this.consume("COLON", "Le symbole « : » est attendu après le nom de la variable.");
    const type = this.parseType();
    return {
      names,
      type,
      loc: this.spanTokens(names[0]!.loc, type.loc),
    };
  }

  private parseParameters(): Parameter[] {
    if (this.check("RPAREN")) return [];
    const params = [this.parseParameter()];
    while (this.match("COMMA")) {
      params.push(this.parseParameter());
    }
    return params;
  }

  private parseParameter(): Parameter {
    const name = this.parseIdentifier("Le nom du paramètre est attendu.");
    this.consume("COLON", "Le symbole « : » est attendu après le nom du paramètre.");
    const type = this.parseType();
    return {
      name,
      type,
      loc: this.spanTokens(name.loc, type.loc),
    };
  }

  private parseType(): TypeNode {
    const token = this.current();
    if (this.match("ENTIER")) return { kind: "primitive", name: "entier", loc: this.loc(token) };
    if (this.match("REEL")) return { kind: "primitive", name: "reel", loc: this.loc(token) };
    if (this.match("CHAINE")) return { kind: "primitive", name: "chaine", loc: this.loc(token) };
    if (this.match("CARACTERE")) return { kind: "primitive", name: "caractere", loc: this.loc(token) };
    if (this.match("BOOLEEN")) return { kind: "primitive", name: "booleen", loc: this.loc(token) };
    if (this.match("TABLEAU")) {
      this.consume("LBRACKET", "Le crochet ouvrant « [ » est attendu après Tableau.");
      const sizeToken = this.consume("NUMBER", "La taille du tableau doit être un entier littéral.");
      if (sizeToken.lexeme.includes(".")) {
        throw this.errorAt(this.loc(sizeToken), "taille-tableau", "La taille d'un tableau doit être un entier.");
      }
      const size = Number(sizeToken.lexeme);
      if (!Number.isInteger(size) || size <= 0) {
        throw this.errorAt(this.loc(sizeToken), "taille-tableau", "La taille d'un tableau doit être un entier strictement positif.");
      }
      this.consume("RBRACKET", "Le crochet fermant « ] » est attendu.");
      this.consume("DE", "Le mot-clé « de » est attendu dans la déclaration de tableau.");
      const elementType = this.parseType();
      return {
        kind: "tableau",
        size,
        elementType,
        loc: this.span(token, this.previous()),
      };
    }
    throw this.error("type-attendu", "Un type est attendu (Entier, Réel, Chaîne, Caractère, Booléen ou Tableau).");
  }

  private parseStatements(): Statement[] {
    const statements: Statement[] = [];
    while (!this.isAtEndOfBlock()) {
      statements.push(this.parseStatement());
    }
    return statements;
  }

  private parseStatement(): Statement {
    if (this.check("SI")) return this.parseSi();
    if (this.check("POUR")) return this.parsePour();
    if (this.check("TANTQUE")) return this.parseTantQue();
    if (this.check("REPETER")) return this.parseRepeter();
    if (this.check("RETOURNER")) return this.parseRetourner();
    if (this.check("LIRE")) return this.parseLire();
    if (this.check("ECRIRE")) return this.parseEcrire();
    if (this.check("IDENTIFIER")) return this.parseAssignOrCall();
    throw this.error(
      "instruction-inattendue",
      `Instruction inattendue « ${this.current().lexeme} ».`,
    );
  }

  private parseSi(): Statement {
    const start = this.consume("SI", "Le mot-clé Si est attendu.");
    const test = this.parseExpression();
    this.consume("ALORS", "Le mot-clé Alors est attendu après la condition.");
    const body = this.parseStatements();
    const branches: { test: Expression; body: Statement[]; loc: SourceLocation }[] = [
      { test, body, loc: this.span(start, this.previous()) },
    ];

    while (this.match("SINONSI")) {
      const elseifStart = this.previous();
      const elseifTest = this.parseExpression();
      this.consume("ALORS", "Le mot-clé Alors est attendu après SinonSi.");
      const elseifBody = this.parseStatements();
      branches.push({
        test: elseifTest,
        body: elseifBody,
        loc: this.span(elseifStart, this.previous()),
      });
    }

    let elseBody: Statement[] | null = null;
    if (this.match("SINON")) {
      elseBody = this.parseStatements();
    }

    const end = this.consume("FINSI", "FinSi manquant.");
    return {
      kind: "si",
      branches,
      elseBody,
      loc: this.span(start, end),
    };
  }

  private parsePour(): Statement {
    const start = this.consume("POUR", "Le mot-clé Pour est attendu.");
    const variable = this.parseIdentifier("Le compteur de la boucle Pour est attendu.");
    this.consume("ASSIGN", "L'opérateur d'affectation « <- » est attendu dans la boucle Pour.");
    const startExpr = this.parseExpression();
    this.consumeA();
    const endExpr = this.parseExpression();
    let step: Expression | null = null;
    if (this.match("PAS")) {
      step = this.parseExpression();
    }
    this.consume("FAIRE", "Le mot-clé Faire est attendu dans la boucle Pour.");
    const body = this.parseStatements();
    const end = this.consume("FINPOUR", "FinPour manquant.");
    return {
      kind: "pour",
      variable,
      start: startExpr,
      end: endExpr,
      step,
      body,
      loc: this.span(start, end),
    };
  }

  private parseTantQue(): Statement {
    const start = this.consume("TANTQUE", "Le mot-clé TantQue est attendu.");
    const test = this.parseExpression();
    this.consume("FAIRE", "Le mot-clé Faire est attendu après la condition TantQue.");
    const body = this.parseStatements();
    const end = this.consume("FINTANTQUE", "FinTantQue manquant.");
    return {
      kind: "tantque",
      test,
      body,
      loc: this.span(start, end),
    };
  }

  private parseRepeter(): Statement {
    const start = this.consume("REPETER", "Le mot-clé Répéter est attendu.");
    const body = this.parseStatements();
    this.consume("JUSQUA", "JusquA est attendu pour clôturer la boucle Répéter.");
    const test = this.parseExpression();
    return {
      kind: "repeter",
      body,
      test,
      loc: this.span(start, this.previous()),
    };
  }

  private parseRetourner(): Statement {
    const start = this.consume("RETOURNER", "Le mot-clé Retourner est attendu.");
    const value = this.isAtEndOfBlock() ? null : this.parseExpression();
    return {
      kind: "retourner",
      value,
      loc: this.span(start, this.previous()),
    };
  }

  private parseLire(): Statement {
    const start = this.consume("LIRE", "Le mot-clé Lire est attendu.");
    this.consume("LPAREN", "Une parenthèse ouvrante est attendue après Lire.");
    const targets = [this.parseLValue()];
    while (this.match("COMMA")) {
      targets.push(this.parseLValue());
    }
    const end = this.consume("RPAREN", "Une parenthèse fermante est attendue après Lire.");
    return { kind: "lire", targets, loc: this.span(start, end) };
  }

  private parseEcrire(): Statement {
    const start = this.consume("ECRIRE", "Le mot-clé Ecrire est attendu.");
    this.consume("LPAREN", "Une parenthèse ouvrante est attendue après Ecrire.");
    const args: Expression[] = [];
    if (!this.check("RPAREN")) {
      args.push(this.parseExpression());
      while (this.match("COMMA")) {
        args.push(this.parseExpression());
      }
    }
    const end = this.consume("RPAREN", "Une parenthèse fermante est attendue après Ecrire.");
    return { kind: "ecrire", args, loc: this.span(start, end) };
  }

  private parseAssignOrCall(): Statement {
    const identifier = this.parseIdentifier("Un identifiant est attendu.");
    if (this.match("LPAREN")) {
      const args = this.parseArgumentList();
      const end = this.consume("RPAREN", "Une parenthèse fermante est attendue après l'appel.");
      return {
        kind: "call",
        callee: identifier,
        args,
        loc: this.spanTokens(identifier.loc, this.loc(end)),
      };
    }

    let target: LValue = identifier;
    if (this.match("LBRACKET")) {
      const index = this.parseExpression();
      const close = this.consume("RBRACKET", "Un crochet fermant est attendu après l'indice.");
      target = {
        kind: "index",
        array: identifier,
        index,
        loc: this.spanTokens(identifier.loc, this.loc(close)),
      };
    }

    this.consume("ASSIGN", "L'opérateur d'affectation « <- » est attendu.");
    const value = this.parseExpression();
    return {
      kind: "assign",
      target,
      value,
      loc: this.spanTokens(target.loc, value.loc),
    };
  }

  private parseLValue(): LValue {
    const identifier = this.parseIdentifier("Une variable est attendue.");
    if (this.match("LBRACKET")) {
      const index = this.parseExpression();
      const close = this.consume("RBRACKET", "Un crochet fermant est attendu après l'indice.");
      return {
        kind: "index",
        array: identifier,
        index,
        loc: this.spanTokens(identifier.loc, this.loc(close)),
      };
    }
    return identifier;
  }

  private parseArgumentList(): Expression[] {
    if (this.check("RPAREN")) return [];
    const args = [this.parseExpression()];
    while (this.match("COMMA")) {
      args.push(this.parseExpression());
    }
    return args;
  }

  private parseExpression(): Expression {
    return this.parseOu();
  }

  private parseOu(): Expression {
    let expr = this.parseEt();
    while (this.match("OU")) {
      const op = this.previous();
      const right = this.parseEt();
      expr = {
        kind: "binary",
        operator: "ou",
        left: expr,
        right,
        loc: this.spanTokens(expr.loc, right.loc),
      };
      void op;
    }
    return expr;
  }

  private parseEt(): Expression {
    let expr = this.parseNon();
    while (this.match("ET")) {
      const right = this.parseNon();
      expr = {
        kind: "binary",
        operator: "et",
        left: expr,
        right,
        loc: this.spanTokens(expr.loc, right.loc),
      };
    }
    return expr;
  }

  private parseNon(): Expression {
    if (this.match("NON")) {
      const start = this.previous();
      const operand = this.parseNon();
      return {
        kind: "unary",
        operator: "non",
        operand,
        loc: this.span(start, this.previous()),
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    const left = this.parseAdditive();
    const operator = this.matchComparison();
    if (!operator) return left;
    const right = this.parseAdditive();
    return {
      kind: "binary",
      operator,
      left,
      right,
      loc: this.spanTokens(left.loc, right.loc),
    };
  }

  private matchComparison(): BinaryOperator | null {
    if (this.match("EQ")) return "=";
    if (this.match("NEQ")) return "<>";
    if (this.match("LT")) return "<";
    if (this.match("GT")) return ">";
    if (this.match("LTE")) return "<=";
    if (this.match("GTE")) return ">=";
    return null;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();
    while (this.check("PLUS") || this.check("MINUS")) {
      const operator = this.match("PLUS") ? "+" : (this.advance(), "-");
      const right = this.parseMultiplicative();
      expr = {
        kind: "binary",
        operator,
        left: expr,
        right,
        loc: this.spanTokens(expr.loc, right.loc),
      };
    }
    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parsePower();
    while (this.check("STAR") || this.check("SLASH") || this.check("DIV") || this.check("MOD")) {
      let operator: BinaryOperator;
      if (this.match("STAR")) operator = "*";
      else if (this.match("SLASH")) operator = "/";
      else if (this.match("DIV")) operator = "div";
      else {
        this.advance();
        operator = "mod";
      }
      const right = this.parsePower();
      expr = {
        kind: "binary",
        operator,
        left: expr,
        right,
        loc: this.spanTokens(expr.loc, right.loc),
      };
    }
    return expr;
  }

  private parsePower(): Expression {
    const left = this.parseUnary();
    if (this.match("CARET")) {
      const right = this.parsePower();
      return {
        kind: "binary",
        operator: "^",
        left,
        right,
        loc: this.spanTokens(left.loc, right.loc),
      };
    }
    return left;
  }

  private parseUnary(): Expression {
    if (this.match("MINUS")) {
      const start = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "unary",
        operator: "-",
        operand,
        loc: this.span(start, this.previous()),
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    const token = this.current();

    if (this.match("NUMBER")) {
      const isReal = token.lexeme.includes(".");
      return {
        kind: "literal",
        literalKind: isReal ? "reel" : "entier",
        value: Number(token.lexeme),
        loc: this.loc(token),
      };
    }

    if (this.match("STRING")) {
      return {
        kind: "literal",
        literalKind: "chaine",
        value: token.lexeme,
        loc: this.loc(token),
      };
    }

    if (this.match("CHAR")) {
      return {
        kind: "literal",
        literalKind: "caractere",
        value: token.lexeme,
        loc: this.loc(token),
      };
    }

    if (this.match("VRAI")) {
      return { kind: "literal", literalKind: "booleen", value: true, loc: this.loc(token) };
    }
    if (this.match("FAUX")) {
      return { kind: "literal", literalKind: "booleen", value: false, loc: this.loc(token) };
    }

    if (this.match("LPAREN")) {
      const expr = this.parseExpression();
      this.consume("RPAREN", "Une parenthèse fermante est manquante.");
      return expr;
    }

    if (this.check("IDENTIFIER")) {
      const identifier = this.parseIdentifier("Un identifiant est attendu.");
      if (this.match("LBRACKET")) {
        const index = this.parseExpression();
        const close = this.consume("RBRACKET", "Un crochet fermant est attendu après l'indice.");
        return {
          kind: "index",
          array: identifier,
          index,
          loc: this.spanTokens(identifier.loc, this.loc(close)),
        };
      }
      if (this.match("LPAREN")) {
        const args = this.parseArgumentList();
        const close = this.consume("RPAREN", "Une parenthèse fermante est attendue après l'appel.");
        return {
          kind: "call",
          callee: identifier,
          args,
          loc: this.spanTokens(identifier.loc, this.loc(close)),
        };
      }
      return identifier;
    }

    throw this.error("expression-attendue", `Expression attendue, trouvé « ${token.lexeme} ».`);
  }

  private parseIdentifier(message: string): IdentifierNode {
    const token = this.consume("IDENTIFIER", message);
    return {
      kind: "identifier",
      name: normalizeIdentifier(token.lexeme),
      raw: token.lexeme,
      loc: this.loc(token),
    };
  }

  private consumeA(): void {
    const token = this.current();
    if (token.kind === "IDENTIFIER" && token.normalized === "a") {
      this.advance();
      return;
    }
    throw this.error("a-attendu", "Le mot-clé A est attendu dans la boucle Pour (ex. Pour i <- 1 A 10).");
  }

  private consume(kind: TokenKind, message: string): Token {
    if (this.check(kind)) return this.advance();
    throw this.error(this.errorCodeFor(kind), message);
  }

  private errorCodeFor(kind: TokenKind): string {
    switch (kind) {
      case "FINSI":
        return "finsi-manquant";
      case "FINPOUR":
        return "finpour-manquant";
      case "FINTANTQUE":
        return "fintantque-manquant";
      case "FINFONCTION":
        return "finfonction-manquant";
      case "FINPROCEDURE":
        return "finprocedure-manquant";
      case "RPAREN":
        return "parenthese-fermante";
      default:
        return "syntaxe";
    }
  }

  private match(kind: TokenKind): boolean {
    if (!this.check(kind)) return false;
    this.advance();
    return true;
  }

  private check(kind: TokenKind): boolean {
    return this.current().kind === kind;
  }

  private advance(): Token {
    const token = this.current();
    if (!this.check("EOF")) this.index += 1;
    return token;
  }

  private current(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private previous(): Token {
    return this.tokens[this.index - 1] ?? this.tokens[0]!;
  }

  private isAtEndOfBlock(): boolean {
    return BLOCK_END_KINDS.has(this.current().kind);
  }

  private loc(token: Token): SourceLocation {
    return {
      line: token.line,
      column: token.column,
      endLine: token.endLine,
      endColumn: token.endColumn,
    };
  }

  private span(start: Token, end: Token): SourceLocation {
    return {
      line: start.line,
      column: start.column,
      endLine: end.endLine,
      endColumn: end.endColumn,
    };
  }

  private spanTokens(start: SourceLocation, end: SourceLocation): SourceLocation {
    return {
      line: start.line,
      column: start.column,
      endLine: end.endLine,
      endColumn: end.endColumn,
    };
  }

  private error(code: string, message: string): LanguageError {
    const token = this.current();
    return new LanguageError("syntaxe", code, message, token.line, token.column, token.endLine, token.endColumn);
  }

  private errorAt(loc: SourceLocation, code: string, message: string): LanguageError {
    return new LanguageError("syntaxe", code, message, loc.line, loc.column, loc.endLine, loc.endColumn);
  }
}
