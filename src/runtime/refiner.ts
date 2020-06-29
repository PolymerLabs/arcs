/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {RefinementNode, Op, RefinementExpressionNode, BinaryExpressionNode, UnaryExpressionNode, FieldNode, QueryNode, BuiltInNode, BigIntNode, NumberNode, BooleanNode, TextNode} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import {Schema} from './schema.js';
import {Entity} from './entity.js';
import {AuditException} from './arc-exceptions.js';

export enum Primitive {
  BOOLEAN = 'Boolean',
  NUMBER = 'Number',
  BIGINT = 'BigInt',
  TEXT = 'Text',
  UNKNOWN = '~query_arg_type',
}

export enum AtLeastAsSpecific {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN'
}

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;

export class Refinement {
  kind = 'refinement';
  expression: RefinementExpression;

  constructor(expr: RefinementExpression) {
    // TODO(ragdev): ensure that the refinement contains at least 1 fieldName
    this.expression = expr;
  }

  static fromAst(ref: RefinementNode, typeData: Dictionary<ExpressionPrimitives>): Refinement {
    if (!ref) {
      return null;
    }
    return new Refinement(RefinementExpression.fromAst(ref.expression, typeData));
  }

  toLiteral() {
    return {kind: this.kind, expression: this.expression.toLiteral()};
  }

  static fromLiteral(ref): Refinement {
    return new Refinement(RefinementExpression.fromLiteral(ref.expression));
  }

  static refineData(entity: Entity, schema: Schema): AuditException {
    for (const [name, value] of Object.entries(entity)) {
      const refDict = {[name]: value};
      const ref = schema.fields[name].refinement;
      if (ref && !ref.validateData(refDict)) {
        return new AuditException(new Error(`Entity schema field '${name}' does not conform to the refinement ${ref}`), 'Refinement:refineData');
      }
    }
    const ref = schema.refinement;
    if (ref && !ref.validateData(entity)) {
      return new AuditException(new Error(`Entity data does not conform to the refinement ${ref}`), 'Refinement:refineData');
    }
    return null;
  }

  static unionOf(ref1: Refinement, ref2: Refinement): Refinement {
    const expr1 = ref1 && ref1.expression;
    const expr2 = ref2 && ref2.expression;
    let refinement = null;
    if (expr1 && expr2) {
      const bothExpr = new BinaryExpression(expr1, expr2, new RefinementOperator(Op.OR));
      refinement = new Refinement(bothExpr);
    }
    return refinement;
  }

  static intersectionOf(ref1: Refinement, ref2: Refinement): Refinement {
    const expr1 = ref1 && ref1.expression;
    const expr2 = ref2 && ref2.expression;
    let refinement = null;
    if (expr1 && expr2) {
      const bothExpr = new BinaryExpression(expr1, expr2, new RefinementOperator(Op.AND));
      refinement = new Refinement(bothExpr);
    } else if (expr1 || expr2) {
      refinement = new Refinement(expr1 || expr2);
    }
    return refinement;
  }

  containsField(fieldName: string): boolean {
    return this.getFieldParams().has(fieldName);
  }

  getFieldParams(): Map<string, Primitive> {
    return this.expression.getFieldParams();
  }

  getQueryParams(): Map<string, Primitive> {
    return this.expression.getQueryParams();
  }

  getTextPrimitives(): Set<string> {
    return this.expression.getTextPrimitives();
  }

  // checks if a is at least as specific as b
  static isAtLeastAsSpecificAs(a: Refinement, b: Refinement): AtLeastAsSpecific {
    // Ensure there is a refinement to check with.
    if (b == null) {
      // All refinements are more specific than this.
      return AtLeastAsSpecific.YES;
    }
    a = a || new Refinement(new BooleanPrimitive(true));
    try {
      a.normalize();
      b.normalize();
      if (a.toString() === b.toString()) { // Short cut until simple NumberMultinomial equality works.
        return AtLeastAsSpecific.YES;
      }
      const texts = new Set<string>([...a.expression.getTextPrimitives(), ...b.expression.getTextPrimitives()]);
      const textToNum: Dictionary<number> = {};
      let idx = 0;
      for (const text of texts) {
         textToNum[text] = idx;
         idx += 1;
      }
      // Find the range of values for the field name over which the refinement is valid.
      const rangeA = NumberRange.fromExpression(a.expression, textToNum);
      const rangeB = NumberRange.fromExpression(b.expression, textToNum);
      return rangeA.isSubsetOf(rangeB) ? AtLeastAsSpecific.YES : AtLeastAsSpecific.NO;
    } catch (e) {
      console.warn(`Unable to ascertain if ${a} is at least as specific as ${b}.`);
      return AtLeastAsSpecific.UNKNOWN;
    }
  }

  // This function does the following:
  // ~ Simplifies mathematical and boolean expressions e.g. '(2*num + (1 + 3) < 4 + num) and True' => 'num < 0'
  // ~ Converts a binary node to {leftExpr: fieldName, rightExpr: val} (where applicable).
  // ~ Converts a unary node {op: '-', val: x} into a number node {val: -x}
  // ~ Removes redundant info like expression && false => false
  normalize() {
    this.expression = this.expression.normalizeOperators();
    try {
      // Rearrange doesn't handle multivariate case yet.
      // Therefore, we TRY to rearrange, if possible.
      this.expression = this.expression.rearrange();
    } catch (e) {
      // tslint:disable-next-line no-empty
      //TODO(cypher1): Report polynomial errors without using the console.
    }
    this.expression = this.expression.normalize();
  }

  toString(): string {
    return '[' + this.expression.toString() + ']';
  }

  validateData(data: Dictionary<ExpressionPrimitives>): boolean {
    const res = this.expression.applyOperator(data);
    if (res === null && this.expression.getQueryParams().has('?')) {
      return true;
    }
    if (typeof res !== 'boolean') {
      throw new Error(`Refinement expression ${this.expression} evaluated to a non-boolean type.`);
    }
    return res;
  }
}

export interface RefinementExpressionLiteral {
  kind: RefinementExpressionNodeType;
  // tslint:disable:no-any
  [propName: string]: any;
}

export type RefinementExpressionNodeType = 'BinaryExpressionNode' | 'UnaryExpressionNode' | 'FieldNamePrimitiveNode' | 'QueryArgumentPrimitiveNode' | 'NumberPrimitiveNode' | 'BigIntPrimitiveNode' | 'BooleanPrimitiveNode' | 'TextPrimitiveNode' | 'BuiltInNode';

abstract class RefinementExpression {
  evalType: Primitive;

  constructor(readonly kind: RefinementExpressionNodeType) {}
  static fromAst(expr: RefinementExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    if (!expr) {
      return null;
    }
    switch (expr.kind) {
      case 'binary-expression-node': return BinaryExpression.fromAst(expr, typeData);
      case 'unary-expression-node': return UnaryExpression.fromAst(expr, typeData);
      case 'field-name-node': return FieldNamePrimitive.fromAst(expr, typeData);
      case 'built-in-node': return BuiltIn.fromAst(expr, typeData);
      case 'query-argument-node': return QueryArgumentPrimitive.fromAst(expr, typeData);
      case 'number-node': return NumberPrimitive.fromAst(expr);
      case 'bigint-node': return BigIntPrimitive.fromAst(expr);
      case 'boolean-node': return BooleanPrimitive.fromAst(expr);
      case 'text-node': return TextPrimitive.fromAst(expr);
      default:
        // Should never happen; all known kinds are handled above, but the linter wants a default.
        throw new Error(`RefinementExpression.fromAst: Unknown node type ${expr['kind']}`);
    }
  }

  abstract toLiteral(): RefinementExpressionLiteral;

  static fromLiteral(expr: {kind: RefinementExpressionNodeType}): RefinementExpression {
    switch (expr.kind) {
      case 'BinaryExpressionNode': return BinaryExpression.fromLiteral(expr);
      case 'UnaryExpressionNode': return UnaryExpression.fromLiteral(expr);
      case 'FieldNamePrimitiveNode': return FieldNamePrimitive.fromLiteral(expr);
      case 'BuiltInNode': return BuiltIn.fromLiteral(expr);
      case 'QueryArgumentPrimitiveNode': return QueryArgumentPrimitive.fromLiteral(expr);
      case 'NumberPrimitiveNode': return NumberPrimitive.fromLiteral(expr);
      case 'BooleanPrimitiveNode': return BooleanPrimitive.fromLiteral(expr);
      case 'TextPrimitiveNode': return TextPrimitive.fromLiteral(expr);
      default:
        // Should never happen; all known kinds are handled above, but the linter wants a default.
        throw new Error(`RefinementExpression.fromLiteral: Unknown node type ${expr['kind']}`);
    }
  }

  normalize(): RefinementExpression {
    return this;
  }

  rearrange(): RefinementExpression {
    return this;
  }

  normalizeOperators(): RefinementExpression {
    return this;
  }

  abstract toString(): string;

  abstract applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives;

  getFieldParams(): Map<string, Primitive> {
    return new Map<string, Primitive>();
  }

  getQueryParams(): Map<string, Primitive> {
    return new Map<string, Primitive>();
  }

  getTextPrimitives(): Set<string> {
    return new Set<string>();
  }
}

export class BinaryExpression extends RefinementExpression {
  evalType: Primitive;
  leftExpr: RefinementExpression;
  rightExpr: RefinementExpression;
  operator: RefinementOperator;

  constructor(leftExpr: RefinementExpression, rightExpr: RefinementExpression, op: RefinementOperator) {
    super('BinaryExpressionNode');
    this.leftExpr = leftExpr;
    this.rightExpr = rightExpr;
    this.operator = op;
    this.operator.validateOperandCompatibility([this.leftExpr, this.rightExpr]);
    const evalType = this.operator.evalType();
    this.evalType = evalType === 'same' ? this.leftExpr.evalType : evalType;
  }

  static fromAst(expression: BinaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    if (operatorTable[expression.operator] === undefined) {
      const loc = expression.location;
      const filename = loc.filename ? ` in ${loc.filename}` : '';
      throw new Error(`Unknown operator '${expression.operator}' at line ${loc.start.line}, col ${loc.start.column}${filename}`);
    }
    return new BinaryExpression(
            RefinementExpression.fromAst(expression.leftExpr, typeData),
            RefinementExpression.fromAst(expression.rightExpr, typeData),
            new RefinementOperator(expression.operator as Op));
  }

