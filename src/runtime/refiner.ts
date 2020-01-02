/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {RefinementNode, SchemaPrimitiveType, RefinementExpressionNode, BinaryExpressionNode, UnaryExpressionNode, FieldNode, NumberNode, BooleanNode} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import {assert} from '../platform/assert-node.js';
import {Schema} from './schema.js';
import {Entity} from './entity.js';
import {deepEqual} from 'assert';
import e from 'express';
import {Expression} from 'estree';
import {CheckBooleanExpression} from './particle-check.js';

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;
type Evaluator = (exprs: ExpressionPrimitives[]) => ExpressionPrimitives | Error;

export class Refiner {
    static refineData(entity: Entity, schema: Schema): void {
        for (const [name, value] of Object.entries(entity)) {
            const refDict = {}; refDict[name] = value;
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

    // This function assumes the following:
    // ~ The expression is univariate i.e. has exactly one fieldName
    // ~ The expression is valid i.e. no expressions like (num < 3) < (num > 5)
    // This function does the following:
    // ~ Simplifies mathematical expressions e.g. (num + 3) < 4 => num < 1
    // ~ Converts a binary node to {leftExpr: fieldName, rightExpr: val} (where applicable).
    // ~ Converts a unary node {op: '-', val: x} into a number node {val: -x}
    // ~ Removes redundant info like expression == false => not expression
    static normaliseExpression(expr: RefinementExpression) {
        console.log('TODO(ragdev): WIP');
    }
}

export class Range {
    segments: Segment[];
    constructor() {
        this.segments = [];
    }
    static infiniteRange(): Range {
        const infRange = new Range();
        infRange.segments = [Segment.openOpen(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)];
        return infRange;
    }
    static copyOf(range: Range): Range {
        const copy = new Range();
        for (const subRange of range.segments) {
            copy.segments.push(new Segment(subRange.from, subRange.to));
        }
        return copy;
    }
    static fromSegments(segs: Segment[]): Range {
        const newRange = new Range();
        for (const subRange of segs) {
            newRange.segments.push(new Segment(subRange.from, subRange.to));
        }
        return newRange;
    }
    // This function assumes that the expression is univariate
    // and has been normalised (see above for definition).
    // TODO(ragdev): Currently only Number types are supported. Add Boolean and String support.
    static fromExpression(expr: RefinementExpressionNode): Range {
        if (expr.kind === 'binary-expression-node') {
            if (expr.leftExpr.kind === 'field-name-node' && expr.rightExpr.kind === 'number-node') {
                return Range.makeInitialGivenOp(expr.operator, expr.rightExpr.value);
            }
            const left = Range.fromExpression(expr.leftExpr);
            const right = Range.fromExpression(expr.rightExpr);
            return Range.updateGivenOp(expr.operator, [left, right]);
        } else if (expr.kind === 'unary-expression-node') {
            const rg = Range.fromExpression(expr.expr);
            return Range.updateGivenOp(expr.operator, [rg]);
        }
        throw new Error(`Cannot resolve primitive nodes by themselves.`);
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
    static complementOf(range: Range, from: Range = Range.infiniteRange()) {
        return Range.difference(from, range);
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
                to.kind = to.kind === 'open' ? 'closed' : 'open';
                try {
                    newRange.segments.push(new Segment(from, to));
                } catch (e) {const _ = e;}
                from = iseg.to;
                from.kind = from.kind === 'open' ? 'closed' : 'open';
            }
            const to: Boundary = {...seg.to};
            try {
                newRange.segments.push(new Segment(from, to));
            } catch (e) {const _ = e;}
        }
        return newRange;
    }
    equals(range: Range): boolean {
        return JSON.stringify(this) === JSON.stringify(range);
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
        let i = 0; let j = this.segments.length;
        let x: Boundary = {...seg.from}; let y: Boundary = {...seg.to};
        for (const subRange of this.segments) {
            if (seg.isGreaterThan(subRange, false)) {
                i += 1;
            } else {
                if (seg.mergableWith(subRange)) {
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
                if (seg.mergableWith(subRange)) {
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
    static makeInitialGivenOp(op: string, val: ExpressionPrimitives): Range {
        switch (op) {
            case '<': return Range.fromSegments([Segment.openOpen(Number.NEGATIVE_INFINITY, val)]);
            case '<=': return Range.fromSegments([Segment.openClosed(Number.NEGATIVE_INFINITY, val)]);
            case '>': return Range.fromSegments([Segment.openOpen(val, Number.POSITIVE_INFINITY)]);
            case '>=': return Range.fromSegments([Segment.closedOpen(val, Number.POSITIVE_INFINITY)]);
            case '==': return Range.fromSegments([Segment.closedClosed(val, val)]);
            case '!=': return Range.complementOf(Range.fromSegments([Segment.closedClosed(val, val)]));
            default: throw new Error(`Unsupported operator: field ${op} number`);
        }
    }
    static updateGivenOp(op: string, ranges: Range[]): Range {
        switch (op) {
            case 'and': {
                return Range.intersectionOf(ranges[0], ranges[1]);
            }
            case 'or': {
                return Range.unionOf(ranges[0], ranges[1]);
            }
            case '==': {
                const lc = Range.complementOf(ranges[0]);
                const rc = Range.complementOf(ranges[1]);
                const lnr = Range.intersectionOf(ranges[0], ranges[1]);
                const lcnrc = Range.intersectionOf(lc, rc);
                return Range.unionOf(lnr, lcnrc);
            }
            case '!=': {
                const lc = Range.complementOf(ranges[0]);
                const rc = Range.complementOf(ranges[1]);
                const lnrc = Range.intersectionOf(ranges[0], rc);
                const lcnr = Range.intersectionOf(lc, ranges[1]);
                return Range.unionOf(lnrc, lcnr);
            }
            case 'not': {
                return Range.complementOf(ranges[0]);
            }
            default: throw new Error(`Unsupported operator: cannot update range`);
        }
    }
}

export class Segment {
    from: Boundary;
    to: Boundary;
    constructor(from: Boundary, to: Boundary) {
        if (to.val < from.val) {
            throw new Error(`Invalid range from: ${from}, to:${to}`);
        } else if (from.val === to.val && (from.kind === 'open' || to.kind === 'open')) {
            throw new Error(`Invalid range from: ${from}, to:${to}`);
        }
        this.from = {...from};
        this.to = {...to};
    }
    static closedClosed(from: number, to: number): Segment {
        const seg = new Segment({val: from, kind: 'closed'}, {val: to, kind: 'closed'});
        return seg;
    }
    static openOpen(from: number, to: number): Segment {
        const seg = new Segment({val: from, kind: 'open'}, {val: to, kind: 'open'});
        return seg;
    }
    static closedOpen(from: number, to: number): Segment {
        const seg = new Segment({val: from, kind: 'closed'}, {val: to, kind: 'open'});
        return seg;
    }
    static openClosed(from: number, to: number): Segment {
        const seg = new Segment({val: from, kind: 'open'}, {val: to, kind: 'closed'});
        return seg;
    }
    // If strict is false, (a,x) is NOT less than [x,b)
    // even though mathematically it is.
    isLessThan(seg: Segment, strict: boolean): boolean {
        if (this.to.val === seg.from.val) {
            if (strict) {
                return this.to.kind === 'open' || seg.from.kind === 'open';
            }
            return this.to.kind === 'open' && seg.from.kind === 'open';
        }
        return this.to.val < seg.from.val;
    }
    // If strict is false, (x,a) is NOT greater than (b,x]
    // even though mathematically it is.
    isGreaterThan(seg: Segment, strict: boolean): boolean {
        if (this.from.val === seg.to.val) {
            if (strict) {
                return this.from.kind === 'open' || seg.to.kind === 'open';
            }
            return this.from.kind === 'open' && seg.to.kind === 'open';
        }
        return this.from.val > seg.to.val;
    }
    mergableWith(seg: Segment): boolean {
        return !this.isLessThan(seg, false) && !this.isGreaterThan(seg, false);
    }
    overlapsWith(seg: Segment): boolean {
        return !this.isLessThan(seg, true) && !this.isGreaterThan(seg, true);
    }
    static merge(a: Segment, b: Segment): Segment {
        if (!a.mergableWith(b)) {
            throw new Error('Cannot merge non-overlapping segments');
        }
        let left: Boundary; let right: Boundary;
        if (a.from.val === b.from.val) {
            left = {...a.from};
            left.kind = a.from.kind === b.from.kind ? a.from.kind : 'closed';
        } else {
            left = a.from.val < b.from.val ? {...a.from} : {...b.from};
        }
        if (a.to.val === b.to.val) {
            right = {...a.to};
            right.kind = a.to.kind === b.to.kind ? a.to.kind : 'closed';
        } else {
            right = a.to.val > b.to.val ? {...a.to} : {...b.to};
        }
        return new Segment(left, right);
    }
    static overlap(a: Segment, b: Segment): Segment {
        if (!a.overlapsWith(b)) {
            throw new Error('Cannot find intersection of non-overlapping segments');
        }
        let left: Boundary; let right: Boundary;
        if (a.from.val === b.from.val) {
            left = {...a.from};
            left.kind = a.from.kind === b.from.kind ? a.from.kind : 'open';
        } else {
            left = a.from.val > b.from.val ? {...a.from} : {...b.from};
        }
        if (a.to.val === b.to.val) {
            right = {...a.to};
            right.kind = a.to.kind === b.to.kind ? a.to.kind : 'open';
        } else {
            right = a.to.val < b.to.val ? {...a.to} : {...b.to};
        }
        return new Segment(left, right);
    }

}

interface Boundary {
    val: number;
    kind: 'open' | 'closed';
}

export class Refinement {
    kind: 'refinement';
    expression: RefinementExpression;
    private constructor() {
        this.kind = 'refinement';
        this.expression = null;
    }
    static fromAst(ref: RefinementNode, typeData: Dictionary<ExpressionPrimitives>): Refinement {
        const refinement = new Refinement();
        refinement.expression = RefinementExpression.fromAst(ref.expression, typeData);
        return refinement;
    }
    toString(): string {
        return '[' + this.expression.toString() + ']';
    }
    validateData(data: Dictionary<ExpressionPrimitives>): boolean {
        const res = this.expression.applyOperator(data);
        if (typeof res !== 'boolean') {
            throw new Error('Refinement expression evaluated to a non-boolean type.\n');
        }
        return res;
    }
}

class RefinementExpression {
    kind: 'binary-expression' | 'unary-expression' | 'field-name' | 'number' | 'boolean';
    type: 'Boolean' | 'Number' | 'Text';
    static fromAst(expr: RefinementExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
        switch (expr.kind) {
            case 'binary-expression-node': return BinaryExpression.fromAst(expr, typeData);
            case 'unary-expression-node': return UnaryExpression.fromAst(expr, typeData);
            case 'field-name-node': return FieldNamePrimitive.fromAst(expr, typeData);
            case 'number-node': return NumberPrimitive.fromAst(expr);
            case 'boolean-node': return BooleanPrimitive.fromAst(expr);
            default: throw new Error('Unknown node type.');
        }
    }
    toString(): string {
        switch (this.kind) {
            // tslint:disable-next-line: no-any
            case 'binary-expression': return (this as any as BinaryExpression).toString();
            // tslint:disable-next-line: no-any
            case 'unary-expression': return (this as any as UnaryExpression).toString();
            // tslint:disable-next-line: no-any
            case 'field-name': return (this as any as FieldNamePrimitive).toString();
            // tslint:disable-next-line: no-any
            case 'number': return (this as any as NumberPrimitive).toString();
            // tslint:disable-next-line: no-any
            case 'boolean': return (this as any as BooleanPrimitive).toString();
            default: throw new Error('Unknown node type.');
        }
    }
    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        switch (this.kind) {
            // tslint:disable-next-line: no-any
            case 'binary-expression': return (this as any as BinaryExpression).applyOperator(data);
            // tslint:disable-next-line: no-any
            case 'unary-expression': return (this as any as UnaryExpression).applyOperator(data);
            // tslint:disable-next-line: no-any
            case 'field-name': return (this as any as FieldNamePrimitive).applyOperator(data);
            // tslint:disable-next-line: no-any
            case 'number': return (this as any as NumberPrimitive).applyOperator();
            // tslint:disable-next-line: no-any
            case 'boolean': return (this as any as BooleanPrimitive).applyOperator();
            default: throw new Error('Unknown node type.');
        }
    }
}

class BinaryExpression extends RefinementExpression {
    kind: 'binary-expression';
    type: 'Number' | 'Boolean';
    leftExpr: RefinementExpression;
    rightExpr: RefinementExpression;
    operator: RefinementOperator;
    private constructor() {
        super();
    }
    static fromAst(expression: BinaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
        const expr = new BinaryExpression();
        expr.kind = 'binary-expression';
        expr.leftExpr = RefinementExpression.fromAst(expression.leftExpr, typeData);
        expr.rightExpr = RefinementExpression.fromAst(expression.rightExpr, typeData);
        expr.operator = new RefinementOperator(expression.operator);
        expr.operator.assertOperandCompatibility([expr.leftExpr.type, expr.rightExpr.type]);
        expr.type = expr.operator.evalType();
        return expr as RefinementExpression;
    }
    toString(): string {
        return '(' + this.leftExpr.toString() + ' ' + this.operator.op + ' ' + this.rightExpr.toString() + ')';
    }
    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        const left = this.leftExpr.applyOperator(data);
        const right = this.rightExpr.applyOperator(data);
        return this.operator.eval([left, right]);
    }
}

class UnaryExpression extends RefinementExpression {
    kind: 'unary-expression';
    type: 'Number' | 'Boolean';
    expr: RefinementExpression;
    operator: RefinementOperator;
    private constructor() {
        super();
    }
    static fromAst(expression: UnaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
        const expr = new UnaryExpression();
        expr.kind = 'unary-expression';
        expr.expr = RefinementExpression.fromAst(expression.expr, typeData);
        expr.operator = new RefinementOperator((expression.operator === '-') ? 'neg' : expression.operator);
        expr.operator.assertOperandCompatibility([expr.expr.type]);
        expr.type = expr.operator.evalType();
        return expr as RefinementExpression;
    }
    toString(): string {
        return this.operator.op + '(' + this.expr.toString() + ')';
    }
    // tslint:disable-next-line: no-any
    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        const expression = this.expr.applyOperator(data);
        return this.operator.eval([expression]);
    }
}

class FieldNamePrimitive extends RefinementExpression {
    kind: 'field-name';
    type: 'Number' | 'Boolean' | 'Text';
    value: string;
    private constructor() {
        super();
    }
    // tslint:disable-next-line: no-any
    static fromAst(expression: FieldNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
        const expr = new FieldNamePrimitive();
        expr.kind = 'field-name';
        expr.value = expression.value;
        if (typeData[expr.value] === undefined) {
            throw new Error(`Unresolved field name '${expr.value}' in the refinement expression.`);
        }
        expr.type = typeData[expr.value];
        return expr as RefinementExpression;
    }
    toString(): string {
        return this.value.toString();
    }
    // tslint:disable-next-line: no-any
    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        if (data[this.value] !== undefined) {
            return data[this.value];
        }
        return new Error(`Unresolved field name '${this.value}' in the refinement expression.`);
    }
}

class NumberPrimitive extends RefinementExpression {
    kind: 'number';
    type: 'Number';
    value: number;
    private constructor() {
        super();
    }
    static fromAst(expression: NumberNode): RefinementExpression {
        const expr = new NumberPrimitive();
        expr.kind = 'number';
        expr.value = expression.value;
        expr.type = 'Number';
        return expr as RefinementExpression;
    }
    toString(): string {
        return this.value.toString();
    }
    applyOperator(): ExpressionPrimitives {
        return this.value;
    }
}

class BooleanPrimitive extends RefinementExpression {
    kind: 'boolean';
    type: 'Boolean';
    value: boolean;
    private constructor() {
        super();
    }
    static fromAst(expression: BooleanNode): RefinementExpression {
        const expr = new BooleanPrimitive();
        expr.kind = 'boolean';
        expr.value = expression.value;
        expr.type = 'Boolean';
        return expr as RefinementExpression;
    }
    toString(): string {
        return this.value.toString();
    }
    applyOperator(): ExpressionPrimitives {
        return this.value;
    }
}

class RefinementOperator {
    op: string;
    fn: Evaluator;
    constructor(operator: string) {
        this.op = operator;
        switch (this.op) {
            case 'and': this.fn = (expr) => expr[0] && expr[1]; break;
            case 'or': this.fn = (expr) => expr[0] || expr[1]; break;
            case '<': this.fn = (expr) => expr[0] < expr[1]; break;
            case '>': this.fn = (expr) => expr[0] > expr[1]; break;
            case '<=': this.fn = (expr) => expr[0] <= expr[1]; break;
            case '>=': this.fn = (expr) => expr[0] >= expr[1]; break;
            case '+': this.fn = (expr) => expr[0] + expr[1]; break;
            case '-': this.fn = (expr) => expr[0] - expr[1]; break;
            case '*': this.fn = (expr) => expr[0] * expr[1]; break;
            case '/': this.fn = (expr) => expr[0] / expr[1]; break;
            case 'not': this.fn = (expr) => !expr[0]; break;
            case 'neg': this.fn = (expr) => -expr[0]; break;
            case '==': this.fn = (expr) => expr[0] === expr[1]; break;
            case '!=': this.fn = (expr) => expr[0] !== expr[1]; break;
            default: throw new Error(`Invalid refinement operator ${this.op}`);
        }
    }

    // tslint:disable-next-line: no-any
    eval(exprs: ExpressionPrimitives[]): ExpressionPrimitives {
        return this.fn(exprs);
    }

    evalType(): 'Number' | 'Boolean' {
        switch (this.op) {
            case 'and': return 'Boolean';
            case 'or': return 'Boolean';
            case '<': return 'Boolean';
            case '>': return 'Boolean';
            case '<=': return 'Boolean';
            case '>=': return 'Boolean';
            case '+': return 'Number';
            case '-': return 'Number';
            case '*': return 'Number';
            case '/': return 'Number';
            case 'not': return 'Boolean';
            case 'neg': return 'Number';
            case '==': return 'Boolean';
            case '!=': return 'Boolean';
            default: throw new Error(`Invalid refinement operator ${this.op}`);
        }
    }

    assertOperandCompatibility(operandTypes: string[]): void {
        switch (this.op) {
            case 'and': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Boolean');
                this.assertType(operandTypes[1], 'Boolean');
                break;
            }
            case 'or': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Boolean');
                this.assertType(operandTypes[1], 'Boolean');
                break;
            }
            case '<': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '>': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '<=': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '>=': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '+': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '-': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '*': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case '/': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertType(operandTypes[0], 'Number');
                this.assertType(operandTypes[1], 'Number');
                break;
            }
            case 'not': {
                assert.strictEqual(operandTypes.length, 1);
                this.assertType(operandTypes[0], 'Boolean');
                break;
            }
            case 'neg': {
                assert.strictEqual(operandTypes.length, 1);
                this.assertType(operandTypes[0], 'Number');
                break;
            }
            case '==': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertTypeEquality(operandTypes[0], operandTypes[1]);
                break;
            }
            case '!=': {
                assert.strictEqual(operandTypes.length, 2);
                this.assertTypeEquality(operandTypes[0], operandTypes[1]);
                break;
            }
            default: throw new Error('Invalid refinement operator');
        }
    }
    assertType(actual: string, expected: string): void {
        if (actual !== expected) {
            throw new Error(`Got type ${actual}. Expected ${expected}.`);
        }
    }
    assertTypeEquality(t1: string, t2: string): void {
        if (t1 !== t2) {
            throw new Error(`Expected ${t1} and ${t2} to be the same.`);
        }
    }
}
