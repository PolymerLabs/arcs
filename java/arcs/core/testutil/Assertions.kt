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

import com.google.common.truth.StandardSubjectBuilder
import com.google.common.truth.Truth.assertWithMessage
import kotlin.AssertionError

/** Implementation of `fail` which returns [Nothing], and thus will work in elvis-situations. */
fun fail(message: String): Nothing = throw AssertionError(message)

/**
 * Very simple convenience method to include additional context with your assertion.
 *
 * Instead of:
 *
 *     assertWithMessage("For: $myThing").that(...)...
 *
 * You can use:
 *
 *     assertFor(myThing).that(...
 */
fun <T> assertFor(thing: T): StandardSubjectBuilder = assertWithMessage("For $thing: ")

/**
 * Simple helper to assert that something does not throw an exception. Useful if you are
 * using a non-default SubjectBuilder. For example, if you want to include a message that
 * has the stringified version of an object as additional context, you can use:
 *
 *     assertFor(thing).doesNotFail { action() }
 */
inline fun StandardSubjectBuilder.doesNotFail(block: () -> Unit) {
  try {
    block()
  } catch (t: Throwable) {
    fail()
  }
}
