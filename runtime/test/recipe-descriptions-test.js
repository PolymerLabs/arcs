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
import {TestHelper} from './test-helper.js';

describe('recipe descriptions test', function() {
  let manifestString = `
schema Box
  Number height
  Number width
  description \`box\`
    plural \`boxes\`
    value \`\${height}*\${width}\`
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
  ? as handle1
  ProvideBoxes
    boxes -> handle0
  CompareBoxes
    all <- handle0
    biggest -> handle1
  DisplayBox
    biggest <- handle1
  description \`the winner is: '\${CompareBoxes.biggest}' of all '\${CompareBoxes.all}'\`
  `;

  it('generate recipe description', async function() {
    let helper = await TestHelper.parseManifestAndPlan(manifestString);
    assert.equal(helper.plans.length, 1);

    let description = await helper.plans[0].description.getRecipeSuggestion();

    // console.log('Description is: ', description);
    assert.equal('The winner is: \'box\' of all \'boxes\'.', description);
  });
});
