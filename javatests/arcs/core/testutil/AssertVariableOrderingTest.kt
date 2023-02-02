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
      group(
        sequence(2, 3, 5, 7),
        sequence(4, 6, 8),
        sequence(1, 9)
      )
    )

    // Interleaved with unmatched items.
    assertVariableOrdering(
      listOf(44, 1, 2, 3, 66, 4, 5, 6, 7, 22, 8, 9),
      group(
        sequence(2, 3, 5, 7),
        sequence(4, 6, 8),
        sequence(1, 9)
      ),
      allowUnmatched = true
    )

    // In order.
    assertVariableOrdering(
      (1..6).toList(),
      group(
        sequence(1, 2, 3),
        sequence(4),
        sequence(5, 6)
      )
    )
  }

  @Test
  fun parallelGroups() {
    // Interleaved with full coverage
    assertVariableOrdering(
      (1..9).toList(),
      group(
        group(2, 3, 5, 7),
        group(4, 6, 8),
        group(1, 9)
      )
    )

    // Interleaved with unmatched items.
    assertVariableOrdering(
      listOf(44, 1, 2, 3, 66, 4, 5, 6, 7, 22, 8, 9),
      group(
        group(2, 3, 5, 7),
        group(4, 6, 8),
        group(1, 9)
      ),
      allowUnmatched = true
    )

    // In order.
    assertVariableOrdering(
      (1..6).toList(),
      group(
        group(1, 2, 3),
        group(4),
        group(5, 6)
      )
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
    assertVariableOrdering(actual, group(nested, group("g", "f", "t", "z", "m", "w")))

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
  fun reuseValueConstraintObjects() {
    val seq = sequence(1, 2)
    val grp = group(3, 4, 5)

    // In a single call.
    assertVariableOrdering(
      listOf(1, 2, 5, 3, 4, 10, 3, 1, 4, 2, 5, 20, 30),
      sequence(seq, grp),
      group(10),
      group(seq, grp),
      sequence(20, 30)
    )
    assertThat(seq.maxIndex).isEqualTo(9)
    assertThat(grp.maxIndex).isEqualTo(10)

    // Across multiple calls - note that the new matches occur at an earlier index than the
    // last matches of the previous call.
    assertVariableOrdering(
      listOf(1, 2, 5, 3, 4, 10),
      seq,
      grp,
      single(10)
    )
    assertThat(seq.maxIndex).isEqualTo(1)
    assertThat(grp.maxIndex).isEqualTo(4)
  }

  @Test
  fun reuseNestedConstraintObjects() {
    val seq = sequence(sequence(1, 2), group(3, 4))
    val grp = group(single(5), sequence(6, 7))

    // In a single call.
    assertVariableOrdering(
      listOf(1, 2, 4, 3, 6, 5, 7, 10, 1, 6, 2, 3, 4, 7, 5, 20),
      sequence(seq, grp),
      group(10),
      group(seq, grp),
      single(20)
    )
    assertThat(seq.maxIndex).isEqualTo(12)
    assertThat(grp.maxIndex).isEqualTo(14)

    // Across multiple calls - note that the new matches occur at an earlier index than the
    // last matches of the previous call.
    assertVariableOrdering(
      listOf(1, 2, 3, 4, 5, 6, 7, 10),
      seq,
      grp,
      single(10)
    )
    assertThat(seq.maxIndex).isEqualTo(3)
    assertThat(grp.maxIndex).isEqualTo(6)
  }

  @Test
  fun singleValueConstraint() {
    assertVariableOrdering(
      (1..18).toList(),
      single(2),
      sequence(4, 5),
      group(
        single(12),
        single(7),
        sequence(9, 10, 15)
      ),
      group(18, 17),
      allowUnmatched = true
    )

    verifyExceptionMessage(
      """
        assertVariableOrdering: single constraint failed with unmatched values: [x]

            Actual   Match result
        0 | a        seq(>a<, b)
        1 | b        seq(a, >b<)
          :          ?? sng(x)
        2 | c
        3 | d
        4 | e
      """
    ) {
      assertVariableOrdering(
        listOf("a", "b", "c", "d", "e"),
        sequence("a", "b"),
        single("x"),
        group("d", "e")
      )
    }
  }

  @Test
  fun complexValueTypes_setOfInt() {
    val listOfSets = listOf(setOf(1, 2), setOf(3, 4, 5), setOf(6))

    assertVariableOrdering(
      listOfSets,
      sequence(setOf(1, 2), setOf(3, 4, 5)),
      // API quirk: a single setOf() matches the group(Iterable<T>) method instead of the
      // intended vararg one. group(listOf(setOf())) works but single() is more readable.
      single(setOf(6))
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
      assertVariableOrdering(
        listOfSets,
        sequence(setOf(1, 2), setOf(8, 9), setOf(6))
      )
    }
  }

  @Test
  fun complexValueTypes_dataClass() {
    data class Bob(val x: Int, val y: String = "")
    val listOfBobs = listOf(Bob(1, "one"), Bob(2), Bob(3, "three"), Bob(4), Bob(5))

    assertVariableOrdering(
      listOfBobs,
      group(
        sequence(Bob(1, "one"), Bob(4)),
        sequence(Bob(2), Bob(3, "three"))
      ),
      sequence(Bob(5))
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
      assertVariableOrdering(
        listOfBobs,
        group(Bob(2), Bob(10, "ten"))
      )
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
        group("a1", "z"),
        group(
          sequence("a1", "a2", "a3"),
          sequence("b1", "b2")
        ),
        sequence("x", "y")
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
        sequence("a1", "z"),
        group("b1", "z", "b2", "k")
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
        sequence("x", "y"),
        group("a", "b")
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
        group("a", "b"),
        group("x", "y")
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
        group(
          sequence("dolor", "sit", "eiusmod"),
          group("lorem", "sed")
        )
      )
    }
  }

  @Test
  fun nestedGroup_mustIteratePermutationsForOverlappingConstraints() {
    // This wouldn't work without the permutation logic in Constraint.NestGroup, because seq(X,Z)
    // matches the first X and the Z, leaving inputs Y-X to fail against seq(X,Y). Additionally,
    // the extra non-overlapping sequences must be left out of the permutation processing to avoid
    // a factorial explosion.
    assertVariableOrdering(
      listOf("X", "Y", "X", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"),
      group(
        sequence("X", "Z"), sequence("X", "Y"),
        single("a"), single("b"), single("c"), single("d"), single("e"), single("f"),
        single("g"), single("h"), single("i"), single("j"), single("k"), single("l")
      )
    )

    // Try every permutation over 4 inputs.
    val a = sequence(1, 2)
    val b = sequence(1, 3)
    val c = sequence(1, 4)
    val d = sequence(1, 5)
    listOf(
      listOf(a, b, c, d), listOf(a, b, d, c), listOf(a, c, d, b), listOf(a, c, b, d),
      listOf(a, d, b, c), listOf(a, d, c, b), listOf(b, c, d, a), listOf(b, c, a, d),
      listOf(b, d, a, c), listOf(b, d, c, a), listOf(b, a, c, d), listOf(b, a, d, c),
      listOf(c, d, a, b), listOf(c, d, b, a), listOf(c, a, b, d), listOf(c, a, d, b),
      listOf(c, b, d, a), listOf(c, b, a, d), listOf(d, a, b, c), listOf(d, a, c, b),
      listOf(d, b, c, a), listOf(d, b, a, c), listOf(d, c, a, b), listOf(d, c, b, a)
    ).forEach {
      assertVariableOrdering(
        listOf(9, 8, 1, 2, 1, 3, 1, 4, 1, 5, 7),
        sequence(9, 8),
        group(it),
        single(7)
      )
    }
  }

  @Test
  fun nestedGroup_errorReportFromOverlappingConstraintWithInvalidValue() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [-2]

            Actual   Match result
        0 | 0        seq(>0<, -2)
          :          ?? seq(0, >-2<)
        1 | 1
        2 | 0
        3 | 2
        4 | 0
        5 | 3
      """
    ) {
      assertVariableOrdering(
        listOf(0, 1, 0, 2, 0, 3),
        group(
          sequence(0, 3),
          sequence(0, -2),
          sequence(0, 1)
        )
      )
    }
  }

  @Test
  fun nestedGroup_errorReportFromNonOverlappingConstraintWithInvalidValue() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: sequence constraint failed with unmatched values: [-6]

            Actual   Match result
        0 | 0
        1 | 1
        2 | 5        seq(>5<, -6)
          :          ?? seq(5, >-6<)
        3 | 6
        4 | 0
        5 | 3
      """
    ) {
      assertVariableOrdering(
        listOf(0, 1, 5, 6, 0, 3),
        group(
          sequence(0, 3),
          sequence(5, -6),
          sequence(0, 1)
        )
      )
    }
  }

  @Test
  fun nestedGroup_errorReportFromOverlappingConstraints() {
    verifyExceptionMessage(
      """
        assertVariableOrdering: no ordering found to satisfy constraints with common values in a nested group

        [Constraints]
        seq(1, 5)
        grp(0, 1, 2)
        seq(5, 3, 6)

        [Sample failure]
            Actual   Match result
        0 | 9        sng(9)
          :          ?? seq(>5<, 3, 6)
        1 | 0        grp(>0<, 1, 2)
        2 | 1        seq(>1<, 5)
        3 | 2        grp(0, 1, >2<)
        4 | 1        grp(0, >1<, 2)
        5 | 5        seq(1, >5<)
        6 | 3        seq(5, >3<, 6)
        7 | 6        seq(5, 3, >6<)
      """
    ) {
      assertVariableOrdering(
        listOf(9, 0, 1, 2, 1, 5, 3, 6),
        single(9),
        group(
          sequence(1, 5),
          sequence(5, 3, 6),
          group(0, 1, 2)
        )
      )
    }
  }

  @Test
  fun nestedGroup_pathologicalInputs() {
    // This has 13 overlapping constraints in the group; 13! is 6,227,020,800 orderings which
    // is not feasible to brute force. The pruning algorithm in NestGroup.process() succesfully
    // completes this call with just 46,496 invocations of runPermutations.
    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14),
        group(
          sequence(1, 2), sequence(2, 3), sequence(3, 4), sequence(4, 5), sequence(5, 6),
          sequence(6, 7), sequence(7, 8), sequence(8, 9), sequence(9, 10), sequence(10, 11),
          sequence(11, 12), sequence(12, 13), sequence(13, 14)
        )
      )
    }.let {
      assertThat(it).hasMessageThat().contains("no ordering found to satisfy constraints")
    }

    // The following test would time out without the safety limit check in NestGroup.process().
    assertFailsWith<RuntimeException> {
      assertVariableOrdering(
        listOf(
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
        ),
        group(
          sequence(0, 1),
          sequence(0, 2),
          sequence(0, 3),
          sequence(0, 4),
          sequence(0, 5),
          sequence(0, 6, 7),
          sequence(0, 7),
          sequence(0, 8),
          sequence(0, 9),
          sequence(0, 10),
          sequence(0, 11),
          sequence(0, 12),
          sequence(0, 13)
        )
      )
    }.let {
      assertThat(it).hasMessageThat()
        .contains("NestGroup required too many permutations to complete")
    }
  }

  @Test
  fun deeplyNestedGroups_successfulMatch() {
    assertVariableOrdering(
      listOf(9, 0, 1, 3, 2, 2, 3, 4, 0, 5, 8, 4, 7),
      group(
        sequence(
          single(9),
          group(
            group(
              sequence(0, 1),
              sequence(2, 0)
            ),
            sequence(3, 2)
          )
        ),
        group(
          sequence(3, 4),
          group(4, 5)
        ),
        sequence(8, 7)
      )
    )
  }

  @Test
  fun deeplyNestedGroups_failureInNonOverlappingConstraint() {
    // This should fail in the "noPermute" loop in NestGroup.process
    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(9, 0, 1, 3, 2, 2, 3, 4, 0, 5, 8, 4, 7),
        group(
          sequence(
            single(9),
            group(
              group(
                sequence(0, 1),
                sequence(2, 0)
              ),
              sequence(3, 2)
            )
          ),
          group(
            sequence(3, 4),
            group(4, 5)
          ),
          sequence(-8, 7) // -8 is not in actual
        )
      )
    }.let {
      assertThat(it).hasMessageThat()
        .contains("sequence constraint failed with unmatched values: [-8]")
    }
  }

  @Test
  fun deeplyNestedGroups_failureInOverlappingConstraint() {
    // This should fail in the first "toPermute" loop in NestGroup.process
    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(9, 0, 1, 3, 2, 2, 3, 4, 0, 5, 8, 4, 7),
        group(
          sequence(
            single(9),
            group(
              group(
                sequence(0, 1),
                sequence(2, 0)
              ),
              sequence(3, 2, -5) // -5 is not in actual
            )
          ),
          group(
            sequence(3, 4),
            group(4, 5)
          ),
          sequence(8, 7)
        )
      )
    }.let {
      assertThat(it).hasMessageThat()
        .contains("sequence constraint failed with unmatched values: [-5]")
    }
  }

  @Test
  fun deeplyNestedGroups_failureDuringPermutationAnalysis() {
    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(9, 0, 1, 3, 2, 2, 3, 4, 0, 5, 8, 4, 7),
        group(
          sequence(
            single(9),
            group(
              group(
                sequence(0, 1),
                sequence(2, 0)
              ),
              sequence(3, 2)
            )
          ),
          group(
            sequence(3, 4),
            group(4, 5, 8) // Extra 8 can't be satisfied but will pass the first "toPermute" check
          ),
          sequence(8, 7)
        )
      )
    }.let {
      assertThat(it).hasMessageThat().contains("no ordering found to satisfy constraints")
    }
  }

  @Test
  fun deeplyNestedGroups_unmatchedValues() {
    assertFailsWith<AssertionError> {
      assertVariableOrdering(
        listOf(9, 0, 1, -5, 3, 2, 2, 3, 4, -1, 0, 5, 8, 4, 7, -6),
        group(
          sequence(
            single(9),
            group(
              group(
                sequence(0, 1),
                sequence(2, 0)
              ),
              sequence(3, 2)
            )
          ),
          group(
            sequence(3, 4),
            group(4, 5)
          ),
          sequence(8, 7)
        )
      )
    }.let {
      assertThat(it).hasMessageThat()
        .contains("all constraints satisfied but some values not matched: [-5, -1, -6]")
    }
  }

  @Test
  fun regressionTest_nestedGroupMustClearMatchArrayCorrectly() {
    // The first impl of runPermutations did not clear the match array correctly, so processing
    // of the next permutation was polluted by the failed match entries from previous ones.
    assertVariableOrdering(
      listOf("A", "B", "C", "A", "D", "E", "X", "C", "Y"),
      group(
        sequence("A", "D", "E"),
        sequence("A", "B", "C"),
        sequence("X", "C", "Y")
      )
    )

    // Make sure the clearing logic works with a non-zero 'from' starting index.
    assertVariableOrdering(
      listOf("k", "l", "f", "A", "B", "C", "A", "D", "E", "X", "C", "Y"),
      sequence("k", "l", "f"),
      group(
        sequence("A", "D", "E"),
        sequence("A", "B", "C"),
        sequence("X", "C", "Y")
      )
    )
  }

  @Test
  fun valueSets() {
    assertThat(single(7).valueSet).isEqualTo(setOf(7))

    val s1 = sequence(1, 2, 1, 3, 4)
    val g1 = group(2, 4, 5, 5)
    assertThat(s1.valueSet).isEqualTo(setOf(1, 2, 3, 4))
    assertThat(g1.valueSet).isEqualTo(setOf(2, 4, 5))
    assertThat(sequence(s1, g1).valueSet).isEqualTo(setOf(1, 2, 3, 4, 5))
    assertThat(group(s1, g1).valueSet).isEqualTo(setOf(1, 2, 3, 4, 5))

    val s2 = sequence(
      group("y", "x", "a"),
      single("x"),
      sequence("y", "a")
    )
    val g2 = group(
      sequence("a", "b", "a", "c", "d"),
      group("a", "c", "e")
    )
    assertThat(sequence(s2, g2).valueSet).isEqualTo(setOf("a", "b", "c", "d", "e", "x", "y"))
    assertThat(group(s2, g2).valueSet).isEqualTo(setOf("a", "b", "c", "d", "e", "x", "y"))
  }
}