  toLiteral(): RefinementExpressionLiteral {
    return {
      kind: this.kind,
      leftExpr: this.leftExpr.toLiteral(),
      rightExpr: this.rightExpr.toLiteral(),
      evalType: this.evalType,
      operator: this.operator.toLiteral()
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new BinaryExpression(
            RefinementExpression.fromLiteral(expr.leftExpr),
            RefinementExpression.fromLiteral(expr.rightExpr),
            RefinementOperator.fromLiteral(expr.operator));
  }

  update(expr: BinaryExpression): void {
    this.leftExpr = expr.leftExpr;
    this.rightExpr = expr.rightExpr;
    this.operator = expr.operator;
    this.evalType = expr.evalType;
  }

  toString(): string {
    return `(${this.leftExpr.toString()} ${this.operator.op} ${this.rightExpr.toString()})`;
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    const left = this.leftExpr.applyOperator(data);
    const right = this.rightExpr.applyOperator(data);
    if (this.operator.op === Op.AND && left !== null && right === null) {
      return left;
    }
    if (this.operator.op === Op.AND && left === null && right !== null) {
      return right;
    }
    if (left === null) {
      return null;
    }
    if (right === null) {
      return null;
    }
    return this.operator.eval([left, right]);
  }

  swapChildren(): void {
    const temp = this.rightExpr;
    this.rightExpr = this.leftExpr;
    this.leftExpr = temp;
    this.operator.flip();
  }

  simplifyPrimitive(): RefinementExpression {
    if (this.leftExpr instanceof BooleanPrimitive && this.rightExpr instanceof BooleanPrimitive) {
      return new BooleanPrimitive(this.applyOperator());
    } else if (this.leftExpr instanceof NumberPrimitive && this.rightExpr instanceof NumberPrimitive) {
      if (this.evalType === Primitive.BOOLEAN) {
        return new BooleanPrimitive(this.applyOperator());
      }
      return new NumberPrimitive(this.applyOperator());
    } else if (this.leftExpr instanceof BigIntPrimitive && this.rightExpr instanceof BigIntPrimitive) {
      if (this.evalType === Primitive.BOOLEAN) {
        return new BooleanPrimitive(this.applyOperator());
      }
      return new BigIntPrimitive(this.applyOperator());
    }
    return null;
  }

  rearrange(): RefinementExpression {
    const numberTypes = [Primitive.NUMBER, Primitive.BIGINT];
    const leftNumeric = numberTypes.includes(this.leftExpr.evalType);
    const rightNumeric = numberTypes.includes(this.rightExpr.evalType);
    if (this.evalType === Primitive.BOOLEAN && leftNumeric && rightNumeric) {
      try {
        Normalizer.rearrangeNumericalExpression(this);
      } catch (e) {
        // tslint:disable-next-line no-empty
        //TODO(cypher1): Report polynomial errors without using the console.
        console.error(e);
      }
    } else {
      this.leftExpr = this.leftExpr.rearrange();
      this.rightExpr = this.rightExpr.rearrange();
    }
    return this;
  }

  normalize(): RefinementExpression {
    this.leftExpr = this.leftExpr.normalize();
    this.rightExpr = this.rightExpr.normalize();
    const sp = this.simplifyPrimitive();
    if (sp) {
      return sp;
    }
    if (this.leftExpr.toString() < this.rightExpr.toString() ) {
      this.swapChildren();
    }
    switch (this.operator.op) {
      case Op.AND: {
        if (this.leftExpr instanceof BooleanPrimitive) {
          return this.leftExpr.value ? this.rightExpr : this.leftExpr;
        } else if (this.rightExpr instanceof BooleanPrimitive) {
          return this.rightExpr.value ? this.leftExpr : this.rightExpr;
        }
        return this;
      }
      case Op.OR: {
        if (this.leftExpr instanceof BooleanPrimitive) {
          return this.leftExpr.value ? this.leftExpr : this.rightExpr;
        } else if (this.rightExpr instanceof BooleanPrimitive) {
          return this.rightExpr.value ? this.rightExpr : this.leftExpr;
        }
        return this;
      }
      case Op.EQ: {
        if (this.leftExpr instanceof BooleanPrimitive) {
            return this.leftExpr.value ? this.rightExpr : new UnaryExpression(this.rightExpr, new RefinementOperator(Op.NOT));
        } else if (this.rightExpr instanceof BooleanPrimitive) {
            return this.rightExpr.value ? this.leftExpr : new UnaryExpression(this.leftExpr, new RefinementOperator(Op.NOT));
        }
        return this;
      }
      case Op.NEQ: {
          if (this.leftExpr instanceof BooleanPrimitive) {
              return this.leftExpr.value ? new UnaryExpression(this.rightExpr, new RefinementOperator(Op.NOT)) : this.rightExpr;
          } else if (this.rightExpr instanceof BooleanPrimitive) {
              return this.rightExpr.value ? new UnaryExpression(this.leftExpr, new RefinementOperator(Op.NOT)) : this.leftExpr;
          }
          return this;
      }
      case Op.DIV: {
          if (this.rightExpr instanceof NumberPrimitive && this.rightExpr.value === 1) {
              return this.leftExpr;
          }
          if (this.rightExpr instanceof BigIntPrimitive && this.rightExpr.value === BigInt(1)) {
              return this.leftExpr;
          }
          return this;
      }
      case Op.MUL: {
          if (this.leftExpr instanceof NumberPrimitive && this.leftExpr.value === 1) {
              return this.rightExpr;
          }
          if (this.leftExpr instanceof BigIntPrimitive && this.leftExpr.value === BigInt(1)) {
              return this.rightExpr;
          }
          if (this.rightExpr instanceof NumberPrimitive && this.rightExpr.value === 1) {
              return this.leftExpr;
          }
          if (this.rightExpr instanceof BigIntPrimitive && this.rightExpr.value === BigInt(1)) {
              return this.leftExpr;
          }
          return this;
      }
      default: return this;
    }
  }

  normalizeOperators(): RefinementExpression {
    this.leftExpr = this.leftExpr.normalizeOperators();
    this.rightExpr = this.rightExpr.normalizeOperators();
    switch (this.operator.op) {
      case Op.GTE: return new BinaryExpression(
        new BinaryExpression(this.rightExpr, this.leftExpr, new RefinementOperator(Op.LT)),
        new BinaryExpression(this.rightExpr, this.leftExpr, new RefinementOperator(Op.EQ)),
        new RefinementOperator(Op.OR)
      );
      case Op.LTE: return new BinaryExpression(
        new BinaryExpression(this.leftExpr, this.rightExpr, new RefinementOperator(Op.LT)),
        new BinaryExpression(this.leftExpr, this.rightExpr, new RefinementOperator(Op.EQ)),
        new RefinementOperator(Op.OR)
      );
      case Op.NEQ: return new UnaryExpression(
        new BinaryExpression(this.leftExpr, this.rightExpr, new RefinementOperator(Op.EQ)),
        new RefinementOperator(Op.NOT)
      );
      default: return this;
    }
  }

  getFieldParams(): Map<string, Primitive> {
    const fn1 = this.leftExpr.getFieldParams();
    const fn2 = this.rightExpr.getFieldParams();
    return new Map<string, Primitive>([...fn1, ...fn2]);
  }

  getQueryParams(): Map<string, Primitive> {
    const fn1 = this.leftExpr.getQueryParams();
    const fn2 = this.rightExpr.getQueryParams();
    return new Map<string, Primitive>([...fn1, ...fn2]);
  }

  getTextPrimitives(): Set<string> {
    const fn1 = this.leftExpr.getTextPrimitives();
    const fn2 = this.rightExpr.getTextPrimitives();
    return new Set<string>([...fn1, ...fn2]);
  }
}

export class UnaryExpression extends RefinementExpression {
  evalType: Primitive;
  expr: RefinementExpression;
  operator: RefinementOperator;

  constructor(expr: RefinementExpression, op: RefinementOperator) {
    super('UnaryExpressionNode');
    this.expr = expr;
    this.operator = op;
    this.operator.validateOperandCompatibility([this.expr]);
    const evalType = this.operator.evalType();
    this.evalType = evalType === 'same' ? this.expr.evalType : evalType;
  }

  static fromAst(expression: UnaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    return new UnaryExpression(
            RefinementExpression.fromAst(expression.expr, typeData),
            new RefinementOperator((expression.operator === Op.SUB) ? Op.NEG : expression.operator));
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      expr: this.expr.toLiteral(),
      operator: this.operator.toLiteral()
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new UnaryExpression(
            RefinementExpression.fromLiteral(expr.expr),
            RefinementOperator.fromLiteral(expr.operator));
  }

  toString(): string {
    return `(${this.operator.op === Op.NEG ? '-' : this.operator.op} ${this.expr.toString()})`;
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    const expression = this.expr.applyOperator(data);
    if (expression === null) {
      return null;
    }
    return this.operator.eval([expression]);
  }

  simplifyPrimitive(): RefinementExpression  {
    if (this.expr instanceof BooleanPrimitive && this.operator.op === Op.NOT) {
      return new BooleanPrimitive(this.applyOperator());
    } else if (this.expr instanceof NumberPrimitive && this.operator.op === Op.NEG) {
      return new NumberPrimitive(this.applyOperator());
    } else if (this.expr instanceof BigIntPrimitive && this.operator.op === Op.NEG) {
      return new BigIntPrimitive(this.applyOperator());
    }
    return null;
  }

  normalize(): RefinementExpression {
    this.expr = this.expr.normalize();
    const sp = this.simplifyPrimitive();
    if (sp) {
      return sp;
    }
    switch (this.operator.op) {
      case Op.NOT: {
        if (this.expr instanceof UnaryExpression && this.expr.operator.op === Op.NOT) {
          return this.expr.expr;
        }
        if (this.expr instanceof BinaryExpression) {
          if (this.expr.operator.op === Op.NEQ) {
          return new BinaryExpression(this.expr.leftExpr, this.expr.rightExpr, new RefinementOperator(Op.EQ));
          }
          if (this.expr.operator.op === Op.EQ) {
            return new BinaryExpression(this.expr.leftExpr, this.expr.rightExpr, new RefinementOperator(Op.NEQ));
          }
        }
        return this;
      }
      default:
        return this;
    }
  }

  rearrange(): RefinementExpression {
    this.expr = this.expr.rearrange();
    return this;
  }

  getFieldParams(): Map<string, Primitive> {
    return this.expr.getFieldParams();
  }

  getQueryParams(): Map<string, Primitive> {
    return this.expr.getQueryParams();
  }

  getTextPrimitives(): Set<string> {
    return this.expr.getTextPrimitives();
  }
}

export class FieldNamePrimitive extends RefinementExpression {
  evalType: Primitive;
  value: string;

  constructor(value: string, evalType: Primitive) {
    super('FieldNamePrimitiveNode');
    this.value = value;
    this.evalType = evalType;
  }

  static fromAst(expression: FieldNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    if (typeData[expression.value] === undefined) {
      throw new Error(`Unresolved field name '${expression.value}' in the refinement expression.`);
    }
    return new FieldNamePrimitive(expression.value, typeData[expression.value]);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new FieldNamePrimitive(expr.value, expr.evalType);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    if (data[this.value] != undefined) {
      return data[this.value];
    }
    throw new Error(`Unresolved field name '${this.value}' in the refinement expression.`);
  }

