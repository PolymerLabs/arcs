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
import {Schema} from '../../runtime/schema.js';
import fs from 'fs';
import {promisify} from 'util';
import {Schema2Kotlin} from '../schema2kotlin.js';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

describe('schema2kotlin', () => {
  const inputName = './testInput.arcs';
  const outputName = './schema-mock.tmp';

  const overwriteFile = (filePath: string) => async (contents: string) => writeFile(filePath, contents);

  const overwriteInput = overwriteFile(inputName);
  const overwriteOutput = overwriteFile(outputName);

  beforeEach(async () => await overwriteInput(''));
  afterEach( async () => await overwriteOutput(''));

  it('creates unique aliases for schemas with multiple names', async () => {
    await overwriteInput(`\
  particle Foo
    in Product Element Thing {Text value} alpha
    in Thing {Number n} beta
    `);

    const mock = new Schema2Kotlin({'_': [inputName], 'outdir': '.', 'outfile': outputName});
    await mock.call();

    const contents: string = await readFile(outputName, 'utf8');

    assert.match(contents, /typealias\s+[\w_]*Product[\w_]*\s*=\s*/g);
    assert.match(contents, /typealias\s+[\w_]*Element[\w_]*\s*=\s*/g);
    assert.lengthOf(contents.match(/typealias\s+[\w_]*Thing[\w_]*\s*=\s*/g), 2);
  });
});
