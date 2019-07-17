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
import {Instant} from '../../common/time/instant.js';
import {TimeUnit} from '../../common/time/timeunit.js';
import '../clock-service.js';

describe('services: clock', () => {
  it('gets a clock value', async () => {
    // SECONDS
    let clockValue = await Services.request({call: 'clock.now', timeUnit: 'SECONDS'});
    assert.isDefined(clockValue);

    let instant = Instant.fromString(clockValue);
    assert.isDefined(instant);
    assert.strictEqual(instant.resolution, TimeUnit.SECONDS);

    // MILLIS
    clockValue = await Services.request({call: 'clock.now', timeUnit: 'MILLIS'});
    assert.isDefined(clockValue);

    instant = Instant.fromString(clockValue);
    assert.isDefined(instant);
    assert.strictEqual(instant.resolution, TimeUnit.MILLIS);

    // DAYS
    clockValue = await Services.request({call: 'clock.now', timeUnit: 'DAYS'});
    assert.isDefined(clockValue);

    instant = Instant.fromString(clockValue);
    assert.isDefined(instant);
    assert.strictEqual(instant.resolution, TimeUnit.DAYS);
  });
});