  getFieldParams(): Map<string, Primitive> {
    return new Map<string, Primitive>([[this.value, this.evalType]]);
  }
}

export class QueryArgumentPrimitive extends RefinementExpression {
  value: string;
  evalType: Primitive;

  constructor(value: string, evalType: Primitive) {
    super('QueryArgumentPrimitiveNode');
    this.value = value;
    this.evalType = evalType;
  }

  static fromAst(expression: QueryNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    return new QueryArgumentPrimitive(expression.value, typeData[expression.value] || Primitive.UNKNOWN);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new QueryArgumentPrimitive(expr.value, expr.evalType);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    if (data[this.value] != undefined) {
      return data[this.value];
    }
    // This is an 'explicit' unknown value which should not restrict data.
    return null;
  }

  getQueryParams(): Map<string, Primitive> {
    return new Map<string, Primitive>([[this.value, this.evalType]]);
  }
}

export class BuiltIn extends RefinementExpression {
  evalType: Primitive;
  // TODO(cypher1): support arguments (e.g. floor(expr))
  value: string;

  constructor(value: string, evalType: Primitive.NUMBER | Primitive.BOOLEAN | Primitive.TEXT) {
    super('BuiltInNode');
    this.value = value;
    this.evalType = evalType;
  }

  static fromAst(expression: BuiltInNode, _typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    let type = undefined;
      switch (expression.value) {
        case 'now()':
          type = Primitive.NUMBER;
          break;
        default:
          throw new Error(`Unresolved built in name '${expression.value}' in the refinement expression.`);
      }
    return new BuiltIn(expression.value, type);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new BuiltIn(expr.value, expr.evalType);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    if (this.value === 'now()') {
      return new Date().getTime(); // milliseconds since epoch;
    }

    // TODO(cypher1): Implement TS getter for 'creationTimeStamp'
    throw new Error(`Unhandled BuiltInNode '${this.value}' in applyOperator`);
  }

  getFieldParams(): Map<string, Primitive> {
    return new Map<string, Primitive>();
  }
}

export class BigIntPrimitive extends RefinementExpression {
  evalType = Primitive.BIGINT;
  value: bigint;

  constructor(value: bigint, units: string[] = []) {
    super('BigIntPrimitiveNode');

    // Convert to Si units.
    this.value = value;
    // For time units, the base unit is milliseconds.
    for (const unit of units) {
      switch (unit) {
        case 'milliseconds':
          break;
        case 'seconds':
          this.value *= BigInt(1000);
          break;
        case 'minutes':
          this.value *= BigInt(60 * 1000);
          break;
        case 'hours':
          this.value *= BigInt(60 * 60 * 1000);
          break;
        case 'days':
          this.value *= BigInt(24 * 60 * 60 * 1000);
          break;
        default:
          throw new Error(`Unsupported units ${unit}`);
      }
    }
  }

  static fromAst(expression: BigIntNode): RefinementExpression {
    return new BigIntPrimitive(expression.value, expression.units || []);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new BigIntPrimitive(expr.value, expr.units);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }
}

export class NumberPrimitive extends RefinementExpression {
  evalType = Primitive.NUMBER;
  value: number;

  constructor(value: number, units: string[] = []) {
    super('NumberPrimitiveNode');

    // Convert to Si units.
    this.value = value;
    // For time units, the base unit is milliseconds.
    for (const unit of units) {
      switch (unit) {
        case 'milliseconds':
          break;
        case 'seconds':
          this.value *= 1000;
          break;
        case 'minutes':
          this.value *= 60 * 1000;
          break;
        case 'hours':
          this.value *= 60 * 60 * 1000;
          break;
        case 'days':
          this.value *= 24 * 60 * 60 * 1000;
          break;
        default:
          throw new Error(`Unsupported units ${unit}`);
      }
    }
  }

  static fromAst(expression: NumberNode): RefinementExpression {
    const value = Number(expression.value);
    if (isNaN(value)) {
      // This mirrors the behavior of constructing BigInts, as Number and Number.parseFloat are
      // otherwise inconsistent in their handling of invalid values.
      throw new SyntaxError(`Cannot convert ${expression.value} to a Number`);
    }
    return new NumberPrimitive(value, expression.units || []);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new NumberPrimitive(expr.value, expr.units);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }
}

export class BooleanPrimitive extends RefinementExpression {
  evalType = Primitive.BOOLEAN;
  value: boolean;

  constructor(value: boolean) {
    super('BooleanPrimitiveNode');
    this.value = value;
  }

  static fromAst(expression: BooleanNode): RefinementExpression {
    return new BooleanPrimitive(expression.value);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new BooleanPrimitive(expr.value);
  }

  toString(): string {
    return this.value.toString();
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }
}

export class TextPrimitive extends RefinementExpression {
  evalType = Primitive.TEXT;
  value: string;

  constructor(value: string) {
    super('TextPrimitiveNode');
    this.value = value;
  }

  static fromAst(expression: TextNode): RefinementExpression {
    return new TextPrimitive(expression.value);
  }

  toLiteral() {
    return {
      kind: this.kind,
      evalType: this.evalType,
      value: this.value
    };
  }

  static fromLiteral(expr): RefinementExpression {
    return new TextPrimitive(expr.value);
  }

  toString(): string {
    return `'${this.value}'`;
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }

  getTextPrimitives(): Set<string> {
    return new Set<string>([this.value]);
  }
}

export class NumberRange {
  private segments: NumberSegment[] = [];
  private type: Primitive;

  constructor(segs: NumberSegment[] = [], type: Primitive = Primitive.NUMBER) {
    this.type = type;
    for (const seg of segs) {
      this.unionWithSeg(seg);
    }
  }

  static universal(type: Primitive): NumberRange {
    if (type === Primitive.BOOLEAN) {
      return new NumberRange([NumberSegment.closedClosed(0, 0), NumberSegment.closedClosed(1, 1)], type);
    }
    return new NumberRange([NumberSegment.closedClosed(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)], type);
  }

  static unit(val: number, ty: Primitive): NumberRange {
    return new NumberRange([NumberSegment.closedClosed(val, val)], ty);
  }

  static copyOf(range: NumberRange): NumberRange {
    return new NumberRange(range.segments, range.type);
  }

  static unionOf(range1: NumberRange, range2: NumberRange): NumberRange {
    const newRange = NumberRange.copyOf(range1);
    newRange.union(range2);
    return newRange;
  }

  complement(): NumberRange {
    return NumberRange.difference(NumberRange.universal(this.type), this);
  }

  // difference(A,B) = A\B = A - B
  static difference(range1: NumberRange, range2: NumberRange): NumberRange {
    const newRange = new NumberRange([], range1.type);
    for (const seg of range1.segments) {
      const ntrsct = range2.intersectWithSeg(seg);
      let from: Boundary<number> = {...seg.from};
      for (const iseg of ntrsct.segments) {
        const to: Boundary<number> = {...iseg.from};
        to.isOpen = !to.isOpen;
        if (NumberSegment.isValid(from, to)) {
          newRange.segments.push(new NumberSegment(from, to));
        }
        from = iseg.to;
        from.isOpen = !from.isOpen;
      }
      const to: Boundary<number> = {...seg.to};
      if (NumberSegment.isValid(from, to)) {
        newRange.segments.push(new NumberSegment(from, to));
      }
    }
    return newRange;
  }

  equals(range: NumberRange): boolean {
    if (this.segments.length !== range.segments.length) {
      return false;
    }
    for (let i = 0; i < this.segments.length; i++) {
      if (!this.segments[i].equals(range.segments[i])) {
        return false;
      }
    }
    return true;
  }

  isSubsetOf(range: NumberRange): boolean {
    return this.equals(this.intersect(range));
  }

  union(range: NumberRange): void {
    for (const seg of range.segments) {
      this.unionWithSeg(seg);
    }
  }

  intersect(range: NumberRange): NumberRange {
    const newRange = new NumberRange();
    for (const seg of range.segments) {
      const dup = this.intersectWithSeg(seg);
      newRange.union(dup);
    }
    return newRange;
  }

  unionWithSeg(seg: NumberSegment): void {
    let i = 0;
    for (const subRange of this.segments) {
      if (seg.isGreaterThan(subRange, false)) {
        i += 1;
      } else if (seg.mergeableWith(subRange)) {
        seg.from = NumberSegment.min(subRange.from, seg.from, false);
      } else {
        break;
      }
    }

    let j = this.segments.length;
    for (const subRange of this.segments.slice().reverse()) {
      if (seg.isLessThan(subRange, false)) {
        j -= 1;
      } else if (seg.mergeableWith(subRange)) {
        seg.to = NumberSegment.max(subRange.to, seg.to, false);
      } else {
        break;
      }
    }
    this.segments.splice(i, j-i, seg);
  }

  intersectWithSeg(seg: NumberSegment): NumberRange {
    const newRange = new NumberRange();
    for (const subRange of this.segments) {
      if (subRange.overlapsWith(seg)) {
        newRange.segments.push(NumberSegment.overlap(seg, subRange));
      }
    }
    return newRange;
  }

  // This function assumes that the expression is univariate
  // and has been normalized (see Refinement.normalize for definition).
  // TODO(ragdev): Currently only Number and Boolean types are supported. Add String support.
  static fromExpression(expr: RefinementExpression, textToNum: Dictionary<number> = {}): NumberRange {
    if (expr instanceof BinaryExpression) {
      if (expr.leftExpr instanceof FieldNamePrimitive && expr.rightExpr instanceof NumberPrimitive) {
        return NumberRange.makeInitialGivenOp(expr.operator.op, expr.rightExpr.value);
      }
      if (expr.leftExpr instanceof FieldNamePrimitive && expr.rightExpr instanceof TextPrimitive) {
        return NumberRange.makeInitialGivenOp(expr.operator.op, textToNum[expr.rightExpr.value]);
      }
      const left = NumberRange.fromExpression(expr.leftExpr, textToNum);
      const right = NumberRange.fromExpression(expr.rightExpr, textToNum);
      return NumberRange.updateGivenOp(expr.operator.op, [left, right]);
    }
    if (expr instanceof UnaryExpression) {
      const rg = NumberRange.fromExpression(expr.expr, textToNum);
      return NumberRange.updateGivenOp(expr.operator.op, [rg]);
    }
    if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.BOOLEAN) {
      return NumberRange.unit(1, Primitive.BOOLEAN); // TODO: Check this.
    }
    if (expr instanceof BooleanPrimitive && expr.evalType === Primitive.BOOLEAN) {
      return NumberRange.universal(Primitive.UNKNOWN);
    }

