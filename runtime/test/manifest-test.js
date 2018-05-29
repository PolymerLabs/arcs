/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../manifest.js';
import {parser} from '../build/manifest-parser.js';
import {assert} from './chai-web.js';
import {fs} from '../../platform/fs-web.js';
import {path} from '../../platform/path-web.js';

async function assertRecipeParses(input, result) {
  // Strip common leading whitespace.
  //result = result.replace(new Regex(`()^|\n)${result.match(/^ */)[0]}`), '$1'),
  let target = (await Manifest.parse(result)).recipes[0].toString();
  assert.deepEqual((await Manifest.parse(input)).recipes[0].toString(), target);
}

describe('manifest', function() {
  it('can parse a manifest containing a recipe', async () => {
    let manifest = await Manifest.parse(`
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
    let verify = (manifest) => {
      let particle = manifest.particles[0];
      assert.equal('SomeParticle', particle.name);
      assert.deepEqual(['work'], particle.verbs);
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal('SomeRecipe', recipe.name);
      assert.deepEqual(['someVerb1', 'someVerb2'], recipe.verbs);
      assert.equal(manifest.findRecipesByVerb('SomeRecipe')[0], recipe);
      assert.equal(recipe.particles.length, 1);
      assert.equal(recipe.handles.length, 2);
      assert.equal(recipe.handles[0].fate, 'map');
      assert.equal(recipe.handles[1].fate, 'create');
      assert.equal(recipe.handleConnections.length, 1);
      assert.sameMembers(recipe.handleConnections[0].tags, ['tag']);
      assert.equal(recipe.pattern, 'hello world');
      assert.equal(recipe.handles[1].pattern, 'best handle');
      let type = recipe.handleConnections[0].rawType;
      assert.equal(1, Object.keys(manifest.schemas).length);
      let schema = Object.values(manifest.schemas)[0];
      assert.equal(3, Object.keys(schema.description).length);
      assert.deepEqual(Object.keys(schema.description), ['pattern', 'plural', 'value']);
    };
    verify(manifest);
    // TODO(dstockwell): The connection between particles and schemas does
    //                   not roundtrip the same way.
    let type = manifest.recipes[0].handleConnections[0].rawType;
    assert.equal('one-s', type.toPrettyString());
    assert.equal('many-ses', type.collectionOf().toPrettyString());
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing a particle specification', async () => {
    let schemaStr = `
schema Product
schema Person
    `;
    let particleStr0 =
`particle TestParticle in 'testParticle.js'
  in [Product {}] list
  out Person {} person
  affordance dom
  affordance dom-touch
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

    let particleStr1 =
`particle NoArgsParticle in 'noArgsParticle.js'
  affordance dom`;
    let manifest = await Manifest.parse(`
${schemaStr}
${particleStr0}
${particleStr1}
    `);
    let verify = (manifest) => {
      assert.equal(manifest.particles.length, 2);
      assert.equal(particleStr0, manifest.particles[0].toString());
      assert.equal(particleStr1, manifest.particles[1].toString());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing a particle with an argument list', async () => {
    let manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      in [Product {}] list
      out Person {} person
      consume thing
        provide otherThing
    `);
    assert.equal(manifest.particles.length, 1);
    assert.equal(manifest.particles[0].connections.length, 2);
  });
  it('can parse a manifest with dependent handles', async () => {
    let manifest = await Manifest.parse(`
    particle TestParticle in 'a.js'
      in [Product {}] input
        out [Product {}] output
      consume thing
        provide otherThing
    `);
    assert.equal(manifest.particles.length, 1);
    assert.equal(manifest.particles[0].connections.length, 2);
  });
  it('can round-trip particles with dependent handles', async () => {
    let manifestString = `particle TestParticle in 'a.js'
  in [Product {}] input
    out [Product {}] output
  affordance dom
  consume thing
    provide otherThing`;

    let manifest = await Manifest.parse(manifestString);
    assert.equal(manifest.particles.length, 1);
    assert.equal(manifestString, manifest.particles[0].toString());
  });
  it('can parse a manifest containing a schema', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        Text value`);
    let verify = (manifest) => assert.equal(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing an extended schema', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
        Text value
      schema Bar extends Foo`);
    let verify = (manifest) => assert.equal(manifest.schemas.Bar.fields.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('two manifests with stores with the same filename, store name and data have the same ids', async () => {
    let manifestA = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    let manifestB = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    assert.equal(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('two manifests with stores with the same filename and store name but different data have different ids', async () => {
    let manifestA = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
        resource NobIdJson
          start
          [{"nobId": "12345"}]
        `, {fileName: 'the.manifest'});

    let manifestB = await Manifest.parse(`
        store NobId of NobIdStore {Text nobId} in NobIdJson
         resource NobIdJson
           start
           [{"nobId": "67890"}]
          `, {fileName: 'the.manifest'});

    assert.notEqual(manifestA.stores[0].id.toString(), manifestB.stores[0].id.toString());
  });
  it('supports recipes with constraints', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle A
        in S a
      particle B
        in S b

      recipe Constrained
        A.a -> B.b`);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe._connectionConstraints.length, 1);
      let constraint = recipe._connectionConstraints[0];
      assert.equal(constraint.from.particle.name, 'A');
      assert.equal(constraint.from.connection, 'a');
      assert.equal(constraint.to.particle.name, 'B');
      assert.equal(constraint.to.connection, 'b');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with constraints that reference handles', async () => {
    let manifest = await Manifest.parse(`
      particle A
        out S {} a

      recipe Constrained
        ? as localThing
        A.a -> localThing`);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe._connectionConstraints.length, 1);
      let constraint = recipe._connectionConstraints[0];
      assert.equal(constraint.from.particle.name, 'A');
      assert.equal(constraint.from.connection, 'a');
      assert.equal(constraint.to.handle.localName, 'localThing');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with local names', async () => {
    let manifest = await Manifest.parse(`
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
          x -> thingHandle`,
      `particle P1
      particle P2

      recipe
        ? #things as thingHandle
        P1 as p1
          x -> thingHandle
        P2 as particle0
          x -> thingHandle`);
    let deserializedManifest = (await Manifest.parse(manifest.toString(), {}));
  });
  // TODO: move these tests to new-recipe tests.
  it('can normalize simple recipes', async () => {
    let manifest = await Manifest.parse(`
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
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    assert.notEqual(await recipe1.digest(), await recipe2.digest());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
    assert.equal(await recipe1.digest(), await recipe2.digest());

    let deserializedManifest = await Manifest.parse(manifest.toString(), {});
  });
  it('can normalize recipes with interdependent ordering of handles and particles', async () => {
    let manifest = await Manifest.parse(`
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
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
  });
  it('can resolve recipe particles defined in the same manifest', async () => {
    let manifest = await Manifest.parse(`
      schema Something
      schema Someother
      particle Thing in 'thing.js'
        in [Something] someThings
        out [Someother] someOthers
      recipe
        Thing`);
    let verify = (manifest) => assert(manifest.recipes[0].particles[0].spec);
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('treats a failed import as non-fatal', async () => {
    let manifests = {
      a: `import 'b'`,
      b: `lol what is this`,
    };
    let loader = {
      loadResource(name) {
        return manifests[name];
      },
      path(file) {
        return '';
      },
      join(path, file) {
        return file;
      },
    };
    await Manifest.load('a', loader);
  });
  it('throws an error when a particle has invalid description', async () => {
    try {
      let manifest = await Manifest.parse(`
        schema Foo
        particle Thing in 'thing.js'
          in Foo foo
          description \`Does thing\`
            bar \`my-bar\``);
      assert(false);
    } catch (e) {
      assert.equal(e.message, 'Unexpected description for bar');
    }
  });
  it('can load a manifest via a loader', async () => {
    let registry = {};
    let loader = {
      loadResource() {
        return 'recipe';
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path}/${file}`;
      },
    };
    let manifest = await Manifest.load('some-path', loader, {registry});
    assert(manifest.recipes[0]);
    assert.equal(manifest, await registry['some-path']);
  });
  it('can load a manifest with imports', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `import 'b'`,
          b: `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader, {registry});
    assert.equal(await registry.a, manifest);
    assert.equal(manifest.imports[0], await registry.b);
  });
  it('can resolve recipe particles imported from another manifest', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              recipe
                ParticleB
                `,
          b: `
              schema Thing
              particle ParticleB in 'b.js'
                in Thing thing`
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader, {registry});
    assert.isTrue(manifest.recipes[0].particles[0].spec.equals((await registry.b).findParticleByName('ParticleB')));
  });
  it('can parse a schema extending a schema in another manifest', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              schema Bar extends Foo`,
          b: `
              schema Foo
                Text value`
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader, {registry});
    assert.equal(manifest.schemas.Bar.fields.value, 'Text');
  });
  it('can find all imported recipes', async () => {
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              import 'c'
              recipe`,
          b: `
              import 'c'
              recipe`,
          c: `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader);
    assert.equal(manifest.recipes.length, 3);
  });
  it('can parse a schema with union typing', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
        (Text or URL) u
        Text test
        (Number, Number, Boolean) t`);
    let verify = (manifest) => {
      let opt = manifest.schemas.Foo.fields;
      assert.equal(opt.u.kind, 'schema-union');
      assert.deepEqual(opt.u.types, ['Text', 'URL']);
      assert.equal(opt.t.kind, 'schema-tuple');
      assert.deepEqual(opt.t.types, ['Number', 'Number', 'Boolean']);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('can parse a manifest containing a recipe with slots', async () => {
    let manifest = await Manifest.parse(`
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
        slot 'slotIDs:A' as slot0
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
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      recipe.normalize();

      assert.equal(recipe.particles.length, 2);
      assert.equal(recipe.handles.length, 1);
      assert.equal(recipe.handleConnections.length, 2);
      assert.equal(recipe.slots.length, 3);
      assert.equal(recipe.slotConnections.length, 3);
      assert.equal(Object.keys(recipe.particles[0].consumedSlotConnections).length, 2);
      assert.equal(Object.keys(recipe.particles[1].consumedSlotConnections).length, 1);
      let mySlot = recipe.particles[1].consumedSlotConnections['mySlot'];
      assert.isDefined(mySlot.targetSlot);
      assert.equal(Object.keys(mySlot.providedSlots).length, 2);
      assert.equal(mySlot.providedSlots['oneMoreSlot'], recipe.particles[0].consumedSlotConnections['oneMoreSlot'].targetSlot);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('unnamed consume slots', async () => {
    let manifest = await Manifest.parse(`
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
    let recipe = manifest.recipes[0];
    assert.equal(2, recipe.slotConnections.length);
    assert.equal(0, recipe.slots.length);
  });
  it('multiple consumed slots', async () => {
    let parseRecipe = async (args) => {
      let recipe = (await Manifest.parse(`
        particle SomeParticle in 'some-particle.js'
          ${args.isRequiredSlotA ? 'must ' : ''}consume slotA
          ${args.isRequiredSlotB ? 'must ' : ''}consume slotB

        recipe
          slot 'slota-0' as s0
          SomeParticle
            consume slotA as s0
      `)).recipes[0];
      recipe.normalize();
      assert.equal(args.expectedIsResolved, recipe.isResolved());
    };
    await parseRecipe({isRequiredSlotA: false, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({isRequiredSlotA: true, isRequiredSlotB: false, expectedIsResolved: true});
    await parseRecipe({isRequiredSlotA: false, isRequiredSlotB: true, expectedIsResolved: false});
    await parseRecipe({isRequiredSlotA: true, isRequiredSlotB: true, expectedIsResolved: false});
  });
  it('recipe slots with tags', async () => {
    let manifest = await Manifest.parse(`
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
    assert.equal(manifest.particles.length, 1);
    let spec = manifest.particles[0];
    assert.equal(spec.slots.size, 1);
    let slotSpec = [...spec.slots.values()][0];
    assert.deepEqual(slotSpec.tags, ['aaa']);
    assert.equal(slotSpec.providedSlots.length, 1);
    let providedSlotSpec = slotSpec.providedSlots[0];
    assert.deepEqual(providedSlotSpec.tags, ['bbb']);

    // verify recipe slots
    assert.equal(manifest.recipes.length, 1);
    let recipe = manifest.recipes[0];
    assert.equal(recipe.slots.length, 2);
    let recipeSlot = recipe.slots.find(s => s.id == 'slot-id0');
    assert(recipeSlot);
    assert.deepEqual(recipeSlot.tags, ['aa', 'aaa']);

    let slotConn = recipe.particles[0].consumedSlotConnections['slotA'];
    assert(slotConn);
    assert.deepEqual(['aa', 'hello'], slotConn.tags);
    assert.equal(1, Object.keys(slotConn.providedSlots).length);
  });
  it('recipe slots with different names', async () => {
    let manifest = await Manifest.parse(`
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
    assert.equal(manifest.particles.length, 2);
    assert.equal(manifest.recipes.length, 1);
    let recipe = manifest.recipes[0];
    assert.equal(recipe.slots.length, 2);
    assert.equal(recipe.particles.find(p => p.name == 'ParticleB').consumedSlotConnections['slotB1'].providedSlots['slotB2'],
                 recipe.particles.find(p => p.name == 'ParticleA').consumedSlotConnections['slotA'].targetSlot);
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
  });
  it('recipe provided slot with no local name', async () => {
    let manifest = await Manifest.parse(`
      particle ParticleA in 'some-particle.js'
        consume slotA1
          provide slotA2
      recipe
        ParticleA
          consume slotA1
            provide slotA2
    `);
    assert.equal(manifest.particles.length, 1);
    assert.equal(manifest.recipes.length, 1);
    let recipe = manifest.recipes[0];
    assert.equal(recipe.slots.length, 1);
    assert.equal('slotA2', recipe.slots[0].name);
    assert.isUndefined(recipe.particles[0].consumedSlotConnections['slotA1'].targetSlot);
    recipe.normalize();
    assert.isFalse(recipe.isResolved());
  });
  it('incomplete aliasing', async () => {
    let recipe = (await Manifest.parse(`
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

    assert.equal(2, recipe.slotConnections.length);
    let slotConnA = recipe.slotConnections.find(s => s.name === 'slotA');
    assert.isUndefined(slotConnA.sourceConnection);

    assert.equal(recipe.slots.length, 1);
    let slotB = recipe.slots[0];
    assert.equal('slotB', slotB.name);
    assert.equal(slotB.consumeConnections.length, 1);
    assert.equal(slotB.sourceConnection, slotConnA);
  });
  it('relies on the loader to combine paths', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          'somewhere/a': `import 'path/b'`,
          'somewhere/a path/b': `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path} ${file}`;
      },
    };
    let manifest = await Manifest.load('somewhere/a', loader, {registry});
    assert(registry['somewhere/a path/b']);
  });
  it('parses all particles manifests', async () => {
    let verifyParticleManifests = (particlePaths) => {
      let count = 0;
      particlePaths.forEach(particleManifestFile => {
        if (fs.existsSync(particleManifestFile)) {
          try {
            let data = fs.readFileSync(particleManifestFile, 'utf-8');
            let model = parser.parse(data);
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

    let shellParticlesPath = './shell/artifacts/';
    let shellParticleNames = [];
    fs.readdirSync(shellParticlesPath).forEach(name => {
      let manifestFolderName = path.join(shellParticlesPath, name);
      if (fs.statSync(manifestFolderName).isDirectory()) {
        shellParticleNames = shellParticleNames.concat(
            fs.readdirSync(manifestFolderName)
                .filter(fileName => fileName.endsWith('.schema') || fileName.endsWith('.manifest') || fileName.endsWith('.recipes'))
                .map(fileName => path.join(manifestFolderName, fileName)));
      }
    });
    assert.isTrue(0 < verifyParticleManifests(shellParticleNames));
  });
  it('loads entities from json files', async () => {
    let manifestSource = `
        schema Thing
        store Store0 of [Thing] in 'entities.json'`;
    let entitySource = JSON.stringify([
      {someProp: 'someValue'},
      {
        $id: 'entity-id',
        someProp: 'someValue2'
      },
    ]);
    let loader = {
      loadResource(path) {
        return {
          'the.manifest': manifestSource,
          'entities.json': entitySource,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('the.manifest', loader);
    let store = manifest.findStoreByName('Store0');
    assert(store);
    assert.deepEqual(await store.toList(), [
      {
        id: 'manifest:the.manifest::0',
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        rawData: {someProp: 'someValue2'},
      }
    ]);
  });
  it('throws an error when a store has invalid json', async () => {
    try {
      let manifest = await Manifest.parse(`
      schema Thing
      resource EntityList
        start
        this is not json?

      store Store0 of [Thing] in EntityList`);
      assert(false);
    } catch (e) {
      assert.deepEqual(e.message, `Post-parse processing error caused by \'undefined\' line 7.
Error parsing JSON from 'EntityList' (Unexpected token h in JSON at position 1)'
        store Store0 of [Thing] in EntityList
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
    }
  });
  it('loads entities from a resource section', async () => {
    let manifest = await Manifest.parse(`
      schema Thing

      resource EntityList
        start
        [
          {"someProp": "someValue"},
          {"$id": "entity-id", "someProp": "someValue2"}
        ]

      store Store0 of [Thing] in EntityList
    `, {fileName: 'the.manifest'});
    let store = manifest.findStoreByName('Store0');
    assert(store);
    assert.deepEqual(await store.toList(), [
      {
        id: 'manifest:the.manifest::0',
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        rawData: {someProp: 'someValue2'},
      }
    ]);
  });
  it('resolves store names to ids', async () => {
    let manifestSource = `
        schema Thing
        store Store0 of [Thing] in 'entities.json'
        recipe
          map Store0 as myStore`;
    let entitySource = JSON.stringify([]);
    let loader = {
      loadResource(path) {
        return {
          'the.manifest': manifestSource,
          'entities.json': entitySource,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('the.manifest', loader);
    let recipe = manifest.recipes[0];
    assert.deepEqual(recipe.toString(), 'recipe\n  map \'manifest:the.manifest:store0:97d170e1550eee4afc0af065b78cda302a97674c\' as myStore');
  });
  it('has prettyish syntax errors', async () => {
    try {
      await Manifest.parse('recipe ?', {fileName: 'bad-file'});
      assert(false);
    } catch (e) {
      assert.deepEqual(e.message, `Parse error in 'bad-file' line 1.
Expected " ", "&", "//", "\\n", "\\r", [ ], [A-Z], or [a-z] but "?" found.
  recipe ?
         ^`);
    }
  });

  it('errors when the manifest connects a particle incorrectly', async () => {
    let manifest = `
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
      assert.match(e.message, /'->' not compatible with 'in' param of 'TestParticle'/);
    }
  });

  it('errors when the manifest references a missing particle param', async () => {
    let manifest = `
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
      assert.match(e.message, /param 'b' is not defined by 'TestParticle'/);
    }
  });

  it('errors when the manifest references a nonexistent local name', async () => {
    let manifest = `
        schema S
        particle A
          in S s
        recipe
          A
            s = noSuchHandle`;
    try {
      await Manifest.parse(manifest);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /Could not find handle 'noSuchHandle'/);
    }
  });

  it('errors when the manifest references a missing consumed slot', async () => {
    let manifest = `
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

  it('errors when the manifest references a missing provided slot', async () => {
    let manifest = `
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

  it('errors when the manifest uses invalid connection constraints', async () => {
    // nonexistent fromParticle
    let manifestFrom = `
        recipe
          NoParticle.paramA -> OtherParticle.paramB`;
    try {
      await Manifest.parse(manifestFrom);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /could not find particle 'NoParticle'/);
    }
    // nonexistent toParticle
    let manifestTo = `
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
    let manifestFromParam = `
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
    let manifestToParam = `
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
    let manifestSource = `
      recipe
        search \`Hello dear world\``;
    let recipe = (await Manifest.parse(manifestSource)).recipes[0];
    assert.isNotNull(recipe.search);
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual(['hello', 'dear', 'world'], recipe.search.unresolvedTokens);
    assert.deepEqual([], recipe.search.resolvedTokens);
    assert.isTrue(recipe.search.isValid());
    recipe.normalize();
    assert.isFalse(recipe.search.isResolved());
    assert.isFalse(recipe.isResolved());
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens \`dear\` \`hello\` \`world\``);

    recipe = (await Manifest.parse(manifestSource)).recipes[0];
    // resolve some tokens.
    recipe.search.resolveToken('hello');
    recipe.search.resolveToken('world');
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual(['dear'], recipe.search.unresolvedTokens);
    assert.deepEqual(['hello', 'world'], recipe.search.resolvedTokens);
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens \`dear\` // \`hello\` \`world\``);

    // resolve all tokens.
    recipe.search.resolveToken('dear');
    recipe.normalize();
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual([], recipe.search.unresolvedTokens);
    assert.deepEqual(['dear', 'hello', 'world'], recipe.search.resolvedTokens);
    assert.isTrue(recipe.search.isResolved());
    assert.isTrue(recipe.isResolved());
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens // \`dear\` \`hello\` \`world\``);
  });
  it('merge recipes with search strings', async () => {
    let recipe1 = (await Manifest.parse(`recipe
  search \`Hello world\``)).recipes[0];
    let recipe2 = (await Manifest.parse(`recipe
  search \`good morning\`
    tokens \`morning\` // \`good\``)).recipes[0];

    recipe2.mergeInto(recipe1);
    assert.equal('Hello world good morning', recipe1.search.phrase);
    assert.deepEqual(['hello', 'world', 'morning'], recipe1.search.unresolvedTokens);
    assert.deepEqual(['good'], recipe1.search.resolvedTokens);
  });
  it('can parse a manifest containing stores', async () => {
    let loader = {
      loadResource() {
        return '[]';
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path}/${file}`;
      },
    };

    let manifest = await Manifest.parse(`
  schema Product
  store ClairesWishlist of [Product] #wishlist in 'wishlist.json'
    description \`Claire's wishlist\``, {loader});
    let verify = (manifest) => {
      assert.equal(manifest.stores.length, 1);
      assert.deepEqual(['wishlist'], manifest._storeTags.get(manifest.stores[0]));
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {loader}));
  });
  it('can parse a manifest containing resources', async () => {
    let manifest = await Manifest.parse(`
resource SomeName
  start
  {'foo': 'bar'}
  hello
`, {});
    assert.deepEqual(manifest.resources['SomeName'], `{'foo': 'bar'}\nhello\n`);
  });
  it('can parse a manifest containing incomplete shapes', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
      shape FullShape
        in Foo foo
        consume root
        provide action
      shape ShapeNoHandleName
        in Foo *
      shape ShapeNoHandleType
        inout foo
      shape ShapeNoHandleDirection
        Foo foo
      shape ShapeOnlyHandleDirection
        out *
      shape ShapeManyHandles
        in Foo *
        out [~a] *
      shape ShapeConsumeNoName
        consume
      shape ShapeConsumeRequiredSetSlot
        must consume set of
        must provide
      shape ShapeOnlyProvideSlots
        provide action
    `);
    assert.equal(9, manifest.shapes.length);
    assert(manifest.findShapeByName('FullShape'));
  });
  it('can parse a manifest containing shapes', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
      shape Shape
        in Foo foo
      particle ShapeParticle
        host Shape shape
      recipe
        create as handle0
        ShapeParticle
          shape = handle0`);
    assert(manifest.findShapeByName('Shape'));
    assert(manifest.recipes[0].normalize());
  });
  it('can parse shapes using new-style body syntax', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
      shape Shape
        in Foo foo
      particle ShapeParticle
        host Shape shape
      recipe
        create as handle0
        ShapeParticle
          shape = handle0
    `);
    assert(manifest.findShapeByName('Shape'));
    assert(manifest.recipes[0].normalize());
  });
  it('can resolve optional handles', async () => {
    let manifest = await Manifest.parse(`
      schema Something
      particle Thing in 'thing.js'
        in [Something] inThing
        out [Something]? maybeOutThings
      recipe
        create as handle0 // [Something]
        Thing
          inThing <- handle0`);
    let verify = (manifest) => {
      assert.isFalse(manifest.particles[0].connections[0].isOptional);
      assert.isTrue(manifest.particles[0].connections[1].isOptional);

      let recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can resolve an immediate handle specified by a particle target', async () => {
    let manifest = await Manifest.parse(`
      schema S
      shape HostedShape
        in S foo

      particle Hosted
        in S foo
        in S bar

      particle Transformation &work in '...js'
        host HostedShape hosted

      recipe
        Transformation
          hosted = Hosted`);
    let [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('can resolve a particle with an inline schema', async () => {
    let manifest = await Manifest.parse(`
      particle P
        in * {Text value} foo
      recipe
        create as handle
        P
          foo = handle
    `);
    let [recipe] = manifest.recipes;
    assert(recipe.normalize());
    assert(recipe.isResolved());
  });
  it('can resolve inline schemas against out of line schemas', async () => {
    let manifest = await Manifest.parse(`
      schema T
        Text value
      particle P
        in * {Text value} foo
      particle P2
        out T foo

      recipe
        create as handle
        P
          foo = handle
        P2
          foo = handle
    `);
    let [validRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });
  it('can resolve handle types from inline schemas', async () => {
    let manifest = await Manifest.parse(`
      particle P
        in * {Text value} foo
      particle P2
        in * {Text value, Text value2} foo
      particle P3
        in * {Text value, Text value3} foo
      particle P4
        in * {Text value, Number value2} foo

      recipe
        create as handle
        P
          foo = handle
        P2
          foo = handle

      recipe
        create as handle
        P2
          foo = handle
        P3
          foo = handle

      recipe
        create as handle
        P2
          foo = handle
        P4
          foo = handle
    `);
    let [validRecipe, suspiciouslyValidRecipe, invalidRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
    assert(suspiciouslyValidRecipe.normalize());
    assert(!invalidRecipe.normalize());
  });

  it('can infer field types of inline schemas from external schemas', async () => {
    let manifest = await Manifest.parse(`
      schema Thing
        Text value
      particle P
        in Thing {value} foo
      particle P2
        in * {Text value} foo

      recipe
        create as handle
        P
          foo = handle
        P2
          foo = handle
    `);
    let [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('supports inline schemas with multiple names', async () => {
    let manifest = await Manifest.parse(`
      schema Thing1
        Text value1
      schema Thing2
        Number value2
      particle P
        in Thing1 Thing2 {value1, value2} foo
      particle P2
        in * {Text value1, Number value2} foo

      recipe
        create as handle
        P
          foo = handle
        P2
          foo = handle
    `);
    let [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());

  });


  it('can parse a manifest with storage key handle definitions', async () => {
    let manifest = await Manifest.parse(`
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
    let [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can process a schema alias', async () => {
    let manifest = await Manifest.parse(`
      alias schema This That as SchemaAlias
      alias schema * extends SchemaAlias as Extended
    `);
    assert.isNotNull(manifest.findSchemaByName('SchemaAlias'));
    assert.sameMembers(manifest.findSchemaByName('Extended').names, ['This', 'That']);
  });

  it('expands schema aliases', async () => {
    let manifest = await Manifest.parse(`
      alias schema Name1 as Thing1
        Text field1
      alias schema Name2 as Thing2
        Text field2
      particle P in 'p.js'
        in Thing1 Thing2 Name3 {Text field1, Text field3} param
    `);
    let paramSchema = manifest.findParticleByName('P').inputs[0].type.entitySchema;
    assert.sameMembers(paramSchema.names, ['Name1', 'Name2', 'Name3']);
    assert.sameMembers(Object.keys(paramSchema.fields), ['field1', 'field2', 'field3']);
  });

  it('fails when expanding conflicting schema aliases', async () => {
    try {
      let manifest = await Manifest.parse(`
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
      let manifest = await Manifest.parse(`
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
    let manifest = await Manifest.parse(`
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
    let [validRecipe] = manifest.recipes;
    assert(validRecipe.normalize());
    assert(validRecipe.isResolved());
  });

  it('can parse a recipe with slot constraints on verbs', async () => {
    let manifest = await Manifest.parse(`
      recipe
        particle can verb
          consume consumeSlot
            provide provideSlot
    `);

    let recipe = manifest.recipes[0];
    assert(recipe.normalize());

    assert.equal(recipe.particles[0]._verbs[0], 'verb');
    assert.equal(recipe.particles[0]._spec, undefined);
    let slotConnection = recipe.particles[0]._consumedSlotConnections.consumeSlot;
    assert(slotConnection._providedSlots.provideSlot);
    assert.equal(slotConnection._providedSlots.provideSlot.sourceConnection, slotConnection);
  });
});
