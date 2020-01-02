/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Refinement, SchemaPrimitiveType, RefinementExpression} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import {assert} from '../platform/assert-node.js';

// Using 'any' because operators are type dependent and generically can only be applied to any.
// tslint:disable-next-line: no-any
type ExpressionPrimitives = any;
type Evaluator = (exprs: ExpressionPrimitives[]) => ExpressionPrimitives | Error;
type GenericOperator = {eval:Evaluator};

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

    // tslint:disable-next-line: no-any
    static refineData(refinement: Refinement, data: Dictionary<any>): boolean {
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
        if (expr.kind === 'number-node') {
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
        return operators[op].eval(expr);
    }

    private static manageErrors(errors: (ExpressionPrimitives | Error)[]): Error {
        let errorMessage = '';
        for (const error of errors) {
            if (error instanceof Error) {
                errorMessage += (error.message + '\n');
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

    eval(exprs: ExpressionPrimitives[]): ExpressionPrimitives | Error {
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
            eval: (exprs) => {
                let res = this.eval(exprs);
                if (res instanceof Error) {
                    res = alternative.eval(exprs);
                }
                return res;
            }
        };
    }
}
