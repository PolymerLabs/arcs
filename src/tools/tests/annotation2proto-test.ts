/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {AnnotationRef} from '../../runtime/recipe/annotation.js';
import {annotationToProtoPayload} from '../annotation2proto.js';
import {Manifest} from '../../runtime/manifest.js';

const customAnnotation = `
annotation custom(myStr: Text, myNum: Number, myBool: Boolean)
  targets: [Recipe]
  retention: Source
  doc: 'custom annotation for testing'`;

describe('annotation2proto', () => {
  it('encodes annotations', async () => {
    const annotation = (await Manifest.parse(
`${customAnnotation}
@custom(myStr: 'hello world!', myNum: 42, myBool: true)
recipe
    `)).recipes[0].annotations[0];
    assert.deepStrictEqual(annotationToProtoPayload(annotation), {
      name: 'custom',
      params: [
        {name: 'myStr', strValue: 'hello world!'},
        {name: 'myNum', numValue: 42},
        {name: 'myBool', boolValue: true},
      ]
    });
  });
});
