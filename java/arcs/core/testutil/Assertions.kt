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

import java.lang.AssertionError
import kotlin.reflect.KClass
import org.junit.Assert.fail

/** Utility to assert that a lambda throws a specific exception type. */
fun assertThrows(expected: KClass<out Exception>, thrower: () -> Unit) {
    try {
        thrower()
    } catch (e: Exception) {
        assert(expected.java.isInstance(e)) {
            "Expected exception of type $expected, but was ${e.javaClass}"
        }
        return
    }
    fail("Expected exception of type $expected, but none was thrown.")
}

/** Utility to assert that a suspending lambda throws a specific exception type. */
suspend fun assertSuspendingThrows(expected: KClass<out Exception>, thrower: suspend () -> Unit) {
    try {
        thrower()
    } catch (e: Exception) {
        if (!expected.java.isInstance(e)) {
            throw AssertionError("Expected exception of type $expected, but was ${e.javaClass}", e)
        }
        return
    }
    fail("Expected exception of type $expected, but none was thrown.")
}
