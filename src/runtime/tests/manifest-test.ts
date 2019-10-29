/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';
import {fs} from '../../platform/fs-web.js';
import {path} from '../../platform/path-web.js';
import {Manifest, ErrorSeverity} from '../manifest.js';
import {Schema} from '../schema.js';
import {checkDefined, checkNotNull} from '../testing/preconditions.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Dictionary} from '../hot.js';
import {assertThrowsAsync} from '../testing/test-util.js';
import {ClaimType, ClaimIsTag, ClaimDerivesFrom} from '../particle-claim.js';
import {CheckHasTag, CheckBooleanExpression, CheckCondition, CheckIsFromStore} from '../particle-check.js';
import {ProvideSlotConnectionSpec} from '../particle-spec.js';
import {Flags} from '../flags.js';
import {Store} from '../storageNG/store.js';
import {StorageStub} from '../storage-stub.js';
import {collectionHandleForTest} from '../testing/handle-for-test.js';
import {Entity} from '../entity.js';
import {RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';

function verifyPrimitiveType(field, type) {
  const copy = {...field};
  delete copy.location;
  assert.deepEqual(copy, {kind: 'schema-primitive', type});
}

describe('manifest', () => {
  it('can parse a manifest containing a recipe', async () => {
    const manifest = await Manifest.parse(`
      schema S
        Text t
        description \`one-s\`
          plural \`many-ses\`
          value \`s:\${t}\`
      particle SomeParticle &work in 'some-particle.js'
        out S someParam

      recipe SomeRecipe &someVerb1 &someVerb2
        map #someHandle
        create #newHandle as handle0
        SomeParticle
          someParam -> #tag
        description \`hello world\`
          handle0 \`best handle\``);
    const verify = (manifest: Manifest) => {
      const particle = manifest.particles[0];
      assert.strictEqual('SomeParticle', particle.name);
      assert.deepEqual(['work'], particle.verbs);
      const recipe = manifest.recipes[0];
      assert(recipe);
      assert.strictEqual('SomeRecipe', recipe.name);
      assert.deepEqual(['someVerb1', 'someVerb2'], recipe.verbs);
      assert.sameMembers(manifest.findRecipesByVerb('someVerb1'), [recipe]);
      assert.sameMembers(manifest.findRecipesByVerb('someVerb2'), [recipe]);
      assert.lengthOf(recipe.particles, 1);
      assert.lengthOf(recipe.handles, 2);
      assert.strictEqual(recipe.handles[0].fate, 'map');
      assert.strictEqual(recipe.handles[1].fate, 'create');
      assert.lengthOf(recipe.handleConnections, 1);
      assert.sameMembers(recipe.handleConnections[0].tags, ['tag']);
      assert.lengthOf(recipe.patterns, 1);
      assert.strictEqual(recipe.patterns[0], 'hello world');
      assert.strictEqual(recipe.handles[1].pattern, 'best handle');
      const type = recipe.handleConnections[0]['_resolvedType'];
      assert.lengthOf(Object.keys(manifest.schemas), 1);
      const schema = Object.values(manifest.schemas)[0] as Schema;
      assert.lengthOf(Object.keys(schema.description), 3);
      assert.deepEqual(Object.keys(schema.description), ['pattern', 'plural', 'value']);
    };
    verify(manifest);
    // TODO(dstockwell): The connection between particles and schemas does
    //                   not roundtrip the same way.
    const type = manifest.recipes[0].handleConnections[0].type;
    assert.strictEqual('one-s', type.toPrettyString());
    assert.strictEqual('many-ses', type.collectionOf().toPrettyString());
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('SLANDLES SYNTAX can parse a manifest containing a particle specification', Flags.withPostSlandlesSyntax(async () => {
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
    const manifest = await Manifest.parse(`
${schemaStr}
${particleStr0}
${particleStr1}
    `);
    const verify = (manifest: Manifest) => {
      assert.lengthOf(manifest.particles, 2);
      assert.strictEqual(particleStr0, manifest.particles[0].toString());
      assert.strictEqual(particleStr1, manifest.particles[1].toString());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  }));
  it('can parse a manifest containing a particle specification', Flags.withPreSlandlesSyntax(async () => {
    const schemaStr = `
schema Product
schema Person
    `;
    const particleStr0 =
`particle TestParticle in 'testParticle.js'
  in [Product {}] list
  out Person {} person
  modality dom
  modality domTouch
  must consume root #master #main
    formFactor big
    must provide action #large
      formFactor big
      handle list
    provide preamble
      formFactor medium
    provide annotation
  consume other
    provide set of myProvidedSetCell
  consume set of mySetCell
  description \`hello world \${list}\`
    list \`my special list\``;

    const particleStr1 =
`particle NoArgsParticle in 'noArgsParticle.js'
  modality dom`;
    const manifest = await Manifest.parse(`
${schemaStr}
${particleStr0}
${particleStr1}
    `);
    const verify = (manifest: Manifest) => {
      assert.lengthOf(manifest.particles, 2);
      assert.strictEqual(particleStr0, manifest.particles[0].toString());
      assert.strictEqual(particleStr1, manifest.particles[1].toString());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  }));
  it('SLANDLES can parse a manifest containing a particle specification', Flags.withPostSlandlesSyntax(async () => {
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
    const manifest = await Manifest.parse(`
${schemaStr}
${particleStr0}
${particleStr1}
    `);
    const verify = (manifest: Manifest) => {
      assert.lengthOf(manifest.particles, 2);
      assert.strictEqual(particleStr0, manifest.particles[0].toString());
      assert.strictEqual(particleStr1, manifest.particles[1].toString());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  }));
  it('can parse a manifest containing a particle with an argument list', async () => {
    const manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      in [Product {}] list
      out Person {} person
      consume thing
        provide otherThing
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 2);
  });
  it('SLANDLES can parse a manifest containing a particle with an argument list', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      list: reads [Product {}]
      person: writes Person {}
      thing: \`consumes Slot
        otherThing: \`provides Slot
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 4);
  }));
  it('can parse a manifest with dependent handles', async () => {
    const manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      in [Product {}] input
        out [Product {}] output
      consume thing
        provide otherThing
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 2);
  });
  it('SLANDLES can parse a manifest with dependent handles', async () => {
    const manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      in [Product {}] input
        out [Product {}] output
      \`consume Slot thing
        \`provide Slot otherThing
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 4);
  });
  it('SLANDLES SYNTAX can round-trip particles with dependent handles', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  modality dom
  thing: consumes Slot
    otherThing: provides? Slot`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('can round-trip particles with dependent handles', Flags.withPreSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  in [Product {}] input
    out [Product {}] output
  modality dom
  consume thing
    provide otherThing`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('SLANDLES can round-trip particles with dependent handles', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thing: \`consumes? Slot
    otherThing: \`provides? Slot
  modality dom`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('can parse a manifest containing a schema', async () => {
    const manifest = await Manifest.parse(`
      schema Bar
        Text value`);
    const verify = (manifest: Manifest) => verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing an extended schema', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text value
      schema Bar extends Foo`);
    const verify = (manifest: Manifest) => verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('two manifests with stores with the same filename, store name and data have the same ids', async () => {
    const manifestA = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    const manifestB = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    assert.strictEqual(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('two manifests with stores with the same filename and store name but different data have different ids', async () => {
    const manifestA = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    const manifestB = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
         resource NobIdJson
           start
           [{"nobId": "67890"}]
          `, {fileName: 'the.manifest'});

    assert.notStrictEqual(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('supports recipes with constraints', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        in S a
      particle B
        in S b

      recipe Constrained
        A.a -> B.b`);
    const verify = (manifest) => {
      const recipe = manifest.recipes[0];
      assert(recipe);
      assert.lengthOf(recipe._connectionConstraints, 1);
      const constraint = recipe._connectionConstraints[0];
      assert.strictEqual(constraint.from.particle.name, 'A');
      assert.strictEqual(constraint.from.connection, 'a');
      assert.strictEqual(constraint.to.particle.name, 'B');
      assert.strictEqual(constraint.to.connection, 'b');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with constraints that reference handles', async () => {
    const manifest = await Manifest.parse(`
      particle A
        out S {} a

      recipe Constrained
        ? as localThing
        A.a -> localThing`);
    const verify = (manifest) => {
      const recipe = manifest.recipes[0];
      assert(recipe);
      assert.lengthOf(recipe.connectionConstraints, 1);
      const constraint = recipe.connectionConstraints[0];
      assert.strictEqual(constraint.from.particle.name, 'A');
      assert.strictEqual(constraint.from.connection, 'a');
      assert.strictEqual(constraint.to.handle.localName, 'localThing');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with local names', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle P1
        out S x
        out S y
      particle P2
        out S x
        out S y

      recipe
        ? #things as thingHandle
        P1 as p1
          x -> thingHandle
        P2
          x -> thingHandle`);
    const deserializedManifest = (await Manifest.parse(manifest.toString(), {}));
  });
  // TODO: move these tests to new-recipe tests.
  it('can normalize simple recipes', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle P1
        out S x
      particle P2

      recipe
        ? as handle1
        P1
          x -> handle1
        P2
      recipe
        ? as someHandle
        P2
        P1
          x -> someHandle
        `, {});
    const [recipe1, recipe2] = manifest.recipes;
    assert.notStrictEqual(recipe1.toString(), recipe2.toString());
    assert.notStrictEqual(await recipe1.digest(), await recipe2.digest());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
    assert.strictEqual(await recipe1.digest(), await recipe2.digest());

    const deserializedManifest = await Manifest.parse(manifest.toString(), {});
  });
  it('can normalize recipes with interdependent ordering of handles and particles', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle P1
        out S x

      recipe
        use as handle1
        use as handle2
        P1
          x -> handle1
        P1
          x -> handle2
      recipe
        use as handle1
        use as handle2
        P1
          x -> handle2
        P1
          x -> handle1`);
    const [recipe1, recipe2] = manifest.recipes;
    assert.notStrictEqual(recipe1.toString(), recipe2.toString());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
  });
  it('can resolve recipe particles defined in the same manifest', async () => {
    const manifest = await Manifest.parse(`
      schema Something
      schema Someother
      particle Thing in 'thing.js'
        in [Something] someThings
        out [Someother] someOthers
      recipe
        Thing`);
    const verify = (manifest: Manifest) => assert(manifest.recipes[0].particles[0].spec);
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('treats a failed import as non-fatal', async () => { // TODO(cypher1): Review this.
    const loader = new StubLoader({
      'a': `import 'b'`,
      'b': `lol what is this`,
    });
    await Manifest.load('a', loader);
  });
  it('throws an error when a particle has invalid description', async () => {
    try {
      const manifest = await Manifest.parse(`
        schema Foo
        particle Thing in 'thing.js'
          in Foo foo
          description \`Does thing\`
            bar \`my-bar\``);
      assert(false);
    } catch (e) {
      assert.strictEqual(e.message, 'Unexpected description for bar');
    }
  });
  it('can load a manifest via a loader', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};

    const loader = new StubLoader({'*': 'recipe'});
    const manifest = await Manifest.load('some-path', loader, {registry});
    assert(manifest.recipes[0]);
    assert.strictEqual(manifest, await registry['some-path']);
  });
  it('can load a manifest with imports', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};
    const loader = new StubLoader({
      a: `import 'b'`,
      b: `recipe`,
    });
    const manifest = await Manifest.load('a', loader, {registry});
    assert.strictEqual(await registry.a, manifest);
    assert.strictEqual(manifest.imports[0], await registry.b);
  });
  it('can resolve recipe particles imported from another manifest', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};
    const loader = new StubLoader({
      a: `
        import 'b'
        recipe
          ParticleB`,
      b: `
        schema Thing
        particle ParticleB in 'b.js'
          in Thing thing`
    });
    const manifest = await Manifest.load('a', loader, {registry});
    assert.isTrue(manifest.recipes[0].particles[0].spec.equals((await registry.b).findParticleByName('ParticleB')));
  });
  it('can parse a schema extending a schema in another manifest', async () => {
    const registry = {};
    const loader = new StubLoader({
      a: `
          import 'b'
          schema Bar extends Foo`,
      b: `
          schema Foo
            Text value`
    });
    const manifest = await Manifest.load('a', loader, {registry});
    verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
  });
  it('can find all imported recipes', async () => {
    const loader = new StubLoader({
      a: `
          import 'b'
          import 'c'
          recipe`,
      b: `
          import 'c'
          recipe`,
      c: `recipe`,
    });
    const manifest = await Manifest.load('a', loader);
    assert.lengthOf(manifest.allRecipes, 3);
  });
  it('can parse a schema with union typing', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        (Text or URL) u
        Text test
        (Number, Number, Boolean) t`);
    const verify = (manifest: Manifest) => {
      const opt = manifest.schemas.Foo.fields;
      assert.strictEqual(opt.u.kind, 'schema-union');
      verifyPrimitiveType(opt.u.types[0], 'Text');
      verifyPrimitiveType(opt.u.types[1], 'URL');
      assert.strictEqual(opt.t.kind, 'schema-tuple');
      verifyPrimitiveType(opt.t.types[0], 'Number');
      verifyPrimitiveType(opt.t.types[1], 'Number');
      verifyPrimitiveType(opt.t.types[2], 'Boolean');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('can parse a manifest containing a recipe with slots', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      particle SomeParticle in 'some-particle.js'
        in Thing someParam
        consume mySlot
          formFactor big
          provide otherSlot
            handle someParam
          provide oneMoreSlot
            formFactor small

      particle OtherParticle
        out Thing aParam
        consume mySlot
        consume oneMoreSlot

      recipe SomeRecipe
        ? #someHandle1 as myHandle
        slot 'slotIDs:A' #someSlot as slot0
        SomeParticle
          someParam <- myHandle
          consume mySlot as slot0
            provide otherSlot as slot2
            provide oneMoreSlot as slot1
        OtherParticle
          aParam -> myHandle
          consume mySlot as slot0
          consume oneMoreSlot as slot1
    `);
    const verify = (manifest: Manifest) => {
      const recipe = manifest.recipes[0];
      assert(recipe);
      recipe.normalize();

      assert.lengthOf(recipe.particles, 2);
      assert.lengthOf(recipe.handles, 1);
      assert.lengthOf(recipe.handleConnections, 2);
      assert.lengthOf(recipe.slots, 3);
      assert.lengthOf(recipe.slotConnections, 3);
      assert.lengthOf(recipe.particles[0].getSlotConnectionNames(), 2);
      assert.lengthOf(recipe.particles[1].getSlotConnectionNames(), 1);
      const mySlot = recipe.particles[1].getSlotConnectionByName('mySlot');
      assert.isDefined(mySlot.targetSlot);
      assert.lengthOf(Object.keys(mySlot.providedSlots), 2);
      assert.strictEqual(mySlot.providedSlots['oneMoreSlot'], recipe.particles[0].getSlotConnectionByName('oneMoreSlot').targetSlot);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('SLANDLES SYNTAX can parse a manifest containing a recipe with slots', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      particle SomeParticle in 'some-particle.js'
        someParam: reads Thing
        mySlot: consumes Slot {formFactor: big}
          otherSlot: provides Slot {handle: someParam}
          oneMoreSlot: provides Slot {formFactor: small}

      particle OtherParticle
        aParam: writes Thing
        mySlot: consumes Slot
        oneMoreSlot: consumes Slot

      recipe SomeRecipe
        myHandle: ? #someHandle1
        slot0: slot 'slotIDs:A' #someSlot
        SomeParticle
          someParam: reads myHandle
          mySlot: consumes slot0
            otherSlot: provides slot2
            oneMoreSlot: provides slot1
        OtherParticle
          aParam: writes myHandle
          mySlot: consumes slot0
          oneMoreSlot: consumes slot1
    `);
    const verify = (manifest: Manifest) => {
      const recipe = manifest.recipes[0];
      assert(recipe);
      recipe.normalize();

      assert.lengthOf(recipe.particles, 2);
      assert.lengthOf(recipe.handles, 1);
      assert.lengthOf(recipe.handleConnections, 2);
      assert.lengthOf(recipe.slots, 3);
      assert.lengthOf(recipe.slotConnections, 3);
      assert.lengthOf(recipe.particles[0].getSlotConnectionNames(), 2);
      assert.lengthOf(recipe.particles[1].getSlotConnectionNames(), 1);
      const mySlot = recipe.particles[1].getSlotConnectionByName('mySlot');
      assert.isDefined(mySlot.targetSlot);
      assert.lengthOf(Object.keys(mySlot.providedSlots), 2);
      assert.strictEqual(mySlot.providedSlots['oneMoreSlot'], recipe.particles[0].getSlotConnectionByName('oneMoreSlot').targetSlot);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  }));
  it('SLANDLES can parse a manifest containing a recipe with slots', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      particle SomeParticle in 'some-particle.js'
        someParam: reads Thing
        mySlot: \`consumes Slot {formFactor: big}
          otherSlot: \`provides Slot {handle: someParam}
          oneMoreSlot: \`provides Slot {formFactor: small}

      particle OtherParticle
        aParam: writes Thing
        mySlot: \`consumes Slot
        oneMoreSlot: \`consumes Slot

      recipe SomeRecipe
        myHandle: ? #someHandle1
        slot0: \`slot 'slotIDs:A' #someSlot
        SomeParticle
          someParam: reads myHandle
          mySlot: \`consumes slot0
          otherSlot: \`provides slot2
          oneMoreSlot: \`provides slot1
        OtherParticle
          aParam: writes myHandle
          mySlot: \`consumes slot0
          oneMoreSlot: \`consumes slot1
    `);
    const verify = (manifest: Manifest) => {
      const recipe = manifest.recipes[0];
      assert(recipe);
      recipe.normalize();

      assert.lengthOf(recipe.particles, 2);
      assert.lengthOf(recipe.handles, 4);
      assert.lengthOf(recipe.handleConnections, 7);
      const mySlot = checkDefined(recipe.particles[1].connections['mySlot'].handle);
      assert.lengthOf(mySlot.connections, 2);
      assert.strictEqual(mySlot.connections[0], recipe.particles[0].connections['mySlot']);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  }));
  it('unnamed consume slots', async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        consume slotA
      particle SomeParticle1 &rest in 'some-particle.js'
        consume slotC

      recipe
        SomeParticle
          consume slotA
        SomeParticle1
          consume slotC
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('unnamed consume set slots', async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        consume set of slotA
      particle SomeParticle1 &rest in 'some-particle.js'
        consume set of slotC

      recipe
        SomeParticle
          consume slotA
        SomeParticle1
          consume slotC
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('unnamed consume set slots', async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        consume set of slotA
      particle SomeParticle1 &rest in 'some-particle.js'
        consume set of slotC

      recipe
        SomeParticle
          consume slotA
        SomeParticle1
          consume slotC
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('SLANDLES unnamed consume slots', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: \`consumes Slot
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: \`consumes Slot

      recipe
        SomeParticle
          slotA: \`consumes
        SomeParticle1
          slotC: \`consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handleConnections, 2);
    assert.isEmpty(recipe.handles);
  }));
  it('SLANDLES unnamed consume set slots', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: \`consumes [Slot]

      recipe
        SomeParticle
          slotA: \`consumes
        SomeParticle1
          slotC: \`consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handleConnections, 2);
    assert.isEmpty(recipe.handles);
  }));
  it('SLANDLES unnamed consume set slots', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: \`consumes [Slot]

      recipe
        SomeParticle
          slotA: \`consumes
        SomeParticle1
          slotC: \`consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handleConnections, 2);
    assert.isEmpty(recipe.handles);
  }));
  it('resolves in context with multiple consumed slots', async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await Manifest.parse(`
        particle SomeParticle in 'some-particle.js'
          ${arg.isRequiredSlotA ? 'must ' : ''}consume slotA
          ${arg.isRequiredSlotB ? 'must ' : ''}consume slotB

        recipe
          slot 'slota-0' as s0
          SomeParticle
            consume slotA as s0
      `)).recipes[0];
      assert.isTrue(recipe.normalize(), 'normalizes');
      const options = {errors: new Map(), details: '', showUnresolved: true};
      assert.strictEqual(recipe.isResolved(options), arg.expectedIsResolved, `${arg.label}: Expected recipe to be ${arg.expectedIsResolved ? '' : 'un'}resolved.\nErrors: ${JSON.stringify([...options.errors, options.details])}`);
    };
    await parseRecipe({label: '1', isRequiredSlotA: false, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '2', isRequiredSlotA: true, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '3', isRequiredSlotA: false, isRequiredSlotB: true, expectedIsResolved: false});
    await parseRecipe({label: '4', isRequiredSlotA: true, isRequiredSlotB: true, expectedIsResolved: false});
  });
  it('SLANDLES resolves in context with multiple consumed slots', Flags.withPostSlandlesSyntax(async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await Manifest.parse(`
        particle SomeParticle in 'some-particle.js'
          slotA: \`consumes${arg.isRequiredSlotA ? '' : '?'} Slot
          slotB: \`consumes${arg.isRequiredSlotB ? '' : '?'} Slot

        recipe
          s0: \`slot 'slota-0'
          SomeParticle
            slotA: \`consumes s0
      `)).recipes[0];
      const options = {errors: new Map(), details: '', showUnresolved: true};
      assert.isTrue(recipe.normalize(options), 'normalizes');
      assert.strictEqual(recipe.isResolved(options), arg.expectedIsResolved, `${arg.label}: Expected recipe to be ${arg.expectedIsResolved ? '' : 'un'}resolved.\nErrors: ${JSON.stringify([...options.errors, options.details])}`);
    };
    await parseRecipe({label: '1', isRequiredSlotA: false, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '2', isRequiredSlotA: true, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '3', isRequiredSlotA: false, isRequiredSlotB: true, expectedIsResolved: false});
    await parseRecipe({label: '4', isRequiredSlotA: true, isRequiredSlotB: true, expectedIsResolved: false});
  }));
  it('SLANDLES resolves & consumes in context with multiple set slots', Flags.withPostSlandlesSyntax(async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await Manifest.parse(`
        particle SomeParticle in 'some-particle.js'
          slotA: \`consumes${arg.isRequiredSlotA ? '' : '?'} [Slot]
          slotB: \`consumes${arg.isRequiredSlotB ? '' : '?'} [Slot]

        recipe
          s0: \`slot 'slota-0'
          SomeParticle
            slotA: \`consumes s0
      `)).recipes[0];
      const options = {errors: new Map(), details: '', showUnresolved: true};
      assert.isTrue(recipe.normalize(options), `should normalizes ${JSON.stringify([...options.errors.values()])} ${JSON.stringify(options.details)}`);
      assert.strictEqual(recipe.isResolved(options), arg.expectedIsResolved, `${arg.label}: Expected recipe to be ${arg.expectedIsResolved ? '' : 'un'}resolved.\nErrors: ${JSON.stringify([...options.errors, options.details])}`);
    };
    await parseRecipe({label: '1', isRequiredSlotA: false, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '2', isRequiredSlotA: true, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({label: '3', isRequiredSlotA: false, isRequiredSlotB: true, expectedIsResolved: false});
    await parseRecipe({label: '4', isRequiredSlotA: true, isRequiredSlotB: true, expectedIsResolved: false});
  }));

  it('SLANDLES resolves with dependent slandles', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle Parent in 'parent.js'
        root: \`consumes Slot
          mySlot: \`provides Slot

      particle Child in 'child.js'
        childSlot: \`consumes Slot

      recipe SlandleRenderSlotsRecipe
        Parent
          root: \`consumes root
            mySlot: \`provides shared
        Child
          childSlot: \`consumes shared
    `);
    // verify particle spec
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    recipe.normalize();
    assert.lengthOf(recipe.handles, 2);
    assert.isTrue(recipe.isResolved());
  }));

  it('SLANDLES doesn\'t resolve mismatching dependencies dependent slandles', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle Parent in 'parent.js'
        root: \`consumes Slot
          mySlot: \`provides Slot

      particle Child in 'child.js'
        childSlot: \`consumes Slot

      recipe SlandleRenderSlotsRecipe
        Parent
          root: \`consumes root
        Child
          childSlot: \`consumes shared
    `);
    // verify particle spec
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    recipe.normalize();
    assert.lengthOf(recipe.handles, 2);
    assert.isFalse(recipe.isResolved());
  }));

  it('recipe slots with tags', async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle in 'some-particle.js'
        consume slotA #aaa
          provide slotB #bbb
      recipe
        slot 'slot-id0' #aa #aaa as s0
        SomeParticle
          consume slotA #aa #hello as s0
            provide slotB
    `);
    // verify particle spec
    assert.lengthOf(manifest.particles, 1);
    const spec = manifest.particles[0];
    assert.strictEqual(spec.slotConnections.size, 1);
    const slotSpec = [...spec.slotConnections.values()][0];
    assert.deepEqual(slotSpec.tags, ['aaa']);
    assert.lengthOf(slotSpec.provideSlotConnections, 1);
    const providedSlotSpec = slotSpec.provideSlotConnections[0];
    assert.deepEqual(providedSlotSpec.tags, ['bbb']);

    // verify recipe slots
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slots, 2);
    const recipeSlot = checkDefined(recipe.slots.find(s => s.id === 'slot-id0'));
    assert.deepEqual(recipeSlot.tags, ['aa', 'aaa']);

    const slotConn = recipe.particles[0].getSlotConnectionByName('slotA');
    assert(slotConn);
    assert.deepEqual(['aa', 'hello'], slotConn.tags);
    assert.lengthOf(Object.keys(slotConn.providedSlots), 1);
  });
  it('SLANDLES recipe slots with tags', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle SomeParticle in 'some-particle.js'
        slotA: \`consumes Slot #aaa
          slotB: \`provides Slot #bbb
      recipe
        s0: \`slot 'slot-id0' #aa #aaa
        SomeParticle
          slotA: \`consumes s0 #aa #hello
          slotB: \`provides
    `);
    // verify particle spec
    assert.lengthOf(manifest.particles, 1);
    const spec = manifest.particles[0];
    assert.lengthOf(spec.handleConnections, 2);
    const slotSpec = spec.handleConnections[0];
    assert.deepEqual(slotSpec.tags, ['aaa']);
    assert.lengthOf(slotSpec.dependentConnections, 1);
    const providedSlotSpec = slotSpec.dependentConnections[0];
    assert.deepEqual(providedSlotSpec.tags, ['bbb']);

    // verify recipe slots
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 1);
    const recipeSlot = checkDefined(recipe.handles.find(s => s.id === 'slot-id0'));
    assert.deepEqual(recipeSlot.tags, ['aa', 'aaa']);

    const slotConn = checkDefined(recipe.particles[0].connections['slotA']);
    assert.deepEqual(['aa', 'hello'], slotConn.tags);
  }));
  it('recipe slots with different names', async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        consume slotA
      particle ParticleB in 'some-particle.js'
        consume slotB1
          provide slotB2
      recipe
        slot 'slot-id0' as s0
        ParticleA
          consume slotA as mySlot
        ParticleB
          consume slotB1 as s0
            provide slotB2 as mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slots, 2);
    assert.strictEqual(checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).getSlotConnectionByName('slotB1').providedSlots['slotB2'],
                 checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).getSlotConnectionByName('slotA').targetSlot);
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
  });
  it('SLANDLES recipe slots with different names', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes Slot
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes Slot
          slotB2: \`provides Slot
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);

    const options = {errors: new Map(), details: '', showUnresolved: true};
    assert.isTrue(recipe.normalize(options), 'normalizes');
    assert.isTrue(recipe.isResolved(options), `Expected recipe to be resolved.\n\t ${JSON.stringify([...options.errors])}`);
  }));
  it('SLANDLES recipe set slots with different names (passing a single slot to a set slot)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes Slot
          slotB2: \`provides Slot
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);
    assert.isFalse(recipe.normalize(), 'does not normalize');
  }));
  it('SLANDLES recipe set slots with different names (passing a slot as a set slot)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes Slot
          slotB2: \`provides [Slot]
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);

    const options = {errors: new Map(), details: '', showUnresolved: true};
    assert.isTrue(recipe.normalize(options), 'normalizes');
    assert.isTrue(recipe.isResolved(options), `Expected recipe to be resolved.\n\t ${JSON.stringify([...options.errors])}`);
  }));
  it('SLANDLES recipe set slots with different names (passing set slots)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes [Slot]
          slotB2: \`provides [Slot]
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);

    const options = {errors: new Map(), details: '', showUnresolved: true};
    assert.isTrue(recipe.normalize(options), 'normalizes');
    assert.isTrue(recipe.isResolved(options), `Expected recipe to be resolved.\n\t ${JSON.stringify([...options.errors])}`);
  }));
  it('SLANDLES recipe set slots with different names (passing a single slot to a set slot)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes Slot
          slotB2: \`provides Slot
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);
    assert.isFalse(recipe.normalize(), 'does not normalize');
  }));
  it('SLANDLES recipe set slots with different names (passing a slot as a set slot)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes Slot
          slotB2: \`provides [Slot]
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);

    const options = {errors: new Map(), details: '', showUnresolved: true};
    assert.isTrue(recipe.normalize(options), 'normalizes');
    assert.isTrue(recipe.isResolved(options), `Expected recipe to be resolved.\n\t ${JSON.stringify([...options.errors])}`);
  }));
  it('SLANDLES recipe set slots with different names (passing set slots)', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA: \`consumes [Slot]
      particle ParticleB in 'some-particle.js'
        slotB1: \`consumes [Slot]
          slotB2: \`provides [Slot]
      recipe
        s0: \`slot 'slot-id0'
        ParticleA
          slotA: \`consumes mySlot
        ParticleB
          slotB1: \`consumes s0
          slotB2: \`provides mySlot
    `);
    assert.lengthOf(manifest.particles, 2);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.handles, 2);
    assert.strictEqual(
      checkDefined(recipe.particles.find(p => p.name === 'ParticleA')).connections['slotA'].handle,
      checkDefined(recipe.particles.find(p => p.name === 'ParticleB')).connections['slotB2'].handle);

    const options = {errors: new Map(), details: '', showUnresolved: true};
    assert.isTrue(recipe.normalize(options), 'normalizes');
    assert.isTrue(recipe.isResolved(options), `Expected recipe to be resolved.\n\t ${JSON.stringify([...options.errors])}`);
  }));
  it('recipe provided slot with no local name', async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        consume slotA1
          provide slotA2
      recipe
        ParticleA
          consume slotA1
            provide slotA2
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slots, 1);
    assert.strictEqual('slotA2', recipe.slots[0].name);
    assert.isUndefined(recipe.particles[0].getSlotConnectionByName('slotA1').targetSlot);
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
  });
  it('SLANDLES recipe provided slot with no local name', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA1: \`consumes Slot
          slotA2: \`provides Slot
      recipe
        ParticleA
          slotA1: \`consumes
          slotA2: \`provides
    `);
    // Check that the manifest was parsed in the way we expect.
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.recipes, 1);

    const recipe = manifest.recipes[0];
    // Check that the parser found the handleConnections
    assert.lengthOf(recipe.handleConnections, 2);
    assert.strictEqual('slotA1', recipe.handleConnections[0].name);
    assert.strictEqual('slotA2', recipe.handleConnections[1].name);

    // Check that the handle connection
    // wasn't resolved to a handle (even though it was parsed).
    assert.isUndefined(recipe.handleConnections[0].handle);
    assert.isUndefined(recipe.handleConnections[1].handle);

    // The recipe shouldn't resolve (as there is nothing providing slotA1 or
    // consuming slotA2).
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
  }));
  it('SLANDLES recipe provided set slots with no local name', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA1: \`consumes [Slot]
          slotA2: \`provides [Slot]
      recipe
        ParticleA
          slotA1: \`consumes
          slotA2: \`provides
    `);
    // Check that the manifest was parsed in the way we expect.
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.recipes, 1);

    const recipe = manifest.recipes[0];
    // Check that the parser found the handleConnections
    assert.lengthOf(recipe.handleConnections, 2);
    assert.strictEqual('slotA1', recipe.handleConnections[0].name);
    assert.strictEqual('slotA2', recipe.handleConnections[1].name);

    // Check that the handle connection
    // wasn't resolved to a handle (even though it was parsed).
    assert.isUndefined(recipe.handleConnections[0].handle);
    assert.isUndefined(recipe.handleConnections[1].handle);

    // The recipe shouldn't resolve (as there is nothing providing slotA1 or
    // consuming slotA2).
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
  }));
  it('SLANDLES recipe provided set slots with no local name', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        slotA1: \`consumes [Slot]
          slotA2: \`provides [Slot]
      recipe
        ParticleA
          slotA1: \`consumes
          slotA2: \`provides
    `);
    // Check that the manifest was parsed in the way we expect.
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.recipes, 1);

    const recipe = manifest.recipes[0];
    // Check that the parser found the handleConnections
    assert.lengthOf(recipe.handleConnections, 2);
    assert.strictEqual('slotA1', recipe.handleConnections[0].name);
    assert.strictEqual('slotA2', recipe.handleConnections[1].name);

    // Check that the handle connection
    // wasn't resolved to a handle (even though it was parsed).
    assert.isUndefined(recipe.handleConnections[0].handle);
    assert.isUndefined(recipe.handleConnections[1].handle);

    // The recipe shouldn't resolve (as there is nothing providing slotA1 or
    // consuming slotA2).
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
  }));
  it('incomplete aliasing', async () => {
    const recipe = (await Manifest.parse(`
      particle P1 in 'some-particle.js'
        consume slotA
          provide slotB
      particle P2 in 'some-particle.js'
        consume slotB
      recipe
        P1
          consume slotA
            provide slotB as s1
        P2
          consume slotB as s1
    `)).recipes[0];
    recipe.normalize();

    assert.lengthOf(recipe.slotConnections, 2);
    const slotConnA = checkDefined(recipe.slotConnections.find(s => s.name === 'slotA'));

    // possible bogus assert?
    assert.isUndefined(slotConnA['sourceConnection']);

    assert.lengthOf(recipe.slots, 1);
    const slotB = recipe.slots[0];
    assert.strictEqual('slotB', slotB.name);
    assert.lengthOf(slotB.consumeConnections, 1);
    assert.strictEqual(slotB.sourceConnection, slotConnA);
  });
  it('SLANDLES incomplete aliasing', Flags.withPostSlandlesSyntax(async () => {
    const recipe = (await Manifest.parse(`
      particle P1 in 'some-particle.js'
        slotA: \`consumes Slot
          slotB: \`provides Slot
      particle P2 in 'some-particle.js'
        slotB: \`consumes Slot
      recipe
        P1
          slotA: \`consumes
          slotB: \`provides s1
        P2
          slotB: \`consumes s1
    `)).recipes[0];
    recipe.normalize();

    assert.lengthOf(recipe.handleConnections, 3);
    const slotConnA = checkDefined(recipe.handleConnections.find(s => s.name === 'slotA'));
    assert.isUndefined(slotConnA.handle);

    assert.lengthOf(recipe.handles, 1);
    const slotB = recipe.handles[0];
    assert.lengthOf(slotB.connections, 2);

    assert.strictEqual(slotB.connections[0].name, 'slotB');
    assert.strictEqual(slotB.connections[1].name, 'slotB');

    const directions = slotB.connections.map(c => c.direction);
    assert.lengthOf(directions, 2);
    assert.include(directions, '`provide');
    assert.include(directions, '`consume');
  }));
  it('parses local slots with IDs', async () => {
    const recipe = (await Manifest.parse(`
      particle P1 in 'some-particle.js'
        consume slotA
          provide slotB
      particle P2 in 'some-particle.js'
        consume slotB
      recipe
        slot 'rootslot-0' as slot0
        slot 'local-slot-0' as slot1
        P1
          consume slotA as slot0
            provide slotB as slot1
        P2
          consume slotB as slot1
    `)).recipes[0];
    recipe.normalize();
    assert.lengthOf(recipe.slots, 2);
  });
  it('SLANDLES parses local slots with IDs', Flags.withPostSlandlesSyntax(async () => {
    const recipe = (await Manifest.parse(`
      particle P1 in 'some-particle.js'
        slotA: \`consumes Slot
          slotB: \`provides Slot
      particle P2 in 'some-particle.js'
        slotB: \`consumes Slot
      recipe
        slot0: \`slot 'rootslot-0'
        slot1: \`slot 'local-slot-0'
        P1
          slotA: \`consumes slot0
          slotB: \`provides slot1
        P2
          slotB: \`consumes slot1
    `)).recipes[0];
    recipe.normalize();
    assert.lengthOf(recipe.handles, 2);
  }));
  it('relies on the loader to combine paths', async () => {
    const registry = {};
    const loader = new class extends StubLoader {
      constructor() {
        super({
      'somewhere/a': `import 'path/b'`,
      'somewhere/a path/b': `recipe`
        });
      }
      path(fileName: string): string {
        return fileName;
      }
      join(path: string, file: string): string {
        return `${path} ${file}`;
      }
    }();

    const manifest = await Manifest.load('somewhere/a', loader, {registry});
    assert(registry['somewhere/a path/b']);
  });
  it('parses all particles manifests', async () => {
    const verifyParticleManifests = (particlePaths) => {
      let count = 0;
      particlePaths.forEach(particleManifestFile => {
        if (fs.existsSync(particleManifestFile)) {
          try {
            const data = fs.readFileSync(particleManifestFile, 'utf-8');
            const model = parse(data);
            assert.isDefined(model);
          } catch (e) {
            console.log(`Failed parsing ${particleManifestFile}`);
            throw e;
          }
          ++count;
        }
      });
      return count;
    };

    const shellParticlesPath = 'src/runtime/tests/artifacts/';
    let shellParticleNames = [];
    fs.readdirSync(shellParticlesPath).forEach(name => {
      const manifestFolderName = path.join(shellParticlesPath, name);
      if (fs.statSync(manifestFolderName).isDirectory()) {
        shellParticleNames = shellParticleNames.concat(
            fs.readdirSync(manifestFolderName)
                .filter(fileName => fileName.endsWith('.schema') || fileName.endsWith('.manifest') || fileName.endsWith('.recipes'))
                .map(fileName => path.join(manifestFolderName, fileName)));
      }
    });
    assert.isAbove(verifyParticleManifests(shellParticleNames), 0);
  });
  it('loads entities from json files', async () => {
    const manifestSource = `
        schema Thing
          Text someProp
        store Store0 of [Thing] in 'entities.json'`;
    const entitySource = JSON.stringify([
      {someProp: 'someValue'},
      {
        $id: 'entity-id',
        someProp: 'someValue2'
      },
    ]);
    const loader = new StubLoader({
      'the.manifest': manifestSource,
      'entities.json': entitySource,
    });
    const manifest = await Manifest.load('the.manifest', loader);
    const storageStub = manifest.findStoreByName('Store0');
    assert(storageStub);
    const store = await storageStub.activate();
    assert(store);
    const handle = await collectionHandleForTest(manifest, store.baseStore);

    const sessionId = manifest.idGeneratorForTesting.currentSessionIdForTesting;
    assert.deepEqual((await handle.toList()).map(Entity.serialize), [
      {
        id: `!${sessionId}:the.manifest::0`,
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        rawData: {someProp: 'someValue2'},
      }
    ]);
  });
  it('throws an error when a store has invalid json', async () => {
    try {
      const manifest = await Manifest.parse(`
      schema Thing
      resource EntityList
        start
        this is not json?

      store Store0 of [Thing] in EntityList`);
      assert(false);
    } catch (e) {
      assert.deepEqual(e.message, `Post-parse processing error caused by 'undefined' line 7.
Error parsing JSON from 'EntityList' (Unexpected token h in JSON at position 1)'
        store Store0 of [Thing] in EntityList
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
    }
  });
  it('loads entities from a resource section', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
        Text someProp

      resource EntityList
        start
        [
          {"someProp": "someValue"},
          {"$id": "entity-id", "someProp": "someValue2"}
        ]

      store Store0 of [Thing] in EntityList
    `, {fileName: 'the.manifest'});
    const store = (await manifest.findStoreByName('Store0').activate());
    assert(store);
    const handle = await collectionHandleForTest(manifest, store.baseStore);

    const sessionId = manifest.idGeneratorForTesting.currentSessionIdForTesting;

    // TODO(shans): address as part of storage refactor
    assert.deepEqual((await handle.toList()).map(Entity.serialize), [
      {
        id: `!${sessionId}:the.manifest::0`,
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        rawData: {someProp: 'someValue2'},
      }
    ]);
  });
  it('SLANDLES SYNTAX resolves store names to ids', Flags.withPostSlandlesSyntax(async () => {
    const manifestSource = `
        schema Thing
        store Store0 of [Thing] in 'entities.json'
        recipe
          myStore: map Store0`;
    const entitySource = JSON.stringify([]);
    const loader = new StubLoader({
      'the.manifest': manifestSource,
      'entities.json': entitySource,
    });
    const manifest = await Manifest.load('the.manifest', loader);
    const recipe = manifest.recipes[0];
    assert.deepEqual(recipe.toString(), 'recipe\n  myStore: map \'!manifest:the.manifest:store0:97d170e1550eee4afc0af065b78cda302a97674c\'');
  }));
  it('resolves store names to ids', Flags.withPreSlandlesSyntax(async () => {
    const manifestSource = `
        schema Thing
        store Store0 of [Thing] in 'entities.json'
        recipe
          map Store0 as myStore`;
    const entitySource = JSON.stringify([]);
    const loader = new StubLoader({
      'the.manifest': manifestSource,
      'entities.json': entitySource,
    });
    const manifest = await Manifest.load('the.manifest', loader);
    const recipe = manifest.recipes[0];
    assert.deepEqual(recipe.toString(), 'recipe\n  map \'!manifest:the.manifest:store0:97d170e1550eee4afc0af065b78cda302a97674c\' as myStore');
  }));
  it('has prettyish syntax errors', async () => {
    try {
      await Manifest.parse('recipe ?', {fileName: 'bad-file'});
      assert(false);
    } catch (e) {
      assert.deepEqual(e.message, `Parse error in 'bad-file' line 1.
Expected a verb (e.g. &Verb) or an uppercase identifier (e.g. Foo) but "?" found.
  recipe ?
         ^`);
    }
  });

  it('errors when the manifest connects a particle incorrectly', async () => {
    const manifest = `
        schema Thing
        particle TestParticle in 'tp.js'
          in Thing iny
          out Thing outy
          inout Thing inouty
        recipe
          create as x
          TestParticle
            iny -> x
            outy -> x
            inouty -> x`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      console.error(e.message);
      assert.match(e.message, /'out' not compatible with 'in' param of 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing particle param', async () => {
    const manifest = `
        schema Thing
        particle TestParticle in 'tp.js'
          in Thing a
        recipe
          create as x
          TestParticle
            a = x
            b = x`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      console.error(e.message);
      assert.match(e.message, /param 'b' is not defined by 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing consumed slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          consume root
        recipe
          TestParticle
            consume other`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /Consumed slot 'other' is not defined by 'TestParticle'/);
    }
  });
  it('SLANDLES errors when the manifest references a missing consumed slot', Flags.withPostSlandlesSyntax(async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: \`consumes Slot
        recipe
          TestParticle
            other: \`consumes`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'other' is not defined by 'TestParticle'/);
    }
  }));

  it('errors when the manifest references a missing provided slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          consume root
            provide action
        recipe
          TestParticle
            consume root
              provide noAction`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /Provided slot 'noAction' is not defined by 'TestParticle'/);
    }
  });
  it('SLANDLES errors when the manifest references a missing provided slot', Flags.withPostSlandlesSyntax(async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: \`consumes Slot
            action: \`provides Slot
        recipe
          TestParticle
            root: \`consumes
            noAction: \`provides`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'noAction' is not defined by 'TestParticle'/);
    }
  }));

  it('errors when the manifest uses invalid connection constraints', async () => {
    // nonexistent fromParticle
    const manifestFrom = `
        recipe
          NoParticle.paramA -> OtherParticle.paramB`;
    try {
      await Manifest.parse(manifestFrom);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /could not find particle 'NoParticle'/);
    }
    // nonexistent toParticle
    const manifestTo = `
        particle ParticleA
          in S {} paramA
        recipe
          ParticleA.paramA -> OtherParticle.paramB`;
    try {
      await Manifest.parse(manifestTo);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /could not find particle 'OtherParticle'/);
    }
    // nonexistent connection name in fromParticle
    const manifestFromParam = `
        particle ParticleA
        particle ParticleB
        recipe
          ParticleA.paramA -> ParticleB.paramB`;
    try {
      await Manifest.parse(manifestFromParam);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'paramA' is not defined by 'ParticleA'/);
    }
    // nonexistent connection name in toParticle
    const manifestToParam = `
        schema Thing
        particle ParticleA
          in Thing paramA
        particle ParticleB
        recipe
          ParticleA.paramA -> ParticleB.paramB`;
    try {
      await Manifest.parse(manifestToParam);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'paramB' is not defined by 'ParticleB'/);
    }
  });

  it('resolves manifest with recipe with search', async () => {
    // TODO: support search tokens in manifest-parser.peg
    const manifestSource = `
      recipe
        search \`Hello dear world\``;
    let recipe = (await Manifest.parse(manifestSource)).recipes[0];
    assert.isNotNull(recipe.search);
    let search = checkNotNull(recipe.search);
    assert.strictEqual('Hello dear world', search.phrase);
    assert.deepEqual(['hello', 'dear', 'world'], search.unresolvedTokens);
    assert.deepEqual([], search.resolvedTokens);
    assert.isTrue(search.isValid());
    recipe.normalize();
    search = checkNotNull(recipe.search);
    assert.isFalse(search.isResolved());
    assert.isFalse(recipe.isResolved());
    assert.strictEqual(recipe.toString(), `recipe`);
    assert.strictEqual(recipe.toString({showUnresolved: true}), `recipe
  search \`Hello dear world\`
    tokens \`dear\` \`hello\` \`world\` // unresolved search tokens`);

    recipe = (await Manifest.parse(manifestSource)).recipes[0];
    // resolve some tokens.
    search = checkNotNull(recipe.search);
    search.resolveToken('hello');
    search.resolveToken('world');
    assert.strictEqual('Hello dear world', search.phrase);
    assert.deepEqual(['dear'], search.unresolvedTokens);
    assert.deepEqual(['hello', 'world'], search.resolvedTokens);
    assert.strictEqual(recipe.toString(), `recipe`);
    assert.strictEqual(recipe.toString({showUnresolved: true}), `recipe
  search \`Hello dear world\`
    tokens \`dear\` // \`hello\` \`world\` // unresolved search tokens`);

    // resolve all tokens.
    search.resolveToken('dear');
    recipe.normalize();
    assert.strictEqual('Hello dear world', search.phrase);
    assert.deepEqual([], search.unresolvedTokens);
    assert.deepEqual(['dear', 'hello', 'world'], search.resolvedTokens);
    assert.isTrue(search.isResolved());
    assert.isTrue(recipe.isResolved());
    assert.strictEqual(recipe.toString(), `recipe`);
    assert.strictEqual(recipe.toString({showUnresolved: true}), `recipe
  search \`Hello dear world\`
    tokens // \`dear\` \`hello\` \`world\``);
  });

  it('merge recipes with search strings', async () => {
    const recipe1 = (await Manifest.parse(`recipe
  search \`Hello world\``)).recipes[0];
    const recipe2 = (await Manifest.parse(`recipe
  search \`good morning\`
    tokens \`morning\` // \`good\``)).recipes[0];

    recipe2.mergeInto(recipe1);
    const search = checkNotNull(recipe1.search);
    assert.strictEqual('Hello world good morning', search.phrase);
    assert.deepEqual(['hello', 'world', 'morning'], search.unresolvedTokens);
    assert.deepEqual(['good'], search.resolvedTokens);
  });
  it('can parse a manifest containing stores', async () => {
    const loader = new StubLoader({'*': '[]'});
    const manifest = await Manifest.parse(`
  schema Product
  store ClairesWishlist of [Product] #wishlist in 'wishlist.json'
    description \`Claire's wishlist\``, {loader});
    const verify = (manifest: Manifest) => {
      assert.lengthOf(manifest.stores, 1);
      assert.deepEqual(['wishlist'], manifest.storeTags.get(manifest.stores[0]));
    };
    verify(manifest);
    assert.strictEqual(manifest.stores[0].toManifestString(),
                 (await Manifest.parse(manifest.stores[0].toManifestString(), {loader})).toString());
    verify(await Manifest.parse(manifest.toString(), {loader}));
  });
  it('can parse a manifest containing resources', async () => {
    const manifest = await Manifest.parse(`
resource SomeName
  start
  {'foo': 'bar'}
  hello
`, {});
    assert.deepEqual(manifest.resources['SomeName'], `{'foo': 'bar'}\nhello\n`);
  });
  it('can parse a manifest containing incomplete interfaces', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
      interface FullInterface
        in Foo foo
        consume root
        provide action
      interface NoHandleName
        in Foo *
      interface NoHandleType
        inout foo
      interface NoHandleDirection
        Foo foo
      interface OnlyHandleDirection
        out *
      interface ManyHandles
        in Foo *
        out [~a] *
      interface ConsumeNoName
        consume
      interface ConsumeRequiredSetSlot
        must consume set of
        must provide
      interface OnlyProvideSlots
        provide action
    `);
    assert.lengthOf(manifest.interfaces, 9);
    assert(manifest.findInterfaceByName('FullInterface'));
  });
  it('can parse a manifest containing interfaces', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
      interface Bar
        in Foo foo
      particle HostingParticle
        host Bar iface0
      recipe
        create as handle0
        HostingParticle
          iface0 = handle0`);
    assert(manifest.findInterfaceByName('Bar'));
    assert(manifest.recipes[0].normalize());
  });
  it('can parse a manifest containing a warning', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text value
      particle Particle
        in Foo foo`);
    assert.equal(manifest.errors[0].severity, ErrorSeverity.Warning);
    assert.lengthOf(manifest.allParticles, 1);
  });
  it('can parse interfaces using new-style body syntax', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
      interface Bar
        in Foo foo
      particle HostingParticle
        host Bar iface0
      recipe
        create as handle0
        HostingParticle
          iface0 = handle0
    `);
    assert(manifest.findInterfaceByName('Bar'));
    assert(manifest.recipes[0].normalize());
  });
  it('can resolve optional handles', async () => {
    const manifest = await Manifest.parse(`
      schema Something
      particle Thing in 'thing.js'
        in [Something] inThing
        out? [Something] maybeOutThings
      recipe
        create as handle0 // [Something]
        Thing
          inThing <- handle0`);
    const verify = (manifest: Manifest) => {
      assert.isFalse(manifest.particles[0].handleConnections[0].isOptional);
      assert.isTrue(manifest.particles[0].handleConnections[1].isOptional);

      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can resolve an immediate handle specified by a particle target', async () => {
    const manifest = await Manifest.parse(`
      schema S
      interface HostedInterface
        in S foo

      particle Hosted
        in S foo
        in S bar

      particle Transformation &work in '...js'
        host HostedInterface hosted

      recipe
        Transformation
          hosted = Hosted`);
    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('can resolve a particle with an inline schema', async () => {
    const manifest = await Manifest.parse(`
      particle P
        in * {Text value} foo
      recipe
        create as h0
        P
          foo = h0
    `);
    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('SLANDLES SYNTAX can resolve a particle with a schema reference', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text far
      particle P
        bar: reads Bar {Reference<Foo> foo}
      recipe
        h0: create
        P
          bar: any h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = checkDefined(recipe.particles[0].connections.bar.type.getEntitySchema());
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  bar: reads Bar {Reference<Foo {Text far}> foo}
  modality dom`);
  }));
  it('can resolve a particle with a schema reference', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text far
      particle P
        in Bar {Reference<Foo> foo} bar
      recipe
        create as h0
        P
          bar = h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = checkDefined(recipe.particles[0].connections.bar.type.getEntitySchema());
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  in Bar {Reference<Foo {Text far}> foo} bar
  modality dom`);
  }));
  it('SLANDLES SYNTAX can resolve a particle with an inline schema reference', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
      particle P
        bar: reads Bar {Reference<Foo {Text far}> foo}
      recipe
        h0: create
        P
          bar: any h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  bar: reads Bar {Reference<Foo {Text far}> foo}
  modality dom`);
  }));
  it('can resolve a particle with an inline schema reference', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
      particle P
        in Bar {Reference<Foo {Text far}> foo} bar
      recipe
        create as h0
        P
          bar = h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  in Bar {Reference<Foo {Text far}> foo} bar
  modality dom`);
  }));
  it('SLANDLES SYNTAX can resolve a particle with a collection of schema references', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text far
      particle P
        bar: reads Bar {[Reference<Foo>] foo}
      recipe
        h0: create
        P
          bar: any h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  bar: reads Bar {[Reference<Foo {Text far}>] foo}
  modality dom`);
  }));
  it('can resolve a particle with a collection of schema references', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text far
      particle P
        in Bar {[Reference<Foo>] foo} bar
      recipe
        create as h0
        P
          bar = h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  in Bar {[Reference<Foo {Text far}>] foo} bar
  modality dom`);
  }));
  it('SLANDLES SYNTAX can resolve a particle with a collection of inline schema references', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P
        bar: reads Bar {[Reference<Foo {Text far}>] foo}
      recipe
        h0: create
        P
          bar: any h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  bar: reads Bar {[Reference<Foo {Text far}>] foo}
  modality dom`);
  }));
  it('can resolve a particle with a collection of inline schema references', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P
        in Bar {[Reference<Foo {Text far}>] foo} bar
      recipe
        create as h0
        P
          bar = h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P in 'null'
  in Bar {[Reference<Foo {Text far}>] foo} bar
  modality dom`);
  }));
  it('can resolve inline schemas against out of line schemas', async () => {
    const manifest = await Manifest.parse(`
      schema T
        Text value
      particle P
        in * {Text value} foo
      particle P2
        out T foo

      recipe
        create as h0
        P
          foo = h0
        P2
          foo = h0
    `);
    const [validRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });
  it('can resolve handle types from inline schemas', async () => {
    const manifest = await Manifest.parse(`
      particle P
        in * {Text value} foo
      particle P2
        in * {Text value, Text value2} foo
      particle P3
        in * {Text value, Text value3} foo
      particle P4
        in * {Text value, Number value2} foo

      recipe
        create as h0
        P
          foo = h0
        P2
          foo = h0

      recipe
        create as h0
        P2
          foo = h0
        P3
          foo = h0

      recipe
        create as h0
        P2
          foo = h0
        P4
          foo = h0
    `);
    const [validRecipe, suspiciouslyValidRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
    // Although suspicious, this is valid because entities in the
    // created handle just need to be able to be read as {Text value, Text value2}
    // and {Text value, Text value3}. Hence, the recipe is valid and the type
    // of the handle is * {Text value, Text value2, Text value3};
    assert(suspiciouslyValidRecipe.normalize());
    const suspiciouslyValidFields =
        suspiciouslyValidRecipe.handles[0].type.canWriteSuperset.getEntitySchema().fields;
    verifyPrimitiveType(suspiciouslyValidFields.value, 'Text');
    verifyPrimitiveType(suspiciouslyValidFields.value2, 'Text');
    verifyPrimitiveType(suspiciouslyValidFields.value3, 'Text');
    assert(!invalidRecipe.normalize());
  });

  it('can infer field types of inline schemas from external schemas', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
        Text value
      particle P
        in Thing {value} foo
      particle P2
        in * {Text value} foo

      recipe
        create as h0
        P
          foo = h0
        P2
          foo = h0
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('supports inline schemas with multiple names', async () => {
    const manifest = await Manifest.parse(`
      schema Thing1
        Text value1
      schema Thing2
        Number value2
      particle P
        in Thing1 Thing2 {value1, value2} foo
      particle P2
        in * {Text value1, Number value2} foo

      recipe
        create as h0
        P
          foo = h0
        P2
          foo = h0
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can parse a manifest with storage key handle definitions', async () => {
    const manifest = await Manifest.parse(`
      schema Bar
        Text value

      particle P
        in Bar foo

      store Foo of Bar 'test' @0 at 'firebase://testing'

      recipe
        map Foo as myHandle
        P
          foo = myHandle
    `);
    const [validRecipe] = manifest.recipes;
    assert.isTrue(validRecipe.normalize());
    assert.isTrue(validRecipe.isResolved());
    assert.strictEqual(manifest.stores[0].toManifestString(),
                 (await Manifest.parse(manifest.stores[0].toManifestString())).toString());
  });

  it('can process a schema alias', async () => {
    const manifest = await Manifest.parse(`
      alias schema This That as SchemaAlias
      alias schema * extends SchemaAlias as Extended
    `);
    assert.isNotNull(manifest.findSchemaByName('SchemaAlias'));
    assert.sameMembers(manifest.findSchemaByName('Extended').names, ['This', 'That']);
  });

  it('expands schema aliases', async () => {
    const manifest = await Manifest.parse(`
      alias schema Name1 as Thing1
        Text field1
      alias schema Name2 as Thing2
        Text field2
      particle P in 'p.js'
        in Thing1 Thing2 Name3 {Text field1, Text field3} param
    `);
    const paramSchema = checkNotNull(manifest.findParticleByName('P').inputs[0].type.getEntitySchema());
    assert.sameMembers(paramSchema.names, ['Name1', 'Name2', 'Name3']);
    assert.sameMembers(Object.keys(paramSchema.fields), ['field1', 'field2', 'field3']);
  });

  it('fails when expanding conflicting schema aliases', async () => {
    try {
      const manifest = await Manifest.parse(`
        alias schema Name1 as Thing1
          Text field1
        alias schema Name2 as Thing2
          Number field1
        particle P in 'p.js'
          in Thing1 Thing2 {} param
      `);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'Could not merge schema aliases');
    }
  });

  it('fails when inline schema specifies a field type that does not match alias expansion', async () => {
    try {
      const manifest = await Manifest.parse(`
        alias schema Name1 as Thing1
          Text field1
        particle P in 'p.js'
          in Thing1 {Number field1} param
      `);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'does not match schema');
    }
  });

  it('can relate inline schemas to generic connections', async () => {
    const manifest = await Manifest.parse(`
      schema Thing
        Text value
        Number num

      particle P
        in ~a with Thing {value} inThing
        out ~a outThing

      resource Things
        start
        []

      store ThingStore of Thing in Things

      recipe
        map ThingStore as input
        create as output
        P
          inThing = input
          outThing = output
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can parse a recipe with slot constraints on verbs', async () => {
    const manifest = await Manifest.parse(`
      recipe
        &verb
          consume consumeSlot
            provide provideSlot
    `);

    const recipe = manifest.recipes[0];
    assert(recipe.normalize());

    assert.strictEqual(recipe.particles[0].primaryVerb, 'verb');
    assert.isUndefined(recipe.particles[0].spec);
    const slotConnection = recipe.particles[0].getSlotConnectionByName('consumeSlot');
    assert(slotConnection.providedSlots.provideSlot);
    assert.strictEqual(slotConnection.providedSlots.provideSlot.sourceConnection, slotConnection);
  });

  it('SLANDLES can parse a recipe with slot constraints on verbs', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      recipe
        provideSlot: \`slot
        &verb
          foo: \`consumes provideSlot
    `);

    const recipe = manifest.recipes[0];

    assert.strictEqual(recipe.particles[0].primaryVerb, 'verb');
    assert.isUndefined(recipe.particles[0].spec);
    const slotConnection = recipe.particles[0].connections.foo;
    // TODO(jopra): Internalize new direction names
    assert.strictEqual(slotConnection.direction, '`consume');

    assert.lengthOf(recipe.handles, 1);
    assert.lengthOf(recipe.handles[0].connections, 1);
    assert.strictEqual(recipe.handles[0].connections[0], slotConnection);
  }));

  it('can parse particle arguments with tags', async () => {
    const manifest = await Manifest.parse(`
      schema Dog
      schema Sled
      schema DogSled
      particle DogSledMaker in 'thing.js'
        in Dog leader #leader
        in [Dog] team
        in Sled sled #dogsled
        out DogSled dogsled #multidog #winter #sled
    `);

    assert.strictEqual(manifest.particles.length, 1);
    assert.strictEqual(manifest.particles[0].handleConnections.length, 4);

    const connections = manifest.particles[0].handleConnections;
    assert.strictEqual(connections[0].name, 'leader');
    assert.deepEqual(connections[0].tags, ['leader']);

    assert.strictEqual(connections[1].name, 'team');
    assert.strictEqual(connections[1].tags.length, 0);

    assert.strictEqual(connections[2].name, 'sled');
    assert.deepEqual(connections[2].tags, ['dogsled']);

    assert.strictEqual(connections[3].name, 'dogsled');
    assert.deepEqual(connections[3].tags, ['multidog', 'winter', 'sled']);
  });

  it('SLANDLES SYNTAX can round-trip particles with tags', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  modality dom
  thing: consumes Slot #main #tagname
    otherThing: provides Slot #testtag`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('can round-trip particles with tags', Flags.withPreSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  in [Product {}] input
    out [Product {}] output
  modality dom
  consume thing #main #tagname
    provide otherThing #testtag`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));

  it('SLANDLES SYNTAX can round-trip particles with fields', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thingy: reads ~a
  modality dom
  thing: consumes Slot {formFactor: big} #main #tagname
    otherThing: provides Slot {handle: thingy} #testtag`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('can round-trip particles with fields', Flags.withPreSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  in [Product {}] input
    out [Product {}] output
  in ~a thingy
  modality dom
  must consume thing #main #tagname
    formFactor big
    must provide otherThing #testtag
      handle thingy`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('SLANDLES can round-trip particles with tags', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thing: \`consumes Slot {formFactor:big} #main #tagname
    otherThing: \`provides Slot {handle:thingy} #testtag
  modality dom`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('SLANDLES can round-trip particles with fields', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thingy: reads ~a
  thing: \`consumes Slot {formFactor:big} #main #tagname
    otherThing: \`provides Slot {handle:thingy} #testtag
  modality dom`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));
  it('SLANDLES can round-trip particles with fields', Flags.withPostSlandlesSyntax(async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thing: \`consumes Slot {formFactor:big}
    otherThing: \`provides Slot {handle:thingy}
  modality dom`;

    const manifest = await Manifest.parse(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  }));

  it('can parse recipes with an implicit create handle', async () => {
    const manifest = await Manifest.parse(`
      particle A
        out S {} a
      particle B
        in S {} b

      recipe
        A
          a -> h0
        B
          b <- h0
    `);

    const recipe = manifest.recipes[0];
    assert.strictEqual(recipe.particles[0].connections.a.handle, recipe.particles[1].connections.b.handle);
  });

  it('SLANDLES SYNTAX can parse recipes with a require section', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P1
        a: writes S {}
        root: consumes
          details: provides
      particle P2
        b: reads S {}
          details: consumes

      recipe
        require
          handle as h0
          s0: slot
          P1
            writes h0
            root: consumes
              details: provides s0
          P2
            reads h0
            details: consumes s0
        P1
    `);
    const recipe = manifest.recipes[0];
    assert(recipe.requires.length === 1, 'could not parse require section');
  }));
  it('can parse recipes with a require section', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P1
        out S {} a
        consume root
          provide details
      particle P2
        in S {} b
          consume details

      recipe
        require
          handle as h0
          slot as s0
          P1
            * -> h0
            consume root
              provide details as s0
          P2
            * <- h0
            consume details
        P1
    `);
    const recipe = manifest.recipes[0];
    assert(recipe.requires.length === 1, 'could not parse require section');
  }));

  it('recipe resolution checks the require sections', async () => {
    const manifest = await Manifest.parse(`

      particle A
        in S {} input
      particle B
        out S {} output

      recipe
        require
          A
          B
    `);
    const recipe = manifest.recipes[0];
    recipe.normalize();
    assert.isFalse(recipe.isResolved(), 'recipe with a require section is resolved');
  });

  describe('trust claims and checks', () => {
    it('supports multiple claim statements', async () => {
      const manifest = await Manifest.parse(`
        particle A
          out T {} output1
          out T {} output2
          claim output1 is property1
          claim output2 is property2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustChecks);
      assert.lengthOf(particle.trustClaims, 2);

      const claim1 = particle.trustClaims.find(claim => claim.handle.name === 'output1');
      assert.isNotNull(claim1);
      assert.strictEqual((claim1.claims[0] as ClaimIsTag).tag, 'property1');

      const claim2 = particle.trustClaims.find(claim => claim.handle.name === 'output2');
      assert.isNotNull(claim2);
      assert.strictEqual((claim2.claims[0] as ClaimIsTag).tag, 'property2');
    });

    it('supports claim statement with multiple tags', async () => {
      const manifest = await Manifest.parse(`
        particle A
          out T {} output1
          claim output1 is property1 and is property2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustChecks);
      assert.lengthOf(particle.trustClaims, 1);

      const claim = particle.trustClaims.find(claim => claim.handle.name === 'output1');
      assert.isNotNull(claim);
      assert.sameMembers((claim.claims as ClaimIsTag[]).map(claim => claim.tag), ['property1', 'property2']);
    });

    it('supports "is not" tag claims', async () => {
      const manifest = await Manifest.parse(`
        particle A
          out T {} output1
          out T {} output2
          claim output1 is not property1
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustChecks);
      assert.strictEqual(particle.trustClaims.length, 1);

      const claim1 = particle.trustClaims.find(claim => claim.handle.name === 'output1');
      assert.isNotNull(claim1);
      assert.strictEqual((claim1.claims[0] as ClaimIsTag).isNot, true);
      assert.strictEqual((claim1.claims[0] as ClaimIsTag).tag, 'property1');
     });

    it('supports "derives from" claims with multiple parents', async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input1
          in T {} input2
          out T {} output
          claim output derives from input1 and derives from input2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustChecks);
      assert.strictEqual(particle.trustClaims.length, 1);

      const claim = particle.trustClaims.find(claim => claim.handle.name === 'output');
      assert.isNotNull(claim);
      assert.sameMembers((claim.claims as ClaimDerivesFrom[]).map(claim => claim.parentHandle.name), ['input1', 'input2']);
    });

    it('supports mixed claims with multiple tags, not tags, and "derives from"', async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input1
          in T {} input2
          out T {} output1
          claim output1 is property1 and is property2 and derives from input1 and is not property3 and derives from input2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustChecks);
      assert.lengthOf(particle.trustClaims, 1);

      const claim = particle.trustClaims.find(claim => claim.handle.name === 'output1');
      assert.isNotNull(claim);
      assert.lengthOf(claim.claims, 5);
      const tagClaims = claim.claims.filter(claim => claim.type === ClaimType.IsTag) as ClaimIsTag[];
      assert.lengthOf(tagClaims, 3);
      const notClaims = tagClaims.filter(claim => claim.isNot === true);
      assert.lengthOf(notClaims, 1);
      assert.strictEqual(notClaims[0].tag, 'property3');
      const derivesClaims = claim.claims.filter(claim => claim.type === ClaimType.DerivesFrom) as ClaimDerivesFrom[];
      assert.lengthOf(derivesClaims, 2);
      assert.sameMembers(derivesClaims.map(claim => claim.parentHandle.name), ['input1', 'input2']);
    });

    it('supports multiple check statements', async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input1
          in T {} input2
          check input1 is property1
          check input2 is not property2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 2);

      const check1 = checkDefined(particle.trustChecks[0]);
      assert.strictEqual(check1.toManifestString(), 'check input1 is property1');
      assert.strictEqual(check1.target.name, 'input1');
      assert.deepEqual(check1.expression, new CheckHasTag('property1', /* isNot= */ false));

      const check2 = checkDefined(particle.trustChecks[1]);
      assert.strictEqual(check2.toManifestString(), 'check input2 is not property2');
      assert.strictEqual(check2.target.name, 'input2');
      assert.deepEqual(check2.expression, new CheckHasTag('property2', /* isNot= */ true));
    });

    it(`supports 'is from store' checks`, async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input1
          in T {} input2
          check input1 is from store MyStore
          check input2 is not from store 'my-store-id'
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 2);

      const check1 = checkDefined(particle.trustChecks[0]);
      assert.strictEqual(check1.toManifestString(), 'check input1 is from store MyStore');
      assert.strictEqual(check1.target.name, 'input1');
      assert.deepEqual(check1.expression, new CheckIsFromStore({type: 'name', store: 'MyStore'}, /* isNot= */ false));

      const check2 = checkDefined(particle.trustChecks[1]);
      assert.strictEqual(check2.toManifestString(), `check input2 is not from store 'my-store-id'`);
      assert.strictEqual(check2.target.name, 'input2');
      assert.deepEqual(check2.expression, new CheckIsFromStore({type: 'id', store: 'my-store-id'}, /* isNot= */ true));
    });

    it(`supports 'is from output' checks`, async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input1
          in T {} input2
          out T {} output1
          out T {} output2
          check input1 is from output output1
          check input2 is not from output output2
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 2);

      const check1 = checkDefined(particle.trustChecks[0]);
      assert.strictEqual(check1.toManifestString(), 'check input1 is from output output1');
      assert.strictEqual(check1.target.name, 'input1');

      const check2 = checkDefined(particle.trustChecks[1]);
      assert.strictEqual(check2.toManifestString(), 'check input2 is not from output output2');
      assert.strictEqual(check2.target.name, 'input2');
      assert.isTrue((check2.expression as CheckCondition).isNot);
    });

    it('supports checks on provided slots', async () => {
      const manifest = await Manifest.parse(`
        particle A
          consume root
            provide mySlot
            check mySlot data is trusted
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 1);

      const check = particle.trustChecks[0];
      assert.strictEqual(check.toManifestString(), 'check mySlot data is trusted');
      assert.isTrue(check.target instanceof ProvideSlotConnectionSpec);
      assert.strictEqual(check.target.name, 'mySlot');
      assert.deepEqual(check.expression, new CheckHasTag('trusted', /* isNot= */ false));
    });

    it(`supports checks with the 'or' operation`, async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input
          check input is property1 or is not property2 or is property3
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 1);

      const check = checkDefined(particle.trustChecks[0]);
      assert.strictEqual(check.toManifestString(), 'check input is property1 or is not property2 or is property3');
      assert.strictEqual(check.target.name, 'input');
      assert.deepEqual(check.expression, new CheckBooleanExpression('or', [
        new CheckHasTag('property1', /* isNot= */ false),
        new CheckHasTag('property2', /* isNot= */ true),
        new CheckHasTag('property3', /* isNot= */ false),
      ]));
    });

    it(`supports checks with the 'and' operation`, async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input
          check input is property1 and is not property2 and is property3
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 1);

      const check = particle.trustChecks[0];
      assert.strictEqual(check.toManifestString(), 'check input is property1 and is not property2 and is property3');
      assert.strictEqual(check.target.name, 'input');
      assert.deepEqual(check.expression, new CheckBooleanExpression('and', [
        new CheckHasTag('property1', /* isNot= */ false),
        new CheckHasTag('property2', /* isNot= */ true),
        new CheckHasTag('property3', /* isNot= */ false),
      ]));
    });

    it(`supports arbitrary nesting of 'and' and 'or' operations and conditions`, async () => {
      const manifest = await Manifest.parse(`
        particle A
          in T {} input
          check input (is property1 and ((is not property2))) or ((is property2) or is not property3)
      `);
      assert.lengthOf(manifest.particles, 1);
      const particle = manifest.particles[0];
      assert.isEmpty(particle.trustClaims);
      assert.lengthOf(particle.trustChecks, 1);

      const check = particle.trustChecks[0];
      assert.strictEqual(check.toManifestString(), 'check input (is property1 and is not property2) or (is property2 or is not property3)');
      assert.strictEqual(check.target.name, 'input');
      assert.deepEqual(
        check.expression,
        new CheckBooleanExpression('or', [
          new CheckBooleanExpression('and', [
            new CheckHasTag('property1', /* isNot= */ false),
            new CheckHasTag('property2', /* isNot= */ true),
          ]),
          new CheckBooleanExpression('or', [
            new CheckHasTag('property2', /* isNot= */ false),
            new CheckHasTag('property3', /* isNot= */ true),
          ]),
        ]));
    });

    it('data stores can make claims', async () => {
      const manifest = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
          claim is property1 and is property2
        resource NobIdJson
          start
          [{"nobId": "12345"}]
      `);
      assert.lengthOf(manifest.stores, 1);
      const store = manifest.stores[0];
      assert.lengthOf(store.claims, 2);
      assert.strictEqual(store.claims[0].tag, 'property1');
      assert.strictEqual(store.claims[1].tag, 'property2');

      assert.include(manifest.toString(), '  claim is property1 and is property2');
    });

    it(`SLANDLES SYNTAX doesn't allow mixing 'and' and 'or' operations without nesting`, Flags.withPostSlandlesSyntax(async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          input: reads T {}
          check input is property1 or is property2 and is property3
      `), `You cannot combine 'and' and 'or' operations in a single check expression.`);
    }));

    it(`doesn't allow mixing 'and' and 'or' operations without nesting`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          in T {} input
          check input is property1 or is property2 and is property3
      `), `You cannot combine 'and' and 'or' operations in a single check expression.`);
    });

    it('SLANDLES can round-trip particles with checks and claims', Flags.withPostSlandlesSyntax(async () => {
      const manifestString = `particle TestParticle in 'a.js'
  input1: reads T {}
  input2: reads T {}
  input3: reads T {}
  input4: reads T {}
  output1: writes T {}
  output2: writes T {}
  output3: writes T {}
  parentSlot: \`consumes Slot
    childSlot: \`provides Slot
  claim output1 is trusted
  claim output2 derives from input2 and derives from input2
  claim output3 is not dangerous
  check input1 is trusted or is from handle input2
  check input2 is not extraTrusted
  check input3 is from store MyStore
  check input4 is not from store 'my-store-id'
  check childSlot is not somewhatTrusted
  modality dom`;

      const manifest = await Manifest.parse(manifestString);
      assert.strictEqual(manifest.toString(), manifestString);
    }));
    it('can round-trip particles with checks and claims', Flags.withPreSlandlesSyntax(async () => {
      const manifestString = `particle TestParticle in 'a.js'
  in T {} input1
  in T {} input2
  in T {} input3
  in T {} input4
  out T {} output1
  out T {} output2
  out T {} output3
  claim output1 is trusted
  claim output2 derives from input2 and derives from input2
  claim output3 is not dangerous
  check input1 is trusted or is from handle input2
  check input2 is not extraTrusted
  check input3 is from store MyStore
  check input4 is not from store 'my-store-id'
  check childSlot data is not somewhatTrusted
  modality dom
  consume parentSlot
    provide childSlot`;

      const manifest = await Manifest.parse(manifestString);
      assert.strictEqual(manifest.toString(), manifestString);
    }));

    it('fails for unknown handle names', async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          out T {} output
          claim oops is trusted
      `), `Can't make a claim on unknown handle oops`);

      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          in T {} input
          check oops is trusted
      `), `Can't make a check on unknown handle oops`);
    });

    it(`doesn't allow claims on inputs`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          in T {} foo
          claim foo is trusted
      `), `Can't make a claim on handle foo (not an output handle)`);
    });

    it(`doesn't allow checks on outputs`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          out T {} foo
          check foo is trusted
      `), `Can't make a check on handle foo with direction out (not an input handle)`);
    });

    it(`doesn't allow multiple different claims for the same output`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          out T {} foo
          claim foo is trusted
          claim foo is trusted
      `), `Can't make multiple claims on the same output (foo)`);
    });

    it(`doesn't allow multiple different checks for the same input`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          in T {} foo
          check foo is trusted
          check foo is trusted
      `), `Can't make multiple checks on the same input (foo)`);
    });

    it(`doesn't allow checks on consumed slots`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          consume someOtherSlot
            provide mySlot
          check someOtherSlot data is trusted
      `), `Slot someOtherSlot is a consumed slot. Can only make checks on provided slots`);
    });

    it(`doesn't allow checks on unknown slots`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          consume someOtherSlot
            provide mySlot
          check missingSlot data is trusted
      `), `Can't make a check on unknown slot missingSlot`);
    });

    it(`doesn't allow multiple provided slots with the same name`, async () => {
      assertThrowsAsync(async () => await Manifest.parse(`
        particle A
          consume firstSlot
            provide mySlot
          consume secondSlot
            provide mySlot
      `), `Another slot with name 'mySlot' has already been provided by this particle`);
    });
  });

  describe('all schemas', () => {
    describe('handles manifests with no schemas', () => {
      it('handles an empty manifest', async () => {
        const emptyManifest = await Manifest.parse(`
        `);
        const emptyResult = emptyManifest.allSchemas;
        assert.isEmpty(emptyResult);
      });
      it('handles a non-empty manifest', async () => {
        const manifest = await Manifest.parse(`
          particle A
          recipe Foo
            A
        `);
        const result = manifest.allSchemas;
        assert.isEmpty(result);
      });
    });
    describe('handles manifests with simple schemas', () => {
      it('handles a schema with no fields', async () => {
        const manifest = await Manifest.parse(`
          schema Foo
          particle Bar
            recipe Food
              Bar
        `);
        const result = manifest.allSchemas;
        assert.lengthOf(result, 1);
        assert.isEmpty(result[0].fields);
        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Foo']);

      });
      it('handles a schema with fields', async () => {
        const manifest = await Manifest.parse(`
        schema Foo
          Text a
          Number b
          Boolean c
        particle Bar
          recipe Food
            Bar
        `);
        const result = manifest.allSchemas;
        assert.lengthOf(result, 1);
        assert.isDefined(result[0].fields.a);
        assert.isDefined(result[0].fields.b);
        assert.isDefined(result[0].fields.c);
        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Foo']);
      });
      it('handles schemas with no fields', async () => {
        const manifest = await Manifest.parse(`
          schema Foo
          schema Boo
          schema Roo
          particle Bar
            recipe Food
              Bar
        `);
        const result = manifest.allSchemas;
        assert.lengthOf(result, 3);
        assert.isEmpty(result[0].fields);
        assert.isEmpty(result[1].fields);
        assert.isEmpty(result[2].fields);
      });
      it('handles multiple schemas with fields', async () => {
        const manifest = await Manifest.parse(`
        schema Foo
          Text a
        schema Boo
          Number b
          Boolean c
        schema Roo
          URL d
        schema Goo
          Text e
          Text f
        particle Bar
          recipe Food
            Bar
        `);
        const result = manifest.allSchemas;
        assert.lengthOf(result, 4);

        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Foo']);
        assert.lengthOf(Object.keys(result[0].fields), 1);
        assert.isDefined(result[0].fields.a);

        assert.lengthOf(result[1].names, 1);
        assert.deepEqual(result[1].names, ['Boo']);
        assert.lengthOf(Object.keys(result[1].fields), 2);
        assert.isDefined(result[1].fields.b);
        assert.isDefined(result[1].fields.c);

        assert.lengthOf(result[2].names, 1);
        assert.deepEqual(result[2].names, ['Roo']);
        assert.lengthOf(Object.keys(result[2].fields), 1);
        assert.isDefined(result[2].fields.d);

        assert.lengthOf(result[3].names, 1);
        assert.deepEqual(result[3].names, ['Goo']);
        assert.lengthOf(Object.keys(result[3].fields), 2);
        assert.isDefined(result[3].fields.e);
        assert.isDefined(result[3].fields.f);
      });
    });
    describe('handles manifests with external stores of defined schemas', () => {
      it('handles a simple external store of a schema', async () => {
        const manifestStr = `
        schema Foo
          Text name
          Number age

        store FooStore of Foo in 'b'

        particle Bar
          recipe Food
            Bar`;
        const jsonStr = `
        [
          {
              "name": "Jack",
              "age": 7
          }
        ]`;
        const loader = new StubLoader({
            'a': manifestStr,
            'b': jsonStr,
        });
        const manifest = await Manifest.load('a', loader);
        const result = manifest.allSchemas;
        assert.lengthOf(result, 1);
        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Foo']);
        assert.lengthOf(Object.keys(result[0].fields), 2);
        assert.isDefined(result[0].fields.name);
        assert.isDefined(result[0].fields.age);
      });
      it('handles multiple schemas with internal and external stores and passing them via handles', async () => {
        const manifestStr = `
        schema Data
          Number num
          Text txt
          URL lnk
          Boolean flg

        resource DataResource
          start
          [
            {"num": 73, "txt": "abc", "lnk": "http://xyz", "flg": true}
          ]
        store DataStore of Data in DataResource


        schema Info
          Text for
          Number val

        store InfoStore of [Info] in 'b'


        particle TestParticle
          consume root
          inout Data data
          out Data res
          inout [Info] info

        recipe KotlinTestRecipe
          copy DataStore as h1
          create as h2
          copy InfoStore as h3
          TestParticle
            data <- h1
            res -> h2
            info = h3


        particle ServiceParticle
          consume root

        recipe ServicesAPI
          ServiceParticle
        `;
        const jsonStr = `
        [
            {"for": "xx", "val": -5.8},
            {"val": 107},
            {"for": "yy"}
        ]`;
        const loader = new StubLoader({
            'a': manifestStr,
            'b': jsonStr,
        });
        const manifest = await Manifest.load('a', loader);
        const result = manifest.allSchemas;
        assert.equal(result.length, 2);

        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Data']);
        assert.lengthOf(Object.keys(result[0].fields), 4);
        assert.isDefined(result[0].fields.num);
        assert.isDefined(result[0].fields.txt);
        assert.isDefined(result[0].fields.lnk);
        assert.isDefined(result[0].fields.flg);

        assert.lengthOf(result[1].names, 1);
        assert.deepEqual(result[1].names, ['Info']);
        assert.lengthOf(Object.keys(result[1].fields), 2);
        assert.isDefined(result[1].fields.for);
        assert.isDefined(result[1].fields.val);
      });
    });
  });
  it('warns about using external schemas', async () => {
    const manifest = await Manifest.parse(`
schema Thing
  Text value

particle A
  in Thing thing
    `);
    assert.lengthOf(manifest.errors, 1);
    assert.equal(manifest.errors[0].key, 'externalSchemas');
  });
});

