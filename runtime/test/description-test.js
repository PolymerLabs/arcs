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
import Arc from '../arc.js';
import Description from '../description.js';
import DescriptionDomFormatter from '../description-dom-formatter.js';
import handle from '../handle.js';
import Loader from '../loader.js';
import Manifest from '../manifest.js';
import Relevance from '../relevance.js';
import SlotComposer from '../slot-composer.js';
import Type from '../type.js';

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
  optional
    Text name
    Text fooValue
schema Bar
  optional
    Text name
    Text barValue
schema Far
  optional
    Text name
    Text farValue`;
  let aParticleManifest = `
particle A
  A(in Foo ifoo, out [Foo] ofoos)
  consume root`;
  let bParticleManifest = `
particle B
  B(out Foo ofoo)`;
  let recipeManifest = `
recipe
  create as fooView   // Foo
  create as foosView  // [Foo]
  slot 'rootslotid-root' as slot0
  A
    ifoo <- fooView
    ofoos -> foosView
    consume root as slot0`;
  async function prepareRecipeAndArc(manifestStr) {
    let manifest = (await Manifest.parse(manifestStr));
    assert(1, manifest.recipes.length);
    let recipe = manifest.recipes[0];
    let Foo = manifest.findSchemaByName('Foo').entityClass();
    recipe.views[0].mapToView({id: 'test:1', type: Foo.type});
    if (recipe.views.length > 1) {
      recipe.views[1].mapToView({id: 'test:2', type: Foo.type.setViewOf()});
    }
    if (recipe.views.length > 2) {
      recipe.views[2].mapToView({id: 'test:3', type: Foo.type});
    }
    let arc = createTestArc();
    let fooView = await arc.createHandle(Foo.type);
    let foosView = await arc.createHandle(Foo.type.setViewOf());
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    let ifooHandleConn = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ifoo');
    let ifooView = ifooHandleConn ? ifooHandleConn.view : null;
    let ofoosHandleConn = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ofoos');
    let ofoosView = ofoosHandleConn ? ofoosHandleConn.view : null;
    arc._activeRecipe = recipe;
    return {arc, recipe, ifooView, ofoosView, fooView, foosView};
  }

  tests.forEach((test) => {
    it('one particle description ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
${recipeManifest}
      `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from foo and populate foo list.', description);
      assert.equal('foo', await description.getHandleDescription(ifooView));
      assert.equal('foo list', await description.getHandleDescription(ofoosView));

      // Add value to singleton view.
      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Read from foo-name and populate foo list.', description);
      assert.equal('foo', await description.getHandleDescription(ifooView));
      assert.equal('foo list', await description.getHandleDescription(ofoosView));

      // Add values to set-view
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from foo-name and populate foo list (foo-1, foo-2).', description);
      assert.equal('foo', await description.getHandleDescription(ifooView));
      assert.equal('foo list', await description.getHandleDescription(ofoosView));

      // Add more values to set-view
      foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
      await test.verifySuggestion('Read from foo-name and populate foo list (foo-1 plus 2 other items).', description);
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`my-out-foos\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from my-in-foo and populate my-out-foos.', description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooView));
      assert.equal('my-out-foos', await description.getHandleDescription(ofoosView));

      // Add value to singleton view.
      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos.', description);

      // Add values to set-view
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos (foo-1, foo-2).',
                            description);

      // Add more values to set-view
      foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate my-out-foos (foo-1 plus 2 other items).',
                            description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooView));
      assert.equal('my-out-foos', await description.getHandleDescription(ofoosView));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from my-in-foo and populate The Foos from my-in-foo.', description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooView));
      assert.equal('The Foos from my-in-foo', await description.getHandleDescription(ofoosView));

      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from my-in-foo (foo-name) and populate The Foos from my-in-foo (foo-1, foo-2).',
                            description);
      assert.equal('my-in-foo', await description.getHandleDescription(ifooView));
      assert.equal('The Foos from my-in-foo', await description.getHandleDescription(ofoosView));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions references no pattern ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from foo and populate The Foos from foo.', description);
      assert.equal('foo', await description.getHandleDescription(ifooView));
      assert.equal('The Foos from foo', await description.getHandleDescription(ofoosView));

      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from foo-name and populate The Foos from foo-name (foo-1, foo-2).',
                            description);
      assert.equal('foo', await description.getHandleDescription(ifooView));
      assert.equal('The Foos from foo', await description.getHandleDescription(ofoosView));
    });
  });

  tests.forEach((test) => {
    it('one particle and connections descriptions with extras ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}._name_\`
    ifoo \`[fooValue: \${ifoo.fooValue}]\`
    ofoos \`[A list of \${ifoo}._type_ with values: \${ofoos}._values_]\`
${recipeManifest}
    `));

      let description = new Description(arc);

      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});

      await test.verifySuggestion('Read from [fooValue: the-FOO] (foo-name) and populate [A list of foo with values: foo-1, foo-2].',
                            description);

      assert.equal('[fooValue: the-FOO]', await description.getHandleDescription(ifooView)); /// view description is an object?
      // Add mode getHandleDescription tests, to verify all are strings!
      assert.equal('[A list of foo with values: foo-1, foo-2]', await description.getHandleDescription(ofoosView));
    });
  });

  tests.forEach((test) => {
    it('connection description from another particle ' + test.name, async () => {
      let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`my-foos\`
${bParticleManifest}
  description \`create the \${ofoo}\`
    ofoo \`best-new-foo\`
${recipeManifest}
  B
    ofoo -> fooView
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Read from best-new-foo and populate my-foos.', description);
      assert.equal('best-new-foo', await description.getHandleDescription(ifooView));
      let oBFooView = recipe.handleConnections.find(hc => hc.particle.name == 'B' && hc.name == 'ofoo').view;
      assert.equal('best-new-foo', await description.getHandleDescription(oBFooView));
      assert.equal('my-foos', await description.getHandleDescription(ofoosView));

      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Read from best-new-foo (foo-name) and populate my-foos (foo-1, foo-2).',
                            description);
      assert.equal('best-new-foo', await description.getHandleDescription(ifooView));
      assert.equal('best-new-foo', await description.getHandleDescription(oBFooView));
      assert.equal('my-foos', await description.getHandleDescription(ofoosView));
    });
  });

  tests.forEach((test) => {
    it('multiple particles ' + test.name, async () => {
      let {arc, recipe, ifooHandleConn, fooView} = (await prepareRecipeAndArc(`
${schemaManifest}
particle X1
  X1(out Foo ofoo)
  consume action
  description \`create X1::\${ofoo}\`
    ofoo \`X1-foo\`
particle X2
  X2(out Foo ofoo)
  consume action
  description \`create X2::\${ofoo}\`
    ofoo \`X2-foo\`
particle A
  A(in Foo ifoo)
  consume root
    provide action
  description \`display \${ifoo}\`
    ifoo \`A-foo\`

recipe
  create as fooView   // Foo
  slot 'r0' as slot0
  slot 'action::slot' as slot1
  X1
    ofoo -> fooView
    consume action as slot1
  X2
    ofoo -> fooView
    consume action as slot1
  A
    ifoo <- fooView
    consume root as slot0
      provide action as slot1
    `));
      let aFooView = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ifoo').view;

      let description = new Description(arc);

      await test.verifySuggestion('Display X1-foo, create X1::X1-foo, and create X2::X2-foo.', description);
      assert.equal('X1-foo', await description.getHandleDescription(aFooView));

      // Rank X2 higher than X2
      let relevance = new Relevance();
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'X1'), [5]);
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'X2'), [10]);

      description.relevance = relevance;
      await test.verifySuggestion('Display X2-foo, create X2::X2-foo, and create X1::X1-foo.', description);
      assert.equal('X2-foo', await description.getHandleDescription(aFooView));
    });
  });

  tests.forEach((test) => {
    it('same particle multiple times ' + test.name, async () => {
      let manifestStr = `
${schemaManifest}
particle X
  X(out [Foo] ofoo)
  consume root
  description \`write to \${ofoo}\`
    ofoo \`X-foo\`

recipe
  create as fooView1   // Foo
  create as fooView2   // Foo
  slot 'r0' as slot0
  X
    ofoo -> fooView1
    consume root as slot0
  X
    ofoo -> fooView2
    consume root as slot0
    `;
      let manifest = (await Manifest.parse(manifestStr));
      assert(1, manifest.recipes.length);
      let recipe = manifest.recipes[0];
      let Foo = manifest.findSchemaByName('Foo').entityClass();
      recipe.views[0].mapToView({id: 'test:1', type: Foo.type.setViewOf()});
      recipe.views[1].mapToView({id: 'test:2', type: Foo.type.setViewOf()});
      let arc = createTestArc();
      let fooView1 = await arc.createHandle(Foo.type.setViewOf());
      let fooView2 = await arc.createHandle(Foo.type.setViewOf());
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
      arc._activeRecipe = recipe;

      let description = new Description(arc);

      await test.verifySuggestion('Write to X-foo and write to X-foo.', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[1]));

      // Add values to the second view.
      fooView2.store({id: 1, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
      fooView2.store({id: 2, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
      await test.verifySuggestion('Write to X-foo and write to X-foo (foo-1, foo-2).', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[1]));

      // Add values to the first view also.
      fooView1.store({id: 3, rawData: {name: 'foo-3', fooValue: 'foo-value-3'}});
      fooView1.store({id: 4, rawData: {name: 'foo-4', fooValue: 'foo-value-4'}});
      await test.verifySuggestion('Write to X-foo (foo-3, foo-4) and write to X-foo (foo-1, foo-2).', description);
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[0]));
      assert.equal('X-foo', await description.getHandleDescription(recipe.views[1]));
    });
  });

  tests.forEach((test) => {
    it('duplicate particles ' + test.name, async () => {
      let {arc, recipe, ifooView, fooView} = (await prepareRecipeAndArc(`
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
  create as fooView1    // Foo
  create as foosView    // [Foo]
  create as fooView2    // Foo
  slot 'r0' as slot0
  slot 'action::slot' as slot1
  B
    ofoo -> fooView1
    consume action as slot1
  A
    ifoo <- fooView1
    ofoos -> foosView
    consume root as slot0
      provide action as slot1
  B
    ofoo -> fooView2
    consume action as slot1
    `));

      let description = new Description(arc);

      // Add values to both Foo views
      fooView.set({id: 1, rawData: {name: 'the-FOO'}});
      let fooView2 = await arc.createHandle(fooView.type);
      fooView2.set({id: 2, rawData: {name: 'another-FOO'}});
      await test.verifySuggestion('Do A with b-foo (the-FOO), output B to b-foo, and output B to b-foo (another-FOO).',
                            description);
      assert.equal('b-foo', await description.getHandleDescription(ifooView));

      // Rank B bound to fooView2 higher than B that is bound to fooView1.
      let relevance = new Relevance();
      relevance.newArc = arc;
      relevance.relevanceMap.set(recipe.particles.find(p => p.name == 'A'), [7]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name == 'B')[0], [1]);
      relevance.relevanceMap.set(recipe.particles.filter(p => p.name == 'B')[1], [10]);

      description.relevance = relevance;
      await test.verifySuggestion('Do A with b-foo (the-FOO), output B to b-foo (another-FOO), and output B to b-foo.',
                            description);
    });
  });

  tests.forEach((test) => {
    it('sanisize description ' + test.name, async () => {
      let {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle A
  A(out Foo ofoo)
  consume root
  description \`create <new> <\${ofoo}>\`
    ofoo \`<my-foo>\`

recipe
  create as fooView   // Foo
  slot 'r0' as slot0
  A
    ofoo -> fooView
    consume root as slot0
    `));

      let description = new Description(arc);

      await test.verifySuggestion('Create &lt;new> &lt;&lt;my-foo>>.', description);
      let view = recipe.handleConnections.find(hc => hc.particle.name == 'A' && hc.name == 'ofoo').view;
      assert.equal('&lt;my-foo>', await description.getHandleDescription(view, arc));
    });
  });

  tests.forEach((test) => {
    it('multiword type and no name property in description ' + test.name, async () => {
      let manifestStr = `
        schema MyBESTType
          optional
            Text property
        particle P
          P(in MyBESTType t, out [MyBESTType] ts)
          description \`make \${ts} from \${t}\`
          consume root
        recipe
          create as tView
          create as tsView
          slot 'rootslotid-root' as slot0
          P
           t = tView
           ts = tsView
           consume root as slot0`;
        let manifest = (await Manifest.parse(manifestStr));
        assert(1, manifest.recipes.length);
        let recipe = manifest.recipes[0];
        let MyBESTType = manifest.findSchemaByName('MyBESTType').entityClass();
        recipe.views[0].mapToView({id: 'test:1', type: MyBESTType.type});
        recipe.views[1].mapToView({id: 'test:2', type: MyBESTType.type.setViewOf()});
        let arc = createTestArc();
        let tView = await arc.createHandle(MyBESTType.type);
        let tsView = await arc.createHandle(MyBESTType.type.setViewOf());
        recipe.normalize();
        assert.isTrue(recipe.isResolved());

        arc._activeRecipe = recipe;
        let description = new Description(arc);

        await test.verifySuggestion('Make my best type list from my best type.', description);
        let tRecipeView = recipe.handleConnections.find(hc => hc.particle.name == 'P' && hc.name == 't').view;
        let tsRecipeView = recipe.handleConnections.find(hc => hc.particle.name == 'P' && hc.name == 'ts').view;
        assert.equal('my best type', await description.getHandleDescription(tRecipeView));
        assert.equal('my best type list', await description.getHandleDescription(tsRecipeView));

        // Add values to views.
        tView.set({id: 1, rawData: {property: 'value1'}});
        tsView.store({id: 2, rawData: {property: 'value2'}});
        await test.verifySuggestion('Make my best type list (1 items) from my best type.', description);

        tsView.store({id: 3, rawData: {property: 'value3'}});
        tsView.store({id: 4, rawData: {property: 'value4'}});
        await test.verifySuggestion('Make my best type list (3 items) from my best type.', description);
    });
  });

  tests.forEach((test) => {
    it('particle slots description ' + test.name, async () => {
      let manifestStr = `
schema Foo
  optional
    Text name
particle A
  A(inout Foo foo)
  consume root
    provide aslot
    provide otherslot
  description \`hello \${root.aslot}, see you at \${root.otherslot}\`
particle B1
  B1(out Foo foo)
  consume aslot
  description \`first b\`
particle B2
  B2(out Foo foo)
  consume aslot
  description \`second b\`
particle C
  C(in Foo foo)
  consume otherslot
  description \`only c\`
recipe
  create 'test:1' as view0  // Foo
  slot 'rootslotid-root' as slot0
  A as particle1
    foo = view0
    consume root as slot0
      provide aslot as slot1
      provide otherslot as slot2
  B1
    foo -> view0
    consume aslot as slot1
  B2
    foo -> view0
    consume aslot as slot1
  C
    foo <- view0
    consume otherslot as slot2
`;
      let manifest = (await Manifest.parse(manifestStr));
      assert(1, manifest.recipes.length);
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
      let {arc, recipe, fooView} = (await prepareRecipeAndArc(`
${schemaManifest}
${bParticleManifest}
  description \`Populate \${ofoo}\`
recipe
  create as fooView   // Foo
  B
    ofoo -> fooView
      `));

      let description = new Description(arc);
      await test.verifySuggestion('Populate foo.', description);

      // Add value to singleton view.
      fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Populate foo-name.', description);
    });
  });
});

