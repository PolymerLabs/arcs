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
import {Comparable, compareStrings, compareArrays, compareBools} from './comparable.js';
import {Dictionary} from '../hot.js';
import {AnnotationTargetValue, AnnotationRetentionValue, SchemaPrimitiveTypeValue} from '../manifest-ast-nodes.js';
import {ManifestStringBuilder} from '../manifest-string-builder.js';

export class Annotation implements Comparable<Annotation> {
  constructor(public readonly name: string,
              public readonly params: Dictionary<SchemaPrimitiveTypeValue>,
              public readonly targets: AnnotationTargetValue[],
              public readonly retention: AnnotationRetentionValue,
              public readonly allowMultiple: boolean,
              public readonly doc: string) {}

  _compareTo(other: Annotation): number {
    let cmp: number;
    if ((cmp = compareStrings(this.name, other.name)) !== 0) return cmp;
    if ((cmp = compareArrays(this.targets, other.targets, compareStrings)) !== 0) return cmp;
    if ((cmp = compareStrings(this.retention, other.retention)) !== 0) return cmp;
    if ((cmp = compareBools(this.allowMultiple, other.allowMultiple)) !== 0) return cmp;
    if ((cmp = compareStrings(this.doc, other.doc)) !== 0) return cmp;
    return 0;
  }

  toManifestString(builder = new ManifestStringBuilder()): string {
    let paramStr = '';
    if (Object.keys(this.params).length > 0) {
      paramStr = `(${Object.keys(this.params).map(name => `${name}: ${this.params[name]}`).join(', ')})`;
    }
    builder.push(`annotation ${this.name}${paramStr}`);
    builder.withIndent(builder => {
      if (this.targets.length > 0) {
        builder.push(`targets: [${this.targets.join(', ')}]`);
      }
      builder.push(`retention: ${this.retention}`);
      if (this.allowMultiple) {
        builder.push(`allowMultiple: ${this.allowMultiple}`);
      }
      if (this.doc) {
        builder.push(`doc: '${this.doc}'`);
      }
    });
    return builder.toString();
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

  clone(): AnnotationRef {
    return new AnnotationRef(this.annotation, {...this.params});
  }

  toString(): string {
    let paramStr = '';
    if (Object.keys(this.params).length > 0) {
      const params: string[] = [];
      for (const [name, value] of Object.entries(this.params)) {
        const valueStr = this.annotation.params[name] === 'Text' ? `'${value}'` : value;
        params.push(`${name}: ${valueStr}`);
      }
      paramStr = `(${params.join(', ')})`;
    }
    return `@${this.name}${paramStr}`;
  }
}
