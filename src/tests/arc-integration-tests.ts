/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Arc} from '../runtime/arc.js';
import {StubLoader} from '../runtime/testing/stub-loader.js';
import {PlanningTestHelper} from '../planning/testing/arcs-planning-testing.js';

describe('Arc integration', () => {
  it('copies store tags', async () => {
    const helper = await PlanningTestHelper.createAndPlan({
      manifestString: `
      schema Thing
        Text name
      particle P in 'p.js'
        inout Thing thing
      recipe
        copy 'mything' as thingHandle
        P
          thing = thingHandle
      resource ThingResource
        start
        [
          {"name": "mything"}
        ]
      store ThingStore of Thing 'mything' #best in ThingResource
      `,
      loader: new StubLoader({
        'p.js': `defineParticle(({Particle}) => class P extends Particle {
          async setHandles(handles) {
          }
        });`
      }),
      expectedNumPlans: 1
    });

    assert.isEmpty(helper.arc.storesById);
    assert.isEmpty(helper.arc.storeTags);

    await helper.acceptSuggestion({particles: ['P']});

    assert.equal(1, helper.arc.storesById.size);
    assert.equal(1, helper.arc.storeTags.size);
    assert.deepEqual(['best'], [...helper.arc.storeTags.get([...helper.arc.storesById.values()][0])]);
  });
});