    // This represents cases that the refinement system cannot solve statically.
    return null;
  }

  static makeInitialGivenOp(op: Op, val: ExpressionPrimitives): NumberRange {
    switch (op) {
      case Op.LT: return new NumberRange([NumberSegment.closedOpen(Number.NEGATIVE_INFINITY, val)]);
      case Op.LTE: return new NumberRange([NumberSegment.closedClosed(Number.NEGATIVE_INFINITY, val)]);
      case Op.GT: return new NumberRange([NumberSegment.openClosed(val, Number.POSITIVE_INFINITY)]);
      case Op.GTE: return new NumberRange([NumberSegment.closedClosed(val, Number.POSITIVE_INFINITY)]);
      case Op.EQ: return new NumberRange([NumberSegment.closedClosed(val, val)]);
      case Op.NEQ: return new NumberRange([NumberSegment.closedClosed(val, val)]).complement();
      default: throw new Error(`Unsupported operator: field ${op} number`);
    }
  }

  static updateGivenOp(op: Op, ranges: NumberRange[]): NumberRange {
    switch (op) {
      case Op.AND: {
        return ranges[0].intersect(ranges[1]);
      }
      case Op.OR: {
        return NumberRange.unionOf(ranges[0], ranges[1]);
      }
      case Op.EQ: {
        const lc = ranges[0].complement();
        const rc = ranges[1].complement();
        const lnr = ranges[0].intersect(ranges[1]);
        const lcnrc = lc.intersect(rc);
        return NumberRange.unionOf(lnr, lcnrc);
      }
      case Op.NEQ: {
        const lc = ranges[0].complement();
        const rc = ranges[1].complement();
        const lnrc = ranges[0].intersect(rc);
        const lcnr = lc.intersect(ranges[1]);
        return NumberRange.unionOf(lnrc, lcnr);
      }
      case Op.NOT: {
        return ranges[0].complement();
      }
      default: {
        throw new Error(`Unsupported operator '${op}': cannot update range`);
      }
    }
  }
}

export class NumberSegment {
  from: Boundary<number>;
  to: Boundary<number>;

  constructor(from: Boundary<number>, to: Boundary<number>) {
    if (!NumberSegment.isValid(from, to)) {
      throw new Error(`Invalid range from: ${from.val}, open:${from.isOpen}, to: ${to.val}, open:${to.isOpen}`);
    }
    this.from = {...from};
    this.to = {...to};
  }

  static isValid(from: Boundary<number>, to: Boundary<number>): boolean {
    if (to.val === undefined || from.val === undefined) {
      return false;
    }
    if ((to.val === Infinity || to.val === -Infinity) && to.isOpen) {
      return false;
    }
    if ((from.val === Infinity || from.val === -Infinity) && from.isOpen) {
      return false;
    }
    if (to.val < from.val) {
      return false;
    } else if (from.val === to.val && (from.isOpen || to.isOpen)) {
      return false;
    }
    return true;
  }

  static closedClosed(from: number, to: number): NumberSegment {
    return new NumberSegment({val: from, isOpen: false}, {val: to, isOpen: false});
  }

  static openOpen(from: number, to: number): NumberSegment {
    return new NumberSegment({val: from, isOpen: true}, {val: to, isOpen: true});
  }

  static closedOpen(from: number, to: number): NumberSegment {
    return new NumberSegment({val: from, isOpen: false}, {val: to, isOpen: true});
  }

  static openClosed(from: number, to: number): NumberSegment {
    return new NumberSegment({val: from, isOpen: true}, {val: to, isOpen: false});
  }

  equals(seg: NumberSegment): boolean {
    return this.from.isOpen === seg.from.isOpen &&
      this.from.val === seg.from.val &&
      this.to.isOpen === seg.to.isOpen &&
      this.to.val === seg.to.val;
  }

  // If strict is false, (a,x) is NOT less than [x,b)
  // even though mathematically it is.
  isLessThan(seg: NumberSegment, strict: boolean): boolean {
    if (this.to.val === seg.from.val) {
      if (strict) {
        return this.to.isOpen || seg.from.isOpen;
      }
      return this.to.isOpen && seg.from.isOpen;
    }
    return this.to.val < seg.from.val;
  }

  // If strict is false, (x,a) is NOT greater than (b,x]
  // even though mathematically it is.
  isGreaterThan(seg: NumberSegment, strict: boolean): boolean {
    if (this.from.val === seg.to.val) {
      if (strict) {
        return this.from.isOpen || seg.to.isOpen;
      }
      return this.from.isOpen && seg.to.isOpen;
    }
    return this.from.val > seg.to.val;
  }

  mergeableWith(seg: NumberSegment): boolean {
    return !this.isLessThan(seg, false) && !this.isGreaterThan(seg, false);
  }

  overlapsWith(seg: NumberSegment): boolean {
    return !this.isLessThan(seg, true) && !this.isGreaterThan(seg, true);
  }

  static min(a: Boundary<number>, b: Boundary<number>, inclusive: boolean): Boundary<number> {
    if (a.val !== b.val) {
      return (a.val < b.val) ? {...a} : {...b};
    }
    return {...a, isOpen: inclusive ? a.isOpen && b.isOpen : a.isOpen || b.isOpen};
  }

  static max(a: Boundary<number>, b: Boundary<number>, inclusive: boolean): Boundary<number> {
    if (a.val !== b.val) {
      return (a.val < b.val) ? {...b} : {...a};
    }
    return {...a, isOpen: inclusive ? a.isOpen && b.isOpen : a.isOpen || b.isOpen};
  }

  static merge(a: NumberSegment, b: NumberSegment): NumberSegment {
    if (!a.mergeableWith(b)) {
      throw new Error('Cannot merge non-overlapping segments');
    }
    return new NumberSegment(
      NumberSegment.min(a.from, b.from, true),
      NumberSegment.max(a.to, b.to, true)
    );
  }

  static overlap(a: NumberSegment, b: NumberSegment): NumberSegment {
    if (!a.overlapsWith(b)) {
      throw new Error('Cannot find intersection of non-overlapping segments');
    }
    return new NumberSegment(
      NumberSegment.max(a.from, b.from, false),
      NumberSegment.min(a.to, b.to, false)
    );
  }
}

export class BigIntRange {
  private segments: BigIntSegment[] = [];
  private type: Primitive;

  constructor(segs: BigIntSegment[] = [], type: Primitive = Primitive.BIGINT) {
    for (const seg of segs) {
      this.unionWithSeg(seg);
    }
    this.type = type;
  }

  static universal(type: Primitive): BigIntRange {
    if (type === Primitive.BOOLEAN) {
      // TODO: Support long, int etc.
      const b0 = BigInt(0);
      const b1 = BigInt(1);
      return new BigIntRange([BigIntSegment.closedClosed(b0, b0), BigIntSegment.closedClosed(b1, b1)], type);
    }
    // These are used to represent 'infinity'.
    return new BigIntRange([BigIntSegment.closedClosed('NEGATIVE_INFINITY', 'POSITIVE_INFINITY')], type);
  }

  static unit(val: bigint, ty: Primitive): BigIntRange {
    return new BigIntRange([BigIntSegment.closedClosed(val, val)], ty);
  }

  static copyOf(range: BigIntRange): BigIntRange {
    return new BigIntRange(range.segments, range.type);
  }

  static unionOf(range1: BigIntRange, range2: BigIntRange): BigIntRange {
    const newRange = BigIntRange.copyOf(range1);
    newRange.union(range2);
    return newRange;
  }

  complement(): BigIntRange {
    return BigIntRange.difference(BigIntRange.universal(this.type), this);
  }

  // difference(A,B) = A\B = A - B
  static difference(range1: BigIntRange, range2: BigIntRange): BigIntRange {
    const newRange = new BigIntRange([], range1.type);
    for (const seg of range1.segments) {
      const ntrsct = range2.intersectWithSeg(seg);
      let from: Boundary<BigIntValue> = {...seg.from};
      for (const iseg of ntrsct.segments) {
        const to: Boundary<BigIntValue> = {...iseg.from};
        to.isOpen = !to.isOpen;
        if (BigIntSegment.isValid(from, to)) {
          newRange.segments.push(new BigIntSegment(from, to));
        }
        from = iseg.to;
        from.isOpen = !from.isOpen;
      }
      const to: Boundary<BigIntValue> = {...seg.to};
      if (BigIntSegment.isValid(from, to)) {
        newRange.segments.push(new BigIntSegment(from, to));
      }
    }
    return newRange;
  }

  equals(range: BigIntRange): boolean {
    if (this.segments.length !== range.segments.length) {
      return false;
    }
    for (let i = 0; i < this.segments.length; i++) {
      if (!this.segments[i].equals(range.segments[i])) {
        return false;
      }
    }
    return true;
  }

  isSubsetOf(range: BigIntRange): boolean {
    return this.equals(this.intersect(range));
  }

  union(range: BigIntRange): void {
    for (const seg of range.segments) {
      this.unionWithSeg(seg);
    }
  }

  intersect(range: BigIntRange): BigIntRange {
    const newRange = new BigIntRange();
    for (const seg of range.segments) {
      const dup = this.intersectWithSeg(seg);
      newRange.union(dup);
    }
    return newRange;
  }

  unionWithSeg(seg: BigIntSegment): void {
    let i = 0;
    for (const subRange of this.segments) {
      if (seg.isGreaterThan(subRange, false)) {
        i += 1;
      } else if (seg.mergeableWith(subRange)) {
        seg.from = BigIntSegment.min(subRange.from, seg.from, false);
      } else {
        break;
      }
    }
    let j = this.segments.length;
    for (const subRange of this.segments.slice().reverse()) {
      if (seg.isLessThan(subRange, false)) {
        j -= 1;
      } else if (seg.mergeableWith(subRange)) {
        seg.to = BigIntSegment.max(subRange.to, seg.to, false);
      } else {
        break;
      }
    }
    this.segments.splice(i, j-i, seg);
  }

  intersectWithSeg(seg: BigIntSegment): BigIntRange {
    const newRange = new BigIntRange();
    for (const subRange of this.segments) {
      if (subRange.overlapsWith(seg)) {
        newRange.segments.push(BigIntSegment.overlap(seg, subRange));
      }
    }
    return newRange;
  }

