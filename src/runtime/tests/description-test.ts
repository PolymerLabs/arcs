/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {Recipe} from '../recipe/lib-recipe.js';
import {Relevance} from '../relevance.js';
import {SlotComposer} from '../slot-composer.js';
import {EntityType, SingletonType, InterfaceType} from '../../types/lib-types.js';
import {Entity} from '../entity.js';
import {ArcId} from '../id.js';
import {ConCap} from '../../testing/test-util.js';
import {handleType, handleForStoreInfo} from '../storage/storage.js';
import {Runtime} from '../runtime.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {StoreInfo} from '../storage/store-info.js';
import {newRecipe} from '../recipe/internal/recipe-constructor.js';
import {VolatileStorageKey} from '../storage/drivers/volatile.js';

async function createTestArc(recipe: Recipe, manifest: Manifest) {
  const runtime = new Runtime({context: manifest, loader: new Loader()});
  const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'test'}));
  // TODO(lindner) stop messing with arc internal state, or provide a way to supply in constructor..
  arc['_activeRecipe'] = recipe;
  arc['_recipeDeltas'].push({particles: recipe.particles, handles: recipe.handles, slots: recipe.slots, patterns: recipe.patterns});
  return arc;
}

type VerifySuggestionOptions = {
  arc: Arc;
  relevance?: Relevance;
};

async function verifySuggestion({arc, relevance}: VerifySuggestionOptions, expectedSuggestion) {
  const description = await Description.create(arc, relevance);
  assert.strictEqual(description.getArcDescription(), expectedSuggestion);
  return description;
}

