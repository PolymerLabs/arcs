/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {RefinementNode, RefinementExpressionNode, BinaryExpressionNode, UnaryExpressionNode, FieldNode, NumberNode, BooleanNode} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import {Schema} from './schema.js';
import {Entity} from './entity.js';

enum Primitive {
  BOOLEAN = 'Boolean',
  NUMBER = 'Number',
  TEXT = 'Text',
}

export enum Op {
  AND = 'and',
  OR  = 'or',
  LT  = '<',
  GT  = '>',
  LTE = '<=',
  GTE = '>=',
  ADD = '+',
  SUB = '-',
  MUL = '*',
  DIV = '/',
  NOT = 'not',
  NEG = 'neg',
  EQ = '==',
  NEQ = '!=',
}

export enum AtleastAsSpecific {
  YES,
  NO,
  UNKNOWN
}

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;

export class Refinement {
  kind = 'refinement';
  expression: RefinementExpression = null;

  constructor(expr: RefinementExpression) {
    // TODO(ragdev): Should be a copy?
    // TODO(ragdev): ensure that the refinement contains at least 1 fieldName
    this.expression = expr;
  }

  static fromAst(ref: RefinementNode, typeData: Dictionary<ExpressionPrimitives>): Refinement {
    if (!ref) {
      return null;
    }
    return new Refinement(RefinementExpression.fromAst(ref.expression, typeData));
  }

  static fromLiteral(ref): Refinement {
    return new Refinement(RefinementExpression.fromLiteral(ref.expression));
  }

  static refineData(entity: Entity, schema: Schema): void {
    for (const [name, value] of Object.entries(entity)) {
      const refDict = {[name]: value};
      const ref = schema.fields[name].refinement;
      if (ref && !ref.validateData(refDict)) {
        throw new Error(`Entity schema field '${name}' does not conform to the refinement.`);
      }
    }
    const ref = schema.refinement;
    if (ref && !ref.validateData(entity)) {
      throw new Error('Entity data does not conform to the refinement.');
    }
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
    return this.getFieldNames().has(fieldName);
  }

  getFieldNames(): Set<string> {
    return this.expression.getFieldNames();
  }

  // checks if a is more specific than b, returns null if can't be determined
  static isAtleastAsSpecificAs(a: Refinement, b: Refinement): AtleastAsSpecific {
    if (!a && b) {
      return AtleastAsSpecific.NO;
    } else if (a && !b) {
      return AtleastAsSpecific.YES;
    } else if (!a && !b) {
      return AtleastAsSpecific.YES;
    }
    try {
      a.normalise();
      b.normalise();
      const rangeA = Range.fromExpression(a.expression);
      const rangeB = Range.fromExpression(b.expression);
      return rangeA.isSubsetOf(rangeB) ? AtleastAsSpecific.YES : AtleastAsSpecific.NO;
    } catch (e) {
      return AtleastAsSpecific.UNKNOWN;
    }
  }

  // This function does the following:
  // ~ Simplifies mathematical and boolean expressions e.g. '(2*num + (1 + 3) < 4 + num) and True' => 'num < 0'
  // ~ Converts a binary node to {leftExpr: fieldName, rightExpr: val} (where applicable).
  // ~ Converts a unary node {op: '-', val: x} into a number node {val: -x}
  // ~ Removes redundant info like expression && false => false
  normalise() {
    try {
      // Rearrange doesn't handle multivariate case yet.
      // Therefore, we TRY to rearrange, if possible.
      this.expression = this.expression.rearrange();
    } catch (e) {
      console.log(e);
    }
    this.expression = this.expression.normalise();
  }

  toString(): string {
    return '[' + this.expression.toString() + ']';
  }

  toSQLExpression(): string {
    this.normalise();
    return this.expression.toSQLExpression();
  }

  validateData(data: Dictionary<ExpressionPrimitives>): boolean {
    const res = this.expression.applyOperator(data);
    if (typeof res !== 'boolean') {
      throw new Error('Refinement expression evaluated to a non-boolean type.');
    }
    return res;
  }
}

abstract class RefinementExpression {
  evalType: Primitive.BOOLEAN | Primitive.NUMBER | Primitive.TEXT;

  constructor(readonly kind: 'BinaryExpressionNode' | 'UnaryExpressionNode' | 'FieldNamePrimitiveNode' | 'NumberPrimitiveNode' | 'BooleanPrimitiveNode') {}
  static fromAst(expr: RefinementExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    if (!expr) {
      return null;
    }
    switch (expr.kind) {
      case 'binary-expression-node': return BinaryExpression.fromAst(expr, typeData);
      case 'unary-expression-node': return UnaryExpression.fromAst(expr, typeData);
      case 'field-name-node': return FieldNamePrimitive.fromAst(expr, typeData);
      case 'number-node': return NumberPrimitive.fromAst(expr);
      case 'boolean-node': return BooleanPrimitive.fromAst(expr);
      default:
        // Should never happen; all known kinds are handled above, but the linter wants a default.
        throw new Error(`RefinementExpression.fromAst: Unknown node type ${expr['kind']}`);
    }
  }