  // This function assumes that the expression is univariate
  // and has been normalized (see Refinement.normalize for definition).
  // TODO(ragdev): Currently only BigInt and Boolean types are supported. Add String support.
  static fromExpression(expr: RefinementExpression, textToNum: Dictionary<bigint> = {}): BigIntRange {
    if (expr instanceof BinaryExpression) {
      if (expr.leftExpr instanceof FieldNamePrimitive && expr.rightExpr instanceof BigIntPrimitive) {
        return BigIntRange.makeInitialGivenOp(expr.operator.op, expr.rightExpr.value);
      }
      if (expr.leftExpr instanceof FieldNamePrimitive && expr.rightExpr instanceof TextPrimitive) {
        return BigIntRange.makeInitialGivenOp(expr.operator.op, textToNum[expr.rightExpr.value]);
      }
      const left = BigIntRange.fromExpression(expr.leftExpr, textToNum);
      const right = BigIntRange.fromExpression(expr.rightExpr, textToNum);
      return BigIntRange.updateGivenOp(expr.operator.op, [left, right]);
    }
    if (expr instanceof UnaryExpression) {
      const rg = BigIntRange.fromExpression(expr.expr, textToNum);
      return BigIntRange.updateGivenOp(expr.operator.op, [rg]);
    }
    if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.BOOLEAN) {
      return BigIntRange.unit(BigInt(1), Primitive.BOOLEAN); // TODO: Check this.
    }
    if (expr instanceof BooleanPrimitive && expr.evalType === Primitive.BOOLEAN) {
      return BigIntRange.universal(Primitive.UNKNOWN);
    }

    // This represents cases that the refinement system cannot solve statically.
    return null;
  }

  static makeInitialGivenOp(op: Op, val: ExpressionPrimitives): BigIntRange {
    switch (op) {
      case Op.LT: return new BigIntRange([BigIntSegment.closedOpen('NEGATIVE_INFINITY', val)]);
      case Op.LTE: return new BigIntRange([BigIntSegment.closedClosed('NEGATIVE_INFINITY', val)]);
      case Op.GT: return new BigIntRange([BigIntSegment.openClosed(val, 'POSITIVE_INFINITY')]);
      case Op.GTE: return new BigIntRange([BigIntSegment.closedClosed(val, 'POSITIVE_INFINITY')]);
      case Op.EQ: return new BigIntRange([BigIntSegment.closedClosed(val, val)]);
      case Op.NEQ: return new BigIntRange([BigIntSegment.closedClosed(val, val)]).complement();
      default: throw new Error(`Unsupported operator: field ${op} bigint`);
    }
  }

  static updateGivenOp(op: Op, ranges: BigIntRange[]): BigIntRange {
    switch (op) {
      case Op.AND: {
        return ranges[0].intersect(ranges[1]);
      }
      case Op.OR: {
        return BigIntRange.unionOf(ranges[0], ranges[1]);
      }
      case Op.EQ: {
        const lc = ranges[0].complement();
        const rc = ranges[1].complement();
        const lnr = ranges[0].intersect(ranges[1]);
        const lcnrc = lc.intersect(rc);
        return BigIntRange.unionOf(lnr, lcnrc);
      }
      case Op.NEQ: {
        const lc = ranges[0].complement();
        const rc = ranges[1].complement();
        const lnrc = ranges[0].intersect(rc);
        const lcnr = lc.intersect(ranges[1]);
        return BigIntRange.unionOf(lnrc, lcnr);
      }
      case Op.NOT: {
        return ranges[0].complement();
      }
      default: {
        throw new Error(`Unsupported operator '${op}': cannot update range`);
      }
    }
  }
}

type BigIntValue = bigint | 'POSITIVE_INFINITY' | 'NEGATIVE_INFINITY';

export class BigIntSegment {
  from: Boundary<BigIntValue>;
  to: Boundary<BigIntValue>;

  constructor(from: Boundary<BigIntValue>, to: Boundary<BigIntValue>) {
    if (!BigIntSegment.isValid(from, to)) {
      throw new Error(`Invalid range from: ${from.val}, open:${from.isOpen}, to: ${to.val}, open:${to.isOpen}`);
    }
    this.from = {...from};
    this.to = {...to};
  }

  static isValid(from: Boundary<BigIntValue>, to: Boundary<BigIntValue>): boolean {
    if (to.val === undefined || from.val === undefined) {
      return false;
    }
    if (from.val === 'NEGATIVE_INFINITY') {
      return to.val !== 'NEGATIVE_INFINITY' && !from.isOpen;
    }
    if (to.val === 'POSITIVE_INFINITY') {
      return from.val !== 'POSITIVE_INFINITY' && !to.isOpen;
    }
    if (to.val < from.val) {
      return false;
    } else if (from.val === to.val && (from.isOpen || to.isOpen)) {
      return false;
    }
    return true;
  }

  static closedClosed(from: BigIntValue, to: BigIntValue): BigIntSegment {
    return new BigIntSegment({val: from, isOpen: false}, {val: to, isOpen: false});
  }

  static openOpen(from: BigIntValue, to: BigIntValue): BigIntSegment {
    return new BigIntSegment({val: from, isOpen: true}, {val: to, isOpen: true});
  }

  static closedOpen(from: BigIntValue, to: BigIntValue): BigIntSegment {
    return new BigIntSegment({val: from, isOpen: false}, {val: to, isOpen: true});
  }

  static openClosed(from: BigIntValue, to: BigIntValue): BigIntSegment {
    return new BigIntSegment({val: from, isOpen: true}, {val: to, isOpen: false});
  }

  equals(seg: BigIntSegment): boolean {
    return this.from.isOpen === seg.from.isOpen &&
      this.from.val === seg.from.val &&
      this.to.isOpen === seg.to.isOpen &&
      this.to.val === seg.to.val;
  }

  // If strict is false, (a,x) is NOT less than [x,b)
  // even though mathematically it is.
  isLessThan(seg: BigIntSegment, strict: boolean): boolean {
    if (this.to.val === seg.from.val) {
      if (strict) {
        return this.to.isOpen || seg.from.isOpen;
      }
      return this.to.isOpen && seg.from.isOpen;
    }
    return BigIntSegment.gt(seg.from, this.to);
  }

  // If strict is false, (x,a) is NOT greater than (b,x]
  // even though mathematically it is.
  isGreaterThan(seg: BigIntSegment, strict: boolean): boolean {
    if (this.from.val === seg.to.val) {
      if (strict) {
        return this.from.isOpen || seg.to.isOpen;
      }
      return this.from.isOpen && seg.to.isOpen;
    }
    return BigIntSegment.gt(this.from, seg.to);
  }

  mergeableWith(seg: BigIntSegment): boolean {
    return !this.isLessThan(seg, false) && !this.isGreaterThan(seg, false);
  }

  overlapsWith(seg: BigIntSegment): boolean {
    return !this.isLessThan(seg, true) && !this.isGreaterThan(seg, true);
  }

  static gt(a: Boundary<BigIntValue>, b: Boundary<BigIntValue>) {
    return (a.val === 'POSITIVE_INFINITY' || b.val === 'NEGATIVE_INFINITY' || (typeof a.val === 'bigint' && typeof b.val === 'bigint' && a.val > b.val));
  }

  static min(a: Boundary<BigIntValue>, b: Boundary<BigIntValue>, inclusive: boolean): Boundary<BigIntValue> {
    if (a.val !== b.val) {
      return BigIntSegment.gt(a, b) ? {...b} : {...a};
    }
    return {...a, isOpen: inclusive ? a.isOpen && b.isOpen : a.isOpen || b.isOpen};
  }

  static max(a: Boundary<BigIntValue>, b: Boundary<BigIntValue>, inclusive: boolean): Boundary<BigIntValue> {
    if (a.val !== b.val) {
      return BigIntSegment.gt(a, b) ? {...a} : {...b};
    }
    return {...a, isOpen: inclusive ? a.isOpen && b.isOpen : a.isOpen || b.isOpen};
  }

  static merge(a: BigIntSegment, b: BigIntSegment): BigIntSegment {
    if (!a.mergeableWith(b)) {
      throw new Error('Cannot merge non-overlapping segments');
    }
    return new BigIntSegment(
      BigIntSegment.min(a.from, b.from, true),
      BigIntSegment.max(a.to, b.to, true)
    );
  }

  static overlap(a: BigIntSegment, b: BigIntSegment): BigIntSegment {
    if (!a.overlapsWith(b)) {
      throw new Error('Cannot find intersection of non-overlapping segments');
    }
    return new BigIntSegment(
      BigIntSegment.max(a.from, b.from, false),
      BigIntSegment.min(a.to, b.to, false)
    );
  }
}

interface Boundary<Num> {
  val: Num;
  isOpen: boolean;
}

interface OperatorInfo {
  nArgs: number;
  // TODO: Implement real 'function' types with rules for variables and interfaces.
  // The current argType model is a list of types that the arguments are allowed to take or 'same'
  // meaning that the arguments can be anything as long as the types are the same.
  argType: Primitive[] | 'same';
  // The current evalType model is a set type that the result must take, of 'same' meaning that the
  // type should be the same as the type of the first argument.
  evalType: Primitive | 'same';
}

const numericTypes = [Primitive.NUMBER, Primitive.BIGINT];

const operatorTable: Dictionary<OperatorInfo> = {
  // Booleans
  [Op.NOT]: {nArgs: 1, argType: [Primitive.BOOLEAN],  evalType: Primitive.BOOLEAN},
  [Op.AND]: {nArgs: 2, argType: [Primitive.BOOLEAN], evalType: Primitive.BOOLEAN},
  [Op.OR]: {nArgs: 2, argType: [Primitive.BOOLEAN], evalType: Primitive.BOOLEAN},

  // Numerics
  [Op.ADD]: {nArgs: 2, argType: numericTypes,  evalType: 'same'},
  [Op.SUB]: {nArgs: 2, argType: numericTypes,  evalType: 'same'},
  [Op.MUL]: {nArgs: 2, argType: numericTypes,  evalType: 'same'},
  [Op.DIV]: {nArgs: 2, argType: numericTypes,  evalType: 'same'},
  [Op.NEG]: {nArgs: 1, argType: numericTypes,  evalType: 'same'},

  // Numeric Comparisons
  [Op.LT]: {nArgs: 2, argType: numericTypes,  evalType: Primitive.BOOLEAN},
  [Op.GT]: {nArgs: 2, argType: numericTypes,  evalType: Primitive.BOOLEAN},
  [Op.LTE]: {nArgs: 2, argType: numericTypes,  evalType: Primitive.BOOLEAN},
  [Op.GTE]: {nArgs: 2, argType: numericTypes,  evalType: Primitive.BOOLEAN},

  // Comparisons
  [Op.EQ]: {nArgs: 2, argType: 'same', evalType: Primitive.BOOLEAN},
  [Op.NEQ]: {nArgs: 2, argType: 'same', evalType: Primitive.BOOLEAN},
};

