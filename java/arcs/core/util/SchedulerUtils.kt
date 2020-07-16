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

internal val currentDispatcherThreadLocal = ThreadLocal<CoroutineDispatcher?>()

internal fun setCurrentDispatcher(dispatcher: CoroutineDispatcher?) {
    currentDispatcherThreadLocal.set(dispatcher)
}

/** The [Scheduler] dispatcher that the current thread is running in, or null. */
val currentDispatcher get() = currentDispatcherThreadLocal.get()

/** Returns true if the current thread is executing within the given [dispatcher]. */
fun currentlyRunningInDispatcher(dispatcher: CoroutineDispatcher): Boolean {
    return currentDispatcher === dispatcher
}
