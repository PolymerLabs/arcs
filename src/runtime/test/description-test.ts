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
import {DescriptionDomFormatter} from '../description-dom-formatter.js';
import {Description} from '../description.js';
import {handleFor} from '../handle.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {Recipe} from '../recipe/recipe.js';
import {Relevance} from '../relevance.js';
import {CollectionStorageProvider, VariableStorageProvider} from '../storage/storage-provider-base.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';

function createTestArc(recipe: Recipe, manifest: Manifest) {
  const slotComposer = new FakeSlotComposer();
  const arc = new Arc({slotComposer, id: 'test', context: manifest, loader: new Loader()});
  // TODO(lindner) stop messing with arc internal state, or provide a way to supply in constructor..
  arc['_activeRecipe'] = recipe;
  arc['_recipes'].push({particles: recipe.particles, handles: recipe.handles, slots: recipe.slots, patterns: recipe.patterns});
  return arc;
}

type VerifySuggestionOptions = {
  arc: Arc;
  relevance?;
};

const tests = [
  {
    name: 'text',
    verifySuggestion: async ({arc, relevance}: VerifySuggestionOptions, expectedSuggestion) => {
      const description = await Description.create(arc, relevance);
      assert.equal(description.getArcDescription(), expectedSuggestion);
      return description;
    }
  },
  {
    name: 'dom',
    verifySuggestion: async ({arc, relevance}: VerifySuggestionOptions, expectedSuggestion) => {
      const description = await Description.create(arc, relevance);

      // Use an any variable to override the default string return type
      // tslint:disable-next-line: no-any
      let suggestion: any;
      suggestion = description.getArcDescription(DescriptionDomFormatter);
      let result = suggestion.template.replace(/<[/]?span>/g, '').replace(/<[/]?b>/g, '');
      Object.keys(suggestion.model).forEach(m => {
        assert.isTrue(result.indexOf(`{{${m}}}`) >= 0);
        result = result.replace(new RegExp(`{{${m}}}`, 'g'), suggestion.model[m]);
        assert.isFalse(result.indexOf(`{{${m}}}`) >= 0);
      });
      assert.equal(result, expectedSuggestion);
      return description;
    }
  },
];