describe('Description', () => {
  const schemaManifest = `
schema Foo
  name: Text
  fooValue: Text
schema Bar
  name: Text
  barValue: Text
schema Far
  name: Text
  farValue: Text`;
  const aParticleManifest = `
particle A
  ifoo: reads Foo
  ofoos: writes [Foo]
  root: consumes Slot`;
  const bParticleManifest = `
particle B
  ofoo: writes Foo`;
  const recipeManifest = `
recipe
  fooHandle: use * // Foo
  foosHandle: use * // [Foo]
  slot0: slot 'rootslotid-root'
  A
    ifoo: reads fooHandle
    ofoos: writes foosHandle
    root: consumes slot0`;

  async function prepareRecipeAndArc(manifestStr: string) {
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const fooType = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null).type;
    recipe.handles[0].mapToStorage(new StoreInfo({id: 'test:1', type: fooType}));
    if (recipe.handles.length > 1) {
      recipe.handles[1].mapToStorage(new StoreInfo({id: 'test:2', type: fooType.collectionOf()}));
    }
    if (recipe.handles.length > 2) {
      recipe.handles[2].mapToStorage(new StoreInfo({id: 'test:3', type: fooType}));
    }
    recipe.normalize();
    assert.isTrue(recipe.isResolved());

    // TODO(shans): This clone is required because for some bizarre reason we're stuffing
    // the recipe into activeRecipes here instead of simply instantiating it. That makes
    // the activeRecipe frozen if we don't clone, as we just normalized. A frozen active
    // recipe is A Bad Thing.
    const newRecipe = recipe.clone();

    const ifooHandleConn = newRecipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ifoo');
    const ifooHandle = ifooHandleConn ? ifooHandleConn.handle : null;
    const ofoosHandleConn = newRecipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ofoos');
    const ofoosHandle = ofoosHandleConn ? ofoosHandleConn.handle : null;

    const arc = await createTestArc(newRecipe, manifest);

    const fooStore = await arc.createStore(new SingletonType(fooType), undefined, 'test:1');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const foosStore = await arc.createStore(fooType.collectionOf(), undefined, 'test:2');
    const foosHandle = await handleForStoreInfo(foosStore, arc);
    return {arc, recipe: newRecipe, ifooHandle, ofoosHandle, fooHandle, foosHandle};
  }

  it('one particle description', async () => {
    const {arc, recipe, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
${recipeManifest}
    `));

    let description = await verifySuggestion({arc}, 'Read from foo and populate foo list.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'foo list');

    // Add value to a singleton handle.
    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    description = await verifySuggestion({arc}, 'Read from foo-name and populate foo list.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'foo list');

    // Add values to a collection handle.
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc}, 'Read from foo-name and populate foo list (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'foo list');

    // Add more values to the collection handle.
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-name', fooValue: 'foo-3'}));
    await verifySuggestion({arc}, 'Read from foo-name and populate foo list (foo-1 plus 2 other items).');
  });

  it('one particle and connections descriptions', async () => {
    const {arc, recipe, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`my-out-foos\`
${recipeManifest}
    `));

    let description = await verifySuggestion({arc}, 'Read from my-in-foo and populate my-out-foos.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'my-in-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'my-out-foos');

    // Add value to a singleton handle.
    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    description = await verifySuggestion({arc}, 'Read from my-in-foo (foo-name) and populate my-out-foos.');

    // Add values to a collection handle.
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc}, 'Read from my-in-foo (foo-name) and populate my-out-foos (foo-1, foo-2).');

    // Add more values to the collection handle.
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-name', fooValue: 'foo-3'}));
    description = await verifySuggestion({arc},
        'Read from my-in-foo (foo-name) and populate my-out-foos (foo-1 plus 2 other items).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'my-in-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'my-out-foos');
  });

  it('one particle and connections descriptions references', async () => {
    const {arc, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

    let description = await verifySuggestion({arc}, 'Read from my-in-foo and populate The Foos from my-in-foo.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'my-in-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'The Foos from my-in-foo');

    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc},
        'Read from my-in-foo (foo-name) and populate The Foos from my-in-foo (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'my-in-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'The Foos from my-in-foo');
  });

  it('one particle and connections descriptions references no pattern', async () => {
    const {arc, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

    let description = await verifySuggestion({arc}, 'Read from foo and populate The Foos from foo.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'The Foos from foo');

    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc},
        'Read from foo-name and populate The Foos from foo-name (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'The Foos from foo');
  });

  it('one particle and connections descriptions with extras', async () => {
    const {arc, recipe, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}._name_\`
    ifoo \`[fooValue: \${ifoo.fooValue}]\`
    ofoos \`[A list of \${ifoo}._type_ with values: \${ofoos}._values_]\`
${recipeManifest}
    `));

    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));

    const description = await verifySuggestion({arc},
        'Read from [fooValue: the-FOO] (foo-name) and populate [A list of foo with values: foo-1, foo-2].');

    assert.strictEqual(description.getHandleDescription(ifooHandle), '[fooValue: the-FOO]');
    // Add mode getHandleDescription tests, to verify all are strings!
    assert.strictEqual(description.getHandleDescription(ofoosHandle), '[A list of foo with values: foo-1, foo-2]');
  });

  it('connection description from another particle', async () => {
    const {arc, recipe, ifooHandle, ofoosHandle, fooHandle, foosHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ofoos \`my-foos\`
${bParticleManifest}
  description \`create the \${ofoo}\`
    ofoo \`best-new-foo\`
${recipeManifest}
  B
    ofoo: writes fooHandle
    `));

    let description = await verifySuggestion({arc}, 'Read from best-new-foo and populate my-foos.');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'best-new-foo');
    const oBFooHandle = recipe.handleConnections.find(hc => hc.particle.name === 'B' && hc.name === 'ofoo').handle;
    assert.strictEqual(description.getHandleDescription(oBFooHandle), 'best-new-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'my-foos');

    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await foosHandle.add(new foosHandle.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc}, 'Read from best-new-foo (foo-name) and populate my-foos (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'best-new-foo');
    assert.strictEqual(description.getHandleDescription(oBFooHandle), 'best-new-foo');
    assert.strictEqual(description.getHandleDescription(ofoosHandle), 'my-foos');
  });

  it('multiple particles', async () => {
    const {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle X1
  ofoo: writes Foo
  action: consumes Slot
  description \`create X1::\${ofoo}\`
    ofoo \`X1-foo\`
particle X2
  ofoo: writes Foo
  action: consumes Slot
  description \`create X2::\${ofoo}\`
    ofoo \`X2-foo\`
particle A
  ifoo: reads Foo
  root: consumes Slot
    action: provides? Slot
  description \`display \${ifoo}\`
    ifoo \`A-foo\`

recipe
  fooHandle: use * // Foo
  slot0: slot 'r0'
  X1
    ofoo: writes fooHandle
    action: consumes slot1
  X2
    ofoo: writes fooHandle
    action: consumes slot1
  A
    ifoo: reads fooHandle
    root: consumes slot0
      action: provides slot1
    `));
    const aFooHandle = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ifoo').handle;

    let description = await verifySuggestion(
        {arc}, 'Display X1-foo, create X1::X1-foo, and create X2::X2-foo.');
    assert.strictEqual(description.getHandleDescription(aFooHandle), 'X1-foo');

    // Rank X2 higher than X2
    const relevance = Relevance.create(arc, recipe);

    relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'A'), [7]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'X1'), [5]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'X2'), [10]);

    description = await verifySuggestion(
        {arc, relevance}, 'Display X2-foo, create X2::X2-foo, and create X1::X1-foo.');
    assert.strictEqual(description.getHandleDescription(aFooHandle), 'X2-foo');
  });

  it('same particle multiple times', async () => {
    const manifestStr = `
${schemaManifest}
particle X
  ofoo: writes [Foo]
  root: consumes Slot
  description \`write to \${ofoo}\`
    ofoo \`X-foo\`

recipe
  fooHandle1: use * // Foo
  fooHandle2: use * // Foo
  slot0: slot 'r0'
  X
    ofoo: writes fooHandle1
    root: consumes slot0
  X
    ofoo: writes fooHandle2
    root: consumes slot0
  `;
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    let recipe = manifest.recipes[0];
    const fooType = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null).type;
    recipe.handles[0].mapToStorage(new StoreInfo({id: 'test:1', type: fooType.collectionOf()}));
    recipe.handles[1].mapToStorage(new StoreInfo({id: 'test:2', type: fooType.collectionOf()}));
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    recipe = recipe.clone();

    const arc = await createTestArc(recipe, manifest);
    const fooStore1 = await arc.createStore(fooType.collectionOf(), undefined, 'test:1');
    const fooStore2 = await arc.createStore(fooType.collectionOf(), undefined, 'test:2');
    const fooHandle1 = await handleForStoreInfo(fooStore1, arc);
    const fooHandle2 = await handleForStoreInfo(fooStore2, arc);

    let description = await verifySuggestion({arc}, 'Write to X-foo and write to X-foo.');
    assert.strictEqual(description.getHandleDescription(recipe.handles[0]), 'X-foo');
    assert.strictEqual(description.getHandleDescription(recipe.handles[1]), 'X-foo');

    // Add values to the second handle.
    await fooHandle2.add(new fooHandle2.entityClass({name: 'foo-1', fooValue: 'foo-value-1'}));
    await fooHandle2.add(new fooHandle2.entityClass({name: 'foo-2', fooValue: 'foo-value-2'}));
    description = await verifySuggestion({arc}, 'Write to X-foo and write to X-foo (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(recipe.handles[0]), 'X-foo');
    assert.strictEqual(description.getHandleDescription(recipe.handles[1]), 'X-foo');

    // Add values to the first handle also.
    await fooHandle1.add(new fooHandle1.entityClass({name: 'foo-3', fooValue: 'foo-value-3'}));
    await fooHandle1.add(new fooHandle1.entityClass({name: 'foo-4', fooValue: 'foo-value-4'}));
    description = await verifySuggestion({arc}, 'Write to X-foo (foo-3, foo-4) and write to X-foo (foo-1, foo-2).');
    assert.strictEqual(description.getHandleDescription(recipe.handles[0]), 'X-foo');
    assert.strictEqual(description.getHandleDescription(recipe.handles[1]), 'X-foo');
  });

  it('duplicate particles', async () => {
    const {arc, recipe, ifooHandle, fooHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
    action: provides Slot
  description \`do A with \${ifoo}\`
    ifoo \`a-foo\`
${bParticleManifest}
  action: consumes Slot
  description \`output B to \${ofoo}\`
    ofoo \`b-foo\`

recipe
  fooHandle1: use * // Foo
  foosHandle: use * // [Foo]
  fooHandle2: use * // Foo
  slot0: slot 'r0'
  B
    ofoo: writes fooHandle1
    action: consumes slot1
  A
    ifoo: reads fooHandle1
    ofoos: writes foosHandle
    root: consumes slot0
      action: provides slot1
  B
    ofoo: writes fooHandle2
    action: consumes slot1
    `));

    // Add values to both Foo handles
    await fooHandle.setFromData({name: 'the-FOO'});
    const fooStore2 = await arc.createStore(handleType(fooHandle), undefined, 'test:3');
    const fooHandle2 = await handleForStoreInfo(fooStore2, arc);
    await fooHandle2.setFromData({name: 'another-FOO'});
    const description = await verifySuggestion({arc},
        'Do A with b-foo (the-FOO), output B to b-foo, and output B to b-foo (another-FOO).');
    assert.strictEqual(description.getHandleDescription(ifooHandle), 'b-foo');

    // Rank B bound to fooHandle2 higher than B that is bound to fooHandle1.
    const relevance = Relevance.create(arc, recipe);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'A'), [7]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name === 'B')[0], [1]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name === 'B')[1], [10]);

    await verifySuggestion({arc, relevance},
        'Do A with b-foo (the-FOO), output B to b-foo (another-FOO), and output B to b-foo.');
  });

  it('sanitize description', async () => {
    const {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle A
  ofoo: writes Foo
  root: consumes Slot
  description \`create <new> <\${ofoo}>\`
    ofoo \`<my-foo>\`

recipe
  fooHandle: use * // Foo
  slot0: slot 'r0'
  A
    ofoo: writes fooHandle
    root: consumes slot0
    `));

    const description = await verifySuggestion({arc}, 'Create &lt;new> &lt;&lt;my-foo>>.');
    const handle = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ofoo').handle;
    assert.strictEqual(description.getHandleDescription(handle), '&lt;my-foo>');
  });

  it('uses store value property', async () => {
    const manifestStr = `
      schema ScriptDate
        date: Text
      particle Stardate in './source/Stardate.js'
        stardate: reads writes ScriptDate
        root: consumes Slot
        description \`stardate \${stardate.date}\`
      recipe
        stardateHandle: use *
        slot0: slot 'slotid'
        Stardate
          stardate: stardateHandle
          root: consumes slot0
      `;
    const manifest = (await Manifest.parse(manifestStr));
    let recipe = manifest.recipes[0];
    const scriptDateType = Entity.createEntityClass(manifest.findSchemaByName('ScriptDate'), null).type;
    recipe.handles[0].mapToStorage(new StoreInfo({id: 'test:1', type: scriptDateType}));
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    recipe = recipe.clone();
    const arc = await createTestArc(recipe, manifest);
    const store = await arc.createStore(new SingletonType(scriptDateType), undefined, 'test:1');
    const handle = await handleForStoreInfo(store, arc);
    await verifySuggestion({arc}, 'Stardate .');

    await handle.set(new handle.entityClass({date: 'June 31'}));
    await verifySuggestion({arc}, 'Stardate June 31.');
  });

  it('multiword type and no name property in description', async () => {
    const manifestStr = `
        schema MyBESTType
          property: Text
        particle P
          t: reads MyBESTType
          ts: writes [MyBESTType]
          description \`make \${ts} from \${t}\`
          root: consumes Slot
        recipe
          tHandle: use *
          tsHandle: use *
          slot0: slot 'rootslotid-root'
          P
           t: tHandle
           ts: tsHandle
           root: consumes slot0`;
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    let recipe = manifest.recipes[0];
    const myBESTType = Entity.createEntityClass(manifest.findSchemaByName('MyBESTType'), null).type;
    recipe.handles[0].mapToStorage(new StoreInfo({id: 'test:1', type: myBESTType}));
    recipe.handles[1].mapToStorage(new StoreInfo({id: 'test:2', type: myBESTType.collectionOf()}));
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    recipe = recipe.clone();

    const arc = await createTestArc(recipe, manifest);
    const tStore = await arc.createStore(new SingletonType(myBESTType), undefined, 'test:1');
    const tsStore = await arc.createStore(myBESTType.collectionOf(), undefined, 'test:2');
    const tHandle = await handleForStoreInfo(tStore, arc);
    const tsHandle = await handleForStoreInfo(tsStore, arc);

    const description = await verifySuggestion({arc}, 'Make my best type list from my best type.');
    const tRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name === 'P' && hc.name === 't').handle;
    const tsRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name === 'P' && hc.name === 'ts').handle;
    assert.strictEqual(description.getHandleDescription(tRecipeHandle), 'my best type');
    assert.strictEqual(description.getHandleDescription(tsRecipeHandle), 'my best type list');

    // Add values to handles.
    await tHandle.set(new tHandle.entityClass({property: 'value1'}));
    await tsHandle.add(new tsHandle.entityClass({property: 'value2'}));
    await verifySuggestion({arc}, 'Make my best type list (1 items) from my best type.');

    await tsHandle.add(new tsHandle.entityClass({property: 'value3'}));
    await tsHandle.add(new tsHandle.entityClass({property: 'value4'}));
    await verifySuggestion({arc}, 'Make my best type list (3 items) from my best type.');
  });

  it('particle slots description', async () => {
    const manifestStr = `
schema Foo
  name: Text
particle A
  foo: reads writes Foo
  root: consumes Slot
    aslot: provides? Slot
    otherslot: provides? Slot
  description \`hello \${root.aslot}, see you at \${root.otherslot}\`
particle B1
  foo: writes Foo
  aslot: consumes Slot
  description \`first b\`
particle B2
  foo: writes Foo
  aslot: consumes Slot
  description \`second b\`
particle C
  foo: reads Foo
  otherslot: consumes Slot
  description \`only c\`
recipe
  handle0: create 'test:1' // Foo
  slot0: slot 'rootslotid-root'
  A as particle1
    foo: handle0
    root: consumes slot0
      aslot: provides slot1
      otherslot: provides slot2
  B1
    foo: writes handle0
    aslot: consumes slot1
  B2
    foo: writes handle0
    aslot: consumes slot1
  C
    foo: reads handle0
    otherslot: consumes slot2
`;
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    const arc = await createTestArc(recipe, manifest);

    await verifySuggestion({arc}, 'Hello first b and second b, see you at only c.');
  });

  it('particle without UI description', async () => {
    const {arc, recipe, fooHandle} = (await prepareRecipeAndArc(`
${schemaManifest}
${bParticleManifest}
  description \`Populate \${ofoo}\`
recipe
  fooHandle: use * // Foo
  B
    ofoo: writes fooHandle
    `));

    await verifySuggestion({arc}, 'Populate foo.');

    // Add value to a singleton handle.
    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await verifySuggestion({arc}, 'Populate foo-name.');
  });

  it('capitalizes when some particles do not have descriptions', async () => {
    const runtime = new Runtime();
    const manifest = (await runtime.parse(`
interface DummyInterface
particle NoDescription
particle NoDescMuxer
  hostedParticle: hosts DummyInterface
  root: consumes Slot
    myslot: provides? Slot
  description \`\${hostedParticle} description\`
particle HasDescription
  myslot: consumes Slot
  description \`start with capital letter\`
recipe
  slot0: slot 'rootslotid-root'
  hostedParticleHandle: copy 'hosted-particle-handle'
  NoDescMuxer
    hostedParticle: hostedParticleHandle
    root: consumes slot0
      myslot: provides slot1
  HasDescription
    myslot: consumes slot1
      `));
    const recipe = manifest.recipes[0];
    // Cannot use createTestArc here, because capabilities-resolver cannot be set to null,
    // and interface returns a null schema, and cannot generate hash.
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'test'}));
    arc['_activeRecipe'] = recipe;
    arc['_recipeDeltas'].push({particles: recipe.particles, handles: recipe.handles, slots: recipe.slots, patterns: recipe.patterns});

    const hostedParticle = manifest.findParticleByName('NoDescription');
    const hostedType = manifest.findParticleByName('NoDescMuxer').handleConnections[0].type as InterfaceType;

    const hostedStoreId = 'hosted-particle-handle';
    const hostedStorageKey = new VolatileStorageKey(arc.id, '').childKeyForHandle(hostedStoreId);
    const newStore = await arc.createStore(new SingletonType(hostedType), /* name= */ null, hostedStoreId, /* tags= */ [], hostedStorageKey);
    const newHandle = await handleForStoreInfo(newStore, arc);
    await newHandle.set(hostedParticle.clone());

    await verifySuggestion({arc}, 'Start with capital letter.');
  });

  it('has no particles description', async () => {
    const verify = async (manifestStr: string, expectedDescription: string) => {
      const manifest = await Manifest.parse(manifestStr);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      const arc = await createTestArc(recipe, manifest);
      const description = await Description.create(arc);

      const recipeDescription = description.getRecipeSuggestion();
      assert.strictEqual(recipeDescription, expectedDescription);
    };

    await verify(`recipe`, undefined);
    await verify(`recipe Hello`, undefined);
  });

  it('generates type description', async () => {
    const manifest = (await Manifest.parse(`
schema TVShow
schema MyTVShow
schema MyTV
schema GitHubDash`));
    assert.strictEqual(manifest.findTypeByName('TVShow').toPrettyString(), 'TV Show');
    assert.strictEqual(manifest.findTypeByName('MyTVShow').toPrettyString(), 'My TV Show');
    assert.strictEqual(manifest.findTypeByName('MyTV').toPrettyString(), 'My TV');
    assert.strictEqual(manifest.findTypeByName('GitHubDash').toPrettyString(), 'Git Hub Dash');
  });

  it('fails gracefully (no asserts)', async () => {
    const verifyNoAssert = async (manifestStr, expectedSuggestion, expectedWarning) => {
      const manifest = (await Manifest.parse(manifestStr));
      assert.lengthOf(manifest.recipes, 1);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      const arc = await createTestArc(recipe, manifest);
      const description = await Description.create(arc);
      const arcDesc = ConCap.capture(() => description.getArcDescription());
      assert.strictEqual(arcDesc.result, expectedSuggestion);
      assert.match(arcDesc.warn[0][0], expectedWarning);
    };

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`\${Bar.things}\`
    `, undefined, /Cannot find particles with name Bar/);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`Hello \${Bar.things}\`
    `, `Hello .`, /Cannot find particles with name Bar/);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
        description \`\${bar}\`
      recipe
        Foo
    `, undefined, /Unknown handle connection name 'bar'/);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
        description \`\${bar.baz.boo}\`
      recipe
        Foo
    `, undefined, /Slot connections tokens must have exactly 2 names, found 3/);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`\${foo.bar}\`
    `, undefined, /Invalid particle name 'foo'/);
  });
});