  static fromLiteral(expr): RefinementExpression {
    switch (expr.kind) {
      case 'BinaryExpressionNode': return BinaryExpression.fromLiteral(expr);
      case 'UnaryExpressionNode': return UnaryExpression.fromLiteral(expr);
      case 'FieldNamePrimitiveNode': return FieldNamePrimitive.fromLiteral(expr);
      case 'NumberPrimitiveNode': return NumberPrimitive.fromLiteral(expr);
      case 'BooleanPrimitiveNode': return BooleanPrimitive.fromLiteral(expr);
      default:
        // Should never happen; all known kinds are handled above, but the linter wants a default.
        throw new Error(`RefinementExpression.fromLiteral: Unknown node type ${expr['kind']}`);
    }
  }

  normalise(): RefinementExpression {
    return this;
  }

  rearrange(): RefinementExpression {
    return this;
  }

  abstract toString(): string;

  abstract toSQLExpression(): string;

  abstract applyOperator(data: Dictionary<ExpressionPrimitives>);

  abstract getFieldNames(): Set<string>;
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
    this.operator.validateOperandCompatibility([this.leftExpr.evalType, this.rightExpr.evalType]);
    this.evalType = this.operator.evalType();
}

  static fromAst(expression: BinaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    return new BinaryExpression(
            RefinementExpression.fromAst(expression.leftExpr, typeData),
            RefinementExpression.fromAst(expression.rightExpr, typeData),
            new RefinementOperator(expression.operator));
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

  toSQLExpression(): string {
    return `(${this.leftExpr.toSQLExpression()} ${this.operator.toSQLOp()} ${this.rightExpr.toSQLExpression()})`;
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    const left = this.leftExpr.applyOperator(data);
    const right = this.rightExpr.applyOperator(data);
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
    }
    return null;
  }

  rearrange(): RefinementExpression {
    if (this.evalType === Primitive.BOOLEAN && this.leftExpr.evalType === Primitive.NUMBER && this.rightExpr.evalType === Primitive.NUMBER) {
      Normaliser.rearrangeNumericalExpression(this);
    } else {
      this.leftExpr = this.leftExpr.rearrange();
      this.rightExpr = this.rightExpr.rearrange();
    }
    return this;
  }

  normalise(): RefinementExpression {
    this.leftExpr = this.leftExpr.normalise();
    this.rightExpr = this.rightExpr.normalise();
    const sp = this.simplifyPrimitive();
    if (sp) {
      return sp;
    }
    if (this.rightExpr instanceof FieldNamePrimitive) {
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
      default: return this;
    }
  }

  getFieldNames(): Set<string> {
    const fn1 = this.leftExpr.getFieldNames();
    const fn2 = this.rightExpr.getFieldNames();
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
    this.operator.validateOperandCompatibility([this.expr.evalType]);
    this.evalType = this.operator.evalType();
  }

  static fromAst(expression: UnaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    return new UnaryExpression(
            RefinementExpression.fromAst(expression.expr, typeData),
            new RefinementOperator((expression.operator === Op.SUB) ? Op.NEG : expression.operator));
  }

  static fromLiteral(expr): RefinementExpression {
    return new UnaryExpression(
            RefinementExpression.fromLiteral(expr.expr),
            RefinementOperator.fromLiteral(expr.operator));
  }

  toString(): string {
    return `(${this.operator.op === Op.NEG ? '-' : this.operator.op} ${this.expr.toString()})`;
  }

  toSQLExpression(): string {
    return `(${this.operator.toSQLOp()} ${this.expr.toSQLExpression()})`;
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    const expression = this.expr.applyOperator(data);
    return this.operator.eval([expression]);
  }

  simplifyPrimitive(): RefinementExpression  {
    if (this.expr instanceof BooleanPrimitive && this.operator.op === Op.NOT) {
      return new BooleanPrimitive(this.applyOperator());
    } else if (this.expr instanceof NumberPrimitive && this.operator.op === Op.NEG) {
      return new NumberPrimitive(this.applyOperator());
    }
    return null;
  }

  normalise(): RefinementExpression {
    this.expr = this.expr.normalise();
    const sp = this.simplifyPrimitive();
    if (sp) {
      return sp;
    }
    switch (this.operator.op) {
      case Op.NOT: {
        if (this.expr instanceof UnaryExpression && this.expr.operator.op === Op.NOT) {
          return this.expr.expr;
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

  getFieldNames(): Set<string> {
    return this.expr.getFieldNames();
  }
}

export class FieldNamePrimitive extends RefinementExpression {
  evalType: Primitive;
  value: string;

  constructor(value: string, evalType: Primitive.NUMBER | Primitive.BOOLEAN | Primitive.TEXT) {
    super('FieldNamePrimitiveNode');
    this.value = value;
    this.evalType = evalType;
  }

  static fromAst(expression: FieldNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
    if (typeData[expression.value] == undefined) {
      throw new Error(`Unresolved field name '${expression.value}' in the refinement expression.`);
    }
    return new FieldNamePrimitive(expression.value, typeData[expression.value]);
  }

  static fromLiteral(expr): RefinementExpression {
    return new FieldNamePrimitive(expr.value, expr.evalType);
  }

  toString(): string {
    return this.value.toString();
  }

  toSQLExpression(): string {
    if (this.evalType === Primitive.BOOLEAN) {
      return `(${this.value.toString()} = 1)`;
    }
    return this.value.toString();
  }

  applyOperator(data: Dictionary<ExpressionPrimitives> = {}): ExpressionPrimitives {
    if (data[this.value] != undefined) {
      return data[this.value];
    }
    throw new Error(`Unresolved field name '${this.value}' in the refinement expression.`);
  }

  getFieldNames(): Set<string> {
    return new Set<string>([this.value]);
  }
}

export class NumberPrimitive extends RefinementExpression {
  evalType = Primitive.NUMBER;
  value: number;

  constructor(value: number) {
    super('NumberPrimitiveNode');
    this.value = value;
  }

  static fromAst(expression: NumberNode): RefinementExpression {
    return new NumberPrimitive(expression.value);
  }

  static fromLiteral(expr): RefinementExpression {
    return new NumberPrimitive(expr.value);
  }

  toString(): string {
    return this.value.toString();
  }

  toSQLExpression(): string {
    return this.value.toString();
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }

  getFieldNames(): Set<string> {
    return new Set<string>();
  }
}

class BooleanPrimitive extends RefinementExpression {
  evalType = Primitive.BOOLEAN;
  value: boolean;

  constructor(value: boolean) {
    super('BooleanPrimitiveNode');
    this.value = value;
  }

  static fromAst(expression: BooleanNode): RefinementExpression {
    return new BooleanPrimitive(expression.value);
  }

  static fromLiteral(expr): RefinementExpression {
    return new BooleanPrimitive(expr.value);
  }

  toString(): string {
    return this.value.toString();
  }

  toSQLExpression(): string {
    throw new Error('BooleanPrimitive.toSQLExpression should never be called. The expression is assumed to be normalised.');
  }

  applyOperator(): ExpressionPrimitives {
    return this.value;
  }

  getFieldNames(): Set<string> {
    return new Set<string>();
  }
}

export class Range {
  private segments: Segment[] = [];
  private type: Primitive;

  constructor(segs: Segment[] = [], type: Primitive = Primitive.NUMBER) {
    for (const seg of segs) {
      this.unionWithSeg(seg);
    }
    this.type = type;
  }

  static infiniteRange(type: Primitive = Primitive.NUMBER): Range {
    return new Range([Segment.openOpen(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)], type);
  }

  static universal(type: Primitive) {
    if (type === Primitive.BOOLEAN) {
      return new Range([Segment.closedClosed(0, 0), Segment.closedClosed(1, 1)], type);
    }
    return Range.infiniteRange(type);
  }

  static booleanRange(val: number): Range {
    if (val !== 0 && val !== 1) {
        throw new Error('Invalid value for a boolean range.');
    }
    return new Range([Segment.closedClosed(val, val)], Primitive.BOOLEAN);
}

  static copyOf(range: Range): Range {
    return new Range(range.segments, range.type);
  }

  static unionOf(range1: Range, range2: Range): Range {
    const newRange = Range.copyOf(range1);
    newRange.union(range2);
    return newRange;
  }

  static intersectionOf(range1: Range, range2: Range): Range {
    const newRange = Range.copyOf(range1);
    newRange.intersect(range2);
    return newRange;
  }

  static complementOf(range: Range) {
    return Range.difference(Range.universal(range.type), range);
  }

  // difference(A,B) = A\B = A - B
  static difference(range1: Range, range2: Range): Range {
    const newRange = new Range();
    for (const seg of range1.segments) {
      const ntrsct = Range.copyOf(range2);
      ntrsct.intersectWithSeg(seg);
      let from: Boundary = {...seg.from};
      for (const iseg of ntrsct.segments) {
        const to: Boundary = {...iseg.from};
        to.isOpen = !to.isOpen;
        if (Segment.isValid(from, to)) {
          newRange.segments.push(new Segment(from, to));
        }
        from = iseg.to;
        from.isOpen = !from.isOpen;
      }
      const to: Boundary = {...seg.to};
      if (Segment.isValid(from, to)) {
        newRange.segments.push(new Segment(from, to));
      }
    }
    return newRange;
  }

  equals(range: Range): boolean {
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

  isSubsetOf(range: Range): boolean {
    return this.equals(Range.intersectionOf(this, range));
  }

  union(range: Range): void {
    for (const seg of range.segments) {
      this.unionWithSeg(seg);
    }
  }

  intersect(range: Range): void {
    const newRange = new Range();
    for (const seg of range.segments) {
      const dup = Range.copyOf(this);
      dup.intersectWithSeg(seg);
      newRange.union(dup);
    }
    this.segments = newRange.segments;
  }

  unionWithSeg(seg: Segment): void {
    let i = 0;
    let j = this.segments.length;
    let x: Boundary = {...seg.from};
    let y: Boundary = {...seg.to};
    for (const subRange of this.segments) {
      if (seg.isGreaterThan(subRange, false)) {
        i += 1;
      } else {
        if (seg.mergeableWith(subRange)) {
          const m = Segment.merge(seg, subRange);
          x = {...m.from};
        } else {
          x = subRange.from.val < x.val ? {...subRange.from} : x;
        }
        break;
      }
    }
    for (const subRange of this.segments.slice().reverse()) {
      if (seg.isLessThan(subRange, false)) {
        j -= 1;
      } else {
        if (seg.mergeableWith(subRange)) {
          const m = Segment.merge(seg, subRange);
          y = {...m.to};
        } else {
          y = subRange.to.val > y.val ? {...subRange.to} : y;
        }
        break;
      }
    }
    this.segments.splice(i, j-i, new Segment(x, y));
  }

  intersectWithSeg(seg: Segment): void {
    const newRange = new Range();
    for (const subRange of this.segments) {
      if (subRange.overlapsWith(seg)) {
        newRange.segments.push(Segment.overlap(seg, subRange));
      }
    }
    this.segments = newRange.segments;
  }

  // This function assumes that the expression is univariate
  // and has been normalised (see Refinement.normalise for definition).
  // TODO(ragdev): Currently only Number and Boolean types are supported. Add String support.
  static fromExpression(expr: RefinementExpression): Range {
    if (expr instanceof BinaryExpression) {
      if (expr.leftExpr instanceof FieldNamePrimitive && expr.rightExpr instanceof NumberPrimitive) {
        return Range.makeInitialGivenOp(expr.operator.op, expr.rightExpr.value);
      }
      const left = Range.fromExpression(expr.leftExpr);
      const right = Range.fromExpression(expr.rightExpr);
      return Range.updateGivenOp(expr.operator.op, [left, right]);
    } else if (expr instanceof UnaryExpression) {
      const rg = Range.fromExpression(expr.expr);
      return Range.updateGivenOp(expr.operator.op, [rg]);
    } else if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.BOOLEAN) {
      return Range.booleanRange(1);
    }
    throw new Error(`Cannot resolve primitive nodes by themselves: ${expr.toString()}`);
  }

  static makeInitialGivenOp(op: string, val: ExpressionPrimitives): Range {
    switch (op) {
      case Op.LT: return new Range([Segment.openOpen(Number.NEGATIVE_INFINITY, val)]);
      case Op.LTE: return new Range([Segment.openClosed(Number.NEGATIVE_INFINITY, val)]);
      case Op.GT: return new Range([Segment.openOpen(val, Number.POSITIVE_INFINITY)]);
      case Op.GTE: return new Range([Segment.closedOpen(val, Number.POSITIVE_INFINITY)]);
      case Op.EQ: return new Range([Segment.closedClosed(val, val)]);
      case Op.NEQ: return Range.complementOf(new Range([Segment.closedClosed(val, val)]));
      default: throw new Error(`Unsupported operator: field ${op} number`);
    }
  }

  static updateGivenOp(op: string, ranges: Range[]): Range {
    switch (op) {
      case Op.AND: {
        return Range.intersectionOf(ranges[0], ranges[1]);
      }
      case Op.OR: {
        return Range.unionOf(ranges[0], ranges[1]);
      }
      case Op.EQ: {
        const lc = Range.complementOf(ranges[0]);
        const rc = Range.complementOf(ranges[1]);
        const lnr = Range.intersectionOf(ranges[0], ranges[1]);
        const lcnrc = Range.intersectionOf(lc, rc);
        return Range.unionOf(lnr, lcnrc);
      }
      case Op.NEQ: {
        const lc = Range.complementOf(ranges[0]);
        const rc = Range.complementOf(ranges[1]);
        const lnrc = Range.intersectionOf(ranges[0], rc);
        const lcnr = Range.intersectionOf(lc, ranges[1]);
        return Range.unionOf(lnrc, lcnr);
      }
      case Op.NOT: {
        return Range.complementOf(ranges[0]);
      }
      default:
        throw new Error(`Unsupported operator: cannot update range`);
    }
  }
}

export class Segment {
  from: Boundary;
  to: Boundary;

  constructor(from: Boundary, to: Boundary) {
    if (!Segment.isValid(from, to)) {
      throw new Error(`Invalid range from: ${from}, to:${to}`);
    }
    this.from = {...from};
    this.to = {...to};
  }

  static isValid(from: Boundary, to: Boundary): boolean {
    if (to.val < from.val) {
      return false;
    } else if (from.val === to.val && (from.isOpen || to.isOpen)) {
      return false;
    }
    return true;
  }

  static closedClosed(from: number, to: number): Segment {
    return new Segment({val: from, isOpen: false}, {val: to, isOpen: false});
  }

  static openOpen(from: number, to: number): Segment {
    return new Segment({val: from, isOpen: true}, {val: to, isOpen: true});
  }

  static closedOpen(from: number, to: number): Segment {
    return new Segment({val: from, isOpen: false}, {val: to, isOpen: true});
  }

  static openClosed(from: number, to: number): Segment {
    return new Segment({val: from, isOpen: true}, {val: to, isOpen: false});
  }

  equals(seg: Segment): boolean {
    return this.from.isOpen === seg.from.isOpen &&
      this.from.val === seg.from.val &&
      this.to.isOpen === seg.to.isOpen &&
      this.to.val === seg.to.val;
  }

  // If strict is false, (a,x) is NOT less than [x,b)
  // even though mathematically it is.
  isLessThan(seg: Segment, strict: boolean): boolean {
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
  isGreaterThan(seg: Segment, strict: boolean): boolean {
    if (this.from.val === seg.to.val) {
      if (strict) {
        return this.from.isOpen || seg.to.isOpen;
      }
      return this.from.isOpen && seg.to.isOpen;
    }
    return this.from.val > seg.to.val;
  }

  mergeableWith(seg: Segment): boolean {
    return !this.isLessThan(seg, false) && !this.isGreaterThan(seg, false);
  }

  overlapsWith(seg: Segment): boolean {
    return !this.isLessThan(seg, true) && !this.isGreaterThan(seg, true);
  }

  static merge(a: Segment, b: Segment): Segment {
    if (!a.mergeableWith(b)) {
      throw new Error('Cannot merge non-overlapping segments');
    }
    let left: Boundary;
    let right: Boundary;
    if (a.from.val === b.from.val) {
      left = {...a.from};
      left.isOpen = a.from.isOpen && b.from.isOpen;
    } else {
      left = a.from.val < b.from.val ? {...a.from} : {...b.from};
    }
    if (a.to.val === b.to.val) {
      right = {...a.to};
      right.isOpen = a.to.isOpen && b.to.isOpen;
    } else {
      right = a.to.val > b.to.val ? {...a.to} : {...b.to};
    }
    return new Segment(left, right);
  }

  static overlap(a: Segment, b: Segment): Segment {
    if (!a.overlapsWith(b)) {
      throw new Error('Cannot find intersection of non-overlapping segments');
    }
    let left: Boundary;
    let right: Boundary;
    if (a.from.val === b.from.val) {
      left = {...a.from};
      left.isOpen = a.from.isOpen || b.from.isOpen;
    } else {
      left = a.from.val > b.from.val ? {...a.from} : {...b.from};
    }
    if (a.to.val === b.to.val) {
      right = {...a.to};
      right.isOpen = a.to.isOpen || b.to.isOpen;
    } else {
      right = a.to.val < b.to.val ? {...a.to} : {...b.to};
    }
    return new Segment(left, right);
  }
}

interface Boundary {
  val: number;
  isOpen: boolean;
}

interface OperatorInfo {
  nArgs: number;
  argType: string;
  evalType: Primitive;
  sqlOp: string;
}

const operatorTable: Dictionary<OperatorInfo> = {
  [Op.AND]: {nArgs: 2, argType: Primitive.BOOLEAN, evalType: Primitive.BOOLEAN, sqlOp: 'AND'},
  [Op.OR]: {nArgs: 2, argType: Primitive.BOOLEAN, evalType: Primitive.BOOLEAN, sqlOp: 'OR'},
  [Op.LT]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.BOOLEAN, sqlOp: '<'},
  [Op.GT]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.BOOLEAN, sqlOp: '>'},
  [Op.LTE]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.BOOLEAN, sqlOp: '<='},
  [Op.GTE]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.BOOLEAN, sqlOp: '>='},
  [Op.ADD]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.NUMBER, sqlOp: '+'},
  [Op.SUB]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.NUMBER, sqlOp: '-'},
  [Op.MUL]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.NUMBER, sqlOp: '*'},
  [Op.DIV]: {nArgs: 2, argType: Primitive.NUMBER,  evalType: Primitive.NUMBER, sqlOp: '/'},
  [Op.NOT]: {nArgs: 1, argType: Primitive.BOOLEAN,  evalType: Primitive.BOOLEAN, sqlOp: 'NOT'},
  [Op.NEG]: {nArgs: 1, argType: Primitive.NUMBER,  evalType: Primitive.NUMBER, sqlOp: '-'},
  [Op.EQ]: {nArgs: 2, argType: 'same', evalType: Primitive.BOOLEAN, sqlOp: '='},
  [Op.NEQ]: {nArgs: 2, argType: 'same', evalType: Primitive.BOOLEAN, sqlOp: '<>'},
};

