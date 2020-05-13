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
import {Manifest, ManifestParseOptions, ErrorSeverity} from '../manifest.js';
import {checkDefined, checkNotNull} from '../testing/preconditions.js';
import {Loader} from '../../platform/loader.js';
import {Dictionary} from '../hot.js';
import {assertThrowsAsync, ConCap} from '../../testing/test-util.js';
import {ClaimType, ClaimIsTag, ClaimDerivesFrom} from '../particle-claim.js';
import {CheckHasTag, CheckBooleanExpression, CheckCondition, CheckIsFromStore} from '../particle-check.js';
import {ProvideSlotConnectionSpec} from '../particle-spec.js';
import {Schema} from '../schema.js';
import {Store} from '../storageNG/store.js';
import {Entity} from '../entity.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {digest} from '../../platform/digest-web.js';
import {DriverFactory} from '../storageNG/drivers/driver-factory.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {FirebaseStorageDriverProvider} from '../storageNG/drivers/firebase.js';
import {Runtime} from '../runtime.js';
import {BinaryExpression, FieldNamePrimitive, NumberPrimitive} from '../refiner.js';
import {mockFirebaseStorageKeyOptions} from '../storageNG/testing/mock-firebase.js';
import {Flags} from '../flags.js';
import {TupleType, CollectionType, EntityType} from '../type.js';
import {ActiveCollectionEntityStore, handleForActiveStore} from '../storageNG/storage-ng.js';

function verifyPrimitiveType(field, type) {
  const copy = {...field};
  delete copy.location;
  assert.deepEqual(copy, {kind: 'schema-primitive', refinement: null, type});
}

