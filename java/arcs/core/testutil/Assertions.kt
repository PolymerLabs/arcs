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
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlin.AssertionError

/** Implementation of `fail` which returns [Nothing], and thus will work in elvis-situations. */
fun fail(message: String): Nothing = throw AssertionError(message)

/**
 * Asserts that a list of values matches a sequence of groups, where a List group must be in
 * order while a Set group may be any order. For example:
 *   assertVariableOrdering(listOf(1, 2, 77, 55, 66, 3, 4),
 *                          listOf(1, 2), setOf(55, 66, 77), listOf(3, 4)) => matches
 * TODO: improve error reporting
 * TODO: consider more complex nested groupings
 */
fun <T> assertVariableOrdering(actual: List<T>, vararg groups: Collection<T>) {
  val expectedSize = groups.fold(0) { sum, group -> sum + group.size }
  if (expectedSize != actual.size) {
    throw AssertionError("expected $expectedSize elements but found ${actual.size}: $actual")
  }

  var start = 0
  groups.forEach { group ->
    val slice = actual.subList(start, start + group.size)
    when (group) {
      is List -> assertThat(slice).isEqualTo(group)
      is Set -> assertThat(slice).containsExactlyElementsIn(group)
      else -> throw IllegalArgumentException(
        "assertVariableOrdering: only List and Set may be used " +
          "for the 'groups' argument"
      )
    }
    start += group.size
  }
}

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
