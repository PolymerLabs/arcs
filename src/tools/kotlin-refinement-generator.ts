/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Op} from '../runtime/manifest-ast-types/manifest-ast-nodes.js';
import {Dictionary} from '../utils/lib-utils.js';
import {getPrimitiveTypeInfo} from './kotlin-schema-field.js';
import {Schema, RefinementExpressionVisitor, BinaryExpression, UnaryExpression, FieldNamePrimitive,
        QueryArgumentPrimitive, BuiltIn, NumberPrimitive, TextPrimitive, DiscretePrimitive} from '../types/lib-types.js';

// The variable name used for the query argument in generated Kotlin code.
const KOTLIN_QUERY_ARGUMENT_NAME = 'queryArgument';

const kotlinOperator: Dictionary<string> = {
  [Op.AND]: 'and',
  [Op.OR]: 'or',
  [Op.LT]: 'lt',
  [Op.GT]: 'gt',
  [Op.LTE]: 'lte',
  [Op.GTE]: 'gte',
  [Op.ADD]: '+',
  [Op.SUB]: '-',
  [Op.MUL]: '*',
  [Op.DIV]: '/',
  [Op.NOT]: '!',
  [Op.NEG]: '-',
  [Op.EQ]: 'eq',
  [Op.NEQ]: 'neq',
};

class KotlinRefinementGenerator extends RefinementExpressionVisitor<string> {

  visitBinaryExpression(expr: BinaryExpression): string {
    return `(${this.visit(expr.leftExpr)} ${kotlinOperator[expr.operator.op]} ${this.visit(expr.rightExpr)})`;
  }
  visitUnaryExpression(expr: UnaryExpression): string {
    return `(${kotlinOperator[expr.operator.op]}${this.visit(expr.expr)})`;
  }
  visitFieldNamePrimitive(expr: FieldNamePrimitive): string {
    return `lookup<${typeFor(expr.evalType)}>("${expr.value.toString()}")`;
  }
  visitQueryArgumentPrimitive(arg: QueryArgumentPrimitive): string {
    return `query<${typeFor(arg.evalType)}>("${KOTLIN_QUERY_ARGUMENT_NAME}")`;
  }
  visitBuiltIn(expr: BuiltIn): string {
    // TODO: Double check that millis are the correct default units.
    switch (expr.value) {
      case 'now': return `now()`;
      case 'creationTime': return `lookup<Number>("creationTime()")`;
      case 'expirationTime': return `lookup<Number>("expirationTime()")`;
      default: throw new Error(
        `Unhandled BuiltInNode '${expr.value}' in KotlinRefinementGenerator`
      );
    }
  }
  visitDiscretePrimitive(expr: DiscretePrimitive): string {
    // This assumes that the associated Kotlin type will be built to match `Java.math.BigInteger`
    // and constructs an BigInt via String as Kotlin does not currently support for a
    // BigInteger literal.
    switch (expr.evalType) {
      case 'Boolean':
        return `NumberLiteralExpression(BigInt("${expr.value ? '1' : '0'}"))`;
      case 'Int':
      case 'Long':
      case 'Instant':
      case 'BigInt':
        return `NumberLiteralExpression(BigInt("${expr.value}"))`;
      default: throw new Error(`unexpected type ${expr.evalType}`);
    }
  }
  visitNumberPrimitive(expr: NumberPrimitive): string {
    // This assumes that the associated Kotlin type will be `double`.
    if (expr.value === Infinity) {
      return 'NumberLiteralExpression(Double.POSITIVE_INFINITY)';
    }
    if (expr.value === -Infinity) {
        return 'NumberLiteralExpression(Double.NEGATIVE_INFINITY)';
    }
    return `${expr.value.toString()}.asExpr()`;
  }
  visitTextPrimitive(expr: TextPrimitive): string {
    const escapeForKotlin = (value: string) => {
      // Convert values that need to be escaped into their corresponding escape codes.
      // Escape codes taken from https://www.programiz.com/kotlin-programming/string
      return value
        .replace('\\', '\\\\')
        .replace('\t', '\\t')
        .replace('\b', '\\b')
        .replace('\n', '\\n')
        .replace('\r', '\\r')
        .replace('\'', '\\\'')
        .replace('"', '\\"')
        .replace('$', '\\$');
    };
    return `"${escapeForKotlin(expr.value)}".asExpr()`;
  }
}

export class KTExtracter {
  private static generator = new KotlinRefinementGenerator();

  static fromSchema(schema: Schema): string {


    const filterTerms = [];
    if (schema.refinement) {
      filterTerms.push(this.generator.generate(schema.refinement));
    }
    for (const field of Object.values(schema.fields)) {
      if (field.refinement) {
        filterTerms.push(this.generator.generate(field.refinement));
      }
    }
    const expr = filterTerms.length > 0 ? `${filterTerms.join(' and ')}` : 'true.asExpr()';

    return `${expr}`;
  }
}

function typeFor(name: string) {
  const typeInfo = getPrimitiveTypeInfo(name);
  return typeInfo.isNumber ? 'Number' : typeInfo.type;
}
