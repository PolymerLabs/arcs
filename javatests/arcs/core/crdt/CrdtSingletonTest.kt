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

package arcs.core.crdt

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSingleton.Data
import arcs.core.crdt.CrdtSingleton.IOperation
import arcs.core.crdt.CrdtSingleton.Operation.Clear
import arcs.core.crdt.CrdtSingleton.Operation.Update
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtSingleton]. */
@RunWith(JUnit4::class)
class CrdtSingletonTest {

  @Test
  fun construction_defaultArguments() {
    val singleton = CrdtSingleton<Reference>()

    assertThat(singleton.consumerView).isNull()
    assertThat(singleton.data.values).isEmpty()
    assertThat(singleton.versionMap.isEmpty()).isTrue()
  }

  @Test
  fun construction_withInitialData() {
    val reference = Reference("Foo")
    val singleton = CrdtSingleton(initialData = reference)

    assertThat(singleton.consumerView).isEqualTo(Reference("Foo"))
    assertThat(singleton.versionMap.isEmpty()).isTrue()
    assertThat(singleton.data.values).containsExactly(
      reference.id,
      CrdtSet.DataValue(VersionMap(), reference)
    )
  }

  @Test
  fun construction_withInitialVersionMap() {
    val versionMap = VersionMap("alice" to 7)
    val singleton = CrdtSingleton<Reference>(initialVersion = versionMap)

    assertThat(singleton.consumerView).isNull()
    assertThat(singleton.versionMap).isEqualTo(versionMap)
    assertThat(singleton.data.values).isEmpty()
  }

  @Test
  fun construction_withInitialDataAndVersionMap() {
    val initialValue = Reference("Foo")
    val versionMap = VersionMap("alice" to 7)
    val singleton = CrdtSingleton(initialData = initialValue, initialVersion = versionMap)

    assertThat(singleton.consumerView).isEqualTo(Reference("Foo"))
    assertThat(singleton.versionMap).isEqualTo(versionMap)
    assertThat(singleton.data.values).containsExactly(
      initialValue.id,
      CrdtSet.DataValue(versionMap, initialValue)
    )
  }

  @Test
  fun construction_byCopy() {
    val reference = Reference("Foo")
    val versionMap = VersionMap("alice" to 7)

    val original = CrdtSingleton(initialData = reference, initialVersion = versionMap)
    val copy = CrdtSingleton(singletonToCopy = original)

    assertThat(copy.consumerView).isEqualTo(Reference("Foo"))
    assertThat(copy.versionMap).isEqualTo(versionMap)
    assertThat(copy.data.values).containsExactly(
      reference.id,
      CrdtSet.DataValue(versionMap, reference)
    )
  }

  @Test
  fun construction_providingBothSourceToCopyAndInitialValueIsInvalid() {
    val singleton = CrdtSingleton(initialData = Reference("Foo"))
    assertFailsWith<CrdtException> {
      CrdtSingleton(initialData = Reference("Bar"), singletonToCopy = singleton)
    }
  }

