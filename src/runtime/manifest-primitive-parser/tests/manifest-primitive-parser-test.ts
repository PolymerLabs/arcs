/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Ast, AstNode, ManifestPrimitiveParser} from '../manifest-primitive-parser.js';
import {Particle, Schema, RecipeNode, RecipeHandle, RecipeParticle} from '../../manifest-ast-types/manifest-ast-nodes.js';

describe('manifest-primitive-parser', async () => {

  it('fails to parse a recipe with syntax errors', async () => {
    try {
      await ManifestPrimitiveParser.parse(`
        syntaxError-recipe
          people: map #folks
          things: map #products
          pairs: join (people, locations)
      `);
      // we've failed to fail, force the test to throw
      assert.fail();
    } catch (e) {
      assert.notEqual(e.message, 'assert.fail()', 'parser did not throw on bad syntax');
    }
  });

  it('can parse a manifest containing a recipe', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
      particle SomeParticle &work in 'some-particle.js'
        someParam: writes SomeSchema {t: Text}

      recipe SomeRecipe &someVerb1 &someVerb2
        map #someHandle
        handle0: create #newHandle
        SomeParticle
          someParam: writes #tag
        description \`hello world\`
          handle0 \`best handle\``
    );

    const verify = (manifest: Ast) => {
      const particle = ManifestPrimitiveParser.extract('particle', manifest)[0] as Particle;
      assert.strictEqual('SomeParticle', particle.name);
      assert.deepEqual(['work'], particle.verbs);

      const recipe = ManifestPrimitiveParser.extract('recipe', manifest)[0] as RecipeNode;
      assert(recipe);
      assert.strictEqual('SomeRecipe', recipe.name);
      assert.deepEqual(['someVerb1', 'someVerb2'], recipe.verbs);

      const recipeAst = recipe.items as Ast;
      const recipeParticles = ManifestPrimitiveParser.extract('recipe-particle', recipeAst) as RecipeParticle[];
      assert.lengthOf(recipeParticles, 1);
      const recipeHandles = ManifestPrimitiveParser.extract('handle', recipeAst) as RecipeHandle[];
      assert.lengthOf(recipeHandles, 2);
      assert.strictEqual(recipeHandles[0].fate, 'map');
      assert.strictEqual(recipeHandles[1].fate, 'create');
    };
    verify(manifest);
  });

  it('can parse a manifest containing a particle specification', async () => {
    const schemaStr = `
schema Product
schema Person
    `;
    const particleStr0 =
`particle TestParticle in 'testParticle.js'
  list: reads [Product {}]
  person: writes Person {}
  modality dom
  modality domTouch
  root: consumes Slot {formFactor: big} #master #main
    action: provides Slot {formFactor: big, handle: list} #large
    preamble: provides Slot {formFactor: medium}
    annotation: provides Slot
  other: consumes Slot
    myProvidedSetCell: provides [Slot]
  mySetCell: consumes [Slot]
  description \`hello world \${list}\`
    list \`my special list\``;

    const particleStr1 =
`particle NoArgsParticle in 'noArgsParticle.js'
  modality dom`;
    const content = `
${schemaStr}
${particleStr0}
${particleStr1}
    `;
    const manifest = await ManifestPrimitiveParser.parse(content);
    const verify = (ast: Ast) => {
      const particles = ManifestPrimitiveParser.extract('particle', ast);
      assert.lengthOf(particles, 2);
    };
    verify(manifest);
  });

  it('SLANDLES can parse a manifest containing a particle specification', async () => {
    const schemaStr = `
schema Product
schema Person
    `;
    const particleStr0 =
`particle TestParticle in 'testParticle.js'
  list: reads [Product {}]
  person: writes Person {}
  root: \`consumes Slot {formFactor:big} #master #main
    action: \`provides Slot {formFactor:big, handle:list} #large
    preamble: \`provides Slot {formFactor:medium}
    annotation: \`provides Slot
  other: \`consumes Slot
    myProvidedSetCell: \`provides [Slot]
  mySetCell: \`consumes [Slot]
  modality dom
  modality domTouch
  description \`hello world \${list}\`
    list \`my special list\``;

    const particleStr1 =
`particle NoArgsParticle in 'noArgsParticle.js'
  modality dom`;
    const manifest = await ManifestPrimitiveParser.parse(`
${schemaStr}
${particleStr0}
${particleStr1}
    `);
    const verify = (ast: Ast) => {
      const particles = ManifestPrimitiveParser.extract('particle', ast);
      assert.lengthOf(particles, 2);
    };
    verify(manifest);
  });

  it('can parse a manifest containing a particle with an argument list', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
    particle TestParticle in 'a.js'
      list: reads [Product {}]
      person: writes Person {}
      thing: consumes
        otherThing: provides
    `);
    const particles = ManifestPrimitiveParser.extract('particle', manifest);
    assert.lengthOf(particles, 1);
  });

  it('SLANDLES can parse a manifest containing a particle with an argument list', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
    particle TestParticle in 'a.js'
      list: reads [Product {}]
      person: writes Person {}
      thing: \`consumes Slot
        otherThing: \`provides Slot
    `);
    const particles = ManifestPrimitiveParser.extract('particle', manifest);
    assert.lengthOf(particles, 1);
  });

  it('can parse a manifest with dependent handles', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
    particle TestParticle in 'a.js'
      input: reads [Product {}]
        output: writes [Product {}]
      thing: consumes
        otherThing: provides
    `);
    const particles = ManifestPrimitiveParser.extract('particle', manifest);
    assert.lengthOf(particles, 1);
  });

  it('SLANDLES can parse a manifest with dependent handles', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
    particle TestParticle in 'a.js'
      input: reads [Product {}]
        output: writes [Product {}]
      thing: \`consumes Slot
        otherThing: \`provides Slot
    `);
    const particles = ManifestPrimitiveParser.extract('particle', manifest);
    assert.lengthOf(particles, 1);
  });

  it('can parse a manifest containing a schema', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
      schema Bar
        value: Text
        description \`one-s\`
          plural \`many-ses\`
          value \`s:\${t}\`
    `);
    const schema = ManifestPrimitiveParser.extract('schema', manifest)[0] as AstNode.Schema;
    assert(schema, 'failed to parse any schema');
    const item: AstNode.SchemaItem = schema.items[0];
    assert.strictEqual(item.kind, 'schema-field', 'schema-field type expected as first item');
    const field: AstNode.SchemaField = item as AstNode.SchemaField;
    assert.strictEqual(field.name, 'value', 'field has unexpected name');
    assert.strictEqual(field.type.kind, 'schema-primitive', 'field expected to be schema-primitive type');
    const type = field.type as AstNode.SchemaPrimitiveType;
    assert.strictEqual(type.type, 'Text', 'field has unexpected type');
  });

  it('can parse a manifest containing an inline schema with line breaks and a trailing comma', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
      particle Fooer
        foo: reads Foo {
          // Comments can go here
          value: Text,
          other: Number, // Or here.
        }
    `);
    assert.include(manifest[0] as AstNode.Particle, {kind: 'particle', name: 'Fooer'});
  });

  it('can parse a recipe with a synthetic join handle', async () => {
    const manifest = await ManifestPrimitiveParser.parse(`
      recipe
        people: map #folks
        other: map #products
        pairs: join (people, places)
        places: map #locations
    `);
    // TODO(mykmartin): RecipeNode not included in AstNode.All, intentional?
    const items = (manifest[0] as unknown as RecipeNode).items;
    assert.lengthOf(items, 4);
    assert.deepInclude(items[2], {kind: 'synthetic-handle', name: 'pairs', associations: ['people', 'places']});  });
});