describe('Dynamic description', function() {
  async function prepareRecipeAndArc() {
    let manifestStr = `
schema Foo
  optional
    Text name
    Text fooValue
schema Description
  optional
    Text key
    Text value
particle B
  B(out Foo ofoo, out [Description] descriptions)
  consume root
recipe
  create 'test:1' as view0  // Foo
  create 'test:2' as view1  // [Description]
  slot 'rootslotid-root' as slot0
  B as particle1
    ofoo -> view0
    descriptions -> view1
    consume root as slot0
`;
    let manifest = (await Manifest.parse(manifestStr));
    assert(1, manifest.recipes.length);
    let recipe = manifest.recipes[0];
    let Foo = manifest.findSchemaByName('Foo').entityClass();
    let DescriptionType = manifest.findSchemaByName('Description').entityClass();
    recipe.views[0].mapToView({id: 'test:1', type: Foo.type});
    recipe.views[1].mapToView({id: 'test:2', type: DescriptionType.type.setViewOf()});
    let arc = createTestArc();
    let fooView = await arc.createHandle(Foo.type);
    let descriptionView = await arc.createHandle(DescriptionType.type.setViewOf());
    recipe.normalize();
    assert.isTrue(recipe.isResolved());

    arc._activeRecipe = recipe;
    return {
      recipe,
      description: new Description(arc),
      fooView,
      Description: descriptionView.type.primitiveType().entitySchema.entityClass(),
      descriptionHandle: handle.handleFor(descriptionView)
    };
  }

  tests.forEach((test) => {
    it('particle dynamic description ' + test.name, async () => {
      let {recipe, description, fooView, Description, descriptionHandle} = await prepareRecipeAndArc();

      assert.isUndefined(await description.getArcDescription());

      // Particle (static) spec pattern.
      recipe.particles[0].spec.pattern = 'hello world';
      await test.verifySuggestion('Hello world.', description);

      // Particle (dynamic) description handle (override static description).
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my foo'}));
      await test.verifySuggestion('Return my foo.', description);

      // Particle description handle with view connections.
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my temporary foo'}));
      descriptionHandle.store(new Description({key: '_pattern_', value: 'Return my ${ofoo}'}));
      let ofooDesc = new Description({key: 'ofoo', value: 'best-foo'});
      descriptionHandle.store(ofooDesc);
      await test.verifySuggestion('Return my best-foo.', description);

      // Add value to connection's view.
      fooView.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      await test.verifySuggestion('Return my best-foo (foo-name).', description);

      // Remove connection's description.
      fooView.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
      descriptionHandle.remove(ofooDesc);
      await test.verifySuggestion('Return my foo-name.', description);
    });
  });

  tests.forEach((test) => {
    it('particle dynamic dom description ' + test.name, async () => {
      let {recipe, description, fooView, Description, descriptionHandle} = await prepareRecipeAndArc();
      descriptionHandle.store(new Description({key: '_pattern_', value: 'return my ${ofoo} (text)'}));
      descriptionHandle.store(new Description({key: '_template_', value: 'Return my <span>{{ofoo}}</span> (dom)'}));
      descriptionHandle.store(new Description({key: '_model_', value: JSON.stringify({'ofoo': '${ofoo}'})}));
      await test.verifySuggestion(`Return my foo (${test.name}).`, description);

      fooView.set({id: 5, rawData: {name: 'foo-name'}});
      await test.verifySuggestion(`Return my foo-name (${test.name}).`, description);
    });
  });
});