describe('Description', () => {
  const schemaManifest = `
schema Foo
  Text name
  Text fooValue
schema Bar
  Text name
  Text barValue
schema Far
  Text name
  Text farValue`;
  const aParticleManifest = `
particle A
  in Foo ifoo
  out [Foo] ofoos
  consume root`;
  const bParticleManifest = `
particle B
  out Foo ofoo`;
  const recipeManifest = `
recipe
  create as fooHandle   // Foo
  create as foosHandle  // [Foo]
  slot 'rootslotid-root' as slot0
  A
    ifoo <- fooHandle
    ofoos -> foosHandle
    consume root as slot0`;

  async function prepareRecipeAndArc(manifestStr: string) {
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const fooType = manifest.findSchemaByName('Foo').entityClass().type;
    recipe.handles[0].mapToStorage({id: 'test:1', type: fooType});
    if (recipe.handles.length > 1) {
      recipe.handles[1].mapToStorage({id: 'test:2', type: fooType.collectionOf()});
    }
    if (recipe.handles.length > 2) {
      recipe.handles[2].mapToStorage({id: 'test:3', type: fooType});
    }
    recipe.normalize();

    assert.isTrue(recipe.isResolved());
    const ifooHandleConn = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ifoo');
    const ifooHandle = ifooHandleConn ? ifooHandleConn.handle : null;
    const ofoosHandleConn = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ofoos');
    const ofoosHandle = ofoosHandleConn ? ofoosHandleConn.handle : null;

    const arc = createTestArc(recipe, manifest);
    const fooStore: VariableStorageProvider = await arc.createStore(fooType, undefined, 'test:1') as VariableStorageProvider;
    const foosStore = await arc.createStore(fooType.collectionOf(), undefined, 'test:2') as CollectionStorageProvider;
    return {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore};
  }

  tests.forEach((test) => {
    it('one particle description ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
${recipeManifest}
      `));

      let description = await test.verifySuggestion({arc}, 'Read from foo and populate foo list.');
      assert.equal(description.getHandleDescription(ifooHandle), 'foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'foo list');

      // Add value to a singleton handle.
      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      description = await test.verifySuggestion({arc}, 'Read from foo-name and populate foo list.');
      assert.equal(description.getHandleDescription(ifooHandle), 'foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'foo list');

      // Add values to a collection handle.
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key2']);
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key3']);
      description = await test.verifySuggestion({arc}, 'Read from foo-name and populate foo list (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(ifooHandle), 'foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'foo list');

      // Add more values to the collection handle.
      foosStore.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}}, ['key4']);
      await test.verifySuggestion({arc}, 'Read from foo-name and populate foo list (foo-1 plus 2 other items).');
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`my-out-foos\`
${recipeManifest}
    `));

      let description = await test.verifySuggestion({arc}, 'Read from my-in-foo and populate my-out-foos.');
      assert.equal(description.getHandleDescription(ifooHandle), 'my-in-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'my-out-foos');

      // Add value to a singleton handle.
      await fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      description = await test.verifySuggestion({arc}, 'Read from my-in-foo (foo-name) and populate my-out-foos.');

      // Add values to a collection handle.
      await foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key22']);
      await foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key33']);
      description = await test.verifySuggestion({arc}, 'Read from my-in-foo (foo-name) and populate my-out-foos (foo-1, foo-2).');

      // Add more values to the collection handle.
      await foosStore.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}}, ['key4']);
      description = await test.verifySuggestion({arc},
          'Read from my-in-foo (foo-name) and populate my-out-foos (foo-1 plus 2 other items).');
      assert.equal(description.getHandleDescription(ifooHandle), 'my-in-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'my-out-foos');
    });
  });

  tests.forEach((test) => {
    it('one particle with BigCollection descriptions ' + test.name, async () => {
      const manifest = await Manifest.parse(`
        schema Foo
          Text name
          Text fooValue
        particle A
          in BigCollection<Foo> ifoos
          out Foo ofoo
          consume root
          description \`read from \${ifoos} and write \${ofoo}\`
            ifoos \`my-in-foos\`
            ofoo \`my-out-foo\`
        recipe
          create as foosHandle  // BigCollection<Foo>
          create as fooHandle   // Foo
          slot 'rootslotid-root' as slot0
          A
            ifoos <- foosHandle
            ofoo -> fooHandle
            consume root as slot0`);

      const recipe = manifest.recipes[0];
      const fooType = manifest.findSchemaByName('Foo').entityClass().type;

      recipe.handles[0].mapToStorage({id: 'test:1', type: fooType.bigCollectionOf()});
      recipe.handles[1].mapToStorage({id: 'test:2', type: fooType});
      assert.isTrue(recipe.normalize());
      assert.isTrue(recipe.isResolved());

      const arc = createTestArc(recipe, manifest);
      const foosStore = await arc.createStore(fooType.bigCollectionOf(), undefined, 'test:1') as CollectionStorageProvider;
      const fooStore = await arc.createStore(fooType, undefined, 'test:2') as VariableStorageProvider;

      // BigCollections don't trigger sync/update events when new values are added to the backing
      // store. Pre-populate the store to check the suggestion reads in the first one.
      await foosStore.store({id: 1, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key1']);
      await foosStore.store({id: 2, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key2']);

      await test.verifySuggestion({arc},
          'Read from my-in-foos (collection of items like foo-1) and write my-out-foo.');
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = await test.verifySuggestion({arc}, 'Read from my-in-foo and populate The Foos from my-in-foo.');
      assert.equal(description.getHandleDescription(ifooHandle), 'my-in-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'The Foos from my-in-foo');

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key2']);
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key3']);
      description = await test.verifySuggestion({arc},
          'Read from my-in-foo (foo-name) and populate The Foos from my-in-foo (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(ifooHandle), 'my-in-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'The Foos from my-in-foo');
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references no pattern ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = await test.verifySuggestion({arc}, 'Read from foo and populate The Foos from foo.');
      assert.equal(description.getHandleDescription(ifooHandle), 'foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'The Foos from foo');

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key2']);
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key3']);
      description = await test.verifySuggestion({arc},
          'Read from foo-name and populate The Foos from foo-name (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(ifooHandle), 'foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'The Foos from foo');
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions with extras ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}._name_\`
    ifoo \`[fooValue: \${ifoo.fooValue}]\`
    ofoos \`[A list of \${ifoo}._type_ with values: \${ofoos}._values_]\`
${recipeManifest}
    `));

      await fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key2']);
      await foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key3']);

      const description = await test.verifySuggestion({arc},
          'Read from [fooValue: the-FOO] (foo-name) and populate [A list of foo with values: foo-1, foo-2].');

      assert.equal(description.getHandleDescription(ifooHandle), '[fooValue: the-FOO]');
      // Add mode getHandleDescription tests, to verify all are strings!
      assert.equal(description.getHandleDescription(ofoosHandle), '[A list of foo with values: foo-1, foo-2]');
    });
  });

  tests.forEach((test) => {
    it('connection description from another particle ' + test.name, async () => {
      const {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo} and populate \${ofoos}\`
    ofoos \`my-foos\`
${bParticleManifest}
  description \`create the \${ofoo}\`
    ofoo \`best-new-foo\`
${recipeManifest}
  B
    ofoo -> fooHandle
    `));

      let description = await test.verifySuggestion({arc}, 'Read from best-new-foo and populate my-foos.');
      assert.equal(description.getHandleDescription(ifooHandle), 'best-new-foo');
      const oBFooHandle = recipe.handleConnections.find(hc => hc.particle.name === 'B' && hc.name === 'ofoo').handle;
      assert.equal(description.getHandleDescription(oBFooHandle), 'best-new-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'my-foos');

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key2']);
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key3']);
      description = await test.verifySuggestion({arc}, 'Read from best-new-foo (foo-name) and populate my-foos (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(ifooHandle), 'best-new-foo');
      assert.equal(description.getHandleDescription(oBFooHandle), 'best-new-foo');
      assert.equal(description.getHandleDescription(ofoosHandle), 'my-foos');
    });
  });

  tests.forEach((test) => {
    it('multiple particles ' + test.name, async () => {
      const {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle X1
  out Foo ofoo
  consume action
  description \`create X1::\${ofoo}\`
    ofoo \`X1-foo\`
particle X2
  out Foo ofoo
  consume action
  description \`create X2::\${ofoo}\`
    ofoo \`X2-foo\`
particle A
  in Foo ifoo
  consume root
    provide action
  description \`display \${ifoo}\`
    ifoo \`A-foo\`

recipe
  create as fooHandle   // Foo
  slot 'r0' as slot0
  X1
    ofoo -> fooHandle
    consume action as slot1
  X2
    ofoo -> fooHandle
    consume action as slot1
  A
    ifoo <- fooHandle
    consume root as slot0
      provide action as slot1
    `));
      const aFooHandle = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ifoo').handle;

      let description = await test.verifySuggestion(
          {arc}, 'Display X1-foo, create X1::X1-foo, and create X2::X2-foo.');
      assert.equal(description.getHandleDescription(aFooHandle), 'X1-foo');

      // Rank X2 higher than X2
      const relevance = Relevance.create(arc, recipe);

      relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'X1'), [5]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'X2'), [10]);

      description = await test.verifySuggestion(
          {arc, relevance}, 'Display X2-foo, create X2::X2-foo, and create X1::X1-foo.');
      assert.equal(description.getHandleDescription(aFooHandle), 'X2-foo');
    });
  });

  tests.forEach((test) => {
    it('same particle multiple times ' + test.name, async () => {
      const manifestStr = `
${schemaManifest}
particle X
  out [Foo] ofoo
  consume root
  description \`write to \${ofoo}\`
    ofoo \`X-foo\`

recipe
  create as fooHandle1   // Foo
  create as fooHandle2   // Foo
  slot 'r0' as slot0
  X
    ofoo -> fooHandle1
    consume root as slot0
  X
    ofoo -> fooHandle2
    consume root as slot0
    `;
      const manifest = (await Manifest.parse(manifestStr));
      assert.lengthOf(manifest.recipes, 1);
      const recipe = manifest.recipes[0];
      const fooType = manifest.findSchemaByName('Foo').entityClass().type;
      recipe.handles[0].mapToStorage({id: 'test:1', type: fooType.collectionOf()});
      recipe.handles[1].mapToStorage({id: 'test:2', type: fooType.collectionOf()});
      recipe.normalize();
      assert.isTrue(recipe.isResolved());

      const arc = createTestArc(recipe, manifest);
      const fooStore1 = await arc.createStore(fooType.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
      const fooStore2 = await arc.createStore(fooType.collectionOf(), undefined, 'test:2') as CollectionStorageProvider;

      let description = await test.verifySuggestion({arc}, 'Write to X-foo and write to X-foo.');
      assert.equal(description.getHandleDescription(recipe.handles[0]), 'X-foo');
      assert.equal(description.getHandleDescription(recipe.handles[1]), 'X-foo');

      // Add values to the second handle.
      await fooStore2.store({id: 1, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}}, ['key1']);
      await fooStore2.store({id: 2, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}}, ['key2']);
      description = await test.verifySuggestion({arc}, 'Write to X-foo and write to X-foo (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(recipe.handles[0]), 'X-foo');
      assert.equal(description.getHandleDescription(recipe.handles[1]), 'X-foo');

      // Add values to the first handle also.
      fooStore1.store({id: 3, rawData: {name: 'foo-3', fooValue: 'foo-value-3'}}, ['key3']);
      fooStore1.store({id: 4, rawData: {name: 'foo-4', fooValue: 'foo-value-4'}}, ['key4']);
      description = await test.verifySuggestion({arc}, 'Write to X-foo (foo-3, foo-4) and write to X-foo (foo-1, foo-2).');
      assert.equal(description.getHandleDescription(recipe.handles[0]), 'X-foo');
      assert.equal(description.getHandleDescription(recipe.handles[1]), 'X-foo');
    });
  });

  tests.forEach((test) => {
    it('duplicate particles ' + test.name, async () => {
      const {arc, recipe, ifooHandle, fooStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
    provide action
  description \`do A with \${ifoo}\`
    ifoo \`a-foo\`
${bParticleManifest}
  consume action
  description \`output B to \${ofoo}\`
    ofoo \`b-foo\`

recipe
  create as fooHandle1    // Foo
  create as foosHandle    // [Foo]
  create as fooHandle2    // Foo
  slot 'r0' as slot0
  B
    ofoo -> fooHandle1
    consume action as slot1
  A
    ifoo <- fooHandle1
    ofoos -> foosHandle
    consume root as slot0
      provide action as slot1
  B
    ofoo -> fooHandle2
    consume action as slot1
    `));

      // Add values to both Foo handles
      fooStore.set({id: 1, rawData: {name: 'the-FOO'}});
      const fooStore2 = await arc.createStore(fooStore.type, undefined, 'test:3') as VariableStorageProvider;
      fooStore2.set({id: 2, rawData: {name: 'another-FOO'}});
      const description = await test.verifySuggestion({arc},
          'Do A with b-foo (the-FOO), output B to b-foo, and output B to b-foo (another-FOO).');
      assert.equal(description.getHandleDescription(ifooHandle), 'b-foo');

      // Rank B bound to fooStore2 higher than B that is bound to fooHandle1.
      const relevance = Relevance.create(arc, recipe);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name === 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name === 'B')[0], [1]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name === 'B')[1], [10]);

      await test.verifySuggestion({arc, relevance},
          'Do A with b-foo (the-FOO), output B to b-foo (another-FOO), and output B to b-foo.');
    });
  });

  tests.forEach((test) => {
    it('sanisize description ' + test.name, async () => {
      const {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle A
  out Foo ofoo
  consume root
  description \`create <new> <\${ofoo}>\`
    ofoo \`<my-foo>\`

recipe
  create as fooHandle   // Foo
  slot 'r0' as slot0
  A
    ofoo -> fooHandle
    consume root as slot0
    `));

      const description = await test.verifySuggestion({arc}, 'Create &lt;new> &lt;&lt;my-foo>>.');
      const handle = recipe.handleConnections.find(hc => hc.particle.name === 'A' && hc.name === 'ofoo').handle;
      assert.equal(description.getHandleDescription(handle), '&lt;my-foo>');
    });
  });

  tests.forEach((test) => {
    it('multiword type and no name property in description ' + test.name, async () => {
      const manifestStr = `
        schema MyBESTType
          Text property
        particle P
          in MyBESTType t
          out [MyBESTType] ts
          description \`make \${ts} from \${t}\`
          consume root
        recipe
          create as tHandle
          create as tsHandle
          slot 'rootslotid-root' as slot0
          P
           t = tHandle
           ts = tsHandle
           consume root as slot0`;
        const manifest = (await Manifest.parse(manifestStr));
        assert.lengthOf(manifest.recipes, 1);
        const recipe = manifest.recipes[0];
        const myBESTType = manifest.findSchemaByName('MyBESTType').entityClass().type;
        recipe.handles[0].mapToStorage({id: 'test:1', type: myBESTType});
        recipe.handles[1].mapToStorage({id: 'test:2', type: myBESTType.collectionOf()});
        recipe.normalize();
        assert.isTrue(recipe.isResolved());

        const arc = createTestArc(recipe, manifest);
        const tStore = await arc.createStore(myBESTType, undefined, 'test:1') as VariableStorageProvider;
        const tsStore = await arc.createStore(myBESTType.collectionOf(), undefined, 'test:2') as CollectionStorageProvider;

        const description = await test.verifySuggestion({arc}, 'Make my best type list from my best type.');
        const tRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name === 'P' && hc.name === 't').handle;
        const tsRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name === 'P' && hc.name === 'ts').handle;
        assert.equal(description.getHandleDescription(tRecipeHandle), 'my best type');
        assert.equal(description.getHandleDescription(tsRecipeHandle), 'my best type list');

        // Add values to handles.
        tStore.set({id: 1, rawData: {property: 'value1'}});
        tsStore.store({id: 2, rawData: {property: 'value2'}}, ['key2']);
        await test.verifySuggestion({arc}, 'Make my best type list (1 items) from my best type.');

        tsStore.store({id: 3, rawData: {property: 'value3'}}, ['key3']);
        tsStore.store({id: 4, rawData: {property: 'value4'}}, ['key4']);
        await test.verifySuggestion({arc}, 'Make my best type list (3 items) from my best type.');
    });
  });

  tests.forEach((test) => {
    it('particle slots description ' + test.name, async () => {
      const manifestStr = `
schema Foo
  Text name
particle A
  inout Foo foo
  consume root
    provide aslot
    provide otherslot
  description \`hello \${root.aslot}, see you at \${root.otherslot}\`
particle B1
  out Foo foo
  consume aslot
  description \`first b\`
particle B2
  out Foo foo
  consume aslot
  description \`second b\`
particle C
  in Foo foo
  consume otherslot
  description \`only c\`
recipe
  create 'test:1' as handle0  // Foo
  slot 'rootslotid-root' as slot0
  A as particle1
    foo = handle0
    consume root as slot0
      provide aslot as slot1
      provide otherslot as slot2
  B1
    foo -> handle0
    consume aslot as slot1
  B2
    foo -> handle0
    consume aslot as slot1
  C
    foo <- handle0
    consume otherslot as slot2
`;
      const manifest = (await Manifest.parse(manifestStr));
      assert.lengthOf(manifest.recipes, 1);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      const arc = createTestArc(recipe, manifest);

      await test.verifySuggestion({arc}, 'Hello first b and second b, see you at only c.');
    });
  });

  tests.forEach((test) => {
    it('particle without UI description ' + test.name, async () => {
      const {arc, recipe, fooStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${bParticleManifest}
  description \`Populate \${ofoo}\`
recipe
  create as fooHandle   // Foo
  B
    ofoo -> fooHandle
      `));

      await test.verifySuggestion({arc}, 'Populate foo.');

      // Add value to a singleton handle.
      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion({arc}, 'Populate foo-name.');
    });
  });

  tests.forEach((test) => {
    it('capitalizes when some particles do not have descriptions ' + test.name, async () => {
      const manifest = (await Manifest.parse(`
interface DummyInterface
particle NoDescription
particle NoDescMuxer
  host DummyInterface hostedParticle
  consume root
    provide myslot
  description \`\${hostedParticle} description\`
particle HasDescription
  consume myslot
  description \`start with capital letter\`
recipe
  slot 'rootslotid-root' as slot0
  copy 'hosted-particle-handle' as hostedParticleHandle
  NoDescMuxer
    hostedParticle = hostedParticleHandle
    consume root as slot0
      provide myslot as slot1
  HasDescription
    consume myslot as slot1
      `));
      const recipe = manifest.recipes[0];
      const arc = createTestArc(recipe, manifest);
      const hostedParticle = manifest.findParticleByName('NoDescription');
      const hostedType = manifest.findParticleByName('NoDescMuxer').connections[0].type;
      const newStore = await arc.createStore(hostedType, /* name= */ null, 'hosted-particle-handle') as VariableStorageProvider;
      await newStore.set(hostedParticle.clone().toLiteral());

      await test.verifySuggestion({arc}, 'Start with capital letter.');
    });
  });

  it('has no particles description', async () => {
    const verify = async (manifestStr, expectedDescription) => {
      const manifest = await Manifest.parse(manifestStr);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      const arc = createTestArc(recipe, manifest);
      const description = await Description.create(arc);

      assert.equal(description.getRecipeSuggestion(), expectedDescription);
      assert.deepEqual(description.getRecipeSuggestion(DescriptionDomFormatter),
                       {template: expectedDescription, model: {}});
    };

    verify(`recipe`, 'I\'m feeling lucky.');
    verify(`recipe Hello`, 'Hello.');
  });

  it('generates type description', async () => {
    const manifest = (await Manifest.parse(`
schema TVShow
schema MyTVShow
schema MyTV
schema GitHubDash`));
    assert.equal(manifest.findTypeByName('TVShow').toPrettyString(), 'TV Show');
    assert.equal(manifest.findTypeByName('MyTVShow').toPrettyString(), 'My TV Show');
    assert.equal(manifest.findTypeByName('MyTV').toPrettyString(), 'My TV');
    assert.equal(manifest.findTypeByName('GitHubDash').toPrettyString(), 'Git Hub Dash');
  });

  it('fails gracefully (no asserts)', async () => {
    const verifyNoAssert = async (manifestStr, expectedSuggestion) => {
      const manifest = (await Manifest.parse(manifestStr));
      assert.lengthOf(manifest.recipes, 1);
      const recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      const arc = createTestArc(recipe, manifest);
      const description = await Description.create(arc);
      assert.equal(description.getArcDescription(), expectedSuggestion);
    };

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`\${Bar.things}\`
    `, undefined);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`Hello \${Bar.things}\`
    `, `Hello `);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
        description \`\${bar}\`
      recipe
        Foo
    `, undefined);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
        description \`\${bar.baz.boo}\`
      recipe
        Foo
    `, undefined);

    await verifyNoAssert(`
      particle Foo in 'foo.js'
      recipe
        Foo
        description \`\${foo.bar}\`
    `, undefined);
  });
});

