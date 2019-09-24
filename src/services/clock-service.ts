/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * @fileoverview
 * Clock Service
 *
 * Implements the Arcs Clock/Time Service
 *
 * Supported methods
 * - clock.now : returns an Instant value as a truncated string to
 *   a given TimeUnit based resolution.
 *
 * Example:
 *    this.service({call: 'clock.now', timeUnit: 'DAYS'});
 *
 * @note The returned data may be at a coarser resolution than requested.
 *
 * If any of the data is invalid you will have an undefined value returned.
 */

import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';
import {Instant} from '../common/time/instant.js';
import {TimeUnit} from '../common/time/timeunit.js';

type ClockServiceNowOptions = {
  timeUnit: string;
};

const log = logFactory('clock-service');

Services.register('clock', {
  now: ({timeUnit}: ClockServiceNowOptions) => {
    try {
      const unit = timeUnit ? TimeUnit.fromString(timeUnit) : TimeUnit.SECONDS;

      // Get current millis
      const millis = Date.now();

      // Truncate to timeunit and return
      return Instant.fromEpochMilliseconds(millis).truncateTo(unit).toString();

    } catch (e) {
      // TODO document what happens during failures.
      log('error ', e);
      return undefined;
    }
  }
});
