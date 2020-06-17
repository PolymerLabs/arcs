/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Op} from './manifest-ast-nodes.js';
import {Dictionary} from './hot.js';
import {Schema} from './schema.js';
import {RefinementExpressionVisitor, BinaryExpression, UnaryExpression, FieldNamePrimitive, QueryArgumentPrimitive, BuiltIn, NumberPrimitive, BooleanPrimitive, TextPrimitive, Primitive} from './refiner.js';

const sqlOperator: Dictionary<string> = {
  [Op.AND]: 'AND',
  [Op.OR]: 'OR',
  [Op.LT]: '<',
  [Op.GT]: '>',
  [Op.LTE]: '<=',
  [Op.GTE]: '>=',
  [Op.ADD]: '+',
  [Op.SUB]: '-',
  [Op.MUL]: '*',
  [Op.DIV]: '/',
  [Op.NOT]: 'NOT',
  [Op.NEG]: '-',
  [Op.EQ]: '=',
  [Op.NEQ]: '<>',
};

/**
 * This class is EXPERIMENTAL.
 *
 * Before using this on an actual SQL DB please review the SQL injection possibilities
 * and fix the expression generator accordingly.
 */
class SqlRefinementGenerator extends RefinementExpressionVisitor<string> {

  visitBinaryExpression(expr: BinaryExpression): string {
    return `(${this.visit(expr.leftExpr)} ${sqlOperator[expr.operator.op]} ${this.visit(expr.rightExpr)})`;
  }
  visitUnaryExpression(expr: UnaryExpression): string {
    return `(${sqlOperator[expr.operator.op]} ${this.visit(expr.expr)})`;
  }
  visitFieldNamePrimitive(expr: FieldNamePrimitive): string {
    const fixed = (expr.value.toString());
    if (expr.evalType === Primitive.BOOLEAN) {
      return `(${fixed} = 1)`;
    }
    return fixed;
  }
  visitQueryArgumentPrimitive(expr: QueryArgumentPrimitive): string {
    return expr.value.toString();
  }
  visitBuiltIn(expr: BuiltIn): string {
    if (expr.value === 'now()') {
      return expr.value;
    }
    // TODO: Implement SQL getter for 'creationTimeStamp'
    throw new Error(`Unhandled BuiltInNode '${expr.value}' in toSQLExpression`);
  }
  visitNumberPrimitive(expr: NumberPrimitive): string {
    return expr.value.toString();
  }
  visitBooleanPrimitive(_: BooleanPrimitive): string {
    throw new Error('BooleanPrimitive.toSQLExpression should never be called. The expression is assumed to be normalized.');
  }
  visitTextPrimitive(expr: TextPrimitive): string {
    // TODO(cypher1): Consider escaping this for SQL code generation.
    return `'${expr.value}'`;
  }
}

export class SQLExtracter {
  private static generator = new SqlRefinementGenerator();
  static fromSchema(schema: Schema, table: string, ): string {
    const filterTerms = [];
    if (schema.refinement) {
      filterTerms.push(this.generator.generate(schema.refinement));
    }
    for (const field of Object.values(schema.fields)) {
      if (field.refinement) {
        filterTerms.push(this.generator.generate(field.refinement));
      }
    }
    return `SELECT * FROM ${table}` + (filterTerms.length ? ` WHERE ${filterTerms.join(' AND ')}` : '') + ';';
  }
}