describe('manifest', async () => {

  let memoryProvider;
  beforeEach(() => {
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  const parseManifest = async (content: string, options: ManifestParseOptions = {memoryProvider}): Promise<Manifest> => {
    return Manifest.parse(content, options);
  };

  it('can parse a manifest containing a recipe', async () => {
    const manifest = await parseManifest(`
      schema S
        t: Text

        description \`one-s\`
          plural \`many-ses\`
          value \`s:\${t}\`
      particle SomeParticle &work in 'some-particle.js'
        someParam: writes S

      recipe SomeRecipe &someVerb1 &someVerb2
        map #someHandle
        handle0: create #newHandle
        SomeParticle
          someParam: writes #tag
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
    verify(await parseManifest(manifest.toString()));
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
    const manifest = await parseManifest(`
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
    verify(await parseManifest(manifest.toString()));
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
    const manifest = await parseManifest(`
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
    verify(await parseManifest(manifest.toString()));
  });
  it('can parse a manifest containing a particle with an argument list', async () => {
    const manifest = await parseManifest(`
    particle TestParticle in 'a.js'
      list: reads [Product {}]
      person: writes Person {}
      thing: consumes
        otherThing: provides
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 2);
  });
  it('SLANDLES can parse a manifest containing a particle with an argument list', async () => {
    const manifest = await parseManifest(`
    particle TestParticle in 'a.js'
      list: reads [Product {}]
      person: writes Person {}
      thing: \`consumes Slot
        otherThing: \`provides Slot
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 4);
  });
  it('can parse a manifest with dependent handles', async () => {
    const manifest = await parseManifest(`
    particle TestParticle in 'a.js'
      input: reads [Product {}]
        output: writes [Product {}]
      thing: consumes
        otherThing: provides
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 2);
  });
  it('SLANDLES can parse a manifest with dependent handles', async () => {
    const manifest = await parseManifest(`
    particle TestParticle in 'a.js'
      input: reads [Product {}]
        output: writes [Product {}]
      thing: \`consumes Slot
        otherThing: \`provides Slot
    `);
    assert.lengthOf(manifest.particles, 1);
    assert.lengthOf(manifest.particles[0].handleConnections, 4);
  });
  it('can round-trip particles with dependent handles', async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  modality dom
  thing: consumes Slot
    otherThing: provides? Slot`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  });
  it('SLANDLES can round-trip particles with dependent handles', async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thing: \`consumes? Slot
    otherThing: \`provides? Slot
  modality dom`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  });
  it('can parse a manifest containing a schema', async () => {
    const manifest = await parseManifest(`
      schema Bar
        value: Text`);
    const verify = (manifest: Manifest) => verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('can parse a manifest containing an extended schema', async () => {
    const manifest = await parseManifest(`
      schema Foo
        value: Text
      schema Bar extends Foo`);
    const verify = (manifest: Manifest) => verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('can parse a manifest containing an inline schema', async () => {
    const manifest = await parseManifest(`
      schema Foo
        value: Text
      particle Fooer
        foo: reads Foo {value}`);
    const verify = (manifest: Manifest) => verifyPrimitiveType(manifest.schemas.Foo.fields.value, 'Text');
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('can parse a manifest containing an inline schema with line breaks and a trailing comma', async () => {
    const manifest = await parseManifest(`
      particle Fooer
        foo: reads Foo {
          // Comments can go here
          value: Text,
          other: Number, // Or here.
        }
    `);
    const verify = (manifest: Manifest) => {
      const [particle] = manifest.particles;
      const connectionEntity = (particle.connections[0].type as EntityType).getEntitySchema();
      verifyPrimitiveType(connectionEntity.fields.value, 'Text');
      verifyPrimitiveType(connectionEntity.fields.other, 'Number');
    };
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('two manifests with stores with the same filename, store name and data have the same ids', async () => {
    const manifestText = `
    store NobId of NobIdStore {nobId: Text} in NobIdJson
    resource NobIdJson
      start
      {
        "root": {
          "values": {"anid": {"value": {"id": "anid", "rawData": {"nobId": "12345"}}, "version": {"u": 1}}},
          "version": {"u": 1}
        },
        "locations": {}
      }
    `;
    const manifestA = await parseManifest(manifestText, {fileName: 'the.manifest', memoryProvider});

    const manifestB = await parseManifest(manifestText, {fileName: 'the.manifest', memoryProvider});

    assert.strictEqual(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('two manifests with stores with the same filename and store name but different data have different ids', async () => {
    const manifestText = (id: number) => `
    store NobId of NobIdStore {nobId: Text} in NobIdJson
    resource NobIdJson
      start
      {
        "root": {
          "values": {"anid": {"value": {"id": "anid", "rawData": {"nobId": "${id}"}}, "version": {"u": 1}}},
          "version": {"u": 1}
        },
        "locations": {}
      }
    `;
    const manifestA = await parseManifest(manifestText(12345), {fileName: 'the.manifest', memoryProvider});

    const manifestB = await parseManifest(manifestText(67890), {fileName: 'the.manifest', memoryProvider});

    assert.notStrictEqual(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('can parse a recipe with a synthetic join handle', async () => {
    const manifest = await parseManifest(`
      recipe
        people: map #folks
        other: map #products
        pairs: join (people, places)
        places: map #locations`);
    const verify = (manifest: Manifest) => {
      const [recipe] = manifest.recipes;
      assert.lengthOf(recipe.handles, 4);
      const people = recipe.handles.find(h => h.tags.includes('folks'));
      assert.equal(people.fate, 'map');
      const places = recipe.handles.find(h => h.tags.includes('locations'));
      assert.equal(places.fate, 'map');

      const pairs = recipe.handles.find(h => h.fate === 'join');
      assert.equal(pairs.fate, 'join');
      assert.lengthOf(pairs.joinedHandles, 2);
      assert.include(pairs.joinedHandles, people);
      assert.include(pairs.joinedHandles, places);
    };
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('fails to parse a recipe with an invalid synthetic join handle', async () => {
    try {
      await parseManifest(`
        recipe
          people: map #folks
          things: map #products
          pairs: join (people, locations)`);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'unrecognized name: locations');
    }
  });
  it('can resolve a recipe with a synthetic join handle', async () => {
    const manifest = await parseManifest(`
      particle JoinReader
        data: reads [(
          &Person {name: Text},
          &Place {address: Text}
        )]
      recipe
        people: map 'people'
        places: map 'places'
        pairs: join (people, places)
        JoinReader
          data: reads pairs`);
    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    const peopleHandle = recipe.handles.find(h => h.id === 'people');
    peopleHandle.type.maybeEnsureResolved();
    assert.equal(peopleHandle.type.resolvedType().toString(), '[Person {name: Text}]');

    const placesHandle = recipe.handles.find(h => h.id === 'places');
    placesHandle.type.maybeEnsureResolved();
    assert.equal(placesHandle.type.resolvedType().toString(), '[Place {address: Text}]');

    assert.isTrue(recipe.isResolved());
  });
  it('can resolve a recipe with a synthetic join handle and multiple readers', async () => {
    const manifest = await parseManifest(`
      particle PeopleReader
        people: reads [Person {age: Number, name: Text}]
      particle PlaceReader
        places: reads [Place {address: Text}]
      particle JoinReaderOne
        data: reads [(
          &Person {name: Text},
          &Place {address: Text}
        )]
      particle JoinReaderTwo
        data: reads [(
          &Person {phoneNumber: Text},
          &Place {latitude: Number, longitude: Number}
        )]
      recipe
        people: map 'people'
        places: map 'places'
        pairs: join (people, places)
        PeopleReader
          people: people
        JoinReaderOne
          data: pairs
        JoinReaderTwo
          data: pairs`);
    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    const peopleHandle = recipe.handles.find(h => h.id === 'people');
    peopleHandle.type.maybeEnsureResolved();
    assert.equal(peopleHandle.type.resolvedType().toString(),
        '[Person {age: Number, name: Text, phoneNumber: Text}]');

    const placesHandle = recipe.handles.find(h => h.id === 'places');
    placesHandle.type.maybeEnsureResolved();
    assert.equal(placesHandle.type.resolvedType().toString(),
        '[Place {address: Text, latitude: Number, longitude: Number}]');

    assert.isTrue(recipe.isResolved());
  });
  it('does not allow writing to a synthetic join handle', async () => {
    const manifest = await parseManifest(`
      particle JoinReader
        data: writes [(
          &Person {name: Text},
          &Place {address: Text}
        )]
      recipe
        people: map 'folks'
        places: map 'places'
        pairs: join (people, places)
        JoinReader
          data: writes pairs`);
    const [recipe] = manifest.recipes;
    const options = {errors: new Map()};
    assert.isFalse(recipe.normalize(options), 'expected type error');
    const errors = [...options.errors.values()];
    assert.sameMembers(errors, [`Invalid fate 'join' for handle 'pairs: join (people, places)'; it is used for 'writes' JoinReader::data connection`]);
  });
  it('supports recipes with constraints', async () => {
    const manifest = await parseManifest(`
      schema S
      particle A
        a: reads S
      particle B
        b: reads S

      recipe Constrained
        A.a: writes B.b`);
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
    verify(await parseManifest(manifest.toString()));
  });
  it('supports recipes with constraints that reference handles', async () => {
    const manifest = await parseManifest(`
      particle A
        a: writes S {}

      recipe Constrained
        localThing: ?
        A.a: writes localThing`);
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
    verify(await parseManifest(manifest.toString()));
  });
  it('supports recipes with local names', async () => {
    const manifest = await parseManifest(`
      schema S
      particle P1
        x: writes S
        y: writes S
      particle P2
        x: writes S
        y: writes S

      recipe
        thingHandle: ? #things
        P1 as p1
          x: writes thingHandle
        P2
          x: writes thingHandle`);
    const deserializedManifest = (await parseManifest(manifest.toString()));
  });
  // TODO: move these tests to new-recipe tests.
  it('can normalize simple recipes', async () => {
    const manifest = await parseManifest(`
      schema S
      particle P1
        x: writes S
      particle P2

      recipe
        handle1: ?
        P1
          x: writes handle1
        P2
      recipe
        someHandle: ?
        P2
        P1
          x: writes someHandle
        `);
    const [recipe1, recipe2] = manifest.recipes;
    assert.notStrictEqual(recipe1.toString(), recipe2.toString());
    assert.notStrictEqual(await recipe1.digest(), await recipe2.digest());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
    assert.strictEqual(await recipe1.digest(), await recipe2.digest());

    const deserializedManifest = await parseManifest(manifest.toString());
  });
  it('can normalize recipes with interdependent ordering of handles and particles', async () => {
    const manifest = await parseManifest(`
      schema S
      particle P1
        x: writes S

      recipe
        handle1: use *
        handle2: use *
        P1
          x: writes handle1
        P1
          x: writes handle2
      recipe
        handle1: use *
        handle2: use *
        P1
          x: writes handle2
        P1
          x: writes handle1`);
    const [recipe1, recipe2] = manifest.recipes;
    assert.notStrictEqual(recipe1.toString(), recipe2.toString());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
  });
  it('can resolve recipe particles defined in the same manifest', async () => {
    const manifest = await parseManifest(`
      schema Something
      schema Someother
      particle Thing in 'thing.js'
        someThings: reads [Something]
        someOthers: writes [Someother]
      recipe
        Thing`);
    const verify = (manifest: Manifest) => assert(manifest.recipes[0].particles[0].spec);
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('treats a failed import as non-fatal', async () => { // TODO(cypher1): Review this.
    const loader = new Loader(null, {
      './a': `import 'b'`,
      './b': `lol what is this`,
    });
    const cc = await ConCap.capture(() => Manifest.load('./a', loader, {memoryProvider}));
    assert.lengthOf(cc.warn, 2);
    assert.match(cc.warn[0], /Parse error in '\.\/b' line 1/);
    assert.match(cc.warn[1], /Error importing '\.\/b'/);
  });
  it('throws an error when a particle has invalid description', async () => {
    try {
      const manifest = await parseManifest(`
        schema Foo
        particle Thing in 'thing.js'
          foo: reads Foo
          description \`Does thing\`
            bar \`my-bar\``);
      assert(false);
    } catch (e) {
      assert.strictEqual(e.message, 'Unexpected description for bar');
    }
  });
  it('can load a manifest via a loader', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};

    const loader = new Loader(null, {
      '*': 'recipe'});
    const manifest = await Manifest.load('some-path', loader, {registry, memoryProvider});
    assert(manifest.recipes[0]);
    assert.strictEqual(manifest, await registry['some-path']);
  });
  it('can load a manifest with imports', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};
    const loader = new Loader(null, {
      './a': `import 'b'`,
      './b': `recipe`,
    });
    const manifest = await Manifest.load('./a', loader, {registry, memoryProvider});
    assert.strictEqual(await registry['./a'], manifest);
    assert.strictEqual(manifest.imports[0], await registry['./b']);
  });
  it('can resolve recipe particles imported from another manifest', async () => {
    const registry: Dictionary<Promise<Manifest>> = {};
    const loader = new Loader(null, {
      './a': `
        import 'b'
        recipe
          ParticleB`,
      './b': `
        schema Thing
        particle ParticleB in 'b.js'
          thing: reads Thing`
    });
    const manifest = await Manifest.load('./a', loader, {registry, memoryProvider});
    assert.isTrue(manifest.recipes[0].particles[0].spec.equals(
      (await registry['./b']).findParticleByName('ParticleB'))
    );
  });
  it('can parse a schema extending a schema in another manifest', async () => {
    const loader = new Loader(null, {
      './a': `
          import 'b'
          schema Bar extends Foo`,
      './b': `
          schema Foo
            value: Text`
    });
    const registry = {};
    const manifest = await Manifest.load('./a', loader, {registry, memoryProvider});
    verifyPrimitiveType(manifest.schemas.Bar.fields.value, 'Text');
  });
  it('can find all imported recipes', async () => {
    const loader = new Loader(null, {
      './a': `
          import 'b'
          import 'c'
          recipe`,
      './b': `
          import 'c'
          recipe`,
      './c': `recipe`,
    });
    const manifest = await Manifest.load('./a', loader, {memoryProvider});
    assert.lengthOf(manifest.allRecipes, 3);
  });
  it('can parse a schema with union typing', async () => {
    const manifest = await parseManifest(`
      schema Foo
        u: (Text or URL)
        test: Text
        t: (Number, Number, Boolean)`);
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
    verify(await parseManifest(manifest.toString()));
  });
  it('generates helpful type errors in recipes', async () => {
    const manifest = await parseManifest(`
      particle P in 'a.js'
        outV: writes * {name: Text, age: Number}

      particle Q in 'a.js'
        inV: reads * {first_name: Text, age: Number}

      recipe
        val: create *
        P
          outV: writes val
        Q
          inV: reads val`);
    const verify = (manifest: Manifest) => {
      const recipe = manifest.recipes[0];
      const options = {errors: new Map()};
      assert.isFalse(recipe.normalize(options), 'expected type error');
      const errors = [...options.errors.values()];
      assert.sameMembers(errors, [`Type validations failed for handle 'val: create': could not guarantee variable ~ meets read requirements * {first_name: Text, age: Number} with write guarantees * {name: Text, age: Number}`], 'expected type error');
    };
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('parses meta namespace section', async () => {
    const manifest = await parseManifest(`
      meta
        name: 'Awesome Arc'
        namespace: com.some.namespace
      particle P
        data: writes * {name: Text, age: Number}
    `);
    assert.equal(manifest.meta.namespace, 'com.some.namespace');
  });
  describe('refinement types', async () => {
    it('can construct manifest containing schema with refinement types', Flags.withFieldRefinementsAllowed(async () => {
      const manifest = await parseManifest(`
        schema Foo
          num: Number [num < 5]`);
      const verify = (manifest: Manifest) => {
        const ref = manifest.schemas.Foo.fields.num.refinement;
        assert.strictEqual(ref.kind, 'refinement');
        assert.isTrue(ref.expression instanceof BinaryExpression);
        assert.strictEqual(ref.expression.leftExpr.value, 'num');
        assert.strictEqual(ref.expression.rightExpr.value, 5);
        assert.strictEqual(ref.expression.operator.op, '<');
      };
      verify(manifest);
      verify(await parseManifest(manifest.toString()));
    }));
    it('can construct manifest with particles using already defined schema (with refinements)', Flags.withFieldRefinementsAllowed(async () => {
      const manifest = await parseManifest(`
      schema Person
        name: Text
        id: Text
        age: Number [age > 0]
      schema Ordered
        index: Number [index >= 0]
      particle OrderPeople in 'OrderPeople.js'
        orderedPeople: writes [Ordered Person {name, id, index}]`);
      const verify = (manifest: Manifest) => {
        const entity = manifest.particles[0].handleConnectionMap.get('orderedPeople').type['collectionType'];
        assert.strictEqual(entity.tag, 'Entity');
        // tslint:disable-next-line: no-any
        const ref = (entity as any).getEntitySchema().refinement;
        assert.isNull(ref);
        // tslint:disable-next-line: no-any
        const refIndex = (entity as any).getEntitySchema().fields['index'].refinement;
        assert.exists(refIndex);
        assert.strictEqual(refIndex.kind, 'refinement');
        assert.isTrue(refIndex.expression instanceof BinaryExpression);
        assert.strictEqual(refIndex.expression.operator.op, '>=');
        assert.isTrue(refIndex.expression.leftExpr instanceof FieldNamePrimitive);
        assert.strictEqual(refIndex.expression.leftExpr.value, 'index');
        assert.isTrue(refIndex.expression.rightExpr instanceof NumberPrimitive);
        assert.strictEqual(refIndex.expression.rightExpr.value, 0);
      };
      verify(manifest);
    }));
    it('can construct manifest containing a particle with refinement types', Flags.withFieldRefinementsAllowed(async () => {
      const manifest = await parseManifest(`
      particle Foo
        input: reads Something {value: Number [value > 0], price: Number [price > 0]} [value > 10 and price < 2]`);
      const verify = (manifest: Manifest) => {
        const entity = manifest.particles[0].handleConnectionMap.get('input').type;
        assert.strictEqual(entity.tag, 'Entity');
        // tslint:disable-next-line: no-any
        const ref = (entity as any).getEntitySchema().refinement;
        assert.exists(ref);
        assert.strictEqual(ref.kind, 'refinement');
        assert.isTrue(ref.expression instanceof BinaryExpression);
        assert.strictEqual(ref.expression.operator.op, 'and');
        assert.isTrue(ref.expression.leftExpr instanceof BinaryExpression);
        assert.strictEqual(ref.expression.leftExpr.operator.op, '>');
        assert.strictEqual(ref.expression.leftExpr.leftExpr.value, 'value');
        assert.strictEqual(ref.expression.leftExpr.rightExpr.value, 10);
        assert.isTrue(ref.expression.rightExpr instanceof BinaryExpression);
        assert.strictEqual(ref.expression.rightExpr.operator.op, '<');
        assert.strictEqual(ref.expression.rightExpr.leftExpr.value, 'price');
        assert.strictEqual(ref.expression.rightExpr.rightExpr.value, 2);
      };
      verify(manifest);
      verify(await parseManifest(manifest.toString()));
    }));

    describe('refinement type checking', async () => {
      const verify = (manifest: Manifest, norms: boolean, expectedErrors: string[]) => {
        const recipe = manifest.recipes[0];
        const options = {errors: new Map()};
        const normalizes = recipe.normalize(options);
        assert.sameMembers([...options.errors.values()], expectedErrors);
        assert.deepEqual(normalizes, norms, `is ${norms ? '' : 'not '}expected to normalize`);
        if (norms) {
          assert(recipe.isResolved());
        }
      };

      it('checks refinement expressions', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Writer
            output: writes Something {num: Number [ num > 5 ] }
          particle Reader
            input: reads Something {num: Number [ num > 3 ] }
          recipe Foo
            Writer
              output: writes data
            Reader
              input: reads data
        `);
        verify(manifest, true, []);
      }));
      it('checks for unsafe refinement expressions', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle BadWriter
            output: writes Something {num: Number [ num > 3 ] }
          particle Reader
            input: reads Something {num: Number [ num > 5 ] }
          recipe Foo
            BadWriter
              output: writes data
            Reader
              input: reads data
        `);
        const refinementError = `Type validations failed for handle 'data: create': could not guarantee variable ~ meets read requirements Something {num: Number[(num > 5)]} with write guarantees Something {num: Number[(num > 3)]}`;
        verify(manifest, false, [refinementError]);
      }));
      it('ignores impossible refinement expressions', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number [ (num < 3) and (num > 3) ] }
          particle Reader
            input: reads Something {num: Number [ num > 5 ] }
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        // TODO(cypher1): check that a warning is thrown by Impossible.output
        verify(manifest, true, []);
      }));

      it('ignores dynamic query refinement expressions on fields', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number [ (num > 3) ] }
          particle Reader
            input: reads Something {num: Number [ (num > ?) ] }
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        const cc = await ConCap.capture(() => verify(manifest, true, []));
        assert.lengthOf(cc.warn, 2);
        assert.match(cc.warn[0], /Unable to ascertain if .* is at least as specific as .*/);
        assert.match(cc.warn[1], /Unable to ascertain if .* is at least as specific as .*/);
      }));

      it('ignores dynamic query refinement expressions', async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number} [ (num > 3) ]
          particle Reader
            input: reads Something {num: Number} [ (num > ?) ]
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        const cc = await ConCap.capture(() => verify(manifest, true, []));
        assert.lengthOf(cc.warn, 2);
        assert.match(cc.warn[0], /Unable to ascertain if .* is at least as specific as .*/);
        assert.match(cc.warn[1], /Unable to ascertain if .* is at least as specific as .*/);
      });

      it('applies refinements', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number [ (num > 3) ] }
          particle Reader
            input: reads Something {num: Number [ (num > 5) ] }
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        verify(manifest, false, ['Type validations failed for handle \'data: create\': could not guarantee variable ~ meets read requirements Something {num: Number[(num > 5)]} with write guarantees Something {num: Number[(num > 3)]}']);
      }));
      it('ignores dynamic query refinement expressions and-ed with refinements', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number [ (num > 5) ] }
          particle Reader
            input: reads Something {num: Number [ (num > ?) and (num > 3) ] }
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        const cc = await ConCap.capture(() => verify(manifest, true, []));
        assert.lengthOf(cc.warn, 2);
        assert.lengthOf(cc.log, 0);
        assert.match(cc.warn[0], /Unable to ascertain if .* is at least as specific as .*/);
        assert.match(cc.warn[1], /Unable to ascertain if .* is at least as specific as .*/);
      }));
      it('ignores refinements or-ed with dynamic query refinement expressions', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number }
          particle Reader
            input: reads Something {num: Number [ (num > ?) or (num > 3) ] }
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        const cc = await ConCap.capture(() => verify(manifest, true, []));
        assert.lengthOf(cc.warn, 1);
        assert.lengthOf(cc.log, 0);
        assert.match(cc.warn[0], /Unable to ascertain if .* is at least as specific as .*/);
      }));
      it('catches unsafe schema level refinements', Flags.withFieldRefinementsAllowed(async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number } [num > 0]
          particle Reader
            input: reads Something {num: Number } [num > 3]
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        verify(manifest, false, ['Type validations failed for handle \'data: create\': could not guarantee variable ~ meets read requirements Something {num: Number[(num > 3)]} with write guarantees Something {num: Number[(num > 0)]}']);
      }));
      it('allows safe schema level refinements', async () => {
        const manifest = await parseManifest(`
          particle Impossible
            output: writes Something {num: Number } [num > 5]
          particle Reader
            input: reads Something {num: Number } [num > 3]
          recipe Foo
            Impossible
              output: writes data
            Reader
              input: reads data
        `);
        verify(manifest, true, []);
      });
    });
  });

  describe('relaxed reads and writes', async () => {
    it('can parse a manifest containing relaxed reads', async () => {
      const manifest = await parseManifest(`
        schema Thing
        schema NotAThing

        particle PA
          foo: writes Thing

        particle PB
          foo: writes NotAThing

        particle PC
          foo: reads Thing

        recipe SomeRecipe
          myFoo: create * // [NotAThing {} or Thing {}]
          PA
            foo: writes myFoo
          PB
            foo: writes myFoo
          PC
            foo: reads someof myFoo
      `);
      const recipe = manifest.recipes[0];
      assert.lengthOf(recipe.particles, 3);
      assert.lengthOf(recipe.handles, 1);
      assert.lengthOf(recipe.handleConnections, 3);
      const particleA = recipe.particles[0];
      assert.sameMembers(Object.keys(particleA.connections), ['foo']);
      const handleA = particleA.connections['foo'];
      assert(!handleA.relaxed, 'handle PA.foo should not be relaxed');
      const particleB = recipe.particles[1];
      assert.sameMembers(Object.keys(particleB.connections), ['foo']);
      const handleB = particleB.connections['foo'];
      assert(!handleB.relaxed, 'handle PB.foo should not be relaxed');
      const particleC = recipe.particles[2];
      assert.sameMembers(Object.keys(particleC.connections), ['foo']);
      const handleC = particleC.connections['foo'];
      assert(handleC.relaxed, 'handle PC.foo should be relaxed');
      assert(recipe.normalize(), 'should be able to normalize recipe');
      assert(recipe.isResolved(), 'should be able to resolve recipe');
    });
    it('can round trip a manifest containing relaxed reads', async () => {
      const manifestStr = `schema Thing
schema NotAThing
particle PA
  foo: writes Thing {}
  modality dom
particle PB
  foo: writes NotAThing {}
  modality dom
particle PC
  foo: reads Thing {}
  modality dom
recipe SomeRecipe
  myFoo: ?
  PA as particle0
    foo: writes myFoo
  PB as particle1
    foo: writes myFoo
  PC as particle2
    foo: reads someof myFoo`;
      const manifest = await parseManifest(manifestStr);
      assert.strictEqual(manifest.toString(), manifestStr, 'round trip failed');
    });
  });

  it('can parse a manifest containing a recipe with slots', async () => {
    const manifest = await parseManifest(`
      schema Thing
      particle SomeParticle in 'some-particle.js'
        someParam: reads Thing
        mySlot: consumes Slot {formFactor: big}
          otherSlot: provides Slot {handle: someParam}
          oneMoreSlot: provides Slot {formFactor: small}

      particle OtherParticle
        aParam: writes Thing
        mySlot: consumes
        oneMoreSlot: consumes

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
    verify(await parseManifest(manifest.toString()));
  });
  it('SLANDLES can parse a manifest containing a recipe with slots', async () => {
    const manifest = await parseManifest(`
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
    verify(await parseManifest(manifest.toString()));
  });
  it('unnamed consume slots', async () => {
    const manifest = await parseManifest(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: consumes
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: consumes

      recipe
        SomeParticle
          slotA: consumes
        SomeParticle1
          slotC: consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('unnamed consume set slots', async () => {
    const manifest = await parseManifest(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: consumes [Slot]
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: consumes [Slot]

      recipe
        SomeParticle
          slotA: consumes
        SomeParticle1
          slotC: consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('unnamed consume set slots', async () => {
    const manifest = await parseManifest(`
      particle SomeParticle &work in 'some-particle.js'
        slotA: consumes [Slot]
      particle SomeParticle1 &rest in 'some-particle.js'
        slotC: consumes [Slot]

      recipe
        SomeParticle
          slotA: consumes
        SomeParticle1
          slotC: consumes
    `);
    const recipe = manifest.recipes[0];
    assert.lengthOf(recipe.slotConnections, 2);
    assert.isEmpty(recipe.slots);
  });
  it('SLANDLES unnamed consume slots', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES unnamed consume set slots', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES unnamed consume set slots', async () => {
    const manifest = await parseManifest(`
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
  });
  it('resolves in context with multiple consumed slots', async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await parseManifest(`
        particle SomeParticle in 'some-particle.js'
          slotA: consumes${arg.isRequiredSlotA ? '' : '?'} Slot
          slotB: consumes${arg.isRequiredSlotB ? '' : '?'} Slot

        recipe
          s0: slot 'slota-0'
          SomeParticle
            slotA: consumes s0
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
  it('SLANDLES resolves in context with multiple consumed slots', async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await parseManifest(`
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
  });
  it('SLANDLES resolves & consumes in context with multiple set slots', async () => {
    const parseRecipe = async (arg: {label: string, isRequiredSlotA: boolean, isRequiredSlotB: boolean, expectedIsResolved: boolean}) => {
      const recipe = (await parseManifest(`
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
  });

  it('SLANDLES resolves with dependent slandles', async () => {
    const manifest = await parseManifest(`
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
  });

  it('SLANDLES doesn\'t resolve mismatching dependencies dependent slandles', async () => {
    const manifest = await parseManifest(`
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
  });

  it('recipe slots with tags', async () => {
    const manifest = await parseManifest(`
      particle SomeParticle in 'some-particle.js'
        slotA: consumes #aaa
          slotB: provides #bbb
      recipe
        s0: slot 'slot-id0' #aa #aaa
        SomeParticle
          slotA: consumes s0 #aa #hello
            slotB: provides
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
  it('SLANDLES recipe slots with tags', async () => {
    const manifest = await parseManifest(`
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
  });
  it('recipe slots with different names', async () => {
    const manifest = await parseManifest(`
      particle ParticleA in 'some-particle.js'
        slotA: consumes
      particle ParticleB in 'some-particle.js'
        slotB1: consumes
          slotB2: provides
      recipe
        s0: slot 'slot-id0'
        ParticleA
          slotA: consumes mySlot
        ParticleB
          slotB1: consumes s0
            slotB2: provides mySlot
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
  it('SLANDLES recipe slots with different names', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing a single slot to a set slot)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing a slot as a set slot)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing set slots)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing a single slot to a set slot)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing a slot as a set slot)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe set slots with different names (passing set slots)', async () => {
    const manifest = await parseManifest(`
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
  });
  it('recipe provided slot with no local name', async () => {
    const manifest = await parseManifest(`
      particle ParticleA in 'some-particle.js'
        slotA1: consumes
          slotA2: provides
      recipe
        ParticleA
          slotA1: consumes
            slotA2: provides
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
  it('SLANDLES recipe provided slot with no local name', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe provided set slots with no local name', async () => {
    const manifest = await parseManifest(`
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
  });
  it('SLANDLES recipe provided set slots with no local name', async () => {
    const manifest = await parseManifest(`
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
  });
  it('incomplete aliasing', async () => {
    const recipe = (await parseManifest(`
      particle P1 in 'some-particle.js'
        slotA: consumes
          slotB: provides
      particle P2 in 'some-particle.js'
        slotB: consumes
      recipe
        P1
          slotA: consumes
            slotB: provides s1
        P2
          slotB: consumes s1
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
  it('SLANDLES incomplete aliasing', async () => {
    const recipe = (await parseManifest(`
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
    assert.include(directions, '`provides');
    assert.include(directions, '`consumes');
  });
  it('parses local slots with IDs', async () => {
    const recipe = (await parseManifest(`
      particle P1 in 'some-particle.js'
        slotA: consumes
          slotB: provides
      particle P2 in 'some-particle.js'
        slotB: consumes
      recipe
        slot0: slot 'rootslot-0'
        slot1: slot 'local-slot-0'
        P1
          slotA: consumes slot0
            slotB: provides slot1
        P2
          slotB: consumes slot1
    `)).recipes[0];
    recipe.normalize();
    assert.lengthOf(recipe.slots, 2);
  });
  it('SLANDLES parses local slots with IDs', async () => {
    const recipe = (await parseManifest(`
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
  });
  it('relies on the loader to combine paths', async () => {
    const registry = {};
    const loader = new class extends Loader {
      constructor() {
        super(null, {
          './somewhere/a': `import 'path/b'`,
          './somewhere/a path/b': `recipe`
        });
      }
      path(fileName: string): string {
        return fileName;
      }
      join(path: string, file: string): string {
        return `${path} ${file}`;
      }
    }();

    await Manifest.load('./somewhere/a', loader, {registry, memoryProvider});
    assert(registry['./somewhere/a path/b']);
  });
  it('parses all particles manifests', async () => {
    let broken = false;
    const verifyParticleManifests = (particlePaths) => {
      let count = 0;
      particlePaths.forEach(particleManifestFile => {
        if (fs.existsSync(particleManifestFile)) {
          try {
            const data = fs.readFileSync(particleManifestFile, 'utf-8');
            const model = parse(data);
            assert.isDefined(model);
          } catch (e) {
            console.log(`Failed parsing ${particleManifestFile} +${e.location.start.line}:${e.location.start.column}`);
            broken = true;
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
                .filter(fileName => fileName.endsWith('.schema') || fileName.endsWith('.manifest') || fileName.endsWith('.recipes') || fileName.endsWith('.arcs'))
                .map(fileName => path.join(manifestFolderName, fileName)));
      }
    });
    assert.isAbove(verifyParticleManifests(shellParticleNames), 0, 'no particles parse');
    assert.isFalse(broken, 'a particle doesn\'t parse correctly');
  });
  it('loads entities from json files', async () => {
    const now = new Date().getTime();
    const earlier = new Date(now - 100).getTime();
    const manifestSource = `
        schema Thing
          someProp: Text
        store Store0 of [Thing] in 'entities.json'`;
    const entitySource = JSON.stringify(
      {root: {values:
        {
          e1: {value: {id: 'e1', creationTimestamp: now, rawData: {someProp: 'someValue'}}, version: {u: 1}},
          'entity-id': {value: {id: 'entity-id', creationTimestamp: earlier, rawData: {someProp: 'someValue2'}}, version: {u: 1}}
        }, version: {u: 1}
      }, locations: {}});
    const loader = new Loader(null, {
      './the.manifest': manifestSource,
      './entities.json': entitySource
    });
    const manifest = await Manifest.load('./the.manifest', loader, {memoryProvider});
    const storageStub = manifest.findStoreByName('Store0');
    assert(storageStub);
    const store = await storageStub.activate() as ActiveCollectionEntityStore;
    assert(store);
    const handle = handleForActiveStore(store, manifest);

    assert.deepEqual((await handle.toList()).map(Entity.serialize), [
      {
        id: 'e1',
        creationTimestamp: now,
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        creationTimestamp: earlier,
        rawData: {someProp: 'someValue2'},
      }
    ]);
    DriverFactory.clearRegistrationsForTesting();
  });
  it('throws an error when a store has invalid json', async () => {
    try {
      const manifest = await parseManifest(`
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
    const now = new Date().getTime();
    const later = new Date(now + 1000).getTime();
    const manifest = await parseManifest(`
      schema Thing
        someProp: Text

      resource EntityList
        start
        {
          "root": {
            "values": {
              "eid2": {"value": {"id": "eid2", "creationTimestamp": ${now}, "rawData": {"someProp": "someValue"}}, "version": {"u": 1}},
              "entity-id": {"value": {"id": "entity-id", "creationTimestamp": ${later}, "rawData": {"someProp": "someValue2"}}, "version": {"u": 1}}
            },
            "version": {"u": 1}
          },
          "locations": {}
        }

      store Store0 of [Thing] in EntityList
    `, {fileName: 'the.manifest', memoryProvider});
    const store = (await manifest.findStoreByName('Store0').activate()) as ActiveCollectionEntityStore;
    assert(store);
    const handle = handleForActiveStore(store, manifest);

    // TODO(shans): address as part of storage refactor
    assert.deepEqual((await handle.toList()).map(Entity.serialize), [
      {
        id: `eid2`,
        creationTimestamp: now,
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        creationTimestamp: later,
        rawData: {someProp: 'someValue2'},
      }
    ]);
    DriverFactory.clearRegistrationsForTesting();
  });

  it('loads inline entities with primitive and reference fields', async () => {
    const manifest = await parseManifest(`
      store X of [{n: Number, t: Text, u: URL, f: Boolean, b: Bytes, r: &{z: Text}}] with {
        {n: 0, t: '', u: '', f: false, b: ||, r: <'i1', 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}'>},
        {n: 4.5, t: 'abc', u: 'site', f: true, b: |5a, 7, d|, r: <'i2', 'reference-mode://{volatile://!3:test/backing2@}{volatile://!4:test/container2@}'>},
      }
    `, {fileName: 'the.manifest', memoryProvider});
    const store = (await manifest.findStoreByName('X').activate()) as ActiveCollectionEntityStore;
    const handle = handleForActiveStore(store, manifest);
    const entities = (await handle.toList()).map(Entity.serialize);
    assert.lengthOf(entities, 2);

    const [e1, e2] = entities;
    assert.isTrue(e1.id.length && e2.id.length && e1.id !== e2.id);
    assert.deepStrictEqual(e1.rawData, {
      n: 0, t: '', u: '', f: false, b: new Uint8Array(),
      r: {id: 'i1', entityStorageKey: 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}', creationTimestamp: null, expirationTimestamp: null}
    });
    assert.deepStrictEqual(e2.rawData, {
      n: 4.5, t: 'abc', u: 'site', f: true, b: new Uint8Array([0x5a, 0x07, 0x0d]),
      r: {id: 'i2', entityStorageKey: 'reference-mode://{volatile://!3:test/backing2@}{volatile://!4:test/container2@}', creationTimestamp: null, expirationTimestamp: null}
    });
    DriverFactory.clearRegistrationsForTesting();
  });

  it('loads inline entities with collection fields', async () => {
    const manifest = await parseManifest(`
      store X of [{
        n: [Number], t: [Text], u: [URL], f: [Boolean], b: [Bytes], r: [&{z: Text}]
      }] with {
        {n: [], t: [], u: [], f: [], b: [], r: []},
        {
            n: [0, 2, -8, 3.4, 2],
            t: ['abc', 'abc', ''],
            u: ['site'],
            f: [true, false, true],
            b: [|17, b0|, ||],
            r: [<'i1', 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}'>],
        }
      }
    `, {fileName: 'the.manifest', memoryProvider});
    const store = (await manifest.findStoreByName('X').activate()) as ActiveCollectionEntityStore;
    const handle = handleForActiveStore(store, manifest);
    const entities = (await handle.toList()).map(Entity.serialize);
    assert.lengthOf(entities, 2);

    const [e1, e2] = entities;
    assert.isTrue(e1.id.length && e2.id.length && e1.id !== e2.id);
    assert.deepStrictEqual(e1.rawData, {
      n: [], t: [], u: [], f: [], b: [], r: []
    });
    assert.deepStrictEqual(e2.rawData, {
      n: [0, 2, -8, 3.4],
      t: ['abc', ''],
      u: ['site'],
      f: [true, false],
      b: [new Uint8Array([0x17, 0xb0]), new Uint8Array()],
      r: [{id: 'i1', entityStorageKey: 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}', creationTimestamp: null, expirationTimestamp: null}],
    });
    DriverFactory.clearRegistrationsForTesting();
  });

  it('loads inline entities with tuple fields', async () => {
    const manifest = await parseManifest(`
      store X of [{
        a: (Number, Number, Bytes, URL),
        b: (Boolean, Text)
      }] with {
        {
          a: (0, 0, ||, ''),
          b: (false, ''),
        },
        {
          a: (6.5, -2, |5e, 6|, 'link'),
          b: (true, 'xyz'),
        },
      }
    `, {fileName: 'the.manifest', memoryProvider});
    const store = (await manifest.findStoreByName('X').activate()) as ActiveCollectionEntityStore;
    const handle = handleForActiveStore(store, manifest);
    const entities = (await handle.toList()).map(Entity.serialize);
    assert.lengthOf(entities, 2);

    const [e1, e2] = entities;
    assert.isTrue(e1.id.length && e2.id.length && e1.id !== e2.id);
    assert.deepStrictEqual(e1.rawData, {
      a: [0, 0, new Uint8Array(), ''],
      b: [false, ''],
    });
    assert.deepStrictEqual(e2.rawData, {
      a: [6.5, -2, new Uint8Array([0x5e, 0x06]), 'link'],
      b: [true, 'xyz'],
    });
    DriverFactory.clearRegistrationsForTesting();
  });

  it('loads inline entities with union fields', async () => {
    const manifest = await parseManifest(`
      store X of [{u: (Text or Number or Boolean or Bytes)}] with {
        {u: 'str'},
        {u: 52},
        {u: true},
        {u: |1e, e7|},
      }
    `, {fileName: 'the.manifest', memoryProvider});
    const store = (await manifest.findStoreByName('X').activate()) as ActiveCollectionEntityStore;
    const handle = handleForActiveStore(store, manifest);
    const entities = (await handle.toList()).map(e => Entity.serialize(e).rawData);

    assert.deepStrictEqual(entities, [
      {u: 'str'},
      {u: 52},
      {u: true},
      {u: new Uint8Array([0x1e, 0xe7])},
    ]);
    DriverFactory.clearRegistrationsForTesting();
  });

  it('throws an error when inline entities do not match the store schema', async () => {
    const check = async (manifestStr, msg) => {
      const manifest = await parseManifest(manifestStr, {fileName: 'the.manifest', memoryProvider});
      const store = (await manifest.findStoreByName('X').activate()) as ActiveCollectionEntityStore;
      const handle = handleForActiveStore(store, manifest);
      await assertThrowsAsync(async () => await handle.toList(), msg);
    };

    // Incorrect types
    const mismatch = 'Type mismatch setting field z';
    await check(`store X of [{z: Text}] with { {z: 5} }`, mismatch);
    await check(`store X of [{z: URL}] with { {z: true} }`, mismatch);
    await check(`store X of [{z: Number}] with { {z: 'str'} }`, mismatch);
    await check(`store X of [{z: Boolean}] with { {z: |5a|} }`, mismatch);
    await check(`store X of [{z: Bytes}] with { {z: 12} }`, mismatch);
    await check(`store X of [{z: (Number or URL)}] with { {z: true} }`, mismatch);
    await check(`store X of [{z: (Number, URL)}] with { {z: (6, 7)} }`, mismatch);
    await check(`store X of [{z: [Text]}] with { {z: [30]} }`, mismatch);

    await check(`store X of [{z: &{z: Text}}] with { {z: 1} }`, 'Cannot set reference z with non-reference');
    await check(`store X of [{z: [Text]}] with { {z: 'str'} }`, 'Cannot set collection z with non-collection');
    await check(`store X of [{z: (Number, URL)}] with { {z: |6|} }`, 'Cannot set tuple z with non-array value');

    // Incorrect field name
    await check(`store X of [{a: Text}] with { {b: 'abc'} }`, `Can't set field b; not in schema`);

    DriverFactory.clearRegistrationsForTesting();
  });

  it('resolves store names to ids', async () => {
    const manifestSource = `
        schema Thing
        store Store0 of [Thing] in 'entities.json'
        recipe
          myStore: map Store0`;
    const entitySource = JSON.stringify({root: {}, locations: {}});
    const loader = new Loader(null, {
      './the.manifest': manifestSource,
      './entities.json': entitySource,
    });
    const manifest = await Manifest.load('./the.manifest', loader, {memoryProvider});
    const recipe = manifest.recipes[0];
    assert.deepEqual(recipe.toString(), `recipe\n  myStore: map '!manifest:./the.manifest:store0:${await digest(entitySource)}'`);
  });

  it('has prettyish syntax errors', async () => {
    try {
      await parseManifest('recipe ?', {fileName: 'bad-file', memoryProvider});
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
          iny: reads Thing
          outy: writes Thing
          inouty: reads writes Thing
        recipe
          x: create
          TestParticle
            iny: writes x
            outy: writes x
            inouty: writes x`;
    try {
      await parseManifest(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'writes' not compatible with 'reads' param of 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing particle param', async () => {
    const manifest = `
        schema Thing
        particle TestParticle in 'tp.js'
          a: reads Thing
        recipe
          x: create
          TestParticle
            a: reads x
            b: reads x`;
    try {
      await parseManifest(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'b' is not defined by 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing consumed slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: consumes
        recipe
          TestParticle
            other: consumes`;
    try {
      await parseManifest(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /Consumed slot 'other' is not defined by 'TestParticle'/);
    }
  });
  it('SLANDLES errors when the manifest references a missing consumed slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: \`consumes Slot
        recipe
          TestParticle
            other: \`consumes`;
    try {
      await parseManifest(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'other' is not defined by 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing provided slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: consumes Slot
            action: provides Slot
        recipe
          TestParticle
            root: consumes
              noAction: provides`;
    try {
      await parseManifest(manifest);
      assert.fail('did not throw');
    } catch (e) {
      assert.match(e.message, /Provided slot 'noAction' is not defined by 'TestParticle'/);
    }
  });
  it('SLANDLES errors when the manifest references a missing provided slot', async () => {
    const manifest = `
        particle TestParticle in 'tp.js'
          root: \`consumes Slot
            action: \`provides Slot
        recipe
          TestParticle
            root: \`consumes
            noAction: \`provides`;
    try {
      await parseManifest(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'noAction' is not defined by 'TestParticle'/);
    }
  });

  it('errors when the manifest uses invalid connection constraints', async () => {
    // nonexistent fromParticle
    const manifestFrom = `
        recipe
          NoParticle.paramA: writes OtherParticle.paramB`;
    try {
      await parseManifest(manifestFrom);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /could not find particle 'NoParticle'/);
    }
    // nonexistent toParticle
    const manifestTo = `
        particle ParticleA
          paramA: reads S {}
        recipe
          ParticleA.paramA: writes OtherParticle.paramB`;
    try {
      await parseManifest(manifestTo);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /could not find particle 'OtherParticle'/);
    }
    // nonexistent connection name in fromParticle
    const manifestFromParam = `
        particle ParticleA
        particle ParticleB
        recipe
          ParticleA.paramA: writes ParticleB.paramB`;
    try {
      await parseManifest(manifestFromParam);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'paramA' is not defined by 'ParticleA'/);
    }
    // nonexistent connection name in toParticle
    const manifestToParam = `
        schema Thing
        particle ParticleA
          paramA: reads Thing
        particle ParticleB
        recipe
          ParticleA.paramA: writes ParticleB.paramB`;
    try {
      await parseManifest(manifestToParam);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'paramB' is not defined by 'ParticleB'/);
    }
  });

  it('resolves manifest with recipe with search', async () => {
    // TODO: support search tokens in manifest-parser.pegjs
    const manifestSource = `
      recipe
        search \`Hello dear world\``;
    let recipe = (await parseManifest(manifestSource)).recipes[0];
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

    recipe = (await parseManifest(manifestSource)).recipes[0];
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
    const recipe1 = (await parseManifest(`recipe
  search \`Hello world\``)).recipes[0];
    const recipe2 = (await parseManifest(`recipe
  search \`good morning\`
    tokens \`morning\` // \`good\``)).recipes[0];

    recipe2.mergeInto(recipe1);
    const search = checkNotNull(recipe1.search);
    assert.strictEqual('Hello world good morning', search.phrase);
    assert.deepEqual(['hello', 'world', 'morning'], search.unresolvedTokens);
    assert.deepEqual(['good'], search.resolvedTokens);
  });
  it('can parse a manifest containing stores', async () => {
    const loader = new Loader(null, {
      '*': '{"root": {}, "locations": {}}'
    });
    const parseOptions = {loader, memoryProvider};
    const manifest = await parseManifest(`
  schema Product
  store ClairesWishlist of [Product] #wishlist in 'wishlist.json'
    description \`Claire's wishlist\``, parseOptions);
    const verify = (manifest: Manifest) => {
      assert.lengthOf(manifest.stores, 1);
      assert.deepEqual(['wishlist'], manifest.storeTags.get(manifest.stores[0]));
    };
    verify(manifest);
    assert.strictEqual(manifest.stores[0].toManifestString(),
                 (await parseManifest(manifest.stores[0].toManifestString(), parseOptions)).toString());
    verify(await parseManifest(manifest.toString(), parseOptions));
  });
  it('can parse a manifest containing resources', async () => {
    const manifest = await parseManifest(`
resource SomeName
  start
  {'foo': 'bar'}
  hello
`);
    assert.deepEqual(manifest.resources['SomeName'], `{'foo': 'bar'}\nhello\n`);
  });
  it('can parse a manifest containing incomplete interfaces', async () => {
    const manifest = await parseManifest(`
      schema Foo
      interface FullInterface
        foo: reads Foo
        root: consumes
        action: provides
      interface NoHandleName
        reads Foo
      interface NoHandleType
        foo: reads writes
      interface NoHandleDirection
        foo: Foo
      interface OnlyHandleDirection
        writes
      interface ManyHandles
        reads Foo
        writes [~a]
      interface ConsumeNoName
        consumes
      interface ConsumeRequiredSetSlot
        consumes [Slot]
        provides
      interface OnlyProvideSlots
        action: provides
    `);
    assert.lengthOf(manifest.interfaces, 9);
    assert(manifest.findInterfaceByName('FullInterface'));
  });
  it('can parse a manifest containing interfaces', async () => {
    const manifest = await parseManifest(`
      schema Foo
      interface Bar
        foo: reads Foo
      particle HostingParticle
        iface0: hosts Bar
      recipe
        handle0: create
        HostingParticle
          iface0: hosts handle0`);
    assert(manifest.findInterfaceByName('Bar'));
    assert(manifest.recipes[0].normalize());
  });
  it('can parse a manifest containing a warning', async () => {
    const manifest = await parseManifest(`
      schema Foo
        value: Text
      particle Particle
        foo: reads Foo`);
    assert.equal(manifest.errors[0].severity, ErrorSeverity.Warning);
    assert.lengthOf(manifest.allParticles, 1);
  });
  it('can parse interfaces using new-style body syntax', async () => {
    const manifest = await parseManifest(`
      schema Foo
      interface Bar
        foo: reads Foo
      particle HostingParticle
        iface0: hosts Bar
      recipe
        handle0: create
        HostingParticle
          iface0: hosts handle0
    `);
    assert(manifest.findInterfaceByName('Bar'));
    assert(manifest.recipes[0].normalize());
  });
  it('can resolve optional handles', async () => {
    const manifest = await parseManifest(`
      schema Something
      particle Thing in 'thing.js'
        inThing: reads [Something]
        maybeOutThings: writes? [Something]
      recipe
        handle0: create // [Something]
        Thing
          inThing: reads handle0`);
    const verify = (manifest: Manifest) => {
      assert.isFalse(manifest.particles[0].handleConnections[0].isOptional);
      assert.isTrue(manifest.particles[0].handleConnections[1].isOptional);

      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
    };
    verify(manifest);
    verify(await parseManifest(manifest.toString()));
  });
  it('can resolve an immediate handle specified by a particle target', async () => {
    const manifest = await parseManifest(`
      schema S
      interface HostedInterface
        foo: reads S

      particle Hosted
        foo: reads S
        bar: reads S

      particle Transformation &work in '...js'
        hosted: hosts HostedInterface

      recipe
        Transformation
          hosted: hosts Hosted`);
    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('can resolve a particle with an inline schema', async () => {
    const manifest = await parseManifest(`
      particle P
        foo: reads * {value: Text}
      recipe
        h0: create
        P
          foo: reads h0
    `);
    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('can resolve a particle with a schema reference', async () => {
    const manifest = await parseManifest(`
      schema Foo
        far: Text
      particle P
        bar: reads Bar {foo: &Foo}
      recipe
        h0: create
        P
          bar: h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = checkDefined(recipe.particles[0].connections.bar.type.getEntitySchema());
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P
  bar: reads Bar {foo: &Foo {far: Text}}
  modality dom`);
  });
  it('can resolve a particle with an inline schema reference', async () => {
    const manifest = await parseManifest(`
      schema Foo
      particle P
        bar: reads Bar {foo: &Foo {far: Text}}
      recipe
        h0: create
        P
          bar: h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P
  bar: reads Bar {foo: &Foo {far: Text}}
  modality dom`);
  });
  it('can resolve a particle with a collection of schema references', async () => {
    const manifest = await parseManifest(`
      schema Foo
        far: Text
      particle P
        bar: reads Bar {foo: [&Foo]}
      recipe
        h0: create
        P
          bar: h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P
  bar: reads Bar {foo: [&Foo {far: Text}]}
  modality dom`);
  });
  it('can resolve a particle with a collection of inline schema references', async () => {
    const manifest = await parseManifest(`
      particle P
        bar: reads Bar {foo: [&Foo {far: Text}]}
      recipe
        h0: create
        P
          bar: h0
    `);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
    const schema = recipe.particles[0].connections.bar.type.getEntitySchema();
    const innerSchema = schema.fields.foo.schema.schema.model.getEntitySchema();
    verifyPrimitiveType(innerSchema.fields.far, 'Text');

    assert.strictEqual(manifest.particles[0].toString(),
`particle P
  bar: reads Bar {foo: [&Foo {far: Text}]}
  modality dom`);
  });
  it('can resolve inline schemas against out of line schemas', async () => {
    const manifest = await parseManifest(`
      schema T
        value: Text
      particle P
        foo: reads * {value: Text}
      particle P2
        foo: writes T

      recipe
        h0: create
        P
          foo: reads h0
        P2
          foo: writes h0
    `);
    const [validRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });
  it('can resolve handle types from inline schemas', async () => {
    const manifest = await parseManifest(`
      particle P
        foo: reads * {value: Text}
      particle P2
        foo: reads * {value: Text, value2: Text}
      particle P3
        foo: reads * {value: Text, value3: Text}
      particle P4
        foo: reads * {value: Text, value2: Number}

      recipe
        h0: create
        P
          foo: h0
        P2
          foo: h0

      recipe
        h0: create
        P2
          foo: h0
        P3
          foo: h0

      recipe
        h0: create
        P2
          foo: h0
        P4
          foo: h0
    `);
    const [validRecipe, suspiciouslyValidRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
    // Although suspicious, this is valid because entities in the
    // created handle just need to be able to be read as {value: Text, value2: Text}
    // and {value: Text, value3: Text}. Hence, the recipe is valid and the type
    // of the handle is * {value: Text, value2: Text, value3: Text};
    assert(suspiciouslyValidRecipe.normalize());
    const suspiciouslyValidFields =
        suspiciouslyValidRecipe.handles[0].type.canWriteSuperset.getEntitySchema().fields;
    verifyPrimitiveType(suspiciouslyValidFields.value, 'Text');
    verifyPrimitiveType(suspiciouslyValidFields.value2, 'Text');
    verifyPrimitiveType(suspiciouslyValidFields.value3, 'Text');
    assert(!invalidRecipe.normalize());
  });

  it('can infer field types of inline schemas from external schemas', async () => {
    const manifest = await parseManifest(`
      schema Thing
        value: Text
      particle P
        foo: reads Thing {value}
      particle P2
        foo: reads * {value: Text}

      recipe
        h0: create
        P
          foo: h0
        P2
          foo: h0
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('supports inline schemas with multiple names', async () => {
    const manifest = await parseManifest(`
      schema Thing1
        value1: Text
      schema Thing2
        value2: Number
      particle P
        foo: reads Thing1 Thing2 {value1, value2}
      particle P2
        foo: reads * {
          value1: Text,
          value2: Number,
        }

      recipe
        h0: create
        P
          foo: reads h0
        P2
          foo: reads h0
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can parse a manifest with storage key handle definitions', async () => {
    FirebaseStorageDriverProvider.register(
        Runtime.getRuntime().getCacheService(),
        mockFirebaseStorageKeyOptions);
    const manifest = await parseManifest(`
      schema Bar
        value: Text

      particle P
        foo: reads Bar

      store Foo of Bar 'test' @0 at 'firebase://testing.testing:testing/testing'

      recipe
        myHandle: map Foo
        P
          foo: reads myHandle
    `);
    const [validRecipe] = manifest.recipes;
    assert.isTrue(validRecipe.normalize());
    assert.isTrue(validRecipe.isResolved());
    assert.strictEqual(manifest.stores[0].toManifestString(),
                 (await parseManifest(manifest.stores[0].toManifestString())).toString());
    DriverFactory.clearRegistrationsForTesting();
  });

  it('can process a schema alias', async () => {
    const manifest = await parseManifest(`
      alias schema This That as SchemaAlias
      alias schema * extends SchemaAlias as Extended
    `);
    assert.isNotNull(manifest.findSchemaByName('SchemaAlias'));
    assert.sameMembers(manifest.findSchemaByName('Extended').names, ['This', 'That']);
  });

  it('expands schema aliases', async () => {
    const manifest = await parseManifest(`
      alias schema Name1 as Thing1
        field1: Text
      alias schema Name2 as Thing2
        field2: Text
      particle P in 'p.js'
        param: reads Thing1 Thing2 Name3 {field1: Text, field3: Text}
    `);
    const paramSchema = checkNotNull(manifest.findParticleByName('P').inputs[0].type.getEntitySchema());
    assert.sameMembers(paramSchema.names, ['Name1', 'Name2', 'Name3']);
    assert.sameMembers(Object.keys(paramSchema.fields), ['field1', 'field2', 'field3']);
  });

  it('fails when expanding conflicting schema aliases', async () => {
    try {
      const manifest = await parseManifest(`
        alias schema Name1 as Thing1
          field1: Text
        alias schema Name2 as Thing2
          field1: Number
        particle P in 'p.js'
          param: reads Thing1 Thing2 {}
      `);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'Could not merge schema aliases');
    }
  });

  it('fails when inline schema specifies a field type that does not match alias expansion', async () => {
    try {
      const manifest = await parseManifest(`
        alias schema Name1 as Thing1
          field1: Text
        particle P in 'p.js'
          param: reads Thing1 {field1: Number}
      `);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'does not match schema');
    }
  });

  it('can relate inline schemas to generic connections', async () => {
    const data = '{"root": {}, "locations": {}}';
    const manifest = await parseManifest(`
      schema Thing
        value: Text
        num: Number

      particle P
        inThing: reads ~a with Thing {value}
        outThing: writes ~a

      resource Things
        start
        ${data}

      store ThingStore of Thing in Things

      recipe
        input: map ThingStore
        output: create
        P
          inThing: reads input
          outThing: writes output
    `);
    const [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can parse a recipe with slot constraints on verbs', async () => {
    const manifest = await parseManifest(`
      recipe
        &verb
          consumeSlot: consumes
            provideSlot: provides
    `);

    const recipe = manifest.recipes[0];
    assert(recipe.normalize());

    assert.strictEqual(recipe.particles[0].primaryVerb, 'verb');
    assert.isUndefined(recipe.particles[0].spec);
    const slotConnection = recipe.particles[0].getSlotConnectionByName('consumeSlot');
    assert(slotConnection.providedSlots.provideSlot);
    assert.strictEqual(slotConnection.providedSlots.provideSlot.sourceConnection, slotConnection);
  });

  it('SLANDLES can parse a recipe with slot constraints on verbs', async () => {
    const manifest = await parseManifest(`
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
    assert.strictEqual(slotConnection.direction, '`consumes');

    assert.lengthOf(recipe.handles, 1);
    assert.lengthOf(recipe.handles[0].connections, 1);
    assert.strictEqual(recipe.handles[0].connections[0], slotConnection);
  });

  it('can parse particle arguments with tags', async () => {
    const manifest = await parseManifest(`
      schema Dog
      schema Sled
      schema DogSled
      particle DogSledMaker in 'thing.js'
        leader: reads Dog #leader
        team: reads [Dog]
        sled: reads Sled #dogsled
        dogsled: writes DogSled #multidog #winter #sled
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

  it('can parse a particle with tuples', async () => {
    const manifest = await parseManifest(`
      particle P
        foo: reads [(
          &Bar {photo: URL},
          &Baz {name: Text}
        )]
    `);
    const [particle] = manifest.particles;
    const [connection] = particle.handleConnections;
    assert.strictEqual(connection.type.tag, 'Collection');
    const collection = connection.type as CollectionType<TupleType>;
    assert.strictEqual(collection.collectionType.tag, 'Tuple');
    const tuple = collection.collectionType as TupleType;
    assert.lengthOf(tuple.innerTypes, 2);
    assert.strictEqual(tuple.innerTypes[0].tag, 'Reference');
    assert.strictEqual(tuple.innerTypes[1].tag, 'Reference');
  });

  it('parsing a particle with tuple of non reference fails', async () => {
    try {
      await parseManifest(`
        particle P
          foo: reads (Bar {photo: URL})
      `);
      assert.fail();
    } catch (e) {
      assert.include(e.message, 'Only tuples of references are supported');
    }
  });

  it('can round-trip particles with tags', async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  modality dom
  thing: consumes Slot #main #tagname
    otherThing: provides Slot #testtag`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  });

  it('SLANDLES can round-trip particles with tags', async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thing: \`consumes Slot {formFactor:big} #main #tagname
    otherThing: \`provides Slot {handle:thingy} #testtag
  modality dom`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  });
  it('SLANDLES can round-trip particles with fields', async () => {
    const manifestString = `particle TestParticle in 'a.js'
  input: reads [Product {}]
    output: writes [Product {}]
  thingy: reads ~a
  thing: \`consumes Slot {formFactor:big} #main #tagname
    otherThing: \`provides Slot {handle:thingy} #testtag
  modality dom`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    assert.strictEqual(manifestString, manifest.particles[0].toString());
  });

  it('can parse recipes with an implicit create handle', async () => {
    const manifest = await parseManifest(`
      particle A
        a: writes S {}
      particle B
        b: reads S {}

      recipe
        A
          a: writes h0
        B
          b: reads h0
    `);

    const recipe = manifest.recipes[0];
    assert.strictEqual(recipe.particles[0].connections.a.handle, recipe.particles[1].connections.b.handle);
  });

  it('can parse recipes with a require section', async () => {
    const manifest = await parseManifest(`
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
  });

  it('recipe resolution checks the require sections', async () => {
    const manifest = await parseManifest(`

      particle A
        input: reads S {}
      particle B
        output: writes S {}

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
      const manifest = await parseManifest(`
        particle A
          output1: writes T {}
          output2: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          output1: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          output1: writes T {}
          output2: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          input1: reads T {}
          input2: reads T {}
          output: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          input1: reads T {}
          input2: reads T {}
          output1: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          input1: reads T {}
          input2: reads T {}
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
      const manifest = await parseManifest(`
        particle A
          input1: reads T {}
          input2: reads T {}
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
      const manifest = await parseManifest(`
        particle A
          input1: reads T {}
          input2: reads T {}
          output1: writes T {}
          output2: writes T {}
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
      const manifest = await parseManifest(`
        particle A
          root: consumes
            mySlot: provides
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
      const manifest = await parseManifest(`
        particle A
          input: reads T {}
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
      const manifest = await parseManifest(`
        particle A
          input: reads T {}
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
      const manifest = await parseManifest(`
        particle A
          input: reads T {}
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
      const data = '{"root": {}, "locations": {}}';

      const manifest = await parseManifest(`
        store NobId of NobIdStore {nobId: Text} in NobIdJson
          claim is property1 and is property2
        resource NobIdJson
          start
          ${data}
      `);
      assert.lengthOf(manifest.stores, 1);
      const store = manifest.stores[0];
      assert.lengthOf(store.claims, 2);
      assert.strictEqual(store.claims[0].tag, 'property1');
      assert.strictEqual(store.claims[1].tag, 'property2');

      assert.include(manifest.toString(), '  claim is property1 and is property2');
    });

    it(`doesn't allow mixing 'and' and 'or' operations without nesting`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          input: reads T {}
          check input is property1 or is property2 and is property3
      `), `You cannot combine 'and' and 'or' operations in a single check expression.`);
    });

    it('SLANDLES can round-trip particles with checks and claims', async () => {
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

      const manifest = await parseManifest(manifestString);
      assert.strictEqual(manifest.toString(), manifestString);
    });
    it('can round-trip particles with checks and claims', async () => {
      const manifestString = `particle TestParticle in 'a.js'
  input1: reads T {}
  input2: reads T {}
  input3: reads T {}
  input4: reads T {}
  output1: writes T {}
  output2: writes T {}
  output3: writes T {}
  claim output1 is trusted
  claim output2 derives from input2 and derives from input2
  claim output3 is not dangerous
  check input1 is trusted or is from handle input2
  check input2 is not extraTrusted
  check input3 is from store MyStore
  check input4 is not from store 'my-store-id'
  check childSlot data is not somewhatTrusted
  modality dom
  parentSlot: consumes Slot
    childSlot: provides Slot`;

      const manifest = await parseManifest(manifestString);
      assert.strictEqual(manifest.toString(), manifestString);
   });

    it('fails for unknown handle names', async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          output: writes T {}
          claim oops is trusted
      `), `Can't make a claim on unknown handle oops`);

      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          input: reads T {}
          check oops is trusted
      `), `Can't make a check on unknown handle oops`);
    });

    it(`doesn't allow claims on inputs`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          foo: reads T {}
          claim foo is trusted
      `), `Can't make a claim on handle foo (not an output handle)`);
    });

    it(`doesn't allow checks on outputs`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          foo: writes T {}
          check foo is trusted
      `), `Can't make a check on handle foo with direction writes (not an input handle)`);
    });

    it(`doesn't allow multiple different claims for the same output`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          foo: writes T {}
          claim foo is trusted
          claim foo is trusted
      `), `Can't make multiple claims on the same output (foo)`);
    });

    it(`doesn't allow multiple different checks for the same input`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          foo: reads T {}
          check foo is trusted
          check foo is trusted
      `), `Can't make multiple checks on the same input (foo)`);
    });

    it(`doesn't allow checks on consumed slots`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          someOtherSlot: consumes
            mySlot: provides
          check someOtherSlot data is trusted
      `), `Slot someOtherSlot is a consumed slot. Can only make checks on provided slots`);
    });

    it(`doesn't allow checks on unknown slots`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          someOtherSlot: consumes
            mySlot: provides
          check missingSlot data is trusted
      `), `Can't make a check on unknown slot missingSlot`);
    });

    it(`doesn't allow multiple provided slots with the same name`, async () => {
      await assertThrowsAsync(async () => await parseManifest(`
        particle A
          firstSlot: consumes
            mySlot: provides
          secondSlot: consumes
            mySlot: provides
      `), `Another slot with name 'mySlot' has already been provided by this particle`);
    });
  });

  describe('all schemas', () => {
    describe('handles manifests with no schemas', () => {
      it('handles an empty manifest', async () => {
        const emptyManifest = await parseManifest(``);
        const emptyResult = emptyManifest.allSchemas;
        assert.isEmpty(emptyResult);
      });
      it('handles a non-empty manifest', async () => {
        const manifest = await parseManifest(`
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
        const manifest = await parseManifest(`
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
        const manifest = await parseManifest(`
        schema Foo
          a: Text
          b: Number
          c: Boolean
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
        const manifest = await parseManifest(`
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
        const manifest = await parseManifest(`
        schema Foo
          a: Text
        schema Boo
          b: Number
          c: Boolean
        schema Roo
          d: URL
        schema Goo
          e: Text
          f: Text
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
          name: Text
          age: Number

        store FooStore of Foo in 'b'

        particle Bar
          recipe Food
            Bar`;
        const jsonStr =
        `
        {
          "root": {
            "values": {
              "anid": {"value": {"id": "anid", "rawData": {"name": "Jack", "age": 7}}, "version": {"u": 1}}
            },
            "version": {"u": 1}
          },
          "locations": {}
        }`;
        const loader = new Loader(null, {
          './a': manifestStr,
          './b': jsonStr,
        });
        const manifest = await Manifest.load('./a', loader, {memoryProvider});
        const result = manifest.allSchemas;
        assert.lengthOf(result, 1);
        assert.lengthOf(result[0].names, 1);
        assert.deepEqual(result[0].names, ['Foo']);
        assert.lengthOf(Object.keys(result[0].fields), 2);
        assert.isDefined(result[0].fields.name);
        assert.isDefined(result[0].fields.age);
      });
      it('handles multiple schemas with internal and external stores and passing them via handles', async () => {
        const inlineJson =
          `{"root": {"values": {"anid": {"value": {"id": "anid", "rawData": {"num": 73, "txt": "abc", "lnk": "http://xyz", "flg": true}}, "version": {"u": 1}}}, "version": {"u": 1}}, "locations": {}}`;

        const manifestStr = `
        schema Data
          num: Number
          txt: Text
          lnk: URL
          flg: Boolean

        resource DataResource
          start
          ${inlineJson}

        store DataStore of Data in DataResource


        schema Info
          for: Text
          val: Number

        store InfoStore of [Info] in 'b'


        particle TestParticle
          root: consumes
          data: reads writes Data
          res: writes Data
          info: reads writes [Info]

        recipe KotlinTestRecipe
          h1: copy DataStore
          h2: create
          h3: copy InfoStore
          TestParticle
            data: reads h1
            res: writes h2
            info: reads writes h3


        particle ServiceParticle
          root: consumes

        recipe ServicesAPI
          ServiceParticle
        `;
        const jsonStr =
        `
        {
          "root": {
            "values": {
              "ida": {"value": {"id": "ida", "rawData": {"for": "xx", "val": -5.8}}, "version": {"v": 1}},
              "idb": {"value": {"id": "idb", "rawData": {"val": 107}}, "version": {"w": 1}},
              "idc": {"value": {"id": "idc", "rawData": {"for": "yy"}}, "version": {"x": 1}}
            },
            "version": {"v": 1, "w": 1, "x": 1}
          },
          "locations": {}
        }
        `;
        const loader = new Loader(null, {
          './a': manifestStr,
          './b': jsonStr,
        });
        const manifest = await Manifest.load('./a', loader, {memoryProvider});
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
    const manifest = await parseManifest(`
schema Thing
  value: Text

particle A
  thing: reads Thing
    `);
    assert.lengthOf(manifest.errors, 1);
    assert.equal(manifest.errors[0].key, 'externalSchemas');
  });

  it('can round-trip external particles', async () => {
    const manifestString = `external particle TestParticle
  input: reads [Product {}]
  modality dom`;

    const manifest = await parseManifest(manifestString);
    assert.lengthOf(manifest.particles, 1);
    const particle = manifest.particles[0];
    assert.isTrue(particle.external);
    assert.isNull(particle.implFile);
    assert.strictEqual(manifestString, particle.toString());
  });
});

describe('Manifest storage migration', () => {
  let memoryProvider;
  beforeEach(() => { memoryProvider = new TestVolatileMemoryProvider(); });

  it('inflates into RamDisk', async () => {
    const manifest = await Manifest.parse(`
store NobId of NobIdStore {nobId: Text} in NobIdJson
resource NobIdJson
  start
  {
    "root": {
      "values": {
        "eid2": {"value": {"id": "eid2", "rawData": {"nobId": "12345"}}, "version": {"u": 1}}
      },
      "version": {"u": 1}
    },
    "locations": {}
  }
`, {memoryProvider});
    assert.lengthOf(manifest.stores, 1);
    const store = manifest.stores[0];

    assert.instanceOf(store, Store);
    assert.strictEqual(store.name, 'NobId');
    assert.instanceOf(store.storageKey, RamDiskStorageKey);
    const schema = store.type.getEntitySchema();
    assert.sameMembers(schema.names, ['NobIdStore']);
  });
});
describe('annotations', async () => {
  it('parses annotations', async () => {
    const annotationsStr = `
annotation noParam
  targets: [Particle]
  retention: Source
  doc: 'this is doc'
annotation oneParam(bar: Text)
  targets: [Recipe, Particle]
  retention: Source
  doc: 'this is doc'
annotation multiParam(foo: Text, bar: Number, baz: Boolean)
  targets: [Store, Handle, HandleConnection, Schema, SchemaField, Recipe]
  retention: Runtime
  doc: 'this is doc'
annotation goodForAll
  retention: Runtime
  doc: 'this is doc'
`;
    const manifestStr = `${annotationsStr.trim()}
@oneParam(bar: 'bar')
particle Foo
  modality dom
@oneParam(bar: 'hello world')
recipe One
@multiParam(foo: 'hello', bar: 5, baz: false)
@noParam()
recipe Two
@goodForAll()
recipe Three`;
    const manifest = await Manifest.parse(manifestStr);
    assert.equal(Object.keys(manifest.annotations).length, 4);
    assert.sameMembers(Object.keys(manifest.annotations), ['noParam', 'oneParam', 'multiParam', 'goodForAll']);
    const noParam = manifest.annotations['noParam'];
    assert.isEmpty(noParam.params);
    assert.deepEqual(noParam.targets, ['Particle']);
    assert.equal(noParam.retention, 'Source');
    assert.equal(noParam.doc, 'this is doc');

    const oneParam = manifest.annotations['oneParam'];
    assert.lengthOf(Object.keys(oneParam.params), 1);
    assert.equal(oneParam.params['bar'], 'Text');
    assert.deepEqual(oneParam.targets, ['Recipe', 'Particle']);
    assert.equal(oneParam.retention, 'Source');

    const multiParam = manifest.annotations['multiParam'];
    assert.lengthOf(Object.keys(multiParam.params), 3);
    assert.equal(multiParam.params['foo'], 'Text');
    assert.equal(multiParam.params['bar'], 'Number');
    assert.equal(multiParam.params['baz'], 'Boolean');
    assert.deepEqual(multiParam.targets, ['Store', 'Handle', 'HandleConnection', 'Schema', 'SchemaField', 'Recipe']);
    assert.equal(multiParam.retention, 'Runtime');

    const goodForAll = manifest.annotations['goodForAll'];
    assert.isEmpty(goodForAll.params);
    assert.isEmpty(goodForAll.targets);
    assert.equal(goodForAll.retention, 'Runtime');

    assert.equal(manifest.toString(), manifestStr);

    for (const recipe of manifest.recipes) {
      const cloneRecipe = recipe.clone();
      assert.equal(cloneRecipe.toString(), recipe.toString());
    }
  });
  it('throws when annotation not defined', async () => {
    await assertThrowsAsync(async () => await Manifest.parse(`
        @nonexistent()
        recipe
    `), `annotation not found: 'nonexistent'`);
  });
  it('throws when wrong annotation target', async () => {
    await assertThrowsAsync(async () => await Manifest.parse(`
        annotation noParam
          retention: Source
          targets: [Particle]
          doc: 'doc'
        @noParam()
        recipe
    `), `Annotation 'noParam' is invalid for Recipe`);
  });
  const oneParamAnnotation = `
        annotation oneParam(foo: Text)
          retention: Source
          targets: [Recipe, Particle]
          doc: 'doc'`;
  it('throws when wrong annotation param', async () => {
    console.log(`
        ${oneParamAnnotation}
        @oneParam(wrong: 'hello')
        recipe
    `);
    await assertThrowsAsync(async () => await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam(wrong: 'hello')
        recipe
    `), `unexpected annotation param: 'wrong'`);
    await assertThrowsAsync(async () => await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam(foo: 'hello', wrong: 'world')
        recipe
    `), `unexpected annotation param: 'wrong'`);
  });
  it('throws when annotation param value of incorrect type', async () => {
    await assertThrowsAsync(async () => await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam(foo: 5)
        recipe
    `), `expected 'Text' for param 'foo', instead got 5`);
    await assertThrowsAsync(async () => await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam(foo: false)
        recipe
    `), `expected 'Text' for param 'foo', instead got false`);
  });
  it('parses recipe annotation with text param', async () => {
    const recipe1 = (await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam(foo: 'hello')
        recipe`)).recipes[0];
    assert.lengthOf(recipe1.annotations, 1);
    assert.equal(recipe1.annotations[0].name, 'oneParam');
    assert.equal(recipe1.annotations[0].params['foo'], 'hello');
    assert.isTrue(recipe1.annotations[0].isValidForTarget('Recipe'));
    assert.isFalse(recipe1.annotations[0].isValidForTarget('Schema'));
  });
  it('parses recipe annotation with no param', async () => {
    const recipe2 = (await Manifest.parse(`
        ${oneParamAnnotation}
        @oneParam()
        recipe`)).recipes[0];
    assert.lengthOf(recipe2.annotations, 1);
    assert.equal(recipe2.annotations[0].name, 'oneParam');
    assert.isUndefined(recipe2.annotations[0].params['foo']);
  });
});