describe('Manifest storage migration', () => {
  async function parseStoreFromManifest() {
    const manifest = await Manifest.parse(`
store NobId of NobIdStore {Text nobId} in NobIdJson
resource NobIdJson
  start
  [{"nobId": "12345"}]
    `);
    assert.lengthOf(manifest.stores, 1);
    return manifest.stores[0];
  }

  afterEach(() => {
    Flags.reset();
  });

  it('works with new storage stack', async () => {
    Flags.useNewStorageStack = true;
    const store = await parseStoreFromManifest();

    assert.instanceOf(store, Store);
    assert.strictEqual(store.name, 'NobId');
    assert.instanceOf(store.storageKey, RamDiskStorageKey);
    const schema = store.type.getEntitySchema();
    assert.sameMembers(schema.names, ['NobIdStore']);
  });

  it('works with old storage stack', async () => {
    Flags.useNewStorageStack = false;
    const store = await parseStoreFromManifest();

    assert.instanceOf(store, StorageStub);
    assert.strictEqual(store.name, 'NobId');
    assert.typeOf(store.storageKey, 'string');
    assert.isTrue((store.storageKey as string).startsWith('volatile://'));
    const schema = store.type.getEntitySchema();
    assert.sameMembers(schema.names, ['NobIdStore']);
  });
});