  @Test
  fun construction_createWithData() {
    val singleton = CrdtSingleton.createWithData(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 1, "bob" to 2),
        values = mutableMapOf(
          "Data" to CrdtSet.DataValue(VersionMap("alice" to 1, "bob" to 2), Reference("Data"))
        )
      )
    )

    assertThat(singleton.consumerView).isEqualTo(Reference("Data"))
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1, "bob" to 2))
    assertThat(singleton.data.values).containsExactly(
      "Data",
      CrdtSet.DataValue(VersionMap("alice" to 1, "bob" to 2), Reference("Data"))
    )
  }

  @Test
  fun consumerView_emptySingleton() {
    val singleton = CrdtSingleton<Reference>(initialVersion = VersionMap("alice" to 5))
    assertThat(singleton.consumerView).isNull()
  }

  @Test
  fun consumerView_singleValue() {
    val singleton = CrdtSingleton(initialData = Reference("Foo"))
    assertThat(singleton.consumerView).isEqualTo(Reference("Foo"))
  }

  @Test
  fun consumerView_takesMinimumIfMultipleValuesArePresent() {
    val singleton = CrdtSingleton.createWithData(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 1, "bob" to 1, "claire" to 1),
        values = mutableMapOf(
          "bbb" to CrdtSet.DataValue(VersionMap("bob" to 1), Reference("bbb")),
          "aaa" to CrdtSet.DataValue(VersionMap("alice" to 1), Reference("aaa")),
          "ccc" to CrdtSet.DataValue(VersionMap("claire" to 1), Reference("ccc"))
        )
      )
    )

    assertThat(singleton.consumerView).isEqualTo(Reference("aaa"))
  }

  @Test
  fun update() {
    val singleton = CrdtSingleton<Reference>()

    val value = Reference("1")
    val versionMap = VersionMap("alice" to 1)
    singleton.applyOperation(Update("alice", versionMap, value))

    assertThat(singleton.consumerView).isEqualTo(value)
    assertThat(singleton.versionMap).isEqualTo(versionMap)
    assertThat(singleton.data.values).containsExactly(
      value.id, CrdtSet.DataValue(versionMap, value)
    )
  }

  @Test
  fun update_sequenceBySameActor() {
    val singleton = CrdtSingleton<Reference>()

    var versionMap = VersionMap()
    for (i in 1..3) {
      versionMap = versionMap.copy().increment("alice")
      singleton.applyOperation(Update("alice", versionMap, Reference("ref-$i")))
    }

    val expectedResult = Reference("ref-3")
    val expectedVersionMap = VersionMap("alice" to 3)

    assertThat(singleton.consumerView).isEqualTo(expectedResult)
    assertThat(singleton.versionMap).isEqualTo(expectedVersionMap)
    assertThat(singleton.data.values).containsExactly(
      expectedResult.id, CrdtSet.DataValue(expectedVersionMap, expectedResult)
    )
  }

  @Test
  fun update_sequenceByOtherActors() {
    val singleton = CrdtSingleton<Reference>()

    var versionMap = VersionMap()
    for (actor in listOf("alice", "bob", "carol")) {
      versionMap = versionMap.copy().increment(actor)
      singleton.applyOperation(Update(actor, versionMap, Reference("ref-$actor")))
    }

    val expectedResult = Reference("ref-carol")
    val expectedVersionMap = VersionMap("alice" to 1, "bob" to 1, "carol" to 1)

    assertThat(singleton.consumerView).isEqualTo(expectedResult)
    assertThat(singleton.versionMap).isEqualTo(expectedVersionMap)
    assertThat(singleton.data.values).containsExactly(
      expectedResult.id, CrdtSet.DataValue(expectedVersionMap, expectedResult)
    )
  }

  @Test
  fun update_parallelOperations_bothValuesAreKept() {
    val singleton = CrdtSingleton<Reference>()

    val one = Reference("1")
    singleton.applyOperation(Update("alice", VersionMap("alice" to 1), one))

    val two = Reference("2")
    singleton.applyOperation(Update("bob", VersionMap("bob" to 1), two))

    // Both values are kept, but "one" wins lexicographically.
    assertThat(singleton.consumerView).isEqualTo(one)
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1, "bob" to 1))
    assertThat(singleton.data.values)
      .containsExactlyEntriesIn(
        mutableMapOf(
          one.id to CrdtSet.DataValue(VersionMap("alice" to 1), one),
          two.id to CrdtSet.DataValue(VersionMap("bob" to 1), two)
        )
      )
  }

  @Test
  fun update_failsIfClockIsNotAdvanced_emptyState() {
    val singleton = CrdtSingleton<Reference>()

    assertThat(
      singleton.applyOperation(Update("alice", VersionMap(), Reference("change")))
    ).isFalse()

    assertThat(singleton.consumerView).isNull()
  }

  @Test
  fun update_failsIfClockIsNotAdvanced_nonEmptyState() {
    val singleton = CrdtSingleton<Reference>()
    singleton.applyOperation(Update("alice", VersionMap("alice" to 1), Reference("init")))

    assertThat(
      singleton.applyOperation(Update("alice", VersionMap("alice" to 1), Reference("change")))
    ).isFalse()

    assertThat(singleton.consumerView?.id).isEqualTo("init")
  }

  @Test
  fun clear_clearsValues_sameActor() {
    val singleton = CrdtSingleton(
      initialData = Reference("1"),
      initialVersion = VersionMap("alice" to 1)
    )

    assertThat(
      singleton.applyOperation(Clear("alice", VersionMap("alice" to 1)))
    ).isTrue()

    assertThat(singleton.consumerView).isNull()
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1))
  }

  @Test
  fun clear_clearsValues_otherActor() {
    val singleton = CrdtSingleton(
      initialData = Reference("1"),
      initialVersion = VersionMap("alice" to 1)
    )

    assertThat(
      singleton.applyOperation(Clear("bob", VersionMap("alice" to 1)))
    ).isTrue()

    assertThat(singleton.consumerView).isNull()
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1, "bob" to 0))
  }

  @Test
  fun clear_doesNotClearIfClockIsInThePast() {
    val singleton = CrdtSingleton(
      initialData = Reference("1"),
      initialVersion = VersionMap("alice" to 1)
    )

    assertThat(
      singleton.applyOperation(Clear("alice", VersionMap("alice" to 0)))
    ).isFalse()

    assertThat(singleton.consumerView).isEqualTo(Reference("1"))
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1))
  }

  @Test
  fun clear_succeedsWithEmptyState() {
    val singleton = CrdtSingleton<Reference>()

    assertThat(
      singleton.applyOperation(Clear("alice", VersionMap()))
    ).isTrue()

    assertThat(singleton.consumerView).isNull()
    assertThat(singleton.versionMap.isEmpty()).isTrue()
  }

  @Test
  fun clear_clearsDataInsertedBeforeTheClearOp() {
    // Singleton with 2 elements set at the same time by different actors.
    val singleton = CrdtSingleton.createWithData(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 1, "bob" to 1),
        values = mutableMapOf(
          "1" to CrdtSet.DataValue(VersionMap("alice" to 1), Reference("1")),
          "2" to CrdtSet.DataValue(VersionMap("bob" to 1), Reference("2"))
        )
      )
    )

    // Both values are held by the singleton, but reference "1" wins lexicographically.
    assertThat(singleton.consumerView).isEqualTo(Reference("1"))
    assertThat(singleton.data.values).hasSize(2)
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1, "bob" to 1))

    // Alice clears the singleton without seeing Bob's value.
    assertThat(
      singleton.applyOperation(Clear("alice", VersionMap("alice" to 1)))
    ).isFalse()

    // Reference "1" was removed by clear, reference "2" is left in the singleton.
    assertThat(singleton.consumerView).isEqualTo(Reference("2"))
    assertThat(singleton.data.values).hasSize(1)
    assertThat(singleton.versionMap).isEqualTo(VersionMap("alice" to 1, "bob" to 1))
  }

  @Test
  fun merge_subjectAheadOfTheArgument() = testMerge(
    left = CrdtSingleton(
      initialData = Reference("Ahead"),
      initialVersion = VersionMap("alice" to 3, "bob" to 2)
    ),
    right = CrdtSingleton(
      initialData = Reference("Behind"),
      initialVersion = VersionMap("alice" to 2, "bob" to 1)
    ),
    leftChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 3, "bob" to 2),
        values = mutableMapOf(
          "Ahead" to CrdtSet.DataValue(VersionMap("alice" to 3, "bob" to 2), Reference("Ahead"))
        )
      )
    ),
    rightChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 3, "bob" to 2),
        values = mutableMapOf(
          "Ahead" to CrdtSet.DataValue(VersionMap("alice" to 3, "bob" to 2), Reference("Ahead"))
        )
      )
    )
  )

  /*
   * Test merging an entity with itself produces a set of empty changes.
   */
  @Test
  fun merge_subjectandArgumentEqual() {
    val singleton = CrdtSingleton(
      initialData = Reference("Same"),
      initialVersion = VersionMap("alice" to 3, "bob" to 2)
    )

    val singletonCopy = CrdtSingleton(
      initialData = Reference("Same"),
      initialVersion = VersionMap("alice" to 3, "bob" to 2)
    )

    val result = singleton.merge(singletonCopy.data)

    assertThat(result.modelChange.isEmpty()).isTrue()
    assertThat(result.otherChange.isEmpty()).isTrue()
  }

  @Test
  fun merge_subjectBehindTheArgument() = testMerge(
    left = CrdtSingleton(
      initialData = Reference("Behind"),
      initialVersion = VersionMap("alice" to 3, "bob" to 2)
    ),
    right = CrdtSingleton(
      initialData = Reference("Ahead"),
      initialVersion = VersionMap("alice" to 4, "bob" to 3)
    ),
    leftChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 4, "bob" to 3),
        values = mutableMapOf(
          "Ahead" to CrdtSet.DataValue(VersionMap("alice" to 4, "bob" to 3), Reference("Ahead"))
        )
      )
    ),
    rightChange = CrdtChange.Operations()
  )

  @Test
  fun merge_rightAfterClear() = testMerge(
    left = CrdtSingleton(
      initialData = Reference("Data"),
      initialVersion = VersionMap("alice" to 3, "bob" to 3)
    ),
    right = CrdtSingleton(
      initialData = null,
      initialVersion = VersionMap("alice" to 3, "bob" to 3)
    ),
    leftChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 3, "bob" to 3),
        values = mutableMapOf()
      )
    ),
    rightChange = CrdtChange.Operations()
  )

  @Test
  fun merge_leftAfterClear() = testMerge(
    left = CrdtSingleton(
      initialData = null,
      initialVersion = VersionMap("alice" to 3, "bob" to 3)
    ),
    right = CrdtSingleton(
      initialData = Reference("Data"),
      initialVersion = VersionMap("alice" to 3, "bob" to 3)
    ),
    leftChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 3, "bob" to 3),
        values = mutableMapOf()
      )
    ),
    rightChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 3, "bob" to 3),
        values = mutableMapOf()
      )
    )
  )

  @Test
  fun merge_divergentSingletons() = testMerge(
    left = CrdtSingleton(
      initialData = Reference("Left"),
      initialVersion = VersionMap("alice" to 1)
    ),
    right = CrdtSingleton(
      initialData = Reference("Right"),
      initialVersion = VersionMap("bob" to 1)
    ),
    leftChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 1, "bob" to 1),
        values = mutableMapOf(
          "Left" to CrdtSet.DataValue(VersionMap("alice" to 1), Reference("Left")),
          "Right" to CrdtSet.DataValue(VersionMap("bob" to 1), Reference("Right"))
        )
      )
    ),
    rightChange = CrdtChange.Data(
      CrdtSingleton.DataImpl(
        versionMap = VersionMap("alice" to 1, "bob" to 1),
        values = mutableMapOf(
          "Left" to CrdtSet.DataValue(VersionMap("alice" to 1), Reference("Left")),
          "Right" to CrdtSet.DataValue(VersionMap("bob" to 1), Reference("Right"))
        )
      )
    )
  )

  @Test
  fun toString_producesReadableRepresentation() {
    val singleton = CrdtSingleton(
      initialData = Reference("1"),
      initialVersion = VersionMap("alice" to 1, "bob" to 2)
    )

    assertThat(singleton.toString()).isEqualTo(
      "CrdtSingleton(data=CrdtSet.Data(versionMap={alice: 1, bob: 2}, " +
        "values={1=Reference(id=1)@Version{alice: 1, bob: 2}}))"
    )
  }

  @Test
  fun equals_and_hashCode() {
    val assertEquals = {
      a: CrdtSingleton<Reference>, b: CrdtSingleton<Reference> ->
      assertThat(a).isEqualTo(b)
      assertThat(a.hashCode()).isEqualTo(b.hashCode())
    }

    assertEquals(CrdtSingleton(), CrdtSingleton())
    assertEquals(
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 1)
      ),
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 1)
      )
    )

    val assertNotEquals = {
      a: CrdtSingleton<Reference>, b: CrdtSingleton<Reference> ->
      assertThat(a).isNotEqualTo(b)
      assertThat(a.hashCode()).isNotEqualTo(b.hashCode())
    }

    assertNotEquals(
      CrdtSingleton(),
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 1)
      )
    )
    assertNotEquals(
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 1)
      ),
      CrdtSingleton(
        initialData = Reference("Bar"),
        initialVersion = VersionMap("alice" to 1)
      )
    )
    assertNotEquals(
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 1)
      ),
      CrdtSingleton(
        initialData = Reference("Foo"),
        initialVersion = VersionMap("alice" to 2)
      )
    )
  }

  @Test
  fun crdtSingletonData_isDifferentFromCrdtSetData() {
    val singleton = CrdtSingleton<Reference>()
    // Regression test for b/154181519.
    assertThat(singleton.data is CrdtSet.Data<*>).isFalse()
  }

  private data class Reference(override val id: ReferenceId) : Referencable

  private fun testMerge(
    left: CrdtSingleton<Reference>,
    right: CrdtSingleton<Reference>,
    leftChange: CrdtChange<Data<Reference>, IOperation<Reference>>,
    rightChange: CrdtChange<Data<Reference>, IOperation<Reference>>
  ) {
    val rightPreMergeCopy = CrdtSingleton(singletonToCopy = right)
    val result = left.merge(right.data)

    assertThat(result.modelChange).isEqualTo(leftChange)
    assertThat(result.otherChange).isEqualTo(rightChange)

    val leftChangeData =
      result.modelChange as CrdtChange.Data<Data<Reference>, IOperation<Reference>>

    assertThat(left.data.values).containsExactlyEntriesIn(leftChangeData.data.values)
    assertThat(left.versionMap).isEqualTo(leftChangeData.data.versionMap)
    assertThat(right).isEqualTo(rightPreMergeCopy)
  }
}
