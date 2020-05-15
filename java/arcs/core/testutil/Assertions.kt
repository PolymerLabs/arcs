/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.testutil

import kotlin.AssertionError
import kotlin.reflect.KClass
import org.junit.Assert.fail

/** Utility to assert that a suspending lambda throws a specific exception type. */
@Suppress("UNCHECKED_CAST")
suspend fun <T : Exception> assertSuspendingThrows(
    expected: KClass<T>,
    thrower: suspend () -> Unit
): T {
    try {
        thrower()
    } catch (e: Exception) {
        if (!expected.java.isInstance(e)) {
            throw AssertionError("Expected exception of type $expected, but was ${e.javaClass}", e)
        }
        return e as T
    }
    fail("Expected exception of type $expected, but none was thrown.")
    return AssertionError("Impossible") as T
}

/** Implementation of `fail` which returns [Nothing], and thus will work in elvis-situations. */
fun fail(message: String): Nothing = throw AssertionError(message)
