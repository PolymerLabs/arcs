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
 * Random Service
 *
 * Implements the Arcs Random number service.
 *
 * Supported methods
 * - random.next : returns a Random number between 0 and 1.
 */

import {Services} from '../runtime/services.js';
import {Random} from '../runtime/random.js';

Services.register('random', {
  next: () => Random.next()
});
