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
import Loader from '../loader.js';
import Manifest from '../manifest.js';
import Relevance from '../relevance.js';
import SlotComposer from '../slot-composer.js';
import Type from '../type.js';

function createTestArc() {
  const slotComposer = new SlotComposer({rootContext: 'test', affordance: 'mock'});
  var arc = new Arc({slotComposer, id:'test'});
  return arc;
}

describe('Description', function() {
  var schemaManifest = `
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
  var aParticleManifest = `
particle A
  A(in Foo ifoo, out [Foo] ofoos)
  consume root`;
  var bParticleManifest = `
particle B
  B(out Foo ofoo)`;
  var recipeManifest = `
recipe
  create as fooView   # Foo
  create as foosView  # [Foo]
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
    let fooView = arc.createView(Foo.type);
    let foosView = arc.createView(Foo.type.setViewOf());
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    let ifooViewConn = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ifoo');
    let ifooView = ifooViewConn ? ifooViewConn.view : null;
    let ofoosViewConn = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ofoos');
    let ofoosView = ofoosViewConn ? ofoosViewConn.view : null;
    arc._activeRecipe = recipe;
    return {arc, recipe, ifooView, ofoosView, fooView, foosView};
  }

  it('one particle description', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
${recipeManifest}
    `));

    let description = new Description(arc);

    assert.equal('Read from foo and populate foo list.', description.getRecipeSuggestion());
    assert.equal('foo', description.getViewDescription(ifooView));
    assert.equal('foo list', description.getViewDescription(ofoosView));

    // Add value to singleton view.
    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list.', description.getRecipeSuggestion());
    assert.equal('foo', description.getViewDescription(ifooView));
    assert.equal('foo list', description.getViewDescription(ofoosView));

    // Add values to set-view
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list (<b>foo-1</b>, <b>foo-2</b>).', description.getRecipeSuggestion());
    assert.equal('foo', description.getViewDescription(ifooView));
    assert.equal('foo list', description.getViewDescription(ofoosView));

    // Add more values to set-view
    foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list (<b>foo-1</b> plus <b>2</b> other items).',
                 description.getRecipeSuggestion());
  });

  it('one particle and connections descriptions', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`my-out-foos\`
${recipeManifest}
    `));

    let description = new Description(arc);

    assert.equal('Read from my-in-foo and populate my-out-foos.', description.getRecipeSuggestion());
    assert.equal('my-in-foo', description.getViewDescription(ifooView));
    assert.equal('my-out-foos', description.getViewDescription(ofoosView));

    // Add value to singleton view.
    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos.', description.getRecipeSuggestion());

    // Add values to set-view
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos (<b>foo-1</b>, <b>foo-2</b>).',
                 description.getRecipeSuggestion());

    // Add more values to set-view
    foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos (<b>foo-1</b> plus <b>2</b> other items).',
                 description.getRecipeSuggestion());
    assert.equal('my-in-foo', description.getViewDescription(ifooView));
    assert.equal('my-out-foos', description.getViewDescription(ofoosView));
  });

