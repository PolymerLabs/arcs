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
import {deleteFieldRecursively} from '../../utils/lib-utils.js';

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

  const generateManifest = async () => {
    return await Manifest.parse(`
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
      durationField: Duration
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
      durationsField: [Duration]
      bigintsField: [BigInt]
      textListField: List<Text>
      numListField: List<Number>
      boolListField: List<Boolean>
      byteListField: List<Byte>
      shortListField: List<Short>
      intListField: List<Int>
      longListField: List<Long>
      charListField: List<Char>
      floatListField: List<Float>
      doubleListField: List<Double>
      instantListField: List<Instant>
      durationListField: List<Duration>
      bigintListField: List<BigInt>
    
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
  };

  it('serializes type with many fields', async () => {
    const manifest = await generateManifest();
    const type = manifest.recipes[0].particles[0].spec.connections[0].type;
    assert.deepEqual(type.toLiteral(), Type.fromLiteral(type.toLiteral()).toLiteral());
  });

  it('toString round trips for a type with many fields', async () => {
    const manifest = await generateManifest();
    const reParsed = await Manifest.parse(`${manifest}`);

    const originalType = manifest.recipes[0].particles[0].spec.connections[0].type;
    deleteFieldRecursively(originalType, 'location');
    const type = reParsed.recipes[0].particles[0].spec.connections[0].type;
    deleteFieldRecursively(type, 'location');
    assert.deepEqual(originalType.toLiteral(), type.toLiteral());
  });
});