const evalTable: Dictionary<(exprs: ExpressionPrimitives[]) => ExpressionPrimitives> = {
  [Op.AND]: e => e[0] && e[1],
  [Op.OR]: e => e[0] || e[1],
  [Op.LT]: e => e[0] < e[1],
  [Op.GT]: e => e[0] > e[1],
  [Op.LTE]: e => e[0] <= e[1],
  [Op.GTE]: e => e[0] >= e[1],
  [Op.ADD]: (e: number[]) => e[0] + e[1],
  [Op.SUB]: e => e[0] - e[1],
  [Op.MUL]: e => e[0] * e[1],
  [Op.DIV]: e => e[0] / e[1],
  [Op.NOT]: e => !e[0],
  [Op.NEG]: e => -e[0],
  [Op.EQ]: e => e[0] === e[1],
  [Op.NEQ]: e => e[0] !== e[1],
};

export class RefinementOperator {
  opInfo: OperatorInfo;
  op: string;

  constructor(operator: string) {
    this.op = operator;
    this.updateOp(operator);
  }

  static fromLiteral(refOpr): RefinementOperator {
    return new RefinementOperator(refOpr.op);
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

  toSQLOp(): string {
    return this.opInfo.sqlOp;
  }

  updateOp(operator: string) {
    this.op = operator;
    this.opInfo = operatorTable[operator];
    if (!this.opInfo) {
      throw new Error(`Invalid refinement operator ${operator}`);
    }
  }

  eval(exprs: ExpressionPrimitives[]): ExpressionPrimitives {
    return evalTable[this.op](exprs);
  }

  evalType(): Primitive {
    return this.opInfo.evalType;
  }

  validateOperandCompatibility(operandTypes: string[]): void {
    if (operandTypes.length !== this.opInfo.nArgs) {
      throw new Error(`Expected ${this.opInfo.nArgs} operands. Got ${operandTypes.length}.`);
    }
    if (this.opInfo.argType === 'same') {
      if (operandTypes[0] !== operandTypes[1]) {
        throw new Error(`Expected ${operandTypes[0]} and ${operandTypes[1]} to be the same.`);
      }
    } else {
      for (const type of operandTypes) {
        if (type !== this.opInfo.argType) {
          throw new Error(`Got type ${type}. Expected ${this.opInfo.argType}.`);
        }
      }
    }
  }
}

export class SQLExtracter {
  static fromSchema(schema: Schema, table: string): string {
    const filterTerms = [];
    if (schema.refinement) {
      filterTerms.push(schema.refinement.toSQLExpression());
    }
    for (const field of Object.values(schema.fields)) {
      if (field.refinement) {
        filterTerms.push(field.refinement.toSQLExpression());
      }
    }
    return `SELECT * FROM ${table}` + (filterTerms.length ? ` WHERE ${filterTerms.join(' AND ')}` : '') + ';';
  }
}

export class Fraction {
  num: Polynomial;
  den: Polynomial;

