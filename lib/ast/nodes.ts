import type { SourceLocation } from "@/types/diagnostics";

export type PrimitiveTypeName =
  | "entier"
  | "reel"
  | "chaine"
  | "caractere"
  | "booleen";

export type TypeNode =
  | { kind: "primitive"; name: PrimitiveTypeName; loc: SourceLocation }
  | {
      kind: "tableau";
      size: number;
      elementType: TypeNode;
      loc: SourceLocation;
    };

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "div"
  | "mod"
  | "^"
  | "="
  | "<>"
  | "<"
  | ">"
  | "<="
  | ">="
  | "et"
  | "ou";

export type UnaryOperator = "-" | "non";

export interface IdentifierNode {
  kind: "identifier";
  name: string;
  raw: string;
  loc: SourceLocation;
}

export type Expression =
  | IdentifierNode
  | {
      kind: "literal";
      literalKind: "entier" | "reel" | "chaine" | "caractere" | "booleen";
      value: number | string | boolean;
      loc: SourceLocation;
    }
  | {
      kind: "binary";
      operator: BinaryOperator;
      left: Expression;
      right: Expression;
      loc: SourceLocation;
    }
  | {
      kind: "unary";
      operator: UnaryOperator;
      operand: Expression;
      loc: SourceLocation;
    }
  | {
      kind: "index";
      array: IdentifierNode;
      index: Expression;
      loc: SourceLocation;
    }
  | {
      kind: "call";
      callee: IdentifierNode;
      args: Expression[];
      loc: SourceLocation;
    };

export type LValue =
  | IdentifierNode
  | {
      kind: "index";
      array: IdentifierNode;
      index: Expression;
      loc: SourceLocation;
    };

export interface VarDecl {
  names: IdentifierNode[];
  type: TypeNode;
  loc: SourceLocation;
}

export interface Parameter {
  name: IdentifierNode;
  type: TypeNode;
  loc: SourceLocation;
}

export type Statement =
  | {
      kind: "assign";
      target: LValue;
      value: Expression;
      loc: SourceLocation;
    }
  | {
      kind: "call";
      callee: IdentifierNode;
      args: Expression[];
      loc: SourceLocation;
    }
  | {
      kind: "lire";
      targets: LValue[];
      loc: SourceLocation;
    }
  | {
      kind: "ecrire";
      args: Expression[];
      loc: SourceLocation;
    }
  | {
      kind: "si";
      branches: { test: Expression; body: Statement[]; loc: SourceLocation }[];
      elseBody: Statement[] | null;
      loc: SourceLocation;
    }
  | {
      kind: "pour";
      variable: IdentifierNode;
      start: Expression;
      end: Expression;
      step: Expression | null;
      body: Statement[];
      loc: SourceLocation;
    }
  | {
      kind: "tantque";
      test: Expression;
      body: Statement[];
      loc: SourceLocation;
    }
  | {
      kind: "repeter";
      body: Statement[];
      test: Expression;
      loc: SourceLocation;
    }
  | {
      kind: "retourner";
      value: Expression | null;
      loc: SourceLocation;
    };

export interface AlgorithmDecl {
  kind: "algorithme";
  name: IdentifierNode;
  variables: VarDecl[];
  body: Statement[];
  loc: SourceLocation;
}

export interface FunctionDecl {
  kind: "fonction";
  name: IdentifierNode;
  params: Parameter[];
  returnType: TypeNode;
  variables: VarDecl[];
  body: Statement[];
  loc: SourceLocation;
}

export interface ProcedureDecl {
  kind: "procedure";
  name: IdentifierNode;
  params: Parameter[];
  variables: VarDecl[];
  body: Statement[];
  loc: SourceLocation;
}

export type Declaration = AlgorithmDecl | FunctionDecl | ProcedureDecl;

export interface Program {
  kind: "program";
  algorithm: AlgorithmDecl;
  functions: FunctionDecl[];
  procedures: ProcedureDecl[];
  loc: SourceLocation;
}
