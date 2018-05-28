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

describe('recipe descriptions test', function() {
  function createManifestString(options) {
    options = options || {};
    return `
schema Box
  Number height
  Number width ${options.includeSchemaDescription ? `
  description \`booooox\`
    plural \`boxes\`
    value \`\${height}*\${width}\`` : ''}
particle CompareBoxes in 'test.js'
  in [Box] all
  out Box biggest
  description \`ignore this description\`
particle ProvideBoxes in 'test.js'
  out [Box] boxes
  description \`ignore this description too\`
particle DisplayBox in 'test.js'
  in Box biggest
  description \`ignore this description too\`
recipe
  ? as handle0
  ${options.includeStore ? `use 'mybox'` : `?`} as handle1
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
    {"height": 3, "width": 5}
  ]

store BoxStore of Box 'mybox' in MyBox` : ''}
`;
  }

  async function testRecipeDescription(options, expectedDescription) {
    let helper = await TestHelper.parseManifestAndPlan(createManifestString(options));
    assert.equal(helper.plans.length, 1);

    let description = await helper.plans[0].description.getRecipeSuggestion();

    // console.log('Description is: ', description);
    assert.equal(expectedDescription, description);
  }

  it('generate recipe description', async function() {
    await testRecipeDescription({includeSchemaDescription: false, includeStore: false}, 'The winner is: \'box\' of all \'box list\'.');
  });
  it('generate recipe description (with handle value)', async function() {
    await testRecipeDescription({includeSchemaDescription: false, includeStore: true}, 'The winner is: \'box\' of all \'box list\'.');
  });
  it('generate recipe description (with schema description)', async function() {
    await testRecipeDescription({includeSchemaDescription: true, includeStore: false}, 'The winner is: \'booooox\' of all \'boxes\'.');
  });
  it('generate recipe description (with schema description and handle value)', async function() {
    await testRecipeDescription({includeSchemaDescription: true, includeStore: true}, 'The winner is: \'3*5\' of all \'boxes\'.');
  });
});
