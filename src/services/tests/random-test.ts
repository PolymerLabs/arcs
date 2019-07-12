/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Services} from '../../runtime/services.js';
import '../random-service.js';


describe('services: random', () => {
  it('gets a random number from the random service', async () => {
    const randomValue = await Services.request({call: 'random.next'});
    assert.isNotNull(randomValue);
    assert.isAtLeast(randomValue, 0);
    assert.isAtMost(randomValue, 1);
  });
});
