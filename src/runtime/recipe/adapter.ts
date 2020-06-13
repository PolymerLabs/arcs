/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Comparable, compareArrays, compareComparables, compareObjects, compareStrings} from './comparable.js';
import {Dictionary} from '../hot.js';
import {EntityType, Type} from "../type";
import {AdapterField} from "../manifest-ast-nodes";

/**
 * Represents a type adapter that can be applied to a handle and produce an adapted type by
 * evaluating a series of scope expressions.
 */
export class Adapter implements Comparable<Adapter> {
  constructor(public readonly name: string,
              public readonly params: Dictionary<Type>,
              public readonly target: AdaptedType) {}

  _compareTo(other: Adapter): number {
    let cmp: number;
    if ((cmp = compareStrings(this.name, other.name)) !== 0) return cmp;
    // comparing Types by stringified inline schema, is there a better/more accurate way?
    if ((cmp = compareObjects(this.params, other.params, (a,b) => compareStrings(`${a}`, `${b}`))) !== 0) return cmp;
    if ((cmp = compareComparables(this.target, other.target)) !== 0) return cmp;
    return 0;
  }

  toString(): string {
    const result: string[] = [];
    let paramStr = '(this)';
    if (Object.keys(this.params).length > 0) {
      paramStr = `(${Object.keys(this.params).map(name => `${name}: ${this.params[name].toString()}`).join(', ')})`;
    }
    const bodyStr = `${this.target.targetType.getEntitySchema().names.join(' ')}`;
    const bodyFields = this.target.fields.map(field => `${field.name}: ${field.expression.scopeChain.join('.')}`);
    result.push(`adapter ${this.name}${paramStr} => ${bodyStr} { ${bodyFields.join(',\n')} }`);
    return result.join('\n');
  }
}

/**
 * Represents the resulting EntityType this adapter produces, along with the new fields which
 * must be computed by applying expressions.
 */
export class AdaptedType implements Comparable<AdaptedType> {
  constructor(public readonly targetType: EntityType, public readonly fields: AdapterField[]) {
  }

  _compareTo(other: AdaptedType): number {
    let cmp: number;
    if ((cmp = compareArrays(this.fields, other.fields, (a, b) => compareStrings(a.name, b.name))) !== 0) return cmp;
    if ((cmp = compareArrays(this.fields, other.fields,
      (a, b) => compareStrings(a.expression.scopeChain.join('.'), b.expression.scopeChain.join('.')))) !== 0) return cmp;
    return 0;
  }
}

/**
 * A connection between a Handle and an Adapter which should be applied.
 */
export class HandleAdapter {
  constructor(public readonly adapter: Adapter, public readonly adapterArguments: Dictionary<any>) {}

  toString(): string {
    return `apply ${this.adapter.name}(${Object.keys(this.adapter.params).join(', ')})`;
  }
}
