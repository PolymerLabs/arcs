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
import {RefinementExpressionVisitor, BinaryExpression, UnaryExpression, FieldNamePrimitive, QueryArgumentPrimitive, BuiltIn, NumberPrimitive, DiscretePrimitive, TextPrimitive} from './refiner.js';

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
    if (expr.evalType === 'Boolean') {
      return `(${fixed} = 1)`;
    }
    return fixed;
  }
  visitQueryArgumentPrimitive(expr: QueryArgumentPrimitive): string {
    return expr.value.toString();
  }
  visitBuiltIn(expr: BuiltIn): string {
    // TODO: Double check that millis are the correct default units.
    switch (expr.value) {
      case 'now': return `(STRFTIME('%s','now') || SUBSTR(STRFTIME('%f','now'),4))`;
      case 'creationTime': return `creation_timestamp`;
      case 'expirationTime': return 'expiration_timestamp';
      default: throw new Error(
        `Unhandled BuiltInNode '${expr.value}' in toSQLExpression`
      );
    }
  }
  visitDiscretePrimitive(expr: DiscretePrimitive): string {
    switch (expr.evalType) {
      case 'Instant':
        return `DATETIME(${expr.value}/1000, 'unixepoch')`;
      case 'Int':
      case 'Long':
      case 'BigInt':
        return `${expr.value}`;
      case 'Boolean':
        return `${expr.value ? '1' : '0'}`;
      default: throw new Error(`unexpected type ${expr.evalType}`);
    }
  }
  visitNumberPrimitive(expr: NumberPrimitive): string {
    return expr.value.toString();
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