it('one particle and connections descriptions references', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
    ifoo \`my-in-foo\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

    let description = new Description(arc);

    assert.equal('Read from my-in-foo and populate The Foos from my-in-foo.', description.getRecipeSuggestion());
    assert.equal('my-in-foo', description.getViewDescription(ifooView));
    assert.equal('The Foos from my-in-foo', description.getViewDescription(ofoosView));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate The Foos from my-in-foo (<b>foo-1</b>, <b>foo-2</b>).',
                 description.getRecipeSuggestion());
    assert.equal('my-in-foo', description.getViewDescription(ifooView));
    assert.equal('The Foos from my-in-foo', description.getViewDescription(ofoosView));
  });

  it('one particle and connections descriptions references no pattern', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));

    let description = new Description(arc);

    assert.equal('Read from foo and populate The Foos from foo.', description.getRecipeSuggestion());
    assert.equal('foo', description.getViewDescription(ifooView));
    assert.equal('The Foos from foo', description.getViewDescription(ofoosView));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from <b>foo-name</b> and populate The Foos from <b>foo-name</b> (<b>foo-1</b>, <b>foo-2</b>).',
                 description.getRecipeSuggestion());
    assert.equal('foo', description.getViewDescription(ifooView));
    assert.equal('The Foos from foo', description.getViewDescription(ofoosView));
  });

  it('one particle and connections descriptions with extras', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos._name_}\`
    ifoo \`[fooValue: \${ifoo.fooValue}]\`
    ofoos \`[A list of \${ifoo._type_} with values: \${ofoos._values_}]\`
${recipeManifest}
    `));

    let description = new Description(arc);

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});

    assert.equal('Read from [fooValue: <b>the-FOO</b>] (<b>foo-name</b>) and populate [A list of foo with values: <b>foo-1</b>, <b>foo-2</b>].',
                 description.getRecipeSuggestion());
    assert.equal('[fooValue: <b>the-FOO</b>]', description.getViewDescription(ifooView));
    assert.equal('[A list of foo with values: <b>foo-1</b>, <b>foo-2</b>]', description.getViewDescription(ofoosView));
  });

  it('connection description from another particle', async() => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`my-foos\`
${bParticleManifest}
  description \`Create the \${ofoo}\`
    ofoo \`best-new-foo\`
${recipeManifest}
  B
    ofoo -> fooView
    `));

    let description = new Description(arc);

    assert.equal('Read from best-new-foo and populate my-foos.',
                 description.getRecipeSuggestion());
    assert.equal('best-new-foo', description.getViewDescription(ifooView));
    let oBFooView = recipe.viewConnections.find(vc => vc.particle.name == 'B' && vc.name == 'ofoo').view;
    assert.equal('best-new-foo', description.getViewDescription(oBFooView));
    assert.equal('my-foos', description.getViewDescription(ofoosView));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from best-new-foo (<b>foo-name</b>) and populate my-foos (<b>foo-1</b>, <b>foo-2</b>).',
                 description.getRecipeSuggestion());
    assert.equal('best-new-foo', description.getViewDescription(ifooView));
    assert.equal('best-new-foo', description.getViewDescription(oBFooView));
    assert.equal('my-foos', description.getViewDescription(ofoosView));
  });

  it('multiple particles', async() => {
    let {arc, recipe, ifooViewConn, fooView} = (await prepareRecipeAndArc(`
${schemaManifest}
particle X1
  X1(out Foo ofoo)
  consume action
  description \`Create X1::\${ofoo}\`
    ofoo \`X1-foo\`
particle X2
  X2(out Foo ofoo)
  consume action
  description \`Create X2::\${ofoo}\`
    ofoo \`X2-foo\`
particle A
  A(in Foo ifoo)
  consume root
    provide action
  description \`Display \${ifoo}\`
    ifoo \`A-foo\`

recipe
  create as fooView   # Foo
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
    let aFooView = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ifoo').view;

    let description = new Description(arc);

    assert.equal('Display X1-foo, Create X1::X1-foo, and Create X2::X2-foo.', description.getRecipeSuggestion());
    assert.equal('X1-foo', description.getViewDescription(aFooView));

    // Rank X2 higher than X2
    let relevance = new Relevance();
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "A"), [7]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "X1"), [5]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "X2"), [10]);

    description.setRelevance(relevance);
    assert.equal('Display X2-foo, Create X2::X2-foo, and Create X1::X1-foo.', description.getRecipeSuggestion());
    assert.equal('X2-foo', description.getViewDescription(aFooView));
  });

  it('duplicate particles', async() => {
    let {arc, recipe, ifooView, fooView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
    provide action
  description \`Do A with \${ifoo}\`
    ifoo \`a-foo\`
${bParticleManifest}
  consume action
  description \`Output B to \${ofoo}\`
    ofoo \`b-foo\`

recipe
  create as fooView1    # Foo
  create as foosView    # [Foo]
  create as fooView2    # Foo
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
    let fooView2 = arc.createView(fooView.type);
    fooView2.set({id: 2, rawData: {name: 'another-FOO'}});
    assert.equal('Do A with b-foo (<b>the-FOO</b>), Output B to b-foo, and Output B to b-foo (<b>another-FOO</b>).',
                 description.getRecipeSuggestion());
    assert.equal('b-foo', description.getViewDescription(ifooView));

    // Rank B bound to fooView2 higher than B that is bound to fooView1.
    let relevance = new Relevance();
    relevance.newArc = arc;
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "A"), [7]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name == "B")[0], [1]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name == "B")[1], [10]);

    description.setRelevance(relevance);
    assert.equal('Do A with b-foo (<b>the-FOO</b>), Output B to b-foo (<b>another-FOO</b>), and Output B to b-foo.',
                 description.getRecipeSuggestion());
  });
  it('sanisize description', async() => {
    let {arc, recipe} = (await prepareRecipeAndArc(`
${schemaManifest}
particle A
  A(out Foo ofoo)
  consume root
  description \`Create <new> <\${ofoo}>\`
    ofoo \`<my-foo>\`

recipe
  create as fooView   # Foo
  slot 'r0' as slot0
  A
    ofoo -> fooView
    consume root as slot0
    `));

    let description = new Description(arc);

    assert.equal('Create &lt;new> &lt;&lt;my-foo>>.',
                 description.getRecipeSuggestion());
    let view = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ofoo').view;
    assert.equal('&lt;my-foo>', description.getViewDescription(view, arc));
  });
  it('multiword type and no name property in description', async() => {
    let manifestStr = `
      schema MyBESTType
        optional
          Text property
      particle P
        P(in MyBESTType t, out [MyBESTType] ts)
        description \`Make \${ts} from \${t}\`
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
      let tView = arc.createView(MyBESTType.type);
      let tsView = arc.createView(MyBESTType.type.setViewOf());
      recipe.normalize();
      assert.isTrue(recipe.isResolved());

      arc._activeRecipe = recipe;
      let description = new Description(arc);

      assert.equal('Make my best type list from my best type.', description.getRecipeSuggestion());
      let tRecipeView = recipe.viewConnections.find(vc => vc.particle.name == 'P' && vc.name == 't').view;
      let tsRecipeView = recipe.viewConnections.find(vc => vc.particle.name == 'P' && vc.name == 'ts').view;
      assert.equal('my best type', description.getViewDescription(tRecipeView));
      assert.equal('my best type list', description.getViewDescription(tsRecipeView));

      // Add values to views.
      tView.set({id: 1, rawData: {property: 'value1'}});
      tsView.store({id: 2, rawData: {property: 'value2'}});
      assert.equal('Make my best type list (<b>1</b> items) from my best type.', description.getRecipeSuggestion());

      tsView.store({id: 3, rawData: {property: 'value3'}});
      tsView.store({id: 4, rawData: {property: 'value4'}});
      assert.equal('Make my best type list (<b>3</b> items) from my best type.', description.getRecipeSuggestion());
  });
  it('particle dynamic description', async() => {
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
  create 'test:1' as view0  # Foo
  create 'test:2' as view1  # [Description]
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
    let fooView = arc.createView(Foo.type);
    let descriptionView = arc.createView(DescriptionType.type.setViewOf());
    recipe.normalize();
    assert.isTrue(recipe.isResolved());

    arc._activeRecipe = recipe;
    let description = new Description(arc);

    assert.isUndefined(description.getRecipeSuggestion());

    // Particle (static) spec pattern.
    recipe.particles[0].spec.pattern = "hello world";
    assert.equal('Hello world.', description.getRecipeSuggestion());

    // Particle (dynamic) description handle (override static description).
    descriptionView.store({id: 1, rawData: {key: '_pattern_', value: 'Return my foo'}});
    assert.equal('Return my foo.', description.getRecipeSuggestion());

    // Particle description handle with view connections.
    descriptionView.store({id: 1, rawData: {key: '_pattern_', value: 'Return my temporary foo'}});
    descriptionView.store({id: 1, rawData: {key: '_pattern_', value: 'Return my ${ofoo}'}});
    descriptionView.store({id: 2, rawData: {key: 'ofoo', value: 'best-foo'}});
    assert.equal('Return my best-foo.', description.getRecipeSuggestion());

    // Add value to connection's view.
    fooView.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    assert.equal('Return my best-foo (<b>foo-name</b>).', description.getRecipeSuggestion());

    // Remove connection's description.
    fooView.set({id: 3, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    descriptionView.remove(2);
    assert.equal('Return my <b>foo-name</b>.', description.getRecipeSuggestion());
  });
  it('particle slots description', async() => {
    let manifestStr = `
schema Foo
  optional
    Text name
particle A
  A(inout Foo foo)
  consume root
    provide aslot
    provide otherslot
  description \`Hello \${root.aslot}, see you at \${root.otherslot}\`
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
  create 'test:1' as view0  # Foo
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
    assert.equal('Hello first b and second b, see you at only c.', description.getRecipeSuggestion());
  });
});
