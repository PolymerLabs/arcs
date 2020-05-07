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
import {Comparable} from './comparable.js';
import {Dictionary} from '../hot.js';
import {AnnotationTargetValue, AnnotationRetentionValue, SchemaPrimitiveTypeValue} from '../manifest-ast-nodes.js';

export class Annotation implements Comparable<Annotation> {
  constructor(public readonly name: string,
              public readonly params: Dictionary<SchemaPrimitiveTypeValue>,
              public readonly targets: AnnotationTargetValue[],
              public readonly retention: AnnotationRetentionValue,
              public readonly doc: string) {}

  _compareTo(other: Annotation): number {
    // TODO: implement
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