  constructor(n?: Polynomial, d?: Polynomial) {
    this.num = n ? Polynomial.copyOf(n) : new Polynomial();
    this.den = d ? Polynomial.copyOf(d) : new Polynomial([1]);
    if (this.den.isZero()) {
      throw new Error('Division by zero.');
    }
    this.reduce();
  }

  static add(a: Fraction, b: Fraction): Fraction {
    const den = Polynomial.multiply(a.den, b.den);
    const num = Polynomial.add(Polynomial.multiply(a.num, b.den), Polynomial.multiply(b.num, a.den));
    return new Fraction(num, den);
  }

  static negate(a: Fraction): Fraction {
    return new Fraction(Polynomial.negate(a.num), a.den);
  }

  static subtract(a: Fraction, b: Fraction): Fraction {
    const negB = Fraction.negate(b);
    return Fraction.add(a, negB);
  }

  static multiply(a: Fraction, b: Fraction): Fraction {
    return new Fraction(Polynomial.multiply(a.num, b.num), Polynomial.multiply(a.den, b.den));
  }

  static divide(a: Fraction, b: Fraction): Fraction {
    const invB = new Fraction(b.den, b.num);
    return Fraction.multiply(a, invB);
  }

  reduce() {
    if (this.num.isZero()) {
      this.den = new Polynomial([1]);
      return;
    }
    if (this.num.isConstant() && this.den.isConstant()) {
      this.num = new Polynomial([this.num.coeffs[0]/this.den.coeffs[0]]);
      this.den = new Polynomial([1]);
      return;
    }
    // TODO(ragdev): Fractions can be reduced further by factoring out the gcd of
    // the coeffs in num and den, and then dividing the two. However, since the numbers are floating
    // points, the precision and computation cost of gcd function will be a trade-off to consider.
  }

