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

package arcs.android.systemhealth.testapp

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/** Collection of Arcs coroutine dispatchers. */
object Dispatchers {
    /**
     * For jobs and operations happening at clients, typically
     * arc-host, service store, handle dereferencer, etc.
     *
     * If it's null, taking the dispatchers that clients manage on their own.
     */
    var clients: CoroutineDispatcher? = null

    /**
     * For jobs and operations happening at server, typically
     * storage service, ref-mode-store, etc.
     */
    var server: CoroutineDispatcher = Dispatchers.Default
}
