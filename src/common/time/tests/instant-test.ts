/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Instant} from '../instant.js';
import {TimeUnit} from '../timeunit.js';

describe('Instant', () => {

  it('instant parses start of epoch', () => {
    // 1970
    let instant = Instant.fromEpochSeconds(0);
    assert.strictEqual(instant.epochSeconds, 0);
    assert.strictEqual(instant.epochMilliseconds, 0);
    assert.strictEqual(instant.resolution, TimeUnit.SECONDS);

    instant = Instant.fromEpochMilliseconds(0);
    assert.strictEqual(instant.epochSeconds, 0);
    assert.strictEqual(instant.epochMilliseconds, 0);
    assert.strictEqual(instant.resolution, TimeUnit.MILLIS);

    instant = Instant.fromString('1970-01-01T00:00:00');
    assert.strictEqual(instant.epochSeconds, 0);
    assert.strictEqual(instant.epochMilliseconds, 0);
    assert.strictEqual(instant.resolution, TimeUnit.SECONDS);

    instant = Instant.fromString('1970-01-01T00:00:00.000');
    assert.strictEqual(instant.epochSeconds, 0);
    assert.strictEqual(instant.epochMilliseconds, 0);
    assert.strictEqual(instant.resolution, TimeUnit.MILLIS);

    assert.strictEqual(instant.toString(), '1970-01-01T00:00:00.000');
  });

  it('instant parses/passes correct timeunit', () => {
    let instant: Instant;
    instant = Instant.fromString('2019-10-31T18:45:01.022');
    assert.strictEqual(instant.epochMilliseconds, 1572547501022);
    assert.strictEqual(instant.resolution, TimeUnit.MILLIS);
    assert.strictEqual(instant.toString(), '2019-10-31T18:45:01.022');

    instant = Instant.fromString('2019-10-31T18:45:01');
    assert.strictEqual(instant.epochMilliseconds, 1572547501000);
    assert.strictEqual(instant.resolution, TimeUnit.SECONDS);
    assert.strictEqual(instant.toString(), '2019-10-31T18:45:01');

    instant = Instant.fromString('2019-10-31T18:45');
    assert.strictEqual(instant.resolution, TimeUnit.MINUTES);
    assert.strictEqual(instant.toString(), '2019-10-31T18:45');

    instant = Instant.fromString('2019-10-31T18');
    assert.strictEqual(instant.resolution, TimeUnit.HOURS);
    assert.strictEqual(instant.toString(), '2019-10-31T18');

    instant = Instant.fromString('2019-10-31');
    assert.strictEqual(instant.resolution, TimeUnit.DAYS);
    assert.strictEqual(instant.toString(), '2019-10-31');

    instant = Instant.fromString('2019-10');
    assert.strictEqual(instant.resolution, TimeUnit.MONTHS);
    assert.strictEqual(instant.toString(), '2019-10');

    instant = Instant.fromString('2019');
    assert.strictEqual(instant.resolution, TimeUnit.YEARS);
    assert.strictEqual(instant.toString(), '2019');
  });

  // TODO tests for nanosecond precision TBD
});
