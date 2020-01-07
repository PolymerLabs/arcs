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
import {assert} from '../platform/assert-node.js';
import {Schema} from './schema.js';
import {Entity} from './entity.js';

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;
type Evaluator = (exprs: ExpressionPrimitives[]) => ExpressionPrimitives | Error;

export class Refinement {
    kind = 'refinement';
    expression: RefinementExpression = null;
    static fromAst(ref: RefinementNode, typeData: Dictionary<ExpressionPrimitives>): Refinement {
        const refinement = new Refinement();
        refinement.expression = RefinementExpression.fromAst(ref.expression, typeData);
        return refinement;
    }

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
    // ~ Simplifies mathematical and boolean expressions e.g. (num + (1 + 3) < 4) and True => (num + 4) < 4
    // ~ Converts a binary node to {leftExpr: fieldName, rightExpr: val} (where applicable).
    // ~ Converts a unary node {op: '-', val: x} into a number node {val: -x}
    // ~ Removes redundant info like expression && false => false
    normalise() {
        this.expression = this.expression.normalise();
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

abstract class RefinementExpression {
    type: 'Boolean' | 'Number' | 'Text';

    constructor(readonly kind: 'binary-expression' | 'unary-expression' | 'field-name' | 'number' | 'boolean') {}

    static fromAst(expr: RefinementExpressionNode, typeData: Dictionary<ExpressionPrimitives>): RefinementExpression {
        switch (expr.kind) {
            case 'binary-expression-node': return new BinaryExpression(expr, typeData);
            case 'unary-expression-node': return new UnaryExpression(expr, typeData);
            case 'field-name-node': return new FieldNamePrimitive(expr, typeData);
            case 'number-node': return new NumberPrimitive(expr);
            case 'boolean-node': return new BooleanPrimitive(expr);
            default: throw new Error('Unknown node type.');
        }
    }

    normalise(): RefinementExpression {
        return this;
    }

    abstract toString();

    abstract applyOperator(data: Dictionary<ExpressionPrimitives>);
}

export class BinaryExpression extends RefinementExpression {
    type: 'Number' | 'Boolean';
    leftExpr: RefinementExpression;
    rightExpr: RefinementExpression;
    operator: RefinementOperator;

    constructor(expression: BinaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>) {
        super('binary-expression');
        this.leftExpr = RefinementExpression.fromAst(expression.leftExpr, typeData);
        this.rightExpr = RefinementExpression.fromAst(expression.rightExpr, typeData);
        this.operator = new RefinementOperator(expression.operator);
        this.operator.assertOperandCompatibility([this.leftExpr.type, this.rightExpr.type]);
        this.type = this.operator.evalType();
    }

    toString(): string {
        return '(' + this.leftExpr.toString() + ' ' + this.operator.op + ' ' + this.rightExpr.toString() + ')';
    }

    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        const left = this.leftExpr.applyOperator(data);
        const right = this.rightExpr.applyOperator(data);
        return this.operator.eval([left, right]);
    }

    swapChildren() {
        const temp = this.rightExpr;
        this.rightExpr = this.leftExpr;
        this.leftExpr = temp;
        switch (this.operator.op) {
            case '<': this.operator.updateOp('>'); break;
            case '>': this.operator.updateOp('<'); break;
            case '<=': this.operator.updateOp('>='); break;
            case '>=': this.operator.updateOp('<='); break;
            default: break;
        }
    }

    simplifyPrimitive() {
        if (this.leftExpr.kind === 'boolean' && this.rightExpr.kind === 'boolean') {
            return BooleanPrimitive.fromValue(this.applyOperator({}));
        } else if (this.leftExpr.kind === 'number' && this.rightExpr.kind === 'number') {
            if (this.type === 'Boolean') {
                return BooleanPrimitive.fromValue(this.applyOperator({}));
            }
            return NumberPrimitive.fromValue(this.applyOperator({}));
        }
        return null;
    }

    normalise() {
        this.leftExpr = this.leftExpr.normalise();
        this.rightExpr = this.rightExpr.normalise();
        const sp = this.simplifyPrimitive();
        if (sp) {
            return sp;
        }
        if (this.rightExpr.kind === 'field-name') {
            this.swapChildren();
        }
        switch (this.operator.op) {
            case 'and': {
                if (this.leftExpr.kind === 'boolean') {
                    return (this.leftExpr as BooleanPrimitive).value ? this.rightExpr : this.leftExpr;
                } else if (this.rightExpr.kind === 'boolean') {
                    return (this.rightExpr as BooleanPrimitive).value ? this.leftExpr : this.rightExpr;
                }
                return this;
            }
            case 'or': {
                if (this.leftExpr.kind === 'boolean') {
                    return (this.leftExpr as BooleanPrimitive).value ? this.leftExpr : this.rightExpr;
                } else if (this.rightExpr.kind === 'boolean') {
                    return (this.rightExpr as BooleanPrimitive).value ? this.rightExpr : this.leftExpr;
                }
                return this;
            }
            default: return this;
        }
    }
}

export class UnaryExpression extends RefinementExpression {
    type: 'Number' | 'Boolean';
    expr: RefinementExpression;
    operator: RefinementOperator;