  // assumes the expression received has an evalType of Primitive.NUMBER
  static fromExpression(expr: RefinementExpression): Fraction {
    if (expr instanceof BinaryExpression) {
      const left = Fraction.fromExpression(expr.leftExpr);
      const right = Fraction.fromExpression(expr.rightExpr);
      return Fraction.updateGivenOp(expr.operator.op, [left, right]);
    } else if (expr instanceof UnaryExpression) {
      const fn = Fraction.fromExpression(expr.expr);
      return Fraction.updateGivenOp(expr.operator.op, [fn]);
    } else if (expr instanceof FieldNamePrimitive && expr.evalType === Primitive.NUMBER) {
      return new Fraction(new Polynomial([0, 1], expr.value));
    } else if (expr instanceof NumberPrimitive) {
      return new Fraction(new Polynomial([expr.value]));
    }
    throw new Error(`Cannot resolve expression: ${expr.toString()}`);
  }

  static updateGivenOp(op: string, fractions: Fraction[]): Fraction {
    switch (op) {
      case Op.ADD: return Fraction.add(fractions[0], fractions[1]);
      case Op.MUL: return Fraction.multiply(fractions[0], fractions[1]);
      case Op.SUB: return Fraction.subtract(fractions[0], fractions[1]);
      case Op.DIV: return Fraction.divide(fractions[0], fractions[1]);
      case Op.NEG: return Fraction.negate(fractions[0]);
      default:
        throw new Error(`Unsupported operator: cannot update Fraction`);
    }
  }
}

export class Polynomial {
  private _coeffs: number[];
  indeterminate?: string;

