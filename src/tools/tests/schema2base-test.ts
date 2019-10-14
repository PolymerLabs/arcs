/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Schema2Base} from '../schema2base.js';
import {Schema} from '../../runtime/schema.js';
import fs from 'fs';
import {promisify} from 'util';

const writeFile = promisify(fs.writeFile);

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
    return baseName;
  }

}

describe('schema2base', () => {
  const inputName = './testInput.arcs';
  const outputName = './schema-mock.tmp';

  const overwriteFile = (filePath: string) => async (contents: string) => writeFile(filePath, contents);

  const overwriteInput = overwriteFile(inputName);
  const overwriteOutput = overwriteFile(outputName);

  beforeEach(async () => await overwriteInput(''));
  afterEach( async () => await overwriteOutput(''));

  it('creates a name for anonymous schemas', async () => {
    await overwriteInput(`\
  alias schema * as MySchema
    Text value`);

    const opts = {'_': [inputName], 'outdir': '.', 'd': '.'};
    const mock = new Schema2Mock(opts);
    await mock.call();

    assert.isNotEmpty(mock.entityArgs);
    const entityArg = mock.entityArgs[0];
    assert.containsAllKeys(entityArg[1].fields, ['value']);
    assert.equal(entityArg[0], 'AnonText');

  });
});
