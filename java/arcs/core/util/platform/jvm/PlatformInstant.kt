/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util

import java.time.Instant
@Suppress("NewApi") // See b/167491554

/** Provides a platform-dependent version of [ArcsInstant]. */
typealias PlatformInstant = Instant