const evalTable: Dictionary<(exprs: ExpressionPrimitives[]) => ExpressionPrimitives> = {
  // Booleans
  [Op.NOT]: e => !e[0],
  [Op.AND]: e => e[0] && e[1],
  [Op.OR]: e => e[0] || e[1],

  // Numerics
  [Op.ADD]: (e: (number|bigint)[]) => {
    // Note: These operators support automatic casting of bigint types to number.
    // The type system enforces that these are not used in `validateOperandCompatibility`.
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) + Number(e[1]);
    }
    return e[0] + e[1];
  },
  [Op.SUB]: (e: (number|bigint)[]) => {
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) - Number(e[1]);
    }
    return e[0] - e[1];
  },
  [Op.MUL]: (e: (number|bigint)[]) => {
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) * Number(e[1]);
    }
    return e[0] * e[1];
  },
  [Op.DIV]: (e: (number|bigint)[]) => {
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) / Number(e[1]);
    }
    return e[0] / e[1];
  },
  [Op.NEG]: e => -e[0],

  // Numeric Comparisons (javascript already supports number and bigint comparisons here)
  [Op.LT]: e => e[0] < e[1],
  [Op.GT]: e => e[0] > e[1],
  [Op.LTE]: e => e[0] <= e[1],
  [Op.GTE]: e => e[0] >= e[1],

  // Comparisons
  [Op.EQ]: (e: (number|bigint)[]) => {
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) === Number(e[1]);
    }
    return e[0] === e[1];
  },
  [Op.NEQ]: (e: (number|bigint)[]) => {
    if (typeof e[0] === 'number' || typeof e[1] === 'number') {
      return Number(e[0]) !== Number(e[1]);
    }
    return e[0] !== e[1];
  },
};

export class RefinementOperator {
  opInfo: OperatorInfo;
  op: Op;

  constructor(operator: Op) {
    this.updateOp(operator);
  }

  toLiteral() {
    return this.op;
  }

  static fromLiteral(refOpr: Op): RefinementOperator {
    return new RefinementOperator(refOpr);
  }

  flip(): void {
    switch (this.op) {
      case Op.LT: this.updateOp(Op.GT); break;
      case Op.GT: this.updateOp(Op.LT); break;
      case Op.LTE: this.updateOp(Op.GTE); break;
      case Op.GTE: this.updateOp(Op.LTE); break;
      default: break;
    }
  }

  updateOp(operator: Op) {
    this.op = operator;
    this.opInfo = operatorTable[operator];
    if (!this.opInfo) {
      throw new Error(`Invalid refinement operator ${operator}`);
    }
  }

  eval(exprs: ExpressionPrimitives[]): ExpressionPrimitives {
    return evalTable[this.op](exprs);
  }

  evalType(): Primitive | 'same' {
    return this.opInfo.evalType;
  }

  validateOperandCompatibility(operands: RefinementExpression[]): void {
    if (operands.length !== this.opInfo.nArgs) {
      throw new Error(`Expected ${this.opInfo.nArgs} operands. Got ${operands.length}.`);
    }
    if (this.opInfo.argType === 'same') {
      // If there is a type variable, apply the restriction.
      if (operands[0].evalType === Primitive.UNKNOWN) {
        operands[0].evalType = operands[1].evalType;
        return;
      }
      if (operands[1].evalType === Primitive.UNKNOWN) {
        operands[1].evalType = operands[0].evalType;
        return;
      }
      if (operands[0].evalType !== operands[1].evalType) {
        throw new Error(`Expected refinement expression ${operands[0]} and ${operands[1]} to have the same type. But found types ${operands[0].evalType} and ${operands[1].evalType}.`);
      }
      // TODO(cypher1): Use the type checker here (with type variables) as this is not typesafe.
      // E.g. if both arguments are unknown, the types will be unknown but not enforced to be equal.
    } else {
      let argType: Primitive = Primitive.UNKNOWN;
      for (const operand of operands) {
        if (this.opInfo.argType.includes(operand.evalType) && operand.evalType !== Primitive.UNKNOWN) {
          argType = operand.evalType;
        }
      }
      for (const operand of operands) {
        if (operand.evalType === Primitive.UNKNOWN) {
          operand.evalType = argType;
        }
        if (operand.evalType !== argType) {
          throw new Error(`Refinement expression ${operand} has type ${operand.evalType}. Expected ${this.opInfo.argType.join(' or ')}.`);
        }
      }
    }
  }
}

// A constant is represented by an empty Term object, where there is no indeterminate.
const CONSTANT = '{}';

export class NumberFraction {
  num: NumberMultinomial;
  den: NumberMultinomial;

  constructor(n?: NumberMultinomial, d?: NumberMultinomial) {
    this.num = n ? NumberMultinomial.copyOf(n) : new NumberMultinomial();
    this.den = d ? NumberMultinomial.copyOf(d) : new NumberMultinomial({[CONSTANT]: 1});
    if (this.den.isZero()) {
      throw new Error('Division by zero.');
    }
    this.reduce();
  }

  static add(a: NumberFraction, b: NumberFraction): NumberFraction {
    const den = NumberMultinomial.multiply(a.den, b.den);
    const num = NumberMultinomial.add(NumberMultinomial.multiply(a.num, b.den), NumberMultinomial.multiply(b.num, a.den));
    return new NumberFraction(num, den);
  }

  static negate(a: NumberFraction): NumberFraction {
    return new NumberFraction(NumberMultinomial.negate(a.num), a.den);
  }

  static subtract(a: NumberFraction, b: NumberFraction): NumberFraction {
    const negB = NumberFraction.negate(b);
    return NumberFraction.add(a, negB);
  }

  static multiply(a: NumberFraction, b: NumberFraction): NumberFraction {
    return new NumberFraction(NumberMultinomial.multiply(a.num, b.num), NumberMultinomial.multiply(a.den, b.den));
  }

  static divide(a: NumberFraction, b: NumberFraction): NumberFraction {
    const invB = new NumberFraction(b.den, b.num);
    return NumberFraction.multiply(a, invB);
  }

  reduce() {
    if (this.num.isZero()) {
      this.den = new NumberMultinomial({[CONSTANT]: 1});
      return;
    }
    if (this.num.isConstant() &&
        this.den.isConstant() &&
        Number.isInteger(this.num.terms[CONSTANT]) &&
        Number.isInteger(this.den.terms[CONSTANT])
    ) {
      const gcd = (a: number, b: number) => {
        a = Math.abs(a); b = Math.abs(b);
        return b === 0 ? a : gcd(b, a%b);
      };
      const g = gcd(this.num.terms[CONSTANT], this.den.terms[CONSTANT]);
      this.num = new NumberMultinomial({[CONSTANT]: this.num.terms[CONSTANT]/g});
      this.den = new NumberMultinomial({[CONSTANT]: this.den.terms[CONSTANT]/g});
      return;
    }
    // TODO(ragdev): NumberFractions can be reduced further by factoring out the gcd of
    // the coeffs in num and den, and then dividing the two. However, since the numbers are floating
    // points, the precision and computation cost of gcd function will be a trade-off to consider.
  }

  // assumes the expression received has an evalType of Primitive.NUMBER
  static fromExpression(expr: RefinementExpression): NumberFraction {
    if (expr instanceof BinaryExpression) {
      const left = NumberFraction.fromExpression(expr.leftExpr);
      const right = NumberFraction.fromExpression(expr.rightExpr);
      return NumberFraction.updateGivenOp(expr.operator.op, [left, right]);
    } else if (expr instanceof UnaryExpression) {
      const fn = NumberFraction.fromExpression(expr.expr);
      return NumberFraction.updateGivenOp(expr.operator.op, [fn]);
    } else if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.NUMBER) {
      const term = new BigIntTerm({[expr.value]: BigInt(1)});
      return new NumberFraction(new NumberMultinomial({[term.toKey()]: 1}));
    } else if (expr instanceof NumberPrimitive) {
      return new NumberFraction(new NumberMultinomial({[CONSTANT]: expr.value}));
    }
    throw new Error(`Cannot resolve expression: ${expr.toString()}`);
  }

  static updateGivenOp(op: Op, fractions: NumberFraction[]): NumberFraction {
    switch (op) {
      case Op.ADD: return NumberFraction.add(fractions[0], fractions[1]);
      case Op.MUL: return NumberFraction.multiply(fractions[0], fractions[1]);
      case Op.SUB: return NumberFraction.subtract(fractions[0], fractions[1]);
      case Op.DIV: return NumberFraction.divide(fractions[0], fractions[1]);
      case Op.NEG: return NumberFraction.negate(fractions[0]);
      default:
        throw new Error(`Unsupported operator: '${op}'. Cannot update NumberFraction`);
    }
  }
}

export class BigIntFraction {
  num: BigIntMultinomial;
  den: BigIntMultinomial;

  constructor(n?: BigIntMultinomial, d?: BigIntMultinomial) {
    this.num = n ? BigIntMultinomial.copyOf(n) : new BigIntMultinomial();
    this.den = d ? BigIntMultinomial.copyOf(d) : new BigIntMultinomial({[CONSTANT]: BigInt(1)});
    if (this.den.isZero()) {
      throw new Error('Division by zero.');
    }
    this.reduce();
  }

  static add(a: BigIntFraction, b: BigIntFraction): BigIntFraction {
    const den = BigIntMultinomial.multiply(a.den, b.den);
    const num = BigIntMultinomial.add(BigIntMultinomial.multiply(a.num, b.den), BigIntMultinomial.multiply(b.num, a.den));
    return new BigIntFraction(num, den);
  }

  static negate(a: BigIntFraction): BigIntFraction {
    return new BigIntFraction(BigIntMultinomial.negate(a.num), a.den);
  }

  static subtract(a: BigIntFraction, b: BigIntFraction): BigIntFraction {
    const negB = BigIntFraction.negate(b);
    return BigIntFraction.add(a, negB);
  }

  static multiply(a: BigIntFraction, b: BigIntFraction): BigIntFraction {
    return new BigIntFraction(BigIntMultinomial.multiply(a.num, b.num), BigIntMultinomial.multiply(a.den, b.den));
  }

  static divide(a: BigIntFraction, b: BigIntFraction): BigIntFraction {
    const invB = new BigIntFraction(b.den, b.num);
    return BigIntFraction.multiply(a, invB);
  }

  reduce() {
    if (this.num.isZero()) {
      this.den = new BigIntMultinomial({[CONSTANT]: BigInt(1)});
      return;
    }
    if (this.num.isConstant() &&
        this.den.isConstant()) {
      const gcd = (a: bigint, b: bigint): bigint => {
        a = a > 0 ? a : -a; b = b > 0 ? b : -b; // Because Math.abs doesn't support bigint.
        return b === BigInt(0) ? a : gcd(b, a%b);
      };
      const g = gcd(this.num.terms[CONSTANT], this.den.terms[CONSTANT]);
      this.num = new BigIntMultinomial({[CONSTANT]: this.num.terms[CONSTANT]/g});
      this.den = new BigIntMultinomial({[CONSTANT]: this.den.terms[CONSTANT]/g});
      return;
    }
    // TODO(ragdev): BigIntFractions can be reduced further by factoring out the gcd of
    // the coeffs in num and den, and then dividing the two. However, since the numbers are floating
    // points, the precision and computation cost of gcd function will be a trade-off to consider.
  }

