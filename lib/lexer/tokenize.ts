import { KEYWORDS } from "@/lib/lexer/keywords";
import { LanguageError } from "@/lib/runtime/errors";
import { normalizeIdentifier, normalizeKeyword } from "@/lib/text/normalize";
import type { Token, TokenKind } from "@/types/tokens";

const IDENT_START = /[\p{L}_]/u;
const IDENT_PART = /[\p{L}\p{N}_]/u;

export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

class Lexer {
  private readonly source: string;
  private readonly tokens: Token[] = [];
  private index = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipTrivia();
      if (this.isAtEnd()) break;
      this.tokens.push(this.nextToken());
    }
    this.tokens.push(this.makeToken("EOF", "", this.line, this.column, this.line, this.column));
    return this.mergeCompoundKeywords(this.tokens);
  }

  private nextToken(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const ch = this.peek();

    if (ch === "<") {
      if (this.peek(1) === "-") {
        this.advance();
        this.advance();
        return this.makeToken("ASSIGN", "<-", startLine, startColumn, this.line, this.column);
      }
      if (this.peek(1) === ">") {
        this.advance();
        this.advance();
        return this.makeToken("NEQ", "<>", startLine, startColumn, this.line, this.column);
      }
      if (this.peek(1) === "=") {
        this.advance();
        this.advance();
        return this.makeToken("LTE", "<=", startLine, startColumn, this.line, this.column);
      }
      this.advance();
      return this.makeToken("LT", "<", startLine, startColumn, this.line, this.column);
    }

    if (ch === "←") {
      this.advance();
      return this.makeToken("ASSIGN", "←", startLine, startColumn, this.line, this.column);
    }

    if (ch === ">") {
      if (this.peek(1) === "=") {
        this.advance();
        this.advance();
        return this.makeToken("GTE", ">=", startLine, startColumn, this.line, this.column);
      }
      this.advance();
      return this.makeToken("GT", ">", startLine, startColumn, this.line, this.column);
    }

    switch (ch) {
      case "+":
        this.advance();
        return this.makeToken("PLUS", "+", startLine, startColumn, this.line, this.column);
      case "-":
        this.advance();
        return this.makeToken("MINUS", "-", startLine, startColumn, this.line, this.column);
      case "*":
        this.advance();
        return this.makeToken("STAR", "*", startLine, startColumn, this.line, this.column);
      case "/":
        this.advance();
        return this.makeToken("SLASH", "/", startLine, startColumn, this.line, this.column);
      case "^":
        this.advance();
        return this.makeToken("CARET", "^", startLine, startColumn, this.line, this.column);
      case "=":
        this.advance();
        return this.makeToken("EQ", "=", startLine, startColumn, this.line, this.column);
      case "(":
        this.advance();
        return this.makeToken("LPAREN", "(", startLine, startColumn, this.line, this.column);
      case ")":
        this.advance();
        return this.makeToken("RPAREN", ")", startLine, startColumn, this.line, this.column);
      case "[":
        this.advance();
        return this.makeToken("LBRACKET", "[", startLine, startColumn, this.line, this.column);
      case "]":
        this.advance();
        return this.makeToken("RBRACKET", "]", startLine, startColumn, this.line, this.column);
      case ",":
        this.advance();
        return this.makeToken("COMMA", ",", startLine, startColumn, this.line, this.column);
      case ":":
        this.advance();
        return this.makeToken("COLON", ":", startLine, startColumn, this.line, this.column);
      case '"':
        return this.stringLiteral(startLine, startColumn);
      case "'":
        return this.charLiteral(startLine, startColumn);
      default:
        break;
    }

    if (this.isDigit(ch)) {
      return this.numberLiteral(startLine, startColumn);
    }

    if (IDENT_START.test(ch)) {
      return this.identifierOrKeyword(startLine, startColumn);
    }

    throw new LanguageError(
      "lexicale",
      "caractere-invalide",
      `Caractère invalide « ${ch} ».`,
      startLine,
      startColumn,
    );
  }

  private identifierOrKeyword(startLine: number, startColumn: number): Token {
    let lexeme = "";
    while (!this.isAtEnd() && IDENT_PART.test(this.peek())) {
      lexeme += this.advance();
    }

    if (normalizeKeyword(lexeme) === "JUSQU" && this.peek() === "'") {
      lexeme += this.advance();
      while (!this.isAtEnd() && IDENT_PART.test(this.peek())) {
        lexeme += this.advance();
      }
    }

    const keyword = KEYWORDS[normalizeKeyword(lexeme)];
    if (keyword) {
      return this.makeToken(keyword, lexeme, startLine, startColumn, this.line, this.column);
    }

    return this.makeToken(
      "IDENTIFIER",
      lexeme,
      startLine,
      startColumn,
      this.line,
      this.column,
      normalizeIdentifier(lexeme),
    );
  }

  private numberLiteral(startLine: number, startColumn: number): Token {
    let lexeme = "";
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      lexeme += this.advance();
    }
    if (this.peek() === "." && this.isDigit(this.peek(1))) {
      lexeme += this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        lexeme += this.advance();
      }
    }
    return this.makeToken("NUMBER", lexeme, startLine, startColumn, this.line, this.column);
  }

  private stringLiteral(startLine: number, startColumn: number): Token {
    this.advance();
    let value = "";
    while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== "\n") {
      if (this.peek() === "\\") {
        this.advance();
        value += this.escapeChar(startLine, startColumn);
      } else {
        value += this.advance();
      }
    }
    if (this.peek() !== '"') {
      throw new LanguageError(
        "lexicale",
        "chaine-non-terminee",
        "Chaîne non terminée.",
        startLine,
        startColumn,
      );
    }
    this.advance();
    return this.makeToken("STRING", value, startLine, startColumn, this.line, this.column);
  }

  private charLiteral(startLine: number, startColumn: number): Token {
    this.advance();
    if (this.isAtEnd() || this.peek() === "\n") {
      throw new LanguageError(
        "lexicale",
        "caractere-non-termine",
        "Littéral caractère non terminé.",
        startLine,
        startColumn,
      );
    }
    let value: string;
    if (this.peek() === "\\") {
      this.advance();
      value = this.escapeChar(startLine, startColumn);
    } else {
      value = this.advance();
    }
    if (this.peek() !== "'") {
      throw new LanguageError(
        "lexicale",
        "caractere-non-termine",
        "Un littéral caractère doit contenir un seul caractère, par exemple 'A'.",
        startLine,
        startColumn,
      );
    }
    this.advance();
    return this.makeToken("CHAR", value, startLine, startColumn, this.line, this.column);
  }

  private escapeChar(line: number, column: number): string {
    if (this.isAtEnd()) {
      throw new LanguageError("lexicale", "escape-invalide", "Séquence d'échappement incomplète.", line, column);
    }
    const ch = this.advance();
    switch (ch) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "\\":
        return "\\";
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return ch;
    }
  }

  private skipTrivia(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
        continue;
      }
      if (ch === "/" && this.peek(1) === "/") {
        while (!this.isAtEnd() && this.peek() !== "\n") {
          this.advance();
        }
        continue;
      }
      if (ch === "/" && this.peek(1) === "*") {
        const startLine = this.line;
        const startColumn = this.column;
        this.advance();
        this.advance();
        while (!this.isAtEnd() && !(this.peek() === "*" && this.peek(1) === "/")) {
          this.advance();
        }
        if (this.isAtEnd()) {
          throw new LanguageError(
            "lexicale",
            "commentaire-non-termine",
            "Commentaire non terminé.",
            startLine,
            startColumn,
          );
        }
        this.advance();
        this.advance();
        continue;
      }
      break;
    }
  }

  private mergeCompoundKeywords(tokens: Token[]): Token[] {
    const merged: Token[] = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const current = tokens[i];
      const next = tokens[i + 1];
      if (current.kind === "SINON" && next?.kind === "SI" && current.endLine === next.line) {
        merged.push(
          this.makeToken("SINONSI", `${current.lexeme} ${next.lexeme}`, current.line, current.column, next.endLine, next.endColumn),
        );
        i += 1;
        continue;
      }
      if (current.kind === "FIN" && next && current.endLine === next.line) {
        const compound = this.compoundFin(current, next);
        if (compound) {
          merged.push(compound);
          i += 1;
          continue;
        }
      }
      merged.push(current);
    }
    return merged;
  }

  private compoundFin(fin: Token, next: Token): Token | null {
    const map: Partial<Record<TokenKind, TokenKind>> = {
      SI: "FINSI",
      POUR: "FINPOUR",
      TANTQUE: "FINTANTQUE",
      FONCTION: "FINFONCTION",
      PROCEDURE: "FINPROCEDURE",
    };
    const kind = map[next.kind];
    if (!kind) return null;
    return this.makeToken(
      kind,
      `${fin.lexeme} ${next.lexeme}`,
      fin.line,
      fin.column,
      next.endLine,
      next.endColumn,
    );
  }

  private makeToken(
    kind: TokenKind,
    lexeme: string,
    line: number,
    column: number,
    endLine: number,
    endColumn: number,
    normalized = normalizeKeyword(lexeme),
  ): Token {
    return { kind, lexeme, normalized, line, column, endLine, endColumn };
  }

  private peek(offset = 0): string {
    return this.source[this.index + offset] ?? "";
  }

  private advance(): string {
    const ch = this.source[this.index] ?? "";
    this.index += 1;
    if (ch === "\n") {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return ch;
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isAtEnd(): boolean {
    return this.index >= this.source.length;
  }
}