    constructor(expression: UnaryExpressionNode, typeData: Dictionary<ExpressionPrimitives>) {
        super('unary-expression');
        this.expr = RefinementExpression.fromAst(expression.expr, typeData);
        this.operator = new RefinementOperator((expression.operator === '-') ? 'neg' : expression.operator);
        this.operator.assertOperandCompatibility([this.expr.type]);
        this.type = this.operator.evalType();
    }

    toString(): string {
        return this.operator.op + '(' + this.expr.toString() + ')';
    }

    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        const expression = this.expr.applyOperator(data);
        return this.operator.eval([expression]);
    }

    simplifyPrimitive() {
        if (this.expr.kind === 'boolean' && this.operator.op === 'not') {
            return BooleanPrimitive.fromValue(this.applyOperator({}));
        } else if (this.expr.kind === 'number' && this.operator.op === 'neg') {
            return NumberPrimitive.fromValue(this.applyOperator({}));
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
            case 'not': {
                if (this.expr.kind === 'unary-expression' && (this.expr as UnaryExpression).operator.op === 'not') {
                    return (this.expr as UnaryExpression).expr;
                }
                return this;
            }
            default: return this;
        }
    }
}

class FieldNamePrimitive extends RefinementExpression {
    type: 'Number' | 'Boolean' | 'Text';
    value: string;

    constructor(expression: FieldNode, typeData: Dictionary<ExpressionPrimitives>) {
        super('field-name');
        this.value = expression.value;
        if (typeData[this.value] === undefined) {
            throw new Error(`Unresolved field name '${this.value}' in the refinement expression.`);
        }
        this.type = typeData[this.value];
    }

    static fromValue(value: string, type: 'Number' | 'Boolean' | 'Text'): RefinementExpression {
        const typeData = {}; typeData[value] = type;
        const expr = new FieldNamePrimitive({'value': value} as FieldNode, typeData);
        return expr;
    }

    toString(): string {
        return this.value.toString();
    }

    applyOperator(data: Dictionary<ExpressionPrimitives>): ExpressionPrimitives {
        if (data[this.value] !== undefined) {
            return data[this.value];
        }
        return new Error(`Unresolved field name '${this.value}' in the refinement expression.`);
    }
}

class NumberPrimitive extends RefinementExpression {
    type: 'Number';
    value: number;

    constructor(expression: NumberNode) {
        super('number');
        this.value = expression.value;
        this.type = 'Number';
        return this;
    }

    static fromValue(value: number): RefinementExpression {
        const expr = new NumberPrimitive({'value': value} as NumberNode);
        return expr;
    }
    toString(): string {
        return this.value.toString();
    }
    applyOperator(): ExpressionPrimitives {
        return this.value;
    }
}

class BooleanPrimitive extends RefinementExpression {
    type: 'Boolean';
    value: boolean;

    constructor(expression: BooleanNode) {
        super('boolean');
        this.value = expression.value;
        this.type = 'Boolean';
    }