  constructor(coeffs: number[] = [0], variable?: string) {
    this.coeffs = coeffs;
    this.indeterminate = variable;
  }

  static copyOf(pn: Polynomial): Polynomial {
    return new Polynomial(pn.coeffs, pn.indeterminate);
  }

  get coeffs(): number[] {
    while (this._coeffs.length >= 1 && this._coeffs[this._coeffs.length - 1] === 0) {
      this._coeffs.pop();
    }
    if (this._coeffs.length === 0) {
      this._coeffs.push(0);
    }
    return this._coeffs;
  }

  set coeffs(cfs: number[]) {
    this._coeffs = [...cfs];
  }

  degree(): number {
    return this.coeffs.length - 1;
  }

  static assertCompatibility(a: Polynomial, b: Polynomial) {
    if (a.indeterminate && b.indeterminate && a.indeterminate !== b.indeterminate) {
      throw new Error('Incompatible polynomials');
    }
  }

  static add(a: Polynomial, b: Polynomial): Polynomial {
    Polynomial.assertCompatibility(a, b);
    const sum = a.degree() > b.degree() ? Polynomial.copyOf(a) : Polynomial.copyOf(b);
    const other = a.degree() > b.degree() ? b : a;
    for (const [i, coeff] of other.coeffs.entries()) {
      sum.coeffs[i] += coeff;
    }
    return sum;
  }