describe('Dynamic description', () => {
  async function prepareRecipeAndArc() {
    const manifestStr = `
schema Foo
  name: Text
  fooValue: Text
schema Description
  key: Text
  value: Text
particle B
  ofoo: writes Foo
  descriptions: writes [Description]
  root: consumes Slot
recipe
  handle0: use 'test:1' // Foo
  handle1: use 'test:2' // [Description]
  slot0: slot 'rootslotid-root'
  B as particle1
    ofoo: writes handle0
    descriptions: writes handle1
    root: consumes slot0
`;
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    let recipe = manifest.recipes[0];
    const fooType = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null).type;
    const descriptionType = Entity.createEntityClass(manifest.findSchemaByName('Description'), null).type;
    recipe.handles[0].mapToStorage(new StoreInfo({id: 'test:1', type: fooType}));
    recipe.handles[1].mapToStorage(new StoreInfo({id: 'test:2', type: descriptionType.collectionOf()}));
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    recipe = recipe.clone();
    const arc = await createTestArc(recipe, manifest);
    const fooStore = await arc.createStore(new SingletonType(fooType), undefined, 'test:1');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const descriptionStore = await arc.createStore(descriptionType.collectionOf(), undefined, 'test:2');

    return {
      arc,
      recipe,
      fooHandle,
      DescriptionType: Entity.createEntityClass((descriptionStore.type.getContainedType() as EntityType).entitySchema, null),
      descriptionHandle: await handleForStoreInfo(descriptionStore, arc),
    };
  }

  it('particle dynamic description', async () => {
    const {arc, recipe, fooHandle, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();

    const description = await Description.create(arc);
    assert.isUndefined(description.getArcDescription());

    // Particle (static) spec pattern.
    recipe.particles[0].spec.pattern = 'hello world';
    await verifySuggestion({arc}, 'Hello world.');

    // Particle (dynamic) description handle (override static description).
    await descriptionHandle.add(new DescriptionType({key: 'pattern', value: 'Return my foo'}));
    await verifySuggestion({arc}, 'Return my foo.');

    // Particle description handle with handle connections.
    await descriptionHandle.add(new DescriptionType({key: 'pattern', value: 'Return my temporary foo'}));
    await descriptionHandle.add(new DescriptionType({key: 'pattern', value: 'Return my ${ofoo}'}));
    const ofooDesc = new DescriptionType({key: 'ofoo', value: 'best-foo'});
    await descriptionHandle.add(ofooDesc);
    await verifySuggestion({arc}, 'Return my best-foo.');

    // Add value to connection's handle.
    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FO4'}));
    await verifySuggestion({arc}, 'Return my best-foo (foo-name).');

    // Remove connection's description.
    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name', fooValue: 'the-FOO'}));
    await descriptionHandle.remove(ofooDesc);
    await verifySuggestion({arc}, 'Return my foo-name.');
  });

  it('particle recipe description', async () => {
    const {arc, recipe, fooHandle, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();

    const description = await Description.create(arc);
    assert.isUndefined(description.getArcDescription());

    const recipeClone = recipe.clone();
    arc['_activeRecipe'] = recipeClone;
    arc['_recipeDeltas'] = [recipeClone];

    // Particle (static) spec pattern.
    recipeClone.particles[0].spec.pattern = 'hello world';
    await verifySuggestion({arc}, 'Hello world.');

    recipeClone.patterns = [`Here it is: \${B}`];
    await verifySuggestion({arc}, 'Here it is: hello world.');

    // Particle (dynamic) description handle (override static description).
    await descriptionHandle.add(new DescriptionType({key: 'pattern', value: 'dynamic B description'}));
    await verifySuggestion({arc}, 'Here it is: dynamic B description.');
  });

  it('particle dynamic dom description', async () => {
    const {arc, recipe, fooHandle, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();
    await descriptionHandle.add(new DescriptionType({key: 'pattern', value: 'return my ${ofoo} (text)'}));
    await descriptionHandle.add(new DescriptionType({key: '_template_', value: 'Return my <span>{{ofoo}}</span> (dom)'}));
    await descriptionHandle.add(new DescriptionType({key: '_model_', value: JSON.stringify({'ofoo': '${ofoo}'})}));
    await verifySuggestion({arc}, `Return my foo (text).`);

    await fooHandle.set(new fooHandle.entityClass({name: 'foo-name'}));
    await verifySuggestion({arc}, `Return my foo-name (text).`);
  });
});
