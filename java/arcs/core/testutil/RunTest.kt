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

import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.debug.DebugProbes
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.io.PrintStream
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Alternative to [runBlocking] which always returns [Unit] (safe for JUnit tests) and enforces a
 * timeout, to help avoid waiting forever for a test to finish/time-out.
 *
 * When necessary, you can provide a specific dispatcher for the [coroutineContext] parameter,
 * for example: a handle's dispatcher.
 *
 * The default value for [timeoutMillis] is 5,000ms (5 seconds).
 */
@Suppress("EXPERIMENTAL_API_USAGE")
fun runTest(
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    timeoutMillis: Long = 50000,
    block: suspend CoroutineScope.() -> Unit
) = runBlocking(coroutineContext) {
    try {
        withTimeout(timeoutMillis) { this.block() }
    } catch (e: TimeoutCancellationException) {
        if (DebugProbes.isInstalled) {
            val stringWriter = StringWriter()
            val dump = ByteArrayOutputStream().use { out ->
                PrintStream(out).use {
                    DebugProbes.dumpCoroutines(it)
                    it.flush()
                    out.toString(Charsets.UTF_8.name())
                }
            }
            println(dump)
        }
        throw e
    }
}
