/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Comparable, compareStrings, compareArrays} from './comparable.js';
import {Dictionary} from '../hot.js';
import {AnnotationTargetValue, AnnotationRetentionValue, SchemaPrimitiveTypeValue} from '../manifest-ast-nodes.js';

export class Annotation implements Comparable<Annotation> {
  constructor(public readonly name: string,
              public readonly params: Dictionary<SchemaPrimitiveTypeValue>,
              public readonly targets: AnnotationTargetValue[],
              public readonly retention: AnnotationRetentionValue,
              public readonly doc: string) {}

  _compareTo(other: Annotation): number {
    let cmp: number;
    if ((cmp = compareStrings(this.name, other.name)) !== 0) return cmp;
    if ((cmp = compareArrays(this.targets, other.targets, compareStrings)) !== 0) return cmp;
    if ((cmp = compareStrings(this.retention, other.retention)) !== 0) return cmp;
    if ((cmp = compareStrings(this.doc, other.doc)) !== 0) return cmp;
    return 0;
  }

  toString(): string {
    const result: string[] = [];
    let paramStr = '';
    if (Object.keys(this.params).length > 0) {
      paramStr = `(${Object.keys(this.params).map(name => `${name}: ${this.params[name]}`).join(', ')})`;
    }
    result.push(`annotation ${this.name}${paramStr}`);
    if (this.targets.length > 0) {
      result.push(`  targets: [${this.targets.join(', ')}]`);
    }
    result.push(`  retention: ${this.retention}`);
    if (this.doc) {
      result.push(`  doc: '${this.doc}'`);
    }
    return result.filter(s => s !== '').join('\n');
  }
}

export class AnnotationRef {
  constructor(public readonly annotation: Annotation,
              public readonly params: Dictionary<string|number|boolean|{}>) {
    this._validateParams();
  }

  get name(): string { return this.annotation.name; }

  _validateParams(): void {
    for (const name of Object.keys(this.params)) {
      const type = this.annotation.params[name];
      const value = this.params[name];
      switch (type) {
        case 'Text':
          assert(typeof value === 'string',
                 `expected '${type}' for param '${name}', instead got ${value}`);
          break;
        case 'Number':
          assert(typeof value === 'number',
                 `expected '${type}' for param '${name}', instead got ${value}`);
          break;
        case 'Boolean':
          assert(typeof value === 'boolean',
                 `expected '${type}' for param '${name}', instead got ${value}`);
          break;
        default:
          throw new Error(`Unsupported type: '${type}' for annotation '${name}'`);
      }
    }
  }

  isValidForTarget(target: AnnotationTargetValue): boolean {
    return this.annotation.targets.length === 0 || this.annotation.targets.includes(target);
  }

  toString(): string {
    const result: string[] = [];
    // TODO(#5291): skip (), if no params (when deprated `annotation` in recipe.ts).
    let paramStr = '()';
    if (Object.keys(this.params).length > 0) {
      const params: string[] = [];
      for (const [name, value] of Object.entries(this.params)) {
        const valueStr = this.annotation.params[name] === 'Text' ? `'${value}'` : value;
        params.push(`${name}: ${valueStr}`);
      }
      paramStr = `(${params.join(', ')})`;
    }
    result.push(`@${this.name}${paramStr}`);
    return result.filter(s => s !== '').join('\n');
  }
}
