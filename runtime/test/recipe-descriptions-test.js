/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from './chai-web.js';
import {TestHelper} from '../testing/test-helper.js';
import {DescriptionDomFormatter} from '../description-dom-formatter.js';
import {StubLoader} from '../testing/stub-loader.js';

describe('recipe descriptions test', function() {
  let loader = new StubLoader({
    '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
  });
  function createManifestString(options) {
    options = options || {};
    return `
schema Box
  Text name
  Number height
  Number width ${options.includeSchemaDescription ? `
  description \`booooox\`
    plural \`boxes\`
    value \`\${height}*\${width}\`` : ''}
particle CompareBoxes in 'test.js'
  in [Box] all
  out Box biggest
  description \`ignore this description\` ${options.includeAllDescription ? `
    all \`ALL\``: ''}
particle ProvideBoxes in 'test.js'
  out [Box] boxes
  description \`ignore this description too\`
particle DisplayBox in 'test.js'
  in Box biggest
  description \`ignore this description too\`
recipe
  ${options.includeAllStore ? `use 'allboxes'` : `create`} as handle0
  ${options.includeStore ? `use 'mybox'` : `create`} as handle1
  ProvideBoxes
    boxes -> handle0
  CompareBoxes
    all <- handle0
    biggest -> handle1
  DisplayBox
    biggest <- handle1
  description \`the winner is: '\${CompareBoxes.biggest}' of all '\${CompareBoxes.all}'\`

${options.includeStore ? `
resource MyBox
  start
  [
    {"height": 3, "width": 5${options.includeEntityName ? ', "name": "favorite-box"' : ''}}
  ]

store BoxStore of Box 'mybox' in MyBox` : ''}
${options.includeAllStore ? `
resource AllBoxes
  start
  [
    {"height": 1, "width": 2},
    {"height": 2, "width": 3}
  ]
store BoxesStore of [Box] 'allboxes' in AllBoxes` : ''}
`;
  }

  async function generateRecipeDescription(options) {
    let helper = await TestHelper.createAndPlan({
      manifestString: createManifestString(options), loader
    });
    assert.lengthOf(helper.plans, 1);

    return helper.plans[0].description.getRecipeSuggestion(options.formatter);
  }
  async function testRecipeDescription(options, expectedDescription) {
    let description = await generateRecipeDescription(options);
    // console.log('Description is: ', description);
    assert.equal(expectedDescription, description);
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

  it('generates DOM recipe description', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: false, includeStore: false, includeEntityName: false, formatter: DescriptionDomFormatter});

    assert.equal('The winner is: \'box\' of all \'box list\'.', description.template);
    assert.isEmpty(description.model);
  });

  it('generates DOM recipe description (with handle value)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: false, includeStore: true, includeEntityName: false, formatter: DescriptionDomFormatter});
    assert.equal('The winner is: \'box\' of all \'box list\'.', description.template);
    assert.isEmpty(description.model);
  });

  it('generates DOM recipe description (with handle value and name)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: false, includeStore: true, includeEntityName: true, formatter: DescriptionDomFormatter});
    assert.equal('<span>{{text1}}</span><b>{{biggestVar}}</b><span>{{text2}}</span><span>{{text3}}</span><span>{{text4}}</span>.',
        description.template);
    assert.deepEqual({
      'text1': 'The winner is: \'',
      'biggestVar': 'favorite-box',
      'text2': '\' of all \'',
      'text3': 'box list',
      'text4': '\''}, description.model);
  });

  it('generates DOM recipe description (with schema description)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: true, includeStore: false, includeEntityName: false, formatter: DescriptionDomFormatter});

    assert.equal('The winner is: \'booooox\' of all \'boxes\'.', description.template);
    assert.isEmpty(description.model);
  });

  it('generates DOM recipe description (with schema description and handle value)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: false, formatter: DescriptionDomFormatter});
    assert.equal('<span>{{text1}}</span><b>{{biggestVar}}</b><span>{{text2}}</span><span>{{text3}}</span><span>{{text4}}</span>.',
                 description.template);
    assert.deepEqual({
      'text1': 'The winner is: \'',
      'biggestVar': '3*5',
      'text2': '\' of all \'',
      'text3': 'boxes',
      'text4': '\''}, description.model);
  });

  it('generates DOM recipe description with schema description and entity name', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: true, formatter: DescriptionDomFormatter});

    assert.equal('<span>{{text1}}</span><b>{{biggestVar}}</b><span>{{text2}}</span><span>{{text3}}</span><span>{{text4}}</span>.',
                 description.template);
    assert.deepEqual({
      'text1': 'The winner is: \'',
      'biggestVar': '3*5',
      'text2': '\' of all \'',
      'text3': 'boxes',
      'text4': '\''}, description.model);
  });

  it('generates DOM recipe description (with schema description and stores descriptions)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: true,
         includeAllDescription: true, formatter: DescriptionDomFormatter});
    assert.equal('<span>{{text1}}</span><b>{{biggestVar}}</b><span>{{text2}}</span><span>{{text3}}</span><span>{{text4}}</span>.',
        description.template);
    assert.deepEqual({
      'text1': 'The winner is: \'',
      'biggestVar': '3*5',
      'text2': '\' of all \'',
      'text3': 'ALL',
      'text4': '\''}, description.model);
  });

  it('generates DOM recipe description (everything)', async () => {
    let description = await generateRecipeDescription(
        {includeSchemaDescription: true, includeStore: true, includeEntityName: true,
         includeAllDescription: true, includeAllStore: true, formatter: DescriptionDomFormatter});
    assert.equal('<span>{{text3}}</span><b>{{biggestVar}}</b><span>{{text4}}</span><span>{{allDescription2}}</span> (<b>{{all1Length}}</b> items)<span>{{text5}}</span>.',
                description.template);
    assert.deepEqual({
      'text3': 'The winner is: \'',
      'biggestVar': '3*5',
      'text4': '\' of all \'',
      'allDescription2': 'ALL',
      'all1Length': 2,
      'text5': '\''
    }, description.model);
  });

  it('fails generating recipe description with duplicate particles', async () => {
    await TestHelper.createAndPlan({manifestString: `
      schema Foo
      particle ShowFoo
        out Foo foo
      recipe
        create as fooHandle
        ShowFoo
          foo -> fooHandle
        ShowFoo
          foo -> fooHandle
        description \`cannot show duplicate \${ShowFoo.foo}\`
    `, loader}).then(() => assert('expected exception for duplicate particles'))
      .catch((err) => assert.equal(
          err.message, 'Cannot reference duplicate particle \'ShowFoo\' in recipe description.'));
  });

  it('refers to particle description', async () => {
    let helper = await TestHelper.createAndPlan({manifestString: `
      schema Foo
      particle HelloFoo
        in Foo foo
        description \`hello \${foo}\`

      recipe
        create as h0
        HelloFoo
          foo <- h0
        description \`do "\${HelloFoo}"\`
    `, loader});
    assert.lengthOf(helper.plans, 1);

    assert.equal('Do "hello foo"', await helper.plans[0].description.getRecipeSuggestion());
    let domDescription = await helper.plans[0].description.getRecipeSuggestion(DescriptionDomFormatter);
    assert.equal('Do "hello foo"', domDescription.template);
    assert.isEmpty(domDescription.model);
  });

  it('generates recipe description with duplicate particles', async () => {
    let helper = await TestHelper.createAndPlan({manifestString: `
      schema Foo
      particle ShowFoo
        out Foo foo
      particle Dummy

      recipe
        create as fooHandle
        ShowFoo
          foo -> fooHandle
        description \`show \${ShowFoo.foo}\`

      recipe
        create as fooHandle
        ShowFoo
          foo -> fooHandle
        Dummy
        description \`show \${ShowFoo.foo} with dummy\`
    `, loader});
    assert.lengthOf(helper.plans, 2);
    assert.equal('Show foo.', await helper.plans[0].description.getRecipeSuggestion());

    await helper.acceptSuggestion({particles: ['ShowFoo']});
    await helper.makePlans();
    assert.lengthOf(helper.plans, 1);

    assert.equal('Show foo with dummy.', await helper.plans[0].description.getRecipeSuggestion());
  });
});
