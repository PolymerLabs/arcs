/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {Loader} from '../platform/loader.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {RamDiskStorageDriverProvider} from '../runtime/storageNG/drivers/ramdisk.js';
import {Flags} from '../runtime/flags.js';
import {VolatileStorageKey} from '../runtime/storageNG/drivers/volatile.js';
import {ArcId} from '../runtime/id.js';
import {storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';

describe('recipe descriptions test', () => {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').
  let loader;
  let memoryProvider;
  beforeEach(() => {
    loader = new Loader(null, {
      'test.js': `defineParticle(({Particle}) => {
        return class P extends Particle {
          constructor() { super(); this.relevance = 1; }
        }
      });`
    });
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  function createManifestString(options) {
    options = options || {};

    const myBoxType = Flags.useNewStorageStack ? '![Box]' : 'Box';
    const myBoxData = Flags.useNewStorageStack ?
`  {
    "root": {
      "values": {
        "anid": {
          "value": {"id": "anid", "rawData": {"height": 3, "width": 5${options.includeEntityName ? ', "name": "favorite-box"': ''}}},
          "version": {"u": 1}
        }
      },
      "version": {"u": 1}
    },
    "locations": {}
  }` :
`  [
    {"height": 3, "width": 5${options.includeEntityName ? ', "name": "favorite-box"' : ''}}
  ]`;

    const allBoxData = Flags.useNewStorageStack ?
`  {
    "root": {
      "values": {
        "anid": {
          "value": {"id": "anid", "rawData": {"height": 1, "width": 2}},
          "version": {"u": 1}
        },
        "atwoid": {
          "value": {"id": "atwoid", "rawData": {"height": 2, "width": 3}},
          "version": {"u": 1}
        }
      },
      "version": {"u": 1}
    },
    "locations": {}
  }` :
`  [
    {"height": 1, "width": 2},
    {"height": 2, "width": 3}
  ]`;

    return `
schema Box
  name: Text
  height: Number
  width: Number ${options.includeSchemaDescription ? `
  description \`booooox\`
    plural \`boxes\`
    value \`\${height}*\${width}\`` : ''}
particle CompareBoxes in 'test.js'
  all: reads [Box]
  biggest: writes Box
  description \`ignore this description\` ${options.includeAllDescription ? `
    all \`ALL\``: ''}
particle ProvideBoxes in 'test.js'
  boxes: writes [Box]
  description \`ignore this description too\`
particle DisplayBox in 'test.js'
  biggest: reads Box
  root: consumes Slot
  description \`ignore this description too\`
recipe
  handle0: ${options.includeAllStore ? `copy 'allboxes'` : `create *`}
  handle1: ${options.includeStore ? `copy 'mybox'` : `create *`}
  rootSlot: slot 'root-id'
  ProvideBoxes
    boxes: writes handle0
  CompareBoxes
    all: reads handle0
    biggest: writes handle1
  DisplayBox
    biggest: reads handle1
    root: consumes rootSlot
  description \`the winner is: '\${CompareBoxes.biggest}' of all '\${CompareBoxes.all}'\`

${options.includeStore ? `
resource MyBox
  start
${myBoxData}

store BoxStore of ${myBoxType} 'mybox' in MyBox` : ''}
${options.includeAllStore ? `
resource AllBoxes
  start
${allBoxData}

store BoxesStore of [Box] 'allboxes' in AllBoxes` : ''}
`;
  }

  async function generateRecipeDescription(options) {
    const context =  await Manifest.parse(
        options.manifestString || createManifestString(options),
        {loader, memoryProvider, fileName: 'foo.js'});
    const runtime = new Runtime({loader, context, memoryProvider});
    const key = Flags.useNewStorageStack ? (id: ArcId) => new VolatileStorageKey(id, '') : 'volatile://';
    const arc = runtime.newArc('demo', key);

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);
    const result = suggestions[0].getDescription(arc.modality.names[0]);
    return result;
  }
  async function testRecipeDescription(options, expectedDescription) {
    const description = await generateRecipeDescription(options);
    assert.strictEqual(description, expectedDescription);
  }

  it('generates recipe description', async () => {
    await testRecipeDescription({includeSchemaDescription: false, includeStore: false, includeEntityName: false},
                                'The winner is: \'box\' of all \'box list\'.');
  });

  it('generates recipe description (with handle value)', async () => {
    await testRecipeDescription({includeSchemaDescription: false, includeStore: true, includeEntityName: false},
                                'The winner is: \'box\' of all \'box list\'.');
  });

  it('generates recipe description (with handle value and name)', async () => {
    await testRecipeDescription({includeSchemaDescription: false, includeStore: true, includeEntityName: true},
                                'The winner is: \'favorite-box\' of all \'box list\'.');
  });

  it('generates recipe description (with schema description)', async () => {
    await testRecipeDescription({includeSchemaDescription: true, includeStore: false, includeEntityName: false},
                                'The winner is: \'booooox\' of all \'boxes\'.');
  });

  it('generates recipe description (with schema description and handle value)', async () => {
    await testRecipeDescription({includeSchemaDescription: true, includeStore: true, includeEntityName: false},
                                'The winner is: \'3*5\' of all \'boxes\'.');
  });

  it('generates recipe description (with schema description and handle value and name)', async () => {
    await testRecipeDescription({includeSchemaDescription: true, includeStore: true, includeEntityName: true},
                                'The winner is: \'3*5\' of all \'boxes\'.');
  });

  it('generates recipe description (with schema description and stores descriptions)', async () => {
    await testRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: true, includeAllDescription: true},
        'The winner is: \'3*5\' of all \'ALL\'.');
  });

  it('generates recipe description (everything)', async () => {
    await testRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: true, includeAllDescription: true, includeAllStore: true},
        'The winner is: \'3*5\' of all \'ALL (2 items)\'.');
  });

  it('fails generating recipe description with duplicate particles', async () => {
    const context =  await Manifest.parse(`
        schema Foo
        particle ShowFoo in 'test.js'
          foo: writes Foo
        recipe
          fooHandle: create *
          ShowFoo
            foo: writes fooHandle
          ShowFoo
            foo: writes fooHandle
          description \`cannot show duplicate \${ShowFoo.foo}\`
      `, {loader, fileName: '', memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    await StrategyTestHelper.planForArc(arc).then(() => assert('expected exception for duplicate particles'))
      .catch((err) => assert.strictEqual(
          err.message, 'Cannot reference duplicate particle \'ShowFoo\' in recipe description.'));
  });

  it('refers to particle description', async () => {
    const manifestString = `
      schema Foo
      particle HelloFoo in 'test.js'
        foo: reads Foo
        root: consumes Slot
        description \`hello \${foo}\`

      recipe
        h0: create *
        rootSlot: slot 'root-id'
        HelloFoo
          foo: reads h0
          root: consumes rootSlot
        description \`do "\${HelloFoo}"\`
    `;
    const description = await generateRecipeDescription({manifestString});

    assert.strictEqual('Do "hello foo"', description as string);
  });

  it('generates recipe description with duplicate particles', async () => {
    const context =  await Manifest.parse(`
      schema Foo
      particle ShowFoo in 'test.js'
        foo: writes Foo
      particle Dummy in 'test.js'

      recipe
        fooHandle: create *
        ShowFoo
          foo: writes fooHandle
        description \`show \${ShowFoo.foo}\`

      recipe
        fooHandle: create *
        ShowFoo
          foo: writes fooHandle
        Dummy
        description \`show \${ShowFoo.foo} with dummy\`
    `, {loader, fileName: '', memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const key = Flags.useNewStorageStack ? (id: ArcId) => new VolatileStorageKey(id, '') : 'volatile://';
    const arc = runtime.newArc('demo', key);
    // Plan for arc
    const suggestions0 = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions0, 2);
    assert.strictEqual('Show foo.', suggestions0[0].descriptionText);

    // Instantiate suggestion
    await suggestions0[0].instantiate(arc);
    await arc.idle;

    // Plan again.
    const suggestions1 = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions1, 1);
    assert.strictEqual('Show foo with dummy.', suggestions1[0].descriptionText);
  });

  it('joins recipe descriptions', async () => {
    const context =  await Manifest.parse(`
      particle A in 'test.js'
      particle B in 'test.js'
      particle C in 'test.js'

      recipe
        A
        description \`do A\`
      recipe
        B
        description \`do B\`
      recipe
        C
        description \`do C\`
    `, {loader, fileName: '', memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const key = Flags.useNewStorageStack ? (id: ArcId) => new VolatileStorageKey(id, '') : 'volatile://';
    const arc = runtime.newArc('demo', key);

    const suggestions = await StrategyTestHelper.planForArc(arc);

    assert.lengthOf(suggestions, 3);
    const recipe1 = new Recipe();
    suggestions[0].plan.mergeInto(recipe1);
    assert.lengthOf(recipe1.particles, 1);
    assert.lengthOf(recipe1.patterns, 1);

    suggestions[1].plan.mergeInto(recipe1);
    assert.lengthOf(recipe1.particles, 2);
    assert.lengthOf(recipe1.patterns, 2);

    suggestions[2].plan.mergeInto(recipe1);
    assert.lengthOf(recipe1.particles, 3);
    assert.deepEqual(['do A', 'do B', 'do C'], recipe1.patterns);

    const recipe2 = new Recipe();
    suggestions[2].plan.mergeInto(recipe2);
    suggestions[0].plan.mergeInto(recipe2);
    suggestions[1].plan.mergeInto(recipe2);
    assert.deepEqual(['do C', 'do A', 'do B'], recipe2.patterns);
    assert.notDeepEqual(recipe1.patterns, recipe2.patterns);

    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.patterns, recipe2.patterns);
  });
});
