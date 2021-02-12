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
import * as AstNodes from '../../runtime/manifest-ast-types/manifest-ast-nodes.js';
import {Type} from '../lib-types.js';
import {Flags} from '../../runtime/flags.js';
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
    const types = [
      ...AstNodes.schemaPrimitiveTypes,
      ...AstNodes.kotlinPrimitiveTypes,
    ];

    const indent = `\n      `;
    const generateFields = (f: (typename: string) => string) => `${types.map(f).join(indent)}`;

    return Manifest.parse(`
    schema MoreInline
      textsField: [Text]
    
    schema InnerEntity
      textField: Text
      longField: Long
      numberField: Number
      moreInlineField: inline MoreInline
      moreInlinesField: [inline MoreInline]
    
    schema Entity
      ${generateFields(x => `${x.toLowerCase()}Field: ${x}`)}
      ${generateFields(x => `${x.toLowerCase()}CollectionField: [${x}]`)}
      ${generateFields(x => `${x.toLowerCase()}ListField: List<${x}>`)}
      ${generateFields(x => `${x.toLowerCase()}NullableField: ${x}?`)}
      ${generateFields(x => `${x.toLowerCase()}ListNullableField: List<${x}?>`)}
      ${generateFields(x => `${x.toLowerCase()}CollectionNullableField: [${x}?]`)}
    
      inlineEntityField: inline InnerEntity
      inlinesField: [inline InnerEntity]
      inlineListField: List<inline InnerEntity>
      inlineNullableEntityField: inline InnerEntity?
      inlinesNullableField: [inline InnerEntity?]
      inlineNullableListField: List<inline InnerEntity?>
    
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

  it('serializes type with many fields', Flags.withFlags(
    {supportNullables: true},
    async () => {
      const manifest = await generateManifest();
      const type = manifest.recipes[0].particles[0].spec.connections[0].type;
      assert.deepEqual(type.toLiteral(), Type.fromLiteral(type.toLiteral()).toLiteral());
    }
  ));

  it('toString round trips for a type with many fields', Flags.withFlags(
    {supportNullables: true},
    async () => {
      const manifest = await generateManifest();
      const reParsed = await Manifest.parse(`${manifest}`);

      const originalType = manifest.recipes[0].particles[0].spec.connections[0].type;
      deleteFieldRecursively(originalType, 'location');
      const type = reParsed.recipes[0].particles[0].spec.connections[0].type;
      deleteFieldRecursively(type, 'location');
      assert.deepEqual(originalType.toLiteral(), type.toLiteral());
    }
  ));
});
