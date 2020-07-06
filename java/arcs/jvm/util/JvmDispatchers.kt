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

package arcs.jvm.util

import arcs.core.util.CoreDispatchers
import kotlinx.coroutines.Dispatchers

/**
 * A set of dispatchers used by Arcs for launching coroutines. These mostly mimic those
 * in the builtin Kotlin [Dispatchers] for the JVM but can be overridden via source
 * inclusion/exclusion.
 */
object JvmDispatchers {
    val Default = CoreDispatchers.Default
    val IO = Dispatchers.IO
}