describe('Dynamic description', () => {
  async function prepareRecipeAndArc() {
    const manifestStr = `
schema Foo
  Text name
  Text fooValue
schema Description
  Text key
  Text value
particle B
  out Foo ofoo
  out [Description] descriptions
  consume root
recipe
  create 'test:1' as handle0  // Foo
  create 'test:2' as handle1  // [Description]
  slot 'rootslotid-root' as slot0
  B as particle1
    ofoo -> handle0
    descriptions -> handle1
    consume root as slot0
`;
    const manifest = (await Manifest.parse(manifestStr));
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const fooType = manifest.findSchemaByName('Foo').entityClass().type;
    const descriptionType = manifest.findSchemaByName('Description').entityClass().type;
    recipe.handles[0].mapToStorage({id: 'test:1', type: fooType});
    recipe.handles[1].mapToStorage({id: 'test:2', type: descriptionType.collectionOf()});
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    const arc = createTestArc(recipe, manifest);
    const fooStore = await arc.createStore(fooType, undefined, 'test:1') as VariableStorageProvider;
    const descriptionStore = await arc.createStore(descriptionType.collectionOf(), undefined, 'test:2') as CollectionStorageProvider;

    // Use an any variable to turn descriptionStore into a storageProxy
    // tslint:disable-next-line: no-any
    let descriptionStoreProxy: any;
    descriptionStoreProxy = descriptionStore;

    return {
      arc,
      recipe,
      fooStore,
      DescriptionType: descriptionStore.type.primitiveType().entitySchema.entityClass(),
      descriptionHandle: handleFor(descriptionStoreProxy)
    };
  }

  tests.forEach((test) => {
    it('particle dynamic description ' + test.name, async () => {
      const {arc, recipe, fooStore, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();

      const description = await Description.create(arc);
      assert.isUndefined(description.getArcDescription());

      // Particle (static) spec pattern.
      recipe.particles[0].spec.pattern = 'hello world';
      await test.verifySuggestion({arc}, 'Hello world.');

      // Particle (dynamic) description handle (override static description).
      await descriptionHandle.store(new DescriptionType({key: 'pattern', value: 'Return my foo'}));
      await test.verifySuggestion({arc}, 'Return my foo.');

      // Particle description handle with handle connections.
      await descriptionHandle.store(new DescriptionType({key: 'pattern', value: 'Return my temporary foo'}));
      await descriptionHandle.store(new DescriptionType({key: 'pattern', value: 'Return my ${ofoo}'}));
      const ofooDesc = new DescriptionType({key: 'ofoo', value: 'best-foo'});
      await descriptionHandle.store(ofooDesc);
      await test.verifySuggestion({arc}, 'Return my best-foo.');

      // Add value to connection's handle.
      await fooStore.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FO4'}});
      await test.verifySuggestion({arc}, 'Return my best-foo (foo-name).');

      // Remove connection's description.
      await fooStore.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await descriptionHandle.remove(ofooDesc);
      await test.verifySuggestion({arc}, 'Return my foo-name.');
    });
  });

  tests.forEach((test) => {
    it('particle recipe description ' + test.name, async () => {
      const {arc, recipe, fooStore, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();

      const description = await Description.create(arc);
      assert.isUndefined(description.getArcDescription());

      const recipeClone = recipe.clone();
      arc['_activeRecipe'] = recipeClone;
      arc['_recipes'] = [recipeClone];

      // Particle (static) spec pattern.
      recipeClone.particles[0].spec.pattern = 'hello world';
      await test.verifySuggestion({arc}, 'Hello world.');

      recipeClone.patterns = [`Here it is: \${B}`];
      await test.verifySuggestion({arc}, 'Here it is: hello world.');

      // Particle (dynamic) description handle (override static description).
      await descriptionHandle.store(new DescriptionType({key: 'pattern', value: 'dynamic B description'}));
      await test.verifySuggestion({arc}, 'Here it is: dynamic B description.');
    });
  });

  tests.forEach((test) => {
    it('particle dynamic dom description ' + test.name, async () => {
      const {arc, recipe, fooStore, DescriptionType, descriptionHandle} = await prepareRecipeAndArc();
      await descriptionHandle.store(new DescriptionType({key: 'pattern', value: 'return my ${ofoo} (text)'}));
      await descriptionHandle.store(new DescriptionType({key: '_template_', value: 'Return my <span>{{ofoo}}</span> (dom)'}));
      await descriptionHandle.store(new DescriptionType({key: '_model_', value: JSON.stringify({'ofoo': '${ofoo}'})}));
      await test.verifySuggestion({arc}, `Return my foo (${test.name}).`);

      await fooStore.set({id: 5, rawData: {name: 'foo-name'}});
      await test.verifySuggestion({arc}, `Return my foo-name (${test.name}).`);
    });
  });
});
