/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../../platform/chai-web.js';
import {Schema2Base} from '../schema2base.js';
import {Schema} from '../../runtime/schema.js';


class Schema2Mock extends Schema2Base {
  public readonly entityArgs: [string, Schema][] = [];
  public readonly outnameArgs: string[] = [];
  public readonly basenameArgs: string[] = [];

  entityClass(name: string, schema: Schema): string {
    this.entityArgs.push([name, schema]);
    return '';
  }

  fileFooter(): string {
    return '';
  }

  fileHeader(outName: string): string {
    this.outnameArgs.push(outName);
    return '';
  }

  outputName(baseName: string): string {
    this.basenameArgs.push(baseName);
    return 'schema-mock.tmp';
  }

}

describe('schema2base', () => {
  it('', async () => {

  });
});
