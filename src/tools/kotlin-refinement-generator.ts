/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Op} from '../runtime/manifest-ast-nodes.js';
import {Dictionary} from '../runtime/hot.js';
import {Schema} from '../runtime/schema.js';
import {escapeIdentifier, getTypeInfo} from './kotlin-codegen-shared.js';
import {RefinementExpressionVisitor, BinaryExpression, UnaryExpression, FieldNamePrimitive, QueryArgumentPrimitive, BuiltIn, NumberPrimitive, BooleanPrimitive, TextPrimitive} from '../runtime/refiner.js';

// The variable name used for the query argument in generated Kotlin code.
const KOTLIN_QUERY_ARGUMENT_NAME = 'queryArgument';

const kotlinOperator: Dictionary<string> = {
  [Op.AND]: '&&',
  [Op.OR]: '||',
  [Op.LT]: '<',
  [Op.GT]: '>',
  [Op.LTE]: '<=',
  [Op.GTE]: '>=',
  [Op.ADD]: '+',
  [Op.SUB]: '-',
  [Op.MUL]: '*',
  [Op.DIV]: '/',
  [Op.NOT]: '!',
  [Op.NEG]: '-',
  [Op.EQ]: '==',
  [Op.NEQ]: '!=',
};

class KotlinRefinementGenerator extends RefinementExpressionVisitor<string> {

  visitBinaryExpression(expr: BinaryExpression): string {
    return `(${this.visit(expr.leftExpr)} ${kotlinOperator[expr.operator.op]} ${this.visit(expr.rightExpr)})`;
  }
  visitUnaryExpression(expr: UnaryExpression): string {
    return `(${kotlinOperator[expr.operator.op]}${this.visit(expr.expr)})`;
  }
  visitFieldNamePrimitive(expr: FieldNamePrimitive): string {
    return (expr.value.toString());
  }
  visitQueryArgumentPrimitive(_: QueryArgumentPrimitive): string {
    return KOTLIN_QUERY_ARGUMENT_NAME;
  }
  visitBuiltIn(expr: BuiltIn): string {
    // TODO: Double check that millis are the correct default units.
    if (expr.value === 'now()') {
      return `System.currentTimeMillis()`;
    }

    // TODO: Implement KT getter for 'creationTimeStamp'
    throw new Error(`Unhandled BuiltInNode '${expr.value}' in toKTExpression`);
  }
  visitBigIntPrimitive(expr: BigIntPrimitive): string {
    // This assumes that the associated Kotlin type will be `Java.math.BigInteger`.
    return expr.value.toString();
  }
  visitNumberPrimitive(expr: NumberPrimitive): string {
    // This assumes that the associated Kotlin type will be `double`.
    if (expr.value === Infinity) {
      return 'Double.POSITIVE_INFINITY';
    }
    if (expr.value === -Infinity) {
        return 'Double.NEGATIVE_INFINITY';
    }
    return expr.value.toString();
  }
  visitBooleanPrimitive(expr: BooleanPrimitive): string {
    return `${expr.value}`;
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
    return `"${escapeForKotlin(expr.value)}"`;
  }
}

export class KTExtracter {
  private static generator = new KotlinRefinementGenerator();

  static fromSchema(schema: Schema): string {
    const genFieldAsLocal = (fieldName: string) => {
      const type = schema.fields[fieldName].type;
      const fixed = escapeIdentifier(fieldName);
      return `val ${fixed} = data.singletons["${fieldName}"].toPrimitiveValue(${typeFor(type)}::class, ${getTypeInfo({name: type}).defaultVal})`;
    };

    const genQueryArgAsLocal = ([_, type]: [string, string]) => {
        return `val ${KOTLIN_QUERY_ARGUMENT_NAME} = queryArgs as ${typeFor(type)}`;
    };

    const fieldNames = new Set<string>();
    const filterTerms = [];
    if (schema.refinement) {
      [...schema.refinement.getFieldParams().keys()].forEach(name => fieldNames.add(name));
      filterTerms.push(this.generator.generate(schema.refinement));
    }
    for (const field of Object.values(schema.fields)) {
      if (field.refinement) {
        [...field.refinement.getFieldParams().keys()].forEach(name => fieldNames.add(name));
        filterTerms.push(this.generator.generate(field.refinement));
      }
    }

    const locals = [...fieldNames].map(genFieldAsLocal);
    if (schema.refinement) {
      const querysArgs = [...schema.refinement.getQueryParams()].map(genQueryArgAsLocal);
      locals.push(...querysArgs);
    }
    const expr = filterTerms.length > 0 ? `${filterTerms.join(' && ')}` : 'true';

    return `${locals.map(x => `${x}\n`).join('')}${expr}`;
  }
}

function typeFor(name: string) {
  return getTypeInfo({name}).type;
}
