/**
* @license
* Copyright (c) 2017 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

import {assert} from './chai-web.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {DescriptionDomFormatter} from '../description-dom-formatter.js';
import {handleFor} from '../handle.js';
import {Manifest} from '../manifest.js';
import {Relevance} from '../relevance.js';
import {SlotComposer} from '../slot-composer.js';

function createTestArc() {
  const slotComposer = new SlotComposer({rootContext: 'test', affordance: 'mock'});
  let arc = new Arc({slotComposer, id: 'test'});
  return arc;
}

let tests = [
  {
    name: 'text',
    verifySuggestion: async (expectedSuggestion, description) => {
      assert.equal(expectedSuggestion, await description.getArcDescription());
    }
  },
  {
    name: 'dom',
    verifySuggestion: async (expectedSuggestion, description) => {
      let suggestion = await description.getArcDescription(DescriptionDomFormatter);
      let result = suggestion.template.replace(/<[/]?span>/g, '').replace(/<[/]?b>/g, '');
      Object.keys(suggestion.model).forEach(m => {
        assert.isTrue(result.indexOf(`{{${m}}}`) >= 0);
        result = result.replace(new RegExp(`{{${m}}}`, 'g'), suggestion.model[m]);
        assert.isFalse(result.indexOf(`{{${m}}}`) >= 0);
      });
      assert.equal(expectedSuggestion, result);
    }
  },
];

describe('Description', function() {
  let schemaManifest = `
schema Foo
  Text name
  Text fooValue
schema Bar
  Text name
  Text barValue
schema Far
  Text name
  Text farValue`;
  let aParticleManifest = `
particle A
  in Foo ifoo
  out [Foo] ofoos
  consume root`;
  let bParticleManifest = `
particle B
  out Foo ofoo`;
  let recipeManifest = `
recipe
  create as fooHandle   // Foo
  create as foosHandle  // [Foo]
  slot 'rootslotid-root' as slot0
  A
    ifoo <- fooHandle
    ofoos -> foosHandle
    consume root as slot0`;
  async function prepareRecipeAndArc(manifestStr) {
    let manifest = (await Manifest.parse(manifestStr));
    assert.equal(1, manifest.recipes.length);
    let recipe = manifest.recipes[0];
    let Foo = manifest.findSchemaByName('Foo').entityClass();
    recipe.handles[0].mapToStorage({id: 'test:1', type: Foo.type});
    if (recipe.handles.length > 1) {
      recipe.handles[1].mapToStorage({id: 'test:2', type: Foo.type.collectionOf()});
    }
    if (recipe.handles.length > 2) {
      recipe.handles[2].mapToStorage({id: 'test:3', type: Foo.type});
    }
    let arc = createTestArc();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    let foosStore = await arc.createStore(Foo.type.collectionOf(), undefined, 'test:2');
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    let ifooHandleConn = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ifoo');
    let ifooHandle = ifooHandleConn ? ifooHandleConn.handle : null;
    let ofoosHandleConn = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ofoos');
    let ofoosHandle = ofoosHandleConn ? ofoosHandleConn.handle : null;
    arc._activeRecipe = recipe;
    return {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore};
  }

  tests.forEach((test) => {
    it('one particle description ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
${recipeManifest}
      `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from foo and populate foo list.', description);
      assert.equal('foo', await description.getHandleDescription(ifooHandle));
      assert.equal('foo list', await description.getHandleDescription(ofoosHandle));

      // Add value to a singleton handle.
      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Read from foo-name and populate foo list.', description);
      assert.equal('foo', await description.getHandleDescription(ifooHandle));
      assert.equal('foo list', await description.getHandleDescription(ofoosHandle));

      // Add values to a collection handle.
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from foo-name and populate foo list (foo-1, foo-2).', description);
      assert.equal('foo', await description.getHandleDescription(ifooHandle));
      assert.equal('foo list', await description.getHandleDescription(ofoosHandle));

      // Add more values to the collection handle.
      foosStore.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
      await test.verifySuggestion('Read from foo-name and populate foo list (foo-1 plus 2 other items).', description);
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`my-out-foos\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from my-in-foo and populate my-out-foos.', description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooHandle));
      assert.equal('my-out-foos', await description.getHandleDescription(ofoosHandle));

      // Add value to a singleton handle.
      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos.', description);

      // Add values to a collection handle.
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos (foo-1, foo-2).', description);

      // Add more values to the collection handle.
      foosStore.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos (foo-1 plus 2 other items).',
                                  description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooHandle));
      assert.equal('my-out-foos', await description.getHandleDescription(ofoosHandle));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from my-in-foo and populate The Foos from my-in-foo.', description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooHandle));
      assert.equal('The Foos from my-in-foo', await description.getHandleDescription(ofoosHandle));

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate The Foos from my-in-foo (foo-1, foo-2).',
                            description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooHandle));
      assert.equal('The Foos from my-in-foo', await description.getHandleDescription(ofoosHandle));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references no pattern ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from foo and populate The Foos from foo.', description);
      assert.equal('foo', await description.getHandleDescription(ifooHandle));
      assert.equal('The Foos from foo', await description.getHandleDescription(ofoosHandle));

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion(
          'Read from foo-name and populate The Foos from foo-name (foo-1, foo-2).', description);
      assert.equal('foo', await description.getHandleDescription(ifooHandle));
      assert.equal('The Foos from foo', await description.getHandleDescription(ofoosHandle));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions with extras ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}._name_\`
    ifoo \`[fooValue: \${ifoo.fooValue}]\`
    ofoos \`[A list of \${ifoo}._type_ with values: \${ofoos}._values_]\`
${recipeManifest}
    `));

      let description = new Description(arc);

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});

      await test.verifySuggestion('Read from [fooValue: the-FOO] (foo-name) and populate [A list of foo with values: foo-1, foo-2].',
                            description);

      assert.equal('[fooValue: the-FOO]', await description.getHandleDescription(ifooHandle));
      // Add mode getHandleDescription tests, to verify all are strings!
      assert.equal('[A list of foo with values: foo-1, foo-2]', await description.getHandleDescription(ofoosHandle));
    });
  });

  tests.forEach((test) => {
    it('connection description from another particle ' + test.name, async () => {
      let {arc, recipe, ifooHandle, ofoosHandle, fooStore, foosStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`my-foos\`
${bParticleManifest}
  description \`create the \${ofoo}\`
    ofoo \`best-new-foo\`
${recipeManifest}
  B
    ofoo -> fooHandle
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from best-new-foo and populate my-foos.', description);
      assert.equal('best-new-foo', await description.getHandleDescription(ifooHandle));
      let oBFooHandle = recipe.handleConnections.find(hc => hc.particle.name == 'B' && hc.name == 'ofoo').handle;
      assert.equal('best-new-foo', await description.getHandleDescription(oBFooHandle));
      assert.equal('my-foos', await description.getHandleDescription(ofoosHandle));

      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosStore.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosStore.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from best-new-foo (foo-name) and populate my-foos (foo-1, foo-2).',
                            description);
      assert.equal('best-new-foo', await description.getHandleDescription(ifooHandle));
      assert.equal('best-new-foo', await description.getHandleDescription(oBFooHandle));
      assert.equal('my-foos', await description.getHandleDescription(ofoosHandle));
    });
  });

  tests.forEach((test) => {
    it('multiple particles ' + test.name, async () => {
      let {arc, recipe, ifooHandleConn} = (await prepareRecipeAndArc(`
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
  slot 'action::slot' as slot1
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
      let aFooHandle = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ifoo').handle;

      let description = new Description(arc);

      await test.verifySuggestion('Display X1-foo, create X1::X1-foo, and create X2::X2-foo.', description);
      assert.equal('X1-foo', await description.getHandleDescription(aFooHandle));

      // Rank X2 higher than X2
      let relevance = new Relevance();
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'X1'), [5]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'X2'), [10]);

      description.relevance = relevance;
      await test.verifySuggestion('Display X2-foo, create X2::X2-foo, and create X1::X1-foo.', description);
      assert.equal('X2-foo', await description.getHandleDescription(aFooHandle));
    });
  });

  tests.forEach((test) => {
    it('same particle multiple times ' + test.name, async () => {
      let manifestStr = `
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
      let manifest = (await Manifest.parse(manifestStr));
      assert.equal(1, manifest.recipes.length);
      let recipe = manifest.recipes[0];
      let Foo = manifest.findSchemaByName('Foo').entityClass();
      recipe.handles[0].mapToStorage({id: 'test:1', type: Foo.type.collectionOf()});
      recipe.handles[1].mapToStorage({id: 'test:2', type: Foo.type.collectionOf()});
      let arc = createTestArc();
      let fooStore1 = await arc.createStore(Foo.type.collectionOf(), undefined, 'test:1');
      let fooStore2 = await arc.createStore(Foo.type.collectionOf(), undefined, 'test:2');
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      arc._activeRecipe = recipe;

      let description = new Description(arc);

      await test.verifySuggestion('Write to X-foo and write to X-foo.', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[1]));

      // Add values to the second handle.
      fooStore2.store({id: 1, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      fooStore2.store({id: 2, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Write to X-foo and write to X-foo (foo-1, foo-2).', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[1]));

      // Add values to the first handle also.
      fooStore1.store({id: 3, rawData: {name: 'foo-3', fooValue: 'foo-value-3'}});
      fooStore1.store({id: 4, rawData: {name: 'foo-4', fooValue: 'foo-value-4'}});
      await test.verifySuggestion('Write to X-foo (foo-3, foo-4) and write to X-foo (foo-1, foo-2).', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.handles[1]));
    });
  });

  tests.forEach((test) => {
    it('duplicate particles ' + test.name, async () => {
      let {arc, recipe, ifooHandle, fooStore} = (await prepareRecipeAndArc(`
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
  slot 'action::slot' as slot1
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

      let description = new Description(arc);

      // Add values to both Foo handles
      fooStore.set({id: 1, rawData: {name: 'the-FOO'}});
      let fooStore2 = await arc.createStore(fooStore.type, undefined, 'test:3');
      fooStore2.set({id: 2, rawData: {name: 'another-FOO'}});
      await test.verifySuggestion(
          'Do A with b-foo (the-FOO), output B to b-foo, and output B to b-foo (another-FOO).', description);
      assert.equal('b-foo', await description.getHandleDescription(ifooHandle));

      // Rank B bound to fooStore2 higher than B that is bound to fooHandle1.
      let relevance = new Relevance();
      relevance.newArc = arc;
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name == 'B')[0], [1]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name == 'B')[1], [10]);

      description.relevance = relevance;
      await test.verifySuggestion(
          'Do A with b-foo (the-FOO), output B to b-foo (another-FOO), and output B to b-foo.', description);
    });
  });

  tests.forEach((test) => {
    it('sanisize description ' + test.name, async () => {
      let {arc, recipe} = (await prepareRecipeAndArc(`
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

      let description = new Description(arc);

      await test.verifySuggestion('Create &lt;new> &lt;&lt;my-foo>>.', description);
      let handle = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ofoo').handle;
      assert.equal('&lt;my-foo>', await description.getHandleDescription(handle, arc));
    });
  });

  tests.forEach((test) => {
    it('multiword type and no name property in description ' + test.name, async () => {
      let manifestStr = `
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
        let manifest = (await Manifest.parse(manifestStr));
        assert.equal(1, manifest.recipes.length);
        let recipe = manifest.recipes[0];
        let MyBESTType = manifest.findSchemaByName('MyBESTType').entityClass();
        recipe.handles[0].mapToStorage({id: 'test:1', type: MyBESTType.type});
        recipe.handles[1].mapToStorage({id: 'test:2', type: MyBESTType.type.collectionOf()});
        let arc = createTestArc();
        let tStore = await arc.createStore(MyBESTType.type, undefined, 'test:1');
        let tsStore = await arc.createStore(MyBESTType.type.collectionOf(), undefined, 'test:2');
        recipe.normalize();
        assert.isTrue(recipe.isResolved());

        arc._activeRecipe = recipe;
        let description = new Description(arc);

        await test.verifySuggestion('Make my best type list from my best type.', description);
        let tRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name == 'P' && hc.name == 't').handle;
        let tsRecipeHandle = recipe.handleConnections.find(hc => hc.particle.name == 'P' && hc.name == 'ts').handle;
        assert.equal('my best type', await description.getHandleDescription(tRecipeHandle));
        assert.equal('my best type list', await description.getHandleDescription(tsRecipeHandle));

        // Add values to handles.
        tStore.set({id: 1, rawData: {property: 'value1'}});
        tsStore.store({id: 2, rawData: {property: 'value2'}});
        await test.verifySuggestion('Make my best type list (1 items) from my best type.', description);

        tsStore.store({id: 3, rawData: {property: 'value3'}});
        tsStore.store({id: 4, rawData: {property: 'value4'}});
        await test.verifySuggestion('Make my best type list (3 items) from my best type.', description);
    });
  });

  tests.forEach((test) => {
    it('particle slots description ' + test.name, async () => {
      let manifestStr = `
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
      let manifest = (await Manifest.parse(manifestStr));
      assert.equal(1, manifest.recipes.length);
      let recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());

      let arc = createTestArc();
      arc._activeRecipe = recipe;

      let description = new Description(arc);

      await test.verifySuggestion('Hello first b and second b, see you at only c.', description);
    });
  });

  tests.forEach((test) => {
    it('particle without UI description ' + test.name, async () => {
      let {arc, recipe, fooStore} = (await prepareRecipeAndArc(`
${schemaManifest}
${bParticleManifest}
  description \`Populate \${ofoo}\`
recipe
  create as fooHandle   // Foo
  B
    ofoo -> fooHandle
      `));

      let description = new Description(arc);
      await test.verifySuggestion('Populate foo.', description);

      // Add value to a singleton handle.
      fooStore.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Populate foo-name.', description);
    });
  });

  it('has no particles description', async () => {
    let verify = async (manifestStr, expectedDescription) => {
      let recipe = (await Manifest.parse(manifestStr)).recipes[0];
      let arc = createTestArc();
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      arc._activeRecipe = recipe;
      arc.recipes.push({particles: recipe.particles, handles: recipe.handles, slots: recipe.slots, innerArcs: new Map(), pattern: recipe.pattern});
      let description = new Description(arc);

      assert.equal(expectedDescription, await description.getRecipeSuggestion());
      assert.deepEqual({template: expectedDescription, model: {}},
                      await description.getRecipeSuggestion(DescriptionDomFormatter));
    };

    verify(`recipe`, 'I\'m feeling lucky.');
    verify(`recipe hello`, 'Hello.');
  });

  it('generates type description', async () => {
    let manifest = (await Manifest.parse(`
schema TVShow
schema MyTVShow
schema MyTV
schema GitHubDash`));
    assert.equal('TV Show', manifest.findTypeByName('TVShow').toPrettyString());
    assert.equal('My TV Show', manifest.findTypeByName('MyTVShow').toPrettyString());
    assert.equal('My TV', manifest.findTypeByName('MyTV').toPrettyString());
    assert.equal('Git Hub Dash', manifest.findTypeByName('GitHubDash').toPrettyString());
  });
});

describe('Dynamic description', function() {
  async function prepareRecipeAndArc() {
    let manifestStr = `
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
    let manifest = (await Manifest.parse(manifestStr));
    assert.equal(1, manifest.recipes.length);
    let recipe = manifest.recipes[0];
    let Foo = manifest.findSchemaByName('Foo').entityClass();
    let DescriptionType = manifest.findSchemaByName('Description').entityClass();
    recipe.handles[0].mapToStorage({id: 'test:1', type: Foo.type});
    recipe.handles[1].mapToStorage({id: 'test:2', type: DescriptionType.type.collectionOf()});
    let arc = createTestArc();
    let fooStore = await arc.createStore(Foo.type, undefined, 'test:1');
    let descriptionStore = await arc.createStore(DescriptionType.type.collectionOf(), undefined, 'test:2');
    recipe.normalize();
    assert.isTrue(recipe.isResolved());

    arc._activeRecipe = recipe;
    return {
      recipe,
      description: new Description(arc),
      fooStore,
      Description: descriptionStore.type.primitiveType().entitySchema.entityClass(),
      descriptionHandle: handleFor(descriptionStore)
    };
  }

  tests.forEach((test) => {
    it('particle dynamic description ' + test.name, async () => {
      let {recipe, description, fooStore, Description, descriptionHandle} = await prepareRecipeAndArc();

      assert.isUndefined(await description.getArcDescription());

      // Particle (static) spec pattern.
      recipe.particles[0].spec.pattern = 'hello world';
      await test.verifySuggestion('Hello world.', description);

      // Particle (dynamic) description handle (override static description).
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my foo'}));
      await test.verifySuggestion('Return my foo.', description);

      // Particle description handle with handle connections.
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my temporary foo'}));
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my ${ofoo}'}));
      let ofooDesc = new Description({key: 'ofoo', value: 'best-foo'});
      descriptionHandle.store(ofooDesc);
      await test.verifySuggestion('Return my best-foo.', description);

      // Add value to connection's handle.
      fooStore.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Return my best-foo (foo-name).', description);

      // Remove connection's description.
      fooStore.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      descriptionHandle.remove(ofooDesc);
      await test.verifySuggestion('Return my foo-name.', description);
    });
  });

  tests.forEach((test) => {
    it('particle dynamic dom description ' + test.name, async () => {
      let {recipe, description, fooStore, Description, descriptionHandle} = await prepareRecipeAndArc();
      descriptionHandle.store(new Description({key: '_pattern_', value: 'return my ${ofoo} (text)'}));
      descriptionHandle.store(new Description({key: '_template_', value: 'Return my <span>{{ofoo}}</span> (dom)'}));
      descriptionHandle.store(new Description({key: '_model_', value: JSON.stringify({'ofoo': '${ofoo}'})}));
      await test.verifySuggestion(`Return my foo (${test.name}).`, description);

      fooStore.set({id: 5, rawData: {name: 'foo-name'}});
      await test.verifySuggestion(`Return my foo-name (${test.name}).`, description);
    });
  });
});