  static subtract(a: Polynomial, b: Polynomial): Polynomial {
    Polynomial.assertCompatibility(a, b);
    return Polynomial.add(a, Polynomial.negate(b));
  }

  static negate(a: Polynomial): Polynomial {
    return new Polynomial(a.coeffs.map(co => -co), a.indeterminate);
  }

  static multiply(a: Polynomial, b: Polynomial): Polynomial {
    Polynomial.assertCompatibility(a, b);
    const deg = a.degree() + b.degree();
    const coeffs = new Array(deg+1).fill(0);
    for (let i = 0; i < coeffs.length; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        if (j <= a.degree() && (i-j) <= b.degree()) {
          coeffs[i] += a.coeffs[j]*b.coeffs[i-j];
        }
      }
    }
    return new Polynomial(coeffs, a.indeterminate || b.indeterminate);
  }

  isZero(): boolean {
    return this.isConstant() && this.coeffs[0] === 0;
  }

  isConstant(): boolean {
    return this.degree() === 0;
  }

  static inderminateToExpression(pow: number, fn: string): RefinementExpression {
    if (pow < 0) {
      throw new Error('Must have non-negative power.');
    }
    if (pow === 0) {
      return new NumberPrimitive(1);
    }
    if (pow === 1) {
      return new FieldNamePrimitive(fn, Primitive.NUMBER);
    }
    return new BinaryExpression(
      Polynomial.inderminateToExpression(1, fn),
      Polynomial.inderminateToExpression(pow-1, fn),
      new RefinementOperator(Op.MUL));
  }