  // assumes the expression received has an evalType of Primitive.NUMBER
  static fromExpression(expr: RefinementExpression): BigIntFraction {
    if (expr instanceof BinaryExpression) {
      const left = BigIntFraction.fromExpression(expr.leftExpr);
      const right = BigIntFraction.fromExpression(expr.rightExpr);
      return BigIntFraction.updateGivenOp(expr.operator.op, [left, right]);
    } else if (expr instanceof UnaryExpression) {
      const fn = BigIntFraction.fromExpression(expr.expr);
      return BigIntFraction.updateGivenOp(expr.operator.op, [fn]);
    } else if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.NUMBER) {
      const term = new BigIntTerm({[expr.value]: BigInt(1)});
      return new BigIntFraction(new BigIntMultinomial({[term.toKey()]: BigInt(1)}));
    } else if (expr instanceof BigIntPrimitive) {
      return new BigIntFraction(new BigIntMultinomial({[CONSTANT]: expr.value}));
    }
    throw new Error(`Cannot resolve expression: ${expr.toString()}`);
  }

  static updateGivenOp(op: Op, fractions: BigIntFraction[]): BigIntFraction {
    switch (op) {
      case Op.ADD: return BigIntFraction.add(fractions[0], fractions[1]);
      case Op.MUL: return BigIntFraction.multiply(fractions[0], fractions[1]);
      case Op.SUB: return BigIntFraction.subtract(fractions[0], fractions[1]);
      case Op.DIV: return BigIntFraction.divide(fractions[0], fractions[1]);
      case Op.NEG: return BigIntFraction.negate(fractions[0]);
      default:
        throw new Error(`Unsupported operator: '${op}'. Cannot update BigIntFraction`);
    }
  }
}

export class NumberTerm {
  private _indeterminates: Dictionary<number>;

  constructor(indeterminates: Dictionary<number> = {}) {
    this.indeterminates = indeterminates;
  }

  static copyOf(tm: NumberTerm): NumberTerm {
    return new NumberTerm(tm.indeterminates);
  }

  get indeterminates(): Dictionary<number> {
    for (const [indeterminate, power] of Object.entries(this._indeterminates)) {
      if (power === 0) {
        delete this._indeterminates[indeterminate];
      }
    }
    return this._indeterminates;
  }

  set indeterminates(indtrms: Dictionary<number>) {
    this._indeterminates = {...indtrms};
  }

  toKey(): string {
    // sort the indeterminates
    const ordered = {};
    const unordered = this.indeterminates;
    Object.keys(unordered).sort().forEach((key) => {
      ordered[key] = unordered[key];
    });
    return JSON.stringify(ordered);
  }

  static fromKey(key: string): NumberTerm {
    const data = JSON.parse(key);
    for (const [indeterminate, power] of Object.entries(data)) {
      data[indeterminate] = Number(power);
    }
    return new NumberTerm(data);
  }

  static indeterminateToExpression(fn: string, pow: number): RefinementExpression {
    if (pow <= 0) {
      throw new Error('Pow should be >= 0');
    }
    if (pow === 1) {
      return new FieldNamePrimitive(fn, Primitive.NUMBER);
    }
    const n = Math.floor(pow/2);
    return new BinaryExpression(
      NumberTerm.indeterminateToExpression(fn, n),
      NumberTerm.indeterminateToExpression(fn, pow - n),
      new RefinementOperator(Op.MUL));
  }

  // assumes that term is not a constant i.e. not {}
  toExpression(): RefinementExpression {
    if (Object.keys(this.indeterminates).length === 0) {
      throw new Error('Cannot convert an empty term to expression');
    }
    let expr = null;
    for (const [indeterminate, power] of Object.entries(this.indeterminates)) {
      const indtrExpr = NumberTerm.indeterminateToExpression(indeterminate, power);
      expr = expr ? new BinaryExpression(expr, indtrExpr, new RefinementOperator(Op.MUL)) : indtrExpr;
    }
    return expr;
  }
}

export class NumberMultinomial {
  private _terms: Dictionary<number>;

  constructor(terms: Dictionary<number> = {}) {
    this._terms = terms;
  }

  static copyOf(mn: NumberMultinomial): NumberMultinomial {
    return new NumberMultinomial(mn.terms);
  }

  get terms(): Dictionary<number> {
    for (const [term, coeff] of Object.entries(this._terms)) {
      if (coeff === 0) {
        delete this._terms[term];
      }
    }
    const ordered: Dictionary<number> = {};
    const unordered: Dictionary<number> = this._terms;
    Object.keys(unordered).sort().forEach((key) => {
      ordered[key] = unordered[key];
    });
    this._terms = ordered;
    return this._terms;
  }

  static add(a: NumberMultinomial, b: NumberMultinomial): NumberMultinomial {
    const sum = NumberMultinomial.copyOf(a);
    for (const [term, coeff] of Object.entries(b.terms)) {
      const val: number = (sum.terms[term] || 0) + coeff;
      sum.terms[term] = val;
    }
    return sum;
  }

  static subtract(a: NumberMultinomial, b: NumberMultinomial): NumberMultinomial {
    return NumberMultinomial.add(a, NumberMultinomial.negate(b));
  }

  static negate(a: NumberMultinomial): NumberMultinomial {
    const neg = NumberMultinomial.copyOf(a);
    for (const [term, coeff] of Object.entries(neg.terms)) {
      neg.terms[term] = -coeff;
    }
    return neg;
  }

  static multiply(a: NumberMultinomial, b: NumberMultinomial): NumberMultinomial {
    const prod = new NumberMultinomial();
    for (const [aTerm, acoeff] of Object.entries(a.terms)) {
      for (const [bTerm, bcoeff] of Object.entries(b.terms)) {
        const tprod = NumberTerm.fromKey(aTerm);
        const bterm = NumberTerm.fromKey(bTerm);
        for (const [indeterminate, power] of Object.entries(bterm.indeterminates)) {
          const val: number = power + (tprod.indeterminates[indeterminate] || 0);
          tprod.indeterminates[indeterminate] = val;
        }
        const val: number = acoeff*bcoeff + (prod.terms[tprod.toKey()] || 0);
        prod.terms[tprod.toKey()] = val;
      }
    }
    return prod;
  }

  isZero(): boolean {
    return Object.keys(this.terms).length === 0;
  }

  isConstant(): boolean {
    return this.isZero() || (Object.keys(this.terms).length === 1 && this.terms.hasOwnProperty(CONSTANT));
  }

  getIndeterminates(): Set<string> {
    const indeterminates = new Set<string>();
    for (const tKey of Object.keys(this.terms)) {
      const term = NumberTerm.fromKey(tKey);
      for (const indeterminate of Object.keys(term.indeterminates)) {
        indeterminates.add(indeterminate);
      }
    }
    return indeterminates;
  }

  isUnivariate(): boolean {
    return this.getIndeterminates().size === 1;
  }

  degree(): number {
    let degree: number = 0;
    for (const tKey of Object.keys(this.terms)) {
      const term = NumberTerm.fromKey(tKey);
      let sum: number = 0;
      for (const power of Object.values(term.indeterminates)) {
        sum += power;
      }
      degree = sum > degree ? sum : degree;
    }
    return degree;
  }

  // returns <multinomial> <op> CONSTANT
  toExpression(op: Op): RefinementExpression {
    const operator = new RefinementOperator(op);
    if (this.isConstant()) {
      return new BinaryExpression(
        new NumberPrimitive(this.isZero() ? 0 : this.terms[CONSTANT]),
        new NumberPrimitive(0),
        operator);
    }
    if (this.isUnivariate() && this.degree() === 1) {
      const indeterminate: string = this.getIndeterminates().values().next().value;
      // TODO(ragdev): Implement a neater way to get the leading coefficient
      const leadingCoeff: number = this.terms[`{"${indeterminate}":1}`];
      const cnst: number = this.terms[CONSTANT] || 0;
      if (leadingCoeff < 0) {
        operator.flip();
      }
      const scaledCnst = cnst/leadingCoeff;
      return new BinaryExpression(
        new FieldNamePrimitive(indeterminate, Primitive.NUMBER),
        new NumberPrimitive(-scaledCnst),
        operator);
    }
    const termToExpression = (tKey: string, tCoeff: number) => {
      const termExpr = NumberTerm.fromKey(tKey).toExpression();
      if (tCoeff === 1) {
        return termExpr;
      }
      return new BinaryExpression(
        new NumberPrimitive(tCoeff),
        termExpr,
        new RefinementOperator(Op.MUL)
      );
    };
    let expr = null;
    let cnst = 0;
    for (const [tKey, tCoeff] of Object.entries(this.terms)) {
      if (tKey === CONSTANT) {
        cnst = tCoeff;
      } else {
        const termExpr = termToExpression(tKey, tCoeff);
        expr = expr ? new BinaryExpression(expr, termExpr, new RefinementOperator(Op.ADD)) : termExpr;
      }
    }
    return new BinaryExpression(expr, new NumberPrimitive(-cnst), operator);
  }
}

export class BigIntTerm {
  private _indeterminates: Dictionary<bigint>;

  constructor(indeterminates: Dictionary<bigint> = {}) {
    this.indeterminates = indeterminates;
  }

  static copyOf(tm: BigIntTerm): BigIntTerm {
    return new BigIntTerm(tm.indeterminates);
  }

  get indeterminates(): Dictionary<bigint> {
    for (const [indeterminate, power] of Object.entries(this._indeterminates)) {
      if (power === BigInt(0)) {
        delete this._indeterminates[indeterminate];
      }
    }
    return this._indeterminates;
  }

  set indeterminates(indtrms: Dictionary<bigint>) {
    this._indeterminates = {...indtrms};
  }

  toKey(): string {
    // sort the indeterminates
    const ordered = {};
    const unordered = this.indeterminates;
    Object.keys(unordered).sort().forEach((key) => {
      ordered[key] = unordered[key];
    });
    return JSON.stringify(ordered, (_key, value) =>
      typeof value === 'bigint'
        ? value.toString() // Workaround for JSON not supporting bigint.
        : value // return everything else unchanged
    );
  }

  static fromKey(key: string): BigIntTerm {
    const data = JSON.parse(key);
    for (const [indeterminate, power] of Object.entries(data)) {
      data[indeterminate] = BigInt(power);
    }
    return new BigIntTerm(data);
  }

  static indeterminateToExpression(fn: string, pow: bigint): RefinementExpression {
    if (pow <= 0) {
      throw new Error('Pow should be >= 0');
    }
    if (pow === BigInt(1)) {
      return new FieldNamePrimitive(fn, Primitive.BIGINT);
    }
    const n = pow/BigInt(2);
    return new BinaryExpression(
      BigIntTerm.indeterminateToExpression(fn, n),
      BigIntTerm.indeterminateToExpression(fn, pow - n),
      new RefinementOperator(Op.MUL));
  }

