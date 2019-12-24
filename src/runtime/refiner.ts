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
        // TODO(ragdev): Update when true, false and string literals are supported
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


class Range {
    segments: Segment[];
    constructor() {
        this.segments = [];
    }
    union(range: Range): void {
        for (const seg of range.segments) {
            this.unionWithSeg(seg);
        }
    }
    unionWithSeg(seg: Segment): void {
        let x: number, y:number, i:number, j:number;
        for (const [index, subRange] of this.segments.entries()) {
            if(i === undefined && seg.from <= subRange.to) {
                i = index;
                x = Math.min(subRange.from, seg.from);
            }
            if(seg.to >= subRange.from) {
                j = index;
                y = Math.max(subRange.to, seg.to);
            }
        }
        if (i === undefined && j === undefined) {
            this.segments = [seg];
        } else if (i === undefined) {
            this.segments.splice(j+1, 0, seg);
        } else if (j === undefined) {
            this.segments.splice(i, 0, seg);
        } else if (j < i) {
            this.segments.splice(j+1, 0, seg);
        } else {
            this.segments.splice(i, j-i+1, {from: x, to: y});
        }
    }

    intersectWithSeg(seg: Segment): void {
        let i:number, j:number;
        for (const [index, subRange] of this.segments.entries()) {
            if(i === undefined && seg.from <= subRange.to) {
                i = index;
            }
            if(seg.to >= subRange.from) {
                j = index;
            }
        }
        if (i === undefined || j === undefined || j < i) {
            this.segments = [];
        } else {
            const newRange = new Range();
            for (let x = i; x <= j; x++) {
                const newSeg = {
                    from: Math.max(this.segments[x].from, seg.from),
                    to: Math.min(this.segments[x].to, seg.to)
                };
                newRange.unionWithSeg(newSeg);
            }
            this.segments = newRange.segments;
        }
    }
}

interface Segment {
    from: number;
    to: number;
}