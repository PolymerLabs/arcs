/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ManifestStringBuilder} from '../manifest-string-builder.js';
import {assert} from '../../platform/chai-web.js';

describe('ManifestStringBuilder', () => {
  let builder: ManifestStringBuilder;

  beforeEach(() => {
    builder = new ManifestStringBuilder();
  });

  it('starts empty', () => {
    assert.strictEqual(builder.toString(), '');
  });

  it('can add lines', () => {
    builder.push('111');
    builder.push('222');
    builder.push('333');
    assert.strictEqual(builder.toString(),
`111
222
333`);
  });

  it('can indent via lambda', () => {
    builder.push('111');
    builder.withIndent(indentedBuilder => {
      indentedBuilder.push('222');
      indentedBuilder.push('333');
      assert.strictEqual(indentedBuilder.toString(),
`  222
  333`);
    });
    builder.push('444');
    assert.strictEqual(builder.toString(),
`111
  222
  333
444`);
  });

  it('can indent via return val', () => {
    builder.push('111');
    const indentedBuilder = builder.withIndent();
    indentedBuilder.push('222');
    indentedBuilder.push('333');
    assert.strictEqual(indentedBuilder.toString(),
`  222
  333`);
    builder.push('444');
    assert.strictEqual(builder.toString(),
`111
  222
  333
444`);
    assert.strictEqual(indentedBuilder.toString(),
`  222
  333
444`);
  });

  it('can indent multiple levels', () => {
    const indent1 = builder.withIndent();
    const indent2 = indent1.withIndent();
    const indent3 = indent2.withIndent();
    builder.push('111');
    indent1.push('222');
    indent2.push('333');
    indent3.push('444');
    assert.strictEqual(builder.toString(),
`111
  222
    333
      444`);
  });
});