    static fromValue(value: boolean): RefinementExpression {
        const expr = new BooleanPrimitive({'value': value} as BooleanNode);
        return expr;
    }

    toString(): string {
        return this.value.toString();
    }

    applyOperator(): ExpressionPrimitives {
        return this.value;
    }
}

export class Range {
    segments: Segment[] = [];

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
    static fromExpression(expr: RefinementExpression): Range {
        if (expr.kind === 'binary-expression') {
            const bexpr = expr as BinaryExpression;
            if (bexpr.leftExpr.kind === 'field-name' && bexpr.rightExpr.kind === 'number') {
                return Range.makeInitialGivenOp(bexpr.operator.op, (bexpr.rightExpr as NumberPrimitive).value);
            }
            const left = Range.fromExpression(bexpr.leftExpr);
            const right = Range.fromExpression(bexpr.rightExpr);
            return Range.updateGivenOp(bexpr.operator.op, [left, right]);
        } else if (expr.kind === 'unary-expression') {
            const uexpr = expr as UnaryExpression;
            const rg = Range.fromExpression(uexpr.expr);
            return Range.updateGivenOp(uexpr.operator.op, [rg]);
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
                if(Segment.isValid(from, to)) {
                    newRange.segments.push(new Segment(from, to));
                }
                from = iseg.to;
                from.kind = from.kind === 'open' ? 'closed' : 'open';
            }
            const to: Boundary = {...seg.to};
            if(Segment.isValid(from, to)) {
                newRange.segments.push(new Segment(from, to));
            }
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
        if (!Segment.isValid(from, to)) {
            throw new Error(`Invalid range from: ${from}, to:${to}`);
        }
        this.from = {...from};
        this.to = {...to};
    }

    static isValid(from: Boundary, to: Boundary): boolean {
        if (to.val < from.val) {
            return false;
        } else if (from.val === to.val && (from.kind === 'open' || to.kind === 'open')) {
            return false;
        }
        return true;
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

// Does not contain == and !=
const operandCompatability = {
    'and': ['Boolean', 'Boolean'],
    'or': ['Boolean', 'Boolean'],
    '<': ['Number', 'Number'],
    '>': ['Number', 'Number'],
    '<=': ['Number', 'Number'],
    '>=': ['Number', 'Number'],
    '+': ['Number', 'Number'],
    '-': ['Number', 'Number'],
    '*': ['Number', 'Number'],
    '/': ['Number', 'Number'],
    'not': ['Boolean'],
    'neg': ['Number'],
};

class RefinementOperator {
    op: string;
    fn: Evaluator;

    constructor(operator: string) {
        this.op = operator;
        this.updateFn();
    }

    updateOp(op: string) {
        this.op = op;
        this.updateFn();
    }

    private updateFn() {
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

    eval(exprs: ExpressionPrimitives[]): ExpressionPrimitives {
        return this.fn(exprs);
    }

    evalType(): 'Number' | 'Boolean' {
        switch (this.op) {
            // Boolean
            case 'and': case 'or':
            case '<': case '>':
            case '<=': case '>=':
            case 'not': case '==':
            case '!=': return 'Boolean';
            // Number
            case '+': case '-':
            case '*': case '/':
            case 'neg': return 'Number';
            default: throw new Error(`Invalid refinement operator ${this.op}`);
        }
    }

    assertOperandCompatibility(operandTypes: string[]): void {
        if (['==', '!='].includes(this.op)) {
            assert.strictEqual(operandTypes.length, 2);
            if (operandTypes[0] !== operandTypes[1]) {
                throw new Error(`Expected ${operandTypes[0]} and ${operandTypes[1]} to be the same.`);
            }
            return;
        }
        const expected = operandCompatability[this.op];
        if (!expected) {
            throw new Error(`Invalid refinement operator ${this.op}`);

        }
        assert.strictEqual(operandTypes.length, expected.length);
        for (const [i, opT] of operandTypes.entries()) {
            if (opT !== expected[i]) {
                throw new Error(`Got type ${opT}. Expected ${expected[i]}.`);
            }
        }
    }
}
