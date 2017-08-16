  /**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var Arc = require("../arc.js");
var DescriptionGenerator = require('../description-generator.js');
var Relevance = require('../relevance.js');
var SlotComposer = require('../slot-composer.js');
var assert = require('chai').assert;
var Manifest = require('../manifest.js');
var runtime = require("../runtime.js");
var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

function testRelevance() {
  const slotComposer = new SlotComposer({});
  var arc = new Arc({slotComposer, id:'test'});
  var relevance = new Relevance();
  relevance.newArc = arc;
  relevance.newArc._viewMap = new Map();
  let map = new Map();
  map.set({particle : {name : "TestParticle"}}, [5]);
  relevance.apply(map);
  var fooView = arc.createView(Foo.type);
  var barView = arc.createView(Bar.type);
  var farsView = arc.createView(Far.type.viewOf());
  relevance.newArc._viewsById.forEach((view, id) => relevance.newArc._viewMap.set(view, view));
  return relevance;
}

async function generateDescription(manifest) {
  let recipe = (await Manifest.parse(manifest)).recipes[0];
  assert(recipe);
  return new DescriptionGenerator(recipe, testRelevance());
}

describe('description generator', function() {
  it('generate plain description', async () => {
  assert.equal('test particle', (await generateDescription(`
    particle TestParticle in 'test-particle.js'
      TestParticle()
      consume root
      description \`test particle\`
    recipe SomeRecipe
      TestParticle
    `)).description);
  });

  it('generate description with types and view descriptions', async () => {
    let descriptor = await generateDescription(`
      schema Foo
      schema Bar
      particle TestParticle in 'test-particle.js'
        TestParticle(in Foo foo, out Bar bar)
        consume root
        description \`Increment \${foo} and return \${bar}\`
          bar \`my-bar\`
      recipe SomeRecipe
        map 'test:1' as view0
        map 'test:2' as view1
        TestParticle
          foo <- view0
          bar -> view1
    `);
    assert.equal('Increment Foo and return my-bar', descriptor.description);
    assert.equal('Foo', descriptor.getViewDescription("TestParticle", "foo"));
    assert.equal('my-bar', descriptor.getViewDescription("TestParticle", "bar"));
  });

  it ('combine multiple particle descriptions', async() => {
    let descriptor = await generateDescription(`
      schema Foo
      schema Bar
      schema Far
      particle TestParticle in 'test-particle.js'
        TestParticle(in Foo foo, out Bar bar)
        consume root
        description \`Increment \${foo} and return \${bar}\`
          foo \`my-foo\`
          bar \`my-bar\`
      particle OtherParticle in 'other-particle.js'
        OtherParticle(in Bar bar, out [Far] fars)
        consume root
        description \`Get \${fars} from \${bar}\`
          fars \`my-fars-list\`
      recipe MyRecipe
        map 'test:1' as view0
        map 'test:2' as view1
        map 'test:3' as view2
        TestParticle
          foo <- view0
          bar -> view1
        OtherParticle
          bar <- view1
          fars -> view2
       `);
    assert.equal('Get my-fars-list from my-bar and Increment my-foo and return my-bar',
                 descriptor.description);
  });
});
