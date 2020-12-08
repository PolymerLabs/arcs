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
import {Manifest} from '../../runtime/manifest.js';
import {Type} from '../lib-types.js';

describe('schema field', () => {
  it('serializes type with inline ordered list fields', async () => {
    const manifest = await Manifest.parse(`
      schema MoreInline
        textsField: [Text]
      schema InnerEntity
        moreInlinesField: [inline MoreInline]
      schema Entity
        referenceListField: List<&InnerEntity>
      particle Writer in '.Writer'
        output: writes Entity
      recipe ReadWriteRecipe
        data: create
        Writer
          output: data
    `);
    const type = manifest.recipes[0].particles[0].spec.connections[0].type;
    assert.deepEqual(type.toLiteral(), Type.fromLiteral(type.toLiteral()).toLiteral());
  });

  it('serializes type with many fields', async () => {
    const manifest = await Manifest.parse(`
    schema MoreInline
      textsField: [Text]
    
    schema InnerEntity
      textField: Text
      longField: Long
      numberField: Number
      moreInlineField: inline MoreInline
      moreInlinesField: [inline MoreInline]
    
    schema Entity
      textField: Text
      numField: Number
      boolField: Boolean
      byteField: Byte
      shortField: Short
      intField: Int
      longField: Long
      charField: Char
      floatField: Float
      doubleField: Double
      instantField: Instant
      bigintField: BigInt
      textsField: [Text]
      numsField: [Number]
      boolsField: [Boolean]
      bytesField: [Byte]
      shortsField: [Short]
      intsField: [Int]
      longsField: [Long]
      charsField: [Char]
      floatsField: [Float]
      doublesField: [Double]
      instantsField: [Instant]
      bigintsField: [BigInt]
      textListField: List<Text>
      numListField: List<Number>
      boolListField: List<Boolean>
    
      inlineEntityField: inline InnerEntity
      inlinesField: [inline InnerEntity]
      inlineListField: List<inline InnerEntity>
    
      referenceField: &InnerEntity
      referencesField: [&InnerEntity]
      referenceListField: List<&InnerEntity>

    particle Writer in '.Writer'
        output: writes Entity
    recipe ReadWriteRecipe
        data: create
        Writer
          output: data
    `);
    const type = manifest.recipes[0].particles[0].spec.connections[0].type;
    assert.deepEqual(type.toLiteral(), Type.fromLiteral(type.toLiteral()).toLiteral());
  });
});
