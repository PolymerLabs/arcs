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

package arcs.core.testutil

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Alternative to [runBlocking] which always returns [Unit] (safe for JUnit tests) and enforces a
 * timeout, to help avoid waiting forever for a test to finish/time-out.
 *
 * When necessary, you can provide a specific dispatcher for the [coroutineContext] parameter,
 * for example: a handle's dispatcher.
 *
 * The default value for [timeoutMillis] is 5,000ms (5 seconds).
 */
fun runTest(
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    timeoutMillis: Long = 5000,
    block: suspend CoroutineScope.() -> Unit
) = runBlocking(coroutineContext) {
    withTimeout(timeoutMillis) { this.block() }
}
