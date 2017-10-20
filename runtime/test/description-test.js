/**
* @license
* Copyright (c) 2017 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

let assert = require('chai').assert;
let Arc = require('../arc.js');
let Description = require('../description.js');
let Loader = require('../loader.js');
let Manifest = require('../manifest.js');
let Relevance = require('../relevance.js');
let SlotComposer = require('../slot-composer.js');
let Type = require('../type.js');

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
      recipe.views[1].mapToView({id: 'test:2', type: Foo.type.viewOf()});
    }
    if (recipe.views.length > 2) {
      recipe.views[2].mapToView({id: 'test:3', type: Foo.type});
    }
    let arc = createTestArc();
    let fooView = arc.createView(Foo.type);
    let foosView = arc.createView(Foo.type.viewOf());
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    let ifooViewConn = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ifoo');
    let ifooView = ifooViewConn ? ifooViewConn.view : null;
    let ofoosViewConn = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ofoos');
    let ofoosView = ofoosViewConn ? ofoosViewConn.view : null;
    return {arc, recipe, ifooView, ofoosView, fooView, foosView};
  }

  it('one particle description', async () => {
    let {arc, recipe, ifooView, ofoosView,fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
${recipeManifest}
    `));
    assert.equal('Read from foo and populate foo list.', Description.getSuggestion(recipe, arc));
    assert.equal('foo', Description.getViewDescription(ifooView, arc));
    assert.equal('foo list', Description.getViewDescription(ofoosView, arc));

    // Add value to singleton view.
    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list.', Description.getSuggestion(recipe, arc));
    assert.equal('foo', Description.getViewDescription(ifooView, arc));
    assert.equal('foo list', Description.getViewDescription(ofoosView, arc));

    // Add values to set-view
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list (<b>foo-1</b>, <b>foo-2</b>).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('foo', Description.getViewDescription(ifooView, arc));
    assert.equal('foo list', Description.getViewDescription(ofoosView, arc));

    // Add more values to set-view
    foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
    assert.equal('Read from <b>foo-name</b> and populate foo list (<b>foo-1</b> plus <b>2</b> other items).',
                 Description.getSuggestion(recipe, arc));
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
    assert.equal('Read from my-in-foo and populate my-out-foos.', Description.getSuggestion(recipe, arc));
    assert.equal('my-in-foo', Description.getViewDescription(ifooView, arc));
    assert.equal('my-out-foos', Description.getViewDescription(ofoosView, arc));

    // Add value to singleton view.
    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos.', Description.getSuggestion(recipe, arc));

    // Add values to set-view
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos (<b>foo-1</b>, <b>foo-2</b>).',
                 Description.getSuggestion(recipe, arc));

    // Add more values to set-view
    foosView.store({id: 4, rawData: {name: 'foo-name', fooValue: 'foo-3'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate my-out-foos (<b>foo-1</b> plus <b>2</b> other items).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('my-in-foo', Description.getViewDescription(ifooView, arc));
    assert.equal('my-out-foos', Description.getViewDescription(ofoosView, arc));
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
    assert.equal('Read from my-in-foo and populate The Foos from my-in-foo.', Description.getSuggestion(recipe, arc));
    assert.equal('my-in-foo', Description.getViewDescription(ifooView, arc));
    assert.equal('The Foos from my-in-foo', Description.getViewDescription(ofoosView, arc));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from my-in-foo (<b>foo-name</b>) and populate The Foos from my-in-foo (<b>foo-1</b>, <b>foo-2</b>).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('my-in-foo', Description.getViewDescription(ifooView, arc));
    assert.equal('The Foos from my-in-foo', Description.getViewDescription(ofoosView, arc));
  });

  it('one particle and connections descriptions references no pattern', async () => {
    let {arc, recipe, ifooView, ofoosView, fooView, foosView} = (await prepareRecipeAndArc(`
${schemaManifest}
${aParticleManifest}
  description \`Read from \${ifoo}\ and populate \${ofoos}\`
    ofoos \`The Foos from \${ifoo}\`
${recipeManifest}
    `));
    assert.equal('Read from foo and populate The Foos from foo.', Description.getSuggestion(recipe, arc));
    assert.equal('foo', Description.getViewDescription(ifooView, arc));
    assert.equal('The Foos from foo', Description.getViewDescription(ofoosView, arc));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from <b>foo-name</b> and populate The Foos from <b>foo-name</b> (<b>foo-1</b>, <b>foo-2</b>).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('foo', Description.getViewDescription(ifooView, arc));
    assert.equal('The Foos from foo', Description.getViewDescription(ofoosView, arc));
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
    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});

    assert.equal('Read from [fooValue: <b>the-FOO</b>] (<b>foo-name</b>) and populate [A list of foo with values: <b>foo-1</b>, <b>foo-2</b>].',
                 Description.getSuggestion(recipe, arc));
    assert.equal('[fooValue: <b>the-FOO</b>]', Description.getViewDescription(ifooView, arc));
    assert.equal('[A list of foo with values: <b>foo-1</b>, <b>foo-2</b>]', Description.getViewDescription(ofoosView, arc));
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

    assert.equal('Read from best-new-foo and populate my-foos.',
                 Description.getSuggestion(recipe, arc));
    assert.equal('best-new-foo', Description.getViewDescription(ifooView, arc));
    let oBFooView = recipe.viewConnections.find(vc => vc.particle.name == 'B' && vc.name == 'ofoo').view;
    assert.equal('best-new-foo', Description.getViewDescription(oBFooView, arc));
    assert.equal('my-foos', Description.getViewDescription(ofoosView, arc));

    fooView.set({id: 1, rawData: {name: 'foo-name', fooValue: 'the-FOO'}});
    foosView.store({id: 2, rawData: {name: 'foo-1', fooValue: 'foo-value-1'}});
    foosView.store({id: 3, rawData: {name: 'foo-2', fooValue: 'foo-value-2'}});
    assert.equal('Read from best-new-foo (<b>foo-name</b>) and populate my-foos (<b>foo-1</b>, <b>foo-2</b>).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('best-new-foo', Description.getViewDescription(ifooView, arc));
    assert.equal('best-new-foo', Description.getViewDescription(oBFooView, arc));
    assert.equal('my-foos', Description.getViewDescription(ofoosView, arc));
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

    assert.equal('Display X1-foo, Create X1::X1-foo, and Create X2::X2-foo.', Description.getSuggestion(recipe, arc));
    assert.equal('X1-foo', Description.getViewDescription(aFooView, arc));

    // Rank X2 higher than X2
    let relevance = new Relevance();
    relevance.newArc = arc;
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "A"), [7]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "X1"), [5]);
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "X2"), [10]);
    assert.equal('Display X2-foo, Create X2::X2-foo, and Create X1::X1-foo.', Description.getSuggestion(recipe, arc, relevance));
    assert.equal('X2-foo', Description.getViewDescription(aFooView, arc, relevance));
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

    // Add values to both Foo views
    fooView.set({id: 1, rawData: {name: 'the-FOO'}});
    let fooView2 = arc.createView(fooView.type);
    fooView2.set({id: 2, rawData: {name: 'another-FOO'}});
    assert.equal('Do A with b-foo (<b>the-FOO</b>), Output B to b-foo, and Output B to b-foo (<b>another-FOO</b>).',
                 Description.getSuggestion(recipe, arc));
    assert.equal('b-foo', Description.getViewDescription(ifooView, arc));

    // Rank B bound to fooView2 higher than B that is bound to fooView1.
    let relevance = new Relevance();
    relevance.newArc = arc;
    relevance.relevanceMap.set(recipe.particles.find(p => p.name == "A"), [7]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name == "B")[0], [1]);
    relevance.relevanceMap.set(recipe.particles.filter(p => p.name == "B")[1], [10]);

    assert.equal('Do A with b-foo (<b>the-FOO</b>), Output B to b-foo (<b>another-FOO</b>), and Output B to b-foo.',
                 Description.getSuggestion(recipe, arc, relevance));
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
    assert.equal('Create &lt;new> &lt;&lt;my-foo>>.',
                 Description.getSuggestion(recipe, arc));
    let view = recipe.viewConnections.find(vc => vc.particle.name == 'A' && vc.name == 'ofoo').view;
    assert.equal('&lt;my-foo>', Description.getViewDescription(view, arc));
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
      if (recipe.views.length > 1) {
        recipe.views[1].mapToView({id: 'test:2', type: MyBESTType.type.viewOf()});
      }
      let arc = createTestArc();
      let tView = arc.createView(MyBESTType.type);
      let tsView = arc.createView(MyBESTType.type.viewOf());
      recipe.normalize();
      assert.isTrue(recipe.isResolved());

      assert.equal('Make my best type list from my best type.', Description.getSuggestion(recipe, arc));
      let tRecipeView = recipe.viewConnections.find(vc => vc.particle.name == 'P' && vc.name == 't').view;
      let tsRecipeView = recipe.viewConnections.find(vc => vc.particle.name == 'P' && vc.name == 'ts').view;
      assert.equal('my best type', Description.getViewDescription(tRecipeView, arc));
      assert.equal('my best type list', Description.getViewDescription(tsRecipeView, arc));

      // Add values to views.
      tView.set({id: 1, rawData: {property: 'value1'}});
      tsView.store({id: 2, rawData: {property: 'value2'}});
      assert.equal('Make my best type list (<b>1</b> items) from my best type.', Description.getSuggestion(recipe, arc));

      tsView.store({id: 3, rawData: {property: 'value3'}});
      tsView.store({id: 4, rawData: {property: 'value4'}});
      assert.equal('Make my best type list (<b>3</b> items) from my best type.', Description.getSuggestion(recipe, arc));
  });
});