  // assumes that term is not a constant i.e. not {}
  toExpression(): RefinementExpression {
    if (Object.keys(this.indeterminates).length === 0) {
      throw new Error('Cannot convert an empty term to expression');
    }
    let expr = null;
    for (const [indeterminate, power] of Object.entries(this.indeterminates)) {
      const indtrExpr = BigIntTerm.indeterminateToExpression(indeterminate, power);
      expr = expr ? new BinaryExpression(expr, indtrExpr, new RefinementOperator(Op.MUL)) : indtrExpr;
    }
    return expr;
  }
}

export class BigIntMultinomial {
  private _terms: Dictionary<bigint>;

  constructor(terms: Dictionary<bigint> = {}) {
    this._terms = terms;
  }

  static copyOf(mn: BigIntMultinomial): BigIntMultinomial {
    return new BigIntMultinomial(mn.terms);
  }

  get terms(): Dictionary<bigint> {
    for (const [term, coeff] of Object.entries(this._terms)) {
      if (coeff === BigInt(0)) {
        delete this._terms[term];
      }
    }
    const ordered = {};
    const unordered = this._terms;
    Object.keys(unordered).sort().forEach((key) => {
      ordered[key] = unordered[key];
    });
    this._terms = ordered;
    return this._terms;
  }

  static add(a: BigIntMultinomial, b: BigIntMultinomial): BigIntMultinomial {
    const sum = BigIntMultinomial.copyOf(a);
    for (const [term, coeff] of Object.entries(b.terms)) {
      const val: bigint = (sum.terms[term] || BigInt(0)) + coeff;
      sum.terms[term] = val;
    }
    return sum;
  }

  static subtract(a: BigIntMultinomial, b: BigIntMultinomial): BigIntMultinomial {
    return BigIntMultinomial.add(a, BigIntMultinomial.negate(b));
  }

  static negate(a: BigIntMultinomial): BigIntMultinomial {
    const neg = BigIntMultinomial.copyOf(a);
    for (const [term, coeff] of Object.entries(neg.terms)) {
      neg.terms[term] = -coeff;
    }
    return neg;
  }

  static multiply(a: BigIntMultinomial, b: BigIntMultinomial): BigIntMultinomial {
    const prod = new BigIntMultinomial();
    for (const [aTerm, acoeff] of Object.entries(a.terms)) {
      for (const [bTerm, bcoeff] of Object.entries(b.terms)) {
        const tprod = BigIntTerm.fromKey(aTerm);
        const bterm = BigIntTerm.fromKey(bTerm);
        for (const [indeterminate, power] of Object.entries(bterm.indeterminates)) {
          const new_pow = tprod.indeterminates[indeterminate] || 0;
          const val: bigint = BigInt(power) + BigInt(new_pow);
          tprod.indeterminates[indeterminate] = val;
        }
        const val: bigint = acoeff*bcoeff + (prod.terms[tprod.toKey()] || BigInt(0));
        prod.terms[tprod.toKey()] = val;
      }
    }
    return prod;
  }

  isZero(): boolean {
    return Object.keys(this.terms).length === 0;
  }

  isConstant(): boolean {
    return this.isZero() || (Object.keys(this.terms).length === 1 && this.terms.hasOwnProperty(CONSTANT));
  }

  getIndeterminates(): Set<string> {
    const indeterminates = new Set<string>();
    for (const tKey of Object.keys(this.terms)) {
      const term = BigIntTerm.fromKey(tKey);
      for (const indeterminate of Object.keys(term.indeterminates)) {
        indeterminates.add(indeterminate);
      }
    }
    return indeterminates;
  }

  isUnivariate(): boolean {
    return this.getIndeterminates().size === 1;
  }

  degree(): bigint {
    let degree: bigint = BigInt(0);
    for (const tKey of Object.keys(this.terms)) {
      const term = BigIntTerm.fromKey(tKey);
      let sum: bigint = BigInt(0);
      for (const power of Object.values(term.indeterminates)) {
        sum += power;
      }
      degree = sum > degree ? sum : degree;
    }
    return degree;
  }

  // returns <multinomial> <op> CONSTANT
  toExpression(op: Op): RefinementExpression {
    if (this.isConstant()) {
      return new BinaryExpression(
        new BigIntPrimitive(this.isZero() ? BigInt(0) : this.terms[CONSTANT]),
        new BigIntPrimitive(BigInt(0)),
        new RefinementOperator(op));
    }
    if (this.isUnivariate() && this.degree() === BigInt(1)) {
      const operator = new RefinementOperator(op);
      const indeterminate = this.getIndeterminates().values().next().value;
      // TODO(ragdev): Implement a neater way to get the leading coefficient
      const leadingCoeff: bigint = this.terms[`{"${indeterminate}":1}`];
      const cnst: bigint = this.terms[CONSTANT] || BigInt(0);
      if (leadingCoeff < 0) {
        operator.flip();
      }
      const scaledCnst = cnst/leadingCoeff;
      return new BinaryExpression(
        new FieldNamePrimitive(indeterminate, Primitive.NUMBER),
        new BigIntPrimitive(-scaledCnst),
        operator);
    }
    const termToExpression = (tKey: string, tCoeff: bigint) => {
      const termExpr = BigIntTerm.fromKey(tKey).toExpression();
      if (tCoeff === BigInt(1)) {
        return termExpr;
      }
      return new BinaryExpression(
        new BigIntPrimitive(tCoeff),
        termExpr,
        new RefinementOperator(Op.MUL)
      );
    };
    let expr = null;
    let cnst = BigInt(0);
    for (const [tKey, tCoeff] of Object.entries(this.terms)) {
      if (tKey === CONSTANT) {
        cnst = tCoeff;
      } else {
        const termExpr = termToExpression(tKey, tCoeff);
        expr = expr ? new BinaryExpression(expr, termExpr, new RefinementOperator(Op.ADD)) : termExpr;
      }
    }
    return new BinaryExpression(expr, new BigIntPrimitive(-cnst), new RefinementOperator(op));
  }
}

export class Normalizer {

  // Updates 'expr' after rearrangement.
  static rearrangeNumericalExpression(expr: BinaryExpression): void {
    // TODO(cypher1): Use Number or BigInt here
    const lF = NumberFraction.fromExpression(expr.leftExpr);
    const rF = NumberFraction.fromExpression(expr.rightExpr);
    const frac = NumberFraction.subtract(lF, rF);
    let rearranged = null;
    switch (expr.operator.op) {
      case Op.LT: rearranged = Normalizer.fracLessThanZero(frac); break;
      case Op.GT: rearranged = Normalizer.fracGreaterThanZero(frac); break;
      case Op.EQ: rearranged = Normalizer.fracEqualsToZero(frac); break;
      default:
          throw new Error(`Unsupported operator ${expr.operator.op}: cannot rearrange numerical expression.`);
    }
    expr.update(rearranged);
  }

  static fracLessThanZero(frac: NumberFraction): RefinementExpression {
    const ngt0 = frac.num.toExpression(Op.GT);
    const nlt0 = frac.num.toExpression(Op.LT);
    const dgt0 = frac.den.toExpression(Op.GT);
    const dlt0 = frac.den.toExpression(Op.LT);
    const left = new BinaryExpression(ngt0, dlt0, new RefinementOperator(Op.AND));
    const right = new BinaryExpression(nlt0, dgt0, new RefinementOperator(Op.AND));
    return new BinaryExpression(left, right, new RefinementOperator(Op.OR));
  }

  static fracGreaterThanZero(frac: NumberFraction): BinaryExpression {
    const ngt0 = frac.num.toExpression(Op.GT);
    const nlt0 = frac.num.toExpression(Op.LT);
    const dgt0 = frac.den.toExpression(Op.GT);
    const dlt0 = frac.den.toExpression(Op.LT);
    return new BinaryExpression(
      new BinaryExpression(ngt0, dgt0, new RefinementOperator(Op.AND)),
      new BinaryExpression(nlt0, dlt0, new RefinementOperator(Op.AND)),
      new RefinementOperator(Op.OR)
    );
  }

  static fracEqualsToZero(frac: NumberFraction): RefinementExpression {
    const neq0 = frac.num.toExpression(Op.EQ);
    if (frac.den.isConstant() && !frac.den.isZero()) {
      return neq0; // TODO(cypher1): This normalizer should be doing this for us.
    }
    const dneq0 = frac.den.toExpression(Op.NEQ);
    return new BinaryExpression(neq0, dneq0, new RefinementOperator(Op.AND));
  }
}

/**
 * A visitor for the refinement expression to aid translation of refinement expressions
 * into expressions in another language, e.g. SQL or Kotlin.
 */
export abstract class RefinementExpressionVisitor<T> {

  generate(refinement: Refinement): T {
    refinement.normalize();
    return this.visit(refinement.expression);
  }

  visit(expression: RefinementExpression): T {
    switch (expression.kind) {
      case 'BinaryExpressionNode':
        return this.visitBinaryExpression(expression as BinaryExpression);
      case 'BooleanPrimitiveNode':
        return this.visitBooleanPrimitive(expression as BooleanPrimitive);
      case 'BuiltInNode':
        return this.visitBuiltIn(expression as BuiltIn);
      case 'FieldNamePrimitiveNode':
        return this.visitFieldNamePrimitive(expression as FieldNamePrimitive);
      case 'NumberPrimitiveNode':
        return this.visitNumberPrimitive(expression as NumberPrimitive);
      case 'QueryArgumentPrimitiveNode':
        return this.visitQueryArgumentPrimitive(expression as QueryArgumentPrimitive);
      case 'TextPrimitiveNode':
        return this.visitTextPrimitive(expression as TextPrimitive);
      case 'UnaryExpressionNode':
        return this.visitUnaryExpression(expression as UnaryExpression);
      default:
        throw new Error(`Unsupported refinement expression kind ${expression.kind}`);
    }
  }

  abstract visitBinaryExpression(expr: BinaryExpression): T;
  abstract visitUnaryExpression(expr: UnaryExpression): T;
  abstract visitFieldNamePrimitive(expr: FieldNamePrimitive): T;
  abstract visitQueryArgumentPrimitive(expr: QueryArgumentPrimitive): T;
  abstract visitBuiltIn(expr: BuiltIn): T;
  abstract visitNumberPrimitive(expr: NumberPrimitive): T;
  abstract visitBigIntPrimitive(expr: BigIntPrimitive): T;
  abstract visitBooleanPrimitive(expr: BooleanPrimitive): T;
  abstract visitTextPrimitive(expr: TextPrimitive): T;
}