  toExpression(op: Op): RefinementExpression {
    if (this.degree() === 0) {
      return new BinaryExpression(
        new NumberPrimitive(this.coeffs[0]),
        new NumberPrimitive(0),
        new RefinementOperator(op));
    }
    if (!this.indeterminate) {
      throw new Error('FieldName not found!');
    }
    if (this.degree() === 1) {
      // ax+b <op1> 0 => x <op2> -b/a
      const operator = new RefinementOperator(op);
      if (this.coeffs[1] < 0) {
        operator.flip();
      }
      return new BinaryExpression(
        new FieldNamePrimitive(this.indeterminate, Primitive.NUMBER),
        new NumberPrimitive(-this.coeffs[0]/this.coeffs[1]),
        operator);
    }
    let expr = null;
    for (let i = this.coeffs.length - 1; i >= 0; i -= 1) {
      if (this.coeffs[i] === 0) {
        continue;
      }
      let termExpr = null;
      if (i > 0) {
        termExpr = Polynomial.inderminateToExpression(i, this.indeterminate);
        if (Math.abs(this.coeffs[i]) !== 1) {
          termExpr = new BinaryExpression(
            new NumberPrimitive(this.coeffs[i]),
            termExpr,
            new RefinementOperator(Op.MUL)
          );
        }
      } else {
        termExpr = new NumberPrimitive(this.coeffs[0]);
      }
      expr = expr ? new BinaryExpression(expr, termExpr, new RefinementOperator(Op.ADD)) : termExpr;
    }
    return new BinaryExpression(expr, new NumberPrimitive(0), new RefinementOperator(op));
  }
}

export class Normaliser {

  // Updates 'expr' after rearrangement.
  static rearrangeNumericalExpression(expr: BinaryExpression): void {
    const lF = Fraction.fromExpression(expr.leftExpr);
    const rF = Fraction.fromExpression(expr.rightExpr);
    const frac = Fraction.subtract(lF, rF);
    let rearranged = null;
    switch (expr.operator.op) {
      case Op.LT: rearranged = Normaliser.fracLessThanZero(frac); break;
      case Op.GT: rearranged = Normaliser.fracGreaterThanZero(frac); break;
      case Op.EQ: rearranged = Normaliser.fracEqualsToZero(frac); break;
      case Op.NEQ: rearranged = Normaliser.fracNotEqualsToZero(frac); break;
      default:
          throw new Error(`Unsupported operator ${expr.operator.op}: cannot rearrange numerical expression.`);
    }
    expr.update(rearranged);
  }

  static fracLessThanZero(frac: Fraction): BinaryExpression {
    const ngt0 = frac.num.toExpression(Op.GT);
    const nlt0 = frac.num.toExpression(Op.LT);
    const dgt0 = frac.den.toExpression(Op.GT);
    const dlt0 = frac.den.toExpression(Op.LT);
    return new BinaryExpression(
      new BinaryExpression(ngt0, dlt0, new RefinementOperator(Op.AND)),
      new BinaryExpression(nlt0, dgt0, new RefinementOperator(Op.AND)),
      new RefinementOperator(Op.OR)
    );
  }

  static fracGreaterThanZero(frac: Fraction): BinaryExpression {
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

  static fracEqualsToZero(frac: Fraction): BinaryExpression {
    const neq0 = frac.num.toExpression(Op.EQ);
    const dneq0 = frac.den.toExpression(Op.NEQ);
    return new BinaryExpression(neq0, dneq0, new RefinementOperator(Op.AND));
  }

  static fracNotEqualsToZero(frac: Fraction): BinaryExpression {
    const nneq0 = frac.num.toExpression(Op.NEQ);
    const dneq0 = frac.den.toExpression(Op.NEQ);
    return new BinaryExpression(nneq0, dneq0, new RefinementOperator(Op.AND));
  }

}
