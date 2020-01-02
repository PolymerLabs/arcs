/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Refinement, RefinementExpression} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import { Schema } from './schema.js';
import { Entity } from './entity.js';

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;
type Evaluator = (exprs: ExpressionPrimitives[]) => ExpressionPrimitives | Error;
type GenericOperator = {evaluate: Evaluator};

export class Refiner {
    // Converts refinement ast-node to string.
    // Ast-nodes are typically interfaces with no behaviour.
    static refinementString(refinement: Refinement): string {
        if (!refinement) {
            return '';
        }
        return '[' + Refiner.expressionString(refinement.expression) + ']';
    }

    private static expressionString(expr: RefinementExpression): string {
        if (expr.kind === 'binary-expression-node') {
            return '(' + Refiner.expressionString(expr.leftExpr) + ' ' + expr.operator + ' ' + Refiner.expressionString(expr.rightExpr) + ')';
        } else if (expr.kind === 'unary-expression-node') {
            return '(' + expr.operator + ' ' + expr.expr + ')';
        }
        return expr.value.toString();
    }

    static refineData(entity: Entity, schema: Schema): void {
        for (const [name, value] of Object.entries(entity)) {
            const refDict = {}; refDict[name] = value;
            if (!Refiner.isValidData(schema.fields[name].refinement, refDict)) {
                throw new Error(`Entity schema field '${name}' does not conform to the refinement.`);
            }
        }
        if (!Refiner.isValidData(schema.refinement, entity)) {
            throw new Error('Entity data does not conform to the refinement.');
        }
    }

    static isValidData(refinement: Refinement, data: Dictionary<ExpressionPrimitives>): boolean {
        if (!refinement) {
            return true;
        }
        const result = Refiner.applyRefinement(refinement.expression, data);
        if (result instanceof Error) {
            throw result;
        } else if (typeof result !== 'boolean') {
            throw new Error(`Refinement expression evaluated to a non-boolean type.\n`);
        }
        return result;
    }

    // tslint:disable-next-line: no-any
    private static applyRefinement(expr: RefinementExpression, data: Dictionary<any>): ExpressionPrimitives | Error {
        if (expr.kind === 'binary-expression-node') {
            const left = Refiner.applyRefinement(expr.leftExpr, data);
            const right = Refiner.applyRefinement(expr.rightExpr, data);
            if (left instanceof Error || right instanceof Error) {
                return Refiner.manageErrors([left, right]);
            }
            return Refiner.applyOperator(expr.operator, [left, right]);
        } else if (expr.kind === 'unary-expression-node') {
            const curr = Refiner.applyRefinement(expr.expr, data);
            if (curr instanceof Error) {
                return Refiner.manageErrors([curr]);
            }
            return Refiner.applyOperator(expr.operator, [curr]);
        }
        // TODO(ragdev): Update when string literals are supported
        // in the refinement expression.
        if (expr.kind === 'number-node' || expr.kind === 'boolean-node') {
            return expr.value;
        } else if (expr.kind === 'field-name-node') {
            if (data[expr.value] !== undefined) {
                return data[expr.value];
            } else {
                return new Error(`Unresolved field name '${expr.value}' in the refinement expression.`);
            }
        }
        return new Error(`Unsupported expression node.`);
    }

    private static applyOperator(op: string, expr: ExpressionPrimitives[]): ExpressionPrimitives | Error {
        const eqBoolOp = new RefinementOperator(['boolean', 'boolean'], (expr) => expr[0] === expr[1]);
        const eqNumOp = new RefinementOperator(['number', 'number'], (expr) => expr[0] === expr[1]);
        const neqBoolOp = new RefinementOperator(['boolean', 'boolean'], (expr) => expr[0] !== expr[1]);
        const neqNumOp = new RefinementOperator(['number', 'number'], (expr) => expr[0] !== expr[1]);
        const operators = {
            'and': new RefinementOperator(['boolean', 'boolean'], (expr) => expr[0] && expr[1]),
            'or': new RefinementOperator(['boolean', 'boolean'], (expr) => expr[0] || expr[1]),
            '<': new RefinementOperator(['number', 'number'], (expr) => expr[0] < expr[1]),
            '>': new RefinementOperator(['number', 'number'], (expr) => expr[0] > expr[1]),
            '<=': new RefinementOperator(['number', 'number'], (expr) => expr[0] <= expr[1]),
            '>=': new RefinementOperator(['number', 'number'], (expr) => expr[0] >= expr[1]),
            '+': new RefinementOperator(['number', 'number'], (expr) => expr[0] + expr[1]),
            '-': new RefinementOperator(['number', 'number'], (expr) => expr[0] - expr[1]),
            '*': new RefinementOperator(['number', 'number'], (expr) => expr[0] * expr[1]),
            '/': new RefinementOperator(['number', 'number'], (expr) => expr[0] / expr[1]),
            'not': new RefinementOperator(['boolean'], (expr) => !expr[0]),
            'neg': new RefinementOperator(['number'], (expr) => -expr[0]),
            '==': eqBoolOp.or(eqNumOp),
            '!=': neqBoolOp.or(neqNumOp),
        };
        op = (op === '-' && expr.length === 1) ? 'neg' : op;
        return operators[op].evaluate(expr);
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

    // This function assumes that the expression is univariate
    // and has been normalised (see above for definition).
    // TODO(ragdev): Currently only Number types are supported. Add Boolean and String support.
    static expressionToRange(expr: RefinementExpression): Range {
        if (expr.kind === 'binary-expression-node') {
            if (expr.leftExpr.kind === 'field-name-node' && expr.rightExpr.kind === 'number-node') {
                return Range.makeInitialGivenOp(expr.operator, expr.rightExpr.value);
            }
            const left = Refiner.expressionToRange(expr.leftExpr);
            const right = Refiner.expressionToRange(expr.rightExpr);
            return Range.updateGivenOp(expr.operator, [left, right]);
        } else if (expr.kind === 'unary-expression-node') {
            const rg = Refiner.expressionToRange(expr.expr);
            return Range.updateGivenOp(expr.operator, [rg]);
        }
        throw new Error(`Cannot resolve primitive nodes by themselves.`);
    }

    private static manageErrors(errors: (ExpressionPrimitives | Error)[]): Error {
        let errorMessage = '';
        for (const error of errors) {
            if (error instanceof Error) {
                errorMessage += error.message + '\n';
            }
        }
        return new Error(errorMessage);
    }
}

class RefinementOperator implements GenericOperator {
    exprTypes: string[];
    fn: Evaluator;

    constructor(exprTypes: string[], fn: Evaluator) {
        this.exprTypes = exprTypes;
        this.fn = fn;
    }

    evaluate(exprs: ExpressionPrimitives[]): ExpressionPrimitives | Error {
        if (exprs.length !== this.exprTypes.length) {
            return new Error(`Got ${exprs.length} operands. Expected ${this.exprTypes.length}.`);
        }
        for (const [index, expr] of exprs.entries()) {
            if (typeof expr !== this.exprTypes[index]) {
                return new Error(`Got type ${typeof expr}. Expected ${this.exprTypes[index]}.`);
            }
        }
        return this.fn(exprs);
    }

    or(alternative: GenericOperator): GenericOperator {
        return {
            evaluate: (exprs) => {
                let res = this.evaluate(exprs);
                if (res instanceof Error) {
                    res = alternative.evaluate(exprs);
                }
                return res;
            }
        };
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
