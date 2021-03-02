/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.testutil

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlin.test.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AssertVariableOrderingTest {
  fun verifyExceptionMessage(expected: String, block: () -> Unit) {
    var caught: AssertionError? = null
    try {
      block()
    } catch (e: AssertionError) {
      caught = e
    }
    if (caught == null) {
      fail("Expected an exception to be thrown, but was completed successfully.")
    }
    assertThat(caught.message).isEqualTo(expected.trimIndent())
  }

  @Test
  fun emptyInputs() {
    assertVariableOrdering<Int>(emptyList(), sequence(emptyList()), group(emptyList()))
  }

  @Test
  fun parallelSequences() {
    // Interleaved with full coverage
    assertVariableOrdering(
      (1..9).toList(),
      sequence(2, 3, 5, 7),
      sequence(4, 6, 8),
      sequence(1, 9)
    )

    // Interleaved with unmatched items.
    assertVariableOrdering(
      listOf(44, 1, 2, 3, 66, 4, 5, 6, 7, 22, 8, 9),
      sequence(2, 3, 5, 7),
      sequence(4, 6, 8),
      sequence(1, 9),
      allowUnmatched = true
    )

    // In order.
    assertVariableOrdering(
      (1..6).toList(),
      sequence(1, 2, 3),
      sequence(4),
      sequence(5, 6)
    )
  }

  @Test
  fun parallelGroups() {
    // Interleaved with full coverage
    assertVariableOrdering(
      (1..9).toList(),
      group(2, 3, 5, 7),
      group(4, 6, 8),
      group(1, 9)
    )

    // Interleaved with unmatched items.
    assertVariableOrdering(
      listOf(44, 1, 2, 3, 66, 4, 5, 6, 7, 22, 8, 9),
      group(2, 3, 5, 7),
      group(4, 6, 8),
      group(1, 9),
      allowUnmatched = true
    )

    // In order.
    assertVariableOrdering(
      (1..6).toList(),
      group(1, 2, 3),
      group(4),
      group(5, 6)
    )
  }

  @Test
  fun simpleNestedConstraints() {
    val actual = listOf(
      "g", "X", "f", "Y", "t", "Q", "R", "z", "S", "B1", "A1", "A2", "m", "B2", "w", "K", "J"
    )

    // Test re-use of a constraint ojbect in different calls to assertVariableOrdering.
    val nested = sequence(
      sequence("X", "Y"),
      sequence("Q", "R", "S"),
      group(
        sequence("A1", "A2"),
        sequence("B1", "B2")
      ),
      group("J", "K")
    )

    // Use the allowUnmatched flag to ignore the lower-case items.
    assertVariableOrdering(actual, nested, allowUnmatched = true)

    // Add a parallel group to capture the lower-case items.
    assertVariableOrdering(actual, nested, group("g", "f", "t", "z", "m", "w"))

    // Nested groups - pointless when not re-using constraint objects, but should still work.
    assertVariableOrdering(
      actual,
      group(
        group(
          group("z", "B1"),
          group("A2", "S", "w"),
          group("A1")
        ),
        group("f", "R"),
        group(group("K", "t", "m"))
      ),
      allowUnmatched = true
    )

    // Nested sequences - similarly pointless, but again should still work.
    assertVariableOrdering(
      actual,
      sequence(
        sequence("g", "X", "f"),
        sequence(
          sequence("Y"),
          sequence("t"),
          sequence("R", "B1")
        ),
        sequence(sequence("B2", "w", "K", "J"))
      ),
      allowUnmatched = true
    )
  }

  @Test
  fun deeplyNestedConstraints() {
    assertVariableOrdering(
      (1..30).toList(),
      sequence(
        sequence(1, 2),
        group(
          sequence(
            group(5, 4),
            group(6, 7)
          ),
          sequence(3, 8)
        ),
        group(
          sequence(
            group(12, 16, 15),
            group(
              sequence(21, 23, 28, 29),
              group(24, 22, 19)
            )
          ),
          sequence(25, 26, 27),
          sequence(9, 10, 13, 18, 20),
          group(17, 11, 14)
        ),
        group(30)
      )
    )
  }

  @Test
  fun duplicateValues() {
    val actual = listOf('a', 'a', 'x', 'b', 'a', 'b', 'y', 'b', 'z')
    val expected = listOf('a', 'a', 'b', 'a', 'b', 'b')
    assertVariableOrdering(actual, sequence(expected), allowUnmatched = true)
    assertVariableOrdering(actual, group(expected), allowUnmatched = true)

    // Repeated values in constraints should only match repeated values in actual.
    assertFailsWith<AssertionError> {
      assertVariableOrdering(listOf('a', 'b'), sequence('a', 'a'), allowUnmatched = true)
    }
    assertVariableOrdering(listOf('a', 'b', 'a'), sequence('a', 'a'), allowUnmatched = true)

    assertFailsWith<AssertionError> {
      assertVariableOrdering(listOf('a', 'b'), group('a', 'a'), allowUnmatched = true)
    }
    assertVariableOrdering(listOf('a', 'b', 'a'), group('a', 'a'), allowUnmatched = true)
  }

  @Test
  fun duplicateConstraints() {
    val actual = listOf('a', 'b', 'x', 'a', 'y', 'b')
    val seq = sequence('a', 'b')
    val grp = group('a', 'b')
    assertVariableOrdering(actual, seq, seq, allowUnmatched = true)
    assertVariableOrdering(actual, grp, grp, allowUnmatched = true)

    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(1, 2),
        sequence(group(1, 2), group(1, 2))
      )
    }
    assertVariableOrdering(
      listOf(1, 2, 1, 2),
      sequence(group(1, 2), group(1, 2))
    )

    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(1, 2),
        group(sequence(1, 2), sequence(1, 2))
      )
    }
    assertVariableOrdering(
      listOf(1, 2, 1, 2),
      group(sequence(1, 2), sequence(1, 2))
    )
  }

  @Test
  fun reuseConstraintObjectsInASingleCall() {
    val seq = sequence(1, 2)
    val grp = group(3, 4, 5)
    assertVariableOrdering(
      listOf(1, 2, 5, 3, 4, 10, 3, 1, 4, 2, 5),
      sequence(
        sequence(seq, grp),
        group(10),
        group(seq, grp)
      )
    )
  }

  @Test
  fun complexValueTypes_setOfInt() {
    val listOfSets = listOf(setOf(1, 2), setOf(3, 4, 5), setOf(6))

    assertVariableOrdering(
      listOfSets,
      sequence(
        sequence(setOf(1, 2), setOf(3, 4, 5)),
        // API quirk: a single setOf() matches the group(Iterable<T>) method instead of the
        // intended vararg one. The workaround is to wrap it in listOf.
        group(listOf(setOf(6)))
      )
    )

    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [[8, 9]]

            Actual      Match result
        0 | [1, 2]      seq(>[1, 2]<, [8, 9], [6])
          :             ?? seq([1, 2], >[8, 9]<, [6])
        1 | [3, 4, 5]
        2 | [6]         seq([1, 2], [8, 9], >[6]<)
      """
    ) {
      assertVariableOrdering(listOfSets, sequence(setOf(1, 2), setOf(8, 9), setOf(6)))
    }
  }

  @Test
  fun complexValueTypes_dataClass() {
    data class Bob(val x: Int, val y: String = "")
    val listOfBobs = listOf(Bob(1, "one"), Bob(2), Bob(3, "three"), Bob(4), Bob(5))

    assertVariableOrdering(
      listOfBobs,
      sequence(
        group(
          sequence(Bob(1, "one"), Bob(4)),
          sequence(Bob(2), Bob(3, "three"))
        ),
        sequence(Bob(5))
      )
    )

    verifyExceptionMessage(
      """
        assertVariableOrdering: group constraint failed with unmatched values: [Bob(x=10, y=ten)]

            Actual              Match result
        0 | Bob(x=1, y=one)
        1 | Bob(x=2, y=)        grp(>Bob(x=2, y=)<, Bob(x=10, y=ten))
          :                     ?? grp(Bob(x=2, y=), >Bob(x=10, y=ten)<)
        2 | Bob(x=3, y=three)
        3 | Bob(x=4, y=)
        4 | Bob(x=5, y=)
      """
    ) {
      assertVariableOrdering(listOfBobs, group(Bob(2), Bob(10, "ten")))
    }
  }

  @Test
  fun nestedConstraintFailures() {
    val actual = listOf("a1", "z", "b1", "a2", "b2", "a3", "x", "y")

    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [a1]

            Actual   Match result
        0 | a1       grp(>a1<, z)
        1 | z        grp(a1, >z<)
          :          ?? seq(>a1<, a2, a3)
        2 | b1
        3 | a2       seq(a1, >a2<, a3)
        4 | b2
        5 | a3       seq(a1, a2, >a3<)
        6 | x
        7 | y
      """
    ) {
      assertVariableOrdering(
        actual,
        sequence(
          group("a1", "z"),
          group(
            sequence("a1", "a2", "a3"),
            sequence("b1", "b2")
          ),
          sequence("x", "y")
        )
      )
    }

    verifyExceptionMessage(
      """
        assertVariableOrdering: group constraint failed with unmatched values: [z, k]

            Actual   Match result
        0 | a1       seq(>a1<, z)
        1 | z        seq(a1, >z<)
        2 | b1       grp(>b1<, z, b2, k)
        3 | a2
        4 | b2       grp(b1, z, >b2<, k)
          :          ?? grp(b1, >z<, b2, k)
          :          ?? grp(b1, z, b2, >k<)
        5 | a3
        6 | x
        7 | y
      """
    ) {
      assertVariableOrdering(
        actual,
        sequence(
          sequence("a1", "z"),
          group("b1", "z", "b2", "k")
        )
      )
    }
  }

  @Test
  fun failureMessageFormatting_zeroMatches() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [elit, sed, eiusmod]

            Actual        Match result
          :               ?? seq(>elit<, sed, eiusmod)
          :               ?? seq(elit, >sed<, eiusmod)
          :               ?? seq(elit, sed, >eiusmod<)
        0 | lorem
        1 | ipsum
        2 | dolor
        3 | sit
        4 | consectetur
      """
    ) {
      assertVariableOrdering(
        listOf("lorem", "ipsum", "dolor", "sit", "consectetur"),
        sequence("elit", "sed", "eiusmod")
      )
    }

    verifyExceptionMessage(
      """
        assertVariableOrdering: group constraint failed with unmatched values: [lorem]

            Actual    Match result
          :           ?? grp(>lorem<)
        0 | elit
        1 | eiusmod
      """
    ) {
      assertVariableOrdering(
        listOf("elit", "eiusmod"),
        group("lorem")
      )
    }
  }

  @Test
  fun failureMessageFormatting_runsOfMatchesAndMisses() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [5, 23, 1, -8, 5, 40]

             Actual   Match result
         0 | 1
         1 | 2        seq(>2<, 4, 5, 6, 5, 9, 23, 1, 12, -8, 5, 40, 14)
         2 | 3
         3 | 4        seq(2, >4<, 5, 6, 5, 9, 23, 1, 12, -8, 5, 40, 14)
         4 | 5        seq(2, 4, >5<, 6, 5, 9, 23, 1, 12, -8, 5, 40, 14)
         5 | 6        seq(2, 4, 5, >6<, 5, 9, 23, 1, 12, -8, 5, 40, 14)
           :          ?? seq(2, 4, 5, 6, >5<, 9, 23, 1, 12, -8, 5, 40, 14)
         6 | 7
         7 | 8
         8 | 9        seq(2, 4, 5, 6, 5, >9<, 23, 1, 12, -8, 5, 40, 14)
           :          ?? seq(2, 4, 5, 6, 5, 9, >23<, 1, 12, -8, 5, 40, 14)
           :          ?? seq(2, 4, 5, 6, 5, 9, 23, >1<, 12, -8, 5, 40, 14)
         9 | 10
        10 | 11
        11 | 12       seq(2, 4, 5, 6, 5, 9, 23, 1, >12<, -8, 5, 40, 14)
           :          ?? seq(2, 4, 5, 6, 5, 9, 23, 1, 12, >-8<, 5, 40, 14)
           :          ?? seq(2, 4, 5, 6, 5, 9, 23, 1, 12, -8, >5<, 40, 14)
           :          ?? seq(2, 4, 5, 6, 5, 9, 23, 1, 12, -8, 5, >40<, 14)
        12 | 13
        13 | 14       seq(2, 4, 5, 6, 5, 9, 23, 1, 12, -8, 5, 40, >14<)
      """
    ) {
      assertVariableOrdering(
        (1..14).toList(),
        sequence(2, 4, 5, 6, 5, 9, 23, 1, 12, -8, 5, 40, 14)
      )
    }
  }

  @Test
  fun failureMessageFormatting_unmatchedBeforeAndAfterFullInput() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [x, y]

            Actual   Match result
          :          ?? seq(>x<, y)
          :          ?? seq(x, >y<)
        0 | a
        1 | b
      """
    ) {
      assertVariableOrdering(
        listOf("a", "b"),
        sequence(
          sequence("x", "y"),
          group("a", "b")
        )
      )
    }

    verifyExceptionMessage(
      """
        assertVariableOrdering: group constraint failed with unmatched values: [x, y]

            Actual   Match result
        0 | a        grp(>a<, b)
        1 | b        grp(a, >b<)
          :          ?? grp(>x<, y)
          :          ?? grp(x, >y<)
      """
    ) {
      assertVariableOrdering(
        listOf("a", "b"),
        sequence(
          group("a", "b"),
          group("x", "y")
        )
      )
    }
  }

  @Test
  fun failureMessageFormatting_constraintsSatisfiedWithUnmatchedValues() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: all constraints satisfied but some values not matched: [ipsum, consectetur, elit]

        0 | lorem
        1 | ipsum         <- unmatched
        2 | dolor
        3 | sit
        4 | consectetur   <- unmatched
        5 | elit          <- unmatched
        6 | sed
        7 | eiusmod
      """
    ) {
      assertVariableOrdering(
        listOf("lorem", "ipsum", "dolor", "sit", "consectetur", "elit", "sed", "eiusmod"),
        sequence("dolor", "sit", "eiusmod"),
        group("lorem", "sed")
      )
    }
  }
}
