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

import {assert} from '../chai-web.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('products test', function() {
  let testProductsManifestFile = './runtime/test/particles/artifacts/products-test.recipes';

  let verifyFilteredBook = async (handle) => {
    let list = await handle.toList();
    assert.equal(1, list.length);
    assert.equal('Harry Potter', list[0].rawData.name);
  };

  it('filters', async function() {
    let helper = await TestHelper.loadManifestAndPlan(testProductsManifestFile);

    await helper.acceptSuggestion({particles: ['ProductFilter']});

    await helper.verifyData('ProductFilter', 'results', verifyFilteredBook);
  });

  it('filters and displays', async function() {
    let helper = await TestHelper.loadManifestAndPlan(testProductsManifestFile);

    helper.slotComposer
        .newExpectations()
          .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['template']})
          .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model'], verify: (content) => {
            let verified = content.model && content.model.hasItems
                && content.model.items['$template'].length > 0
                && 1 == content.model.items.models.length;
            if (verified) {
              assert.equal('Harry Potter', helper.arc._stores[0]._items.get(content.model.items.models[0].id).rawData.name);
            }
            return verified;
          }})
          .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['template', 'model']})
          .expectRenderSlot('Multiplexer', 'annotation', {hostedParticle: 'ShowProduct', verify: (content) => {
            return content.model
                && 1 == content.model.items.length
                && 'Harry Potter' === content.model.items[0].name;
          }});

    await helper.acceptSuggestion({particles: ['ShowCollection', 'Multiplexer', 'ProductFilter']});

    await helper.verifyData('ProductFilter', 'results', verifyFilteredBook);
  });
});
