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

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/** Collection of Arcs coroutine dispatchers. */
object Dispatchers {
    /** For client/feature jobs. */
    var client: CoroutineDispatcher = Dispatchers.Default

    /** For server/service jobs. */
    var server: CoroutineDispatcher = Dispatchers.Default
}
