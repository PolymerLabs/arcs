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

package arcs.core.crdt

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Data
import arcs.core.crdt.CrdtSet.IOperation
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtSet]. */
@RunWith(JUnit4::class)
class CrdtSetTest {
    private lateinit var alice: CrdtSet<Reference>
    private lateinit var bob: CrdtSet<Reference>

    @Before
    fun setUp() {
        alice = CrdtSet()
        bob = CrdtSet()
    }

    @Test
    fun startsEmpty() {
        assertThat(alice.consumerView).isEmpty()
    }

    @Test
    fun supportsAddingTwoDifferentItems_fromSameActor() {
        alice.add("alice", VersionMap("alice" to 1), "one")
        assertThat(
            alice.applyOperation(
                Add("alice", VersionMap("alice" to 2), "two")
            )
        ).isTrue()
        assertThat(alice.consumerView).containsExactly(Reference("one"), Reference("two"))
    }

    @Test
    fun supportsAddingSameValue_fromDifferentActors() {
        alice.add("alice", VersionMap("alice" to 1), "one")
        alice.add("bob", VersionMap("bob" to 1), "one")

        assertThat(alice.consumerView).containsExactly(Reference("one"))
    }

    @Test
    fun rejectsAdds_notInSequence() {
        alice.add("alice", VersionMap("alice" to 1), "one")

        assertThat(
            alice.applyOperation(
                Add("alice", VersionMap("alice" to 0), "two")
            )
        ).isFalse()
        assertThat(
            alice.applyOperation(
                Add("alice", VersionMap("alice" to 1), "two")
            )
        ).isFalse()
        assertThat(
            alice.applyOperation(
                Add("alice", VersionMap("alice" to 3), "two")
            )
        ).isFalse()
    }

    @Test
    fun remove_removesAnItem() {
        alice.add("alice", VersionMap("alice" to 1), "one")

        assertThat(
            alice.applyOperation(
                Remove("alice", VersionMap("alice" to 1), "one")
            )
        ).isTrue()
        assertThat(alice.consumerView).isEmpty()
    }

    @Test
    fun removeIsRejected_ifVersionMismatch() {
        alice.add("alice", VersionMap("alice" to 1), "one")

        assertThat(
            alice.applyOperation(
                Remove("alice", VersionMap("alice" to 2), "one")
            )
        ).isFalse()
        assertThat(
            alice.applyOperation(
                Remove("alice", VersionMap("alice" to 0), "one")
            )
        ).isFalse()
    }

    @Test
    fun removeIsRejected_ifItemNotInSet() {
        alice.add("alice", VersionMap("alice" to 1), "one")

        assertThat(
            alice.applyOperation(
                Remove("alice", VersionMap("alice" to 1), "two")
            )
        ).isFalse()
    }

    @Test
    fun removeIsRejected_ifVersionIsTooOld() {
        alice.add("alice", VersionMap("alice" to 1), "one")
        alice.add("bob", VersionMap("bob" to 1), "two")

        assertThat(
            alice.applyOperation(
                Remove("charlie", VersionMap("alice" to 1), "one")
            )
        ).isTrue()
        assertThat(
            alice.applyOperation(
                Remove("charlie", VersionMap("alice" to 1), "two")
            )
        ).isFalse()
    }

    @Test
    fun merge_canMergeTwoModels() {
        listOf(
            Add("charlie", VersionMap("charlie" to 1), "kept by both"),
            Add("charlie", VersionMap("charlie" to 2), "removed by alice"),
            Add("charlie", VersionMap("charlie" to 3), "removed by bob"),
            Add("charlie", VersionMap("charlie" to 4), "removed by alice added by bob"),
            Add("charlie", VersionMap("charlie" to 5), "removed by bob added by alice")
        ).forEach {
            assertThat(alice.applyOperation(it)).isTrue()
            assertThat(bob.applyOperation(it)).isTrue()
        }

        listOf(
            Remove("alice", VersionMap("alice" to 0, "charlie" to 5), "removed by alice"),
            Add("alice", VersionMap("alice" to 1, "charlie" to 5), "added by alice"),
            Add("alice", VersionMap("alice" to 2, "charlie" to 5), "added by both"),
            Add("alice", VersionMap("alice" to 3, "charlie" to 5), "removed by bob added by alice"),
            Remove(
                "alice", VersionMap("alice" to 3, "charlie" to 5), "removed by alice added by bob"
            )
        ).forEach { assertWithMessage("Alice: $it").that(alice.applyOperation(it)).isTrue() }

        listOf(
            Add("bob", VersionMap("bob" to 1, "charlie" to 5), "added by both"),
            Add("bob", VersionMap("bob" to 2, "charlie" to 5), "added by bob"),
            Remove("bob", VersionMap("bob" to 2, "charlie" to 5), "removed by bob"),
            Remove("bob", VersionMap("bob" to 2, "charlie" to 5), "removed by bob added by alice"),
            Add("bob", VersionMap("bob" to 3, "charlie" to 5), "removed by alice added by bob")
        ).forEach { assertWithMessage("Bob: $it").that(bob.applyOperation(it)).isTrue() }

        val changes = alice.merge(bob.data)
        val expectedVersion = VersionMap(
            "alice" to 3,
            "bob" to 3,
            "charlie" to 5
        )

        val modelChange =
            requireNotNull(
                changes.modelChange
                    as? CrdtChange.Data<Data<Reference>, IOperation<Reference>>
            )
        val otherChange =
            requireNotNull(
                changes.otherChange
                    as? CrdtChange.Operations<Data<Reference>, IOperation<Reference>>
            )

        assertThat(modelChange.data.versionMap).isEqualTo(expectedVersion)
        assertThat(modelChange.data.values)
            .containsExactlyEntriesIn(
                mapOf(
                    "kept by both" to
                        CrdtSet.DataValue(VersionMap("charlie" to 1), Reference("kept by both")),
                    "removed by alice added by bob" to
                        CrdtSet.DataValue(
                            VersionMap("bob" to 3, "charlie" to 5),
                            Reference("removed by alice added by bob")
                        ),
                    "removed by bob added by alice" to
                        CrdtSet.DataValue(
                            VersionMap("alice" to 3, "charlie" to 5),
                            Reference("removed by bob added by alice")
                        ),
                    "added by alice" to
                        CrdtSet.DataValue(
                            VersionMap("alice" to 1, "charlie" to 5), Reference("added by alice")
                        ),
                    "added by bob" to
                        CrdtSet.DataValue(
                            VersionMap("bob" to 2, "charlie" to 5), Reference("added by bob")
                        ),
                    "added by both" to
                        CrdtSet.DataValue(
                            VersionMap("alice" to 2, "bob" to 1, "charlie" to 5),
                            Reference("added by both")
                        )
                )
            )

        assertThat(otherChange.size).isEqualTo(1)
        val fastForward =
            requireNotNull(otherChange[0] as? CrdtSet.Operation.FastForward<Reference>)
        assertThat(fastForward.added)
            .containsExactly(
                CrdtSet.DataValue(
                    VersionMap("alice" to 2, "bob" to 1, "charlie" to 5), Reference("added by both")
                ),
                CrdtSet.DataValue(
                    VersionMap("alice" to 3, "charlie" to 5),
                    Reference("removed by bob added by alice")
                ),
                CrdtSet.DataValue(
                    VersionMap("alice" to 1, "charlie" to 5), Reference("added by alice")
                )
            )
        assertThat(fastForward.removed)
            .containsExactly(Reference("removed by alice"))
        assertThat(fastForward.oldClock).isEqualTo(VersionMap("bob" to 3, "charlie" to 5))
        assertThat(fastForward.newClock).isEqualTo(expectedVersion)

        assertThat(bob.applyOperation(fastForward)).isTrue()

        assertThat(alice.data.versionMap).isEqualTo(bob.data.versionMap)
        assertThat(alice.data.values).containsExactlyEntriesIn(bob.data.values)
    }

    @Test
    fun fastForward_canSimplifySingleActorAddOps() {
        listOf(
            Add("alice", VersionMap("alice" to 1), "zero"),
            Add("bob", VersionMap("bob" to 1), "one")
        ).forEach {
            assertThat(alice.applyOperation(it)).isTrue()
            assertThat(bob.applyOperation(it)).isTrue()
        }

        val expectedAdds = listOf(
            Add("bob", VersionMap("alice" to 1, "bob" to 2), "two"),
            Add("bob", VersionMap("alice" to 1, "bob" to 3), "three"),
            Add("bob", VersionMap("alice" to 1, "bob" to 4), "four"),
            Add("bob", VersionMap("alice" to 1, "bob" to 5), "five")
        ).onEach { assertThat(bob.applyOperation(it)).isTrue() }

        val (_, otherChange) = bob.merge(alice.data)

        val operations = requireNotNull(
            otherChange as? CrdtChange.Operations<Data<Reference>, IOperation<Reference>>
        )

        assertThat(operations.ops).containsExactlyElementsIn(expectedAdds)
    }

    @Test
    fun fastForwardRejected_whenItBeginsInTheFuture() {
        assertThat(
            alice.applyOperation(
                CrdtSet.Operation.FastForward(
                    oldClock = VersionMap("alice" to 5),
                    newClock = VersionMap("alice" to 10)
                )
            )
        ).isFalse()
    }

    @Test
    fun fastForwardNoOps_whenItEndsInThePast() {
        listOf(
            Add("alice", VersionMap("alice" to 1), "one"),
            Add("alice", VersionMap("alice" to 2), "two"),
            Add("alice", VersionMap("alice" to 3), "three")
        ).forEach { assertThat(alice.applyOperation(it)).isTrue() }

        assertThat(
            alice.applyOperation(
                CrdtSet.Operation.FastForward(
                    oldClock = VersionMap("alice" to 1),
                    newClock = VersionMap("bob" to 2),
                    added = mutableListOf(
                        CrdtSet.DataValue(VersionMap("alice" to 2), Reference("four"))
                    )
                )
            )
        ).isTrue()
        assertThat(alice.data.values).doesNotContainKey("four")
    }

    @Test
    fun fastForward_advancesTheClock() {
        listOf(
            Add("alice", VersionMap("alice" to 1), "one"),
            Add("alice", VersionMap("alice" to 2), "two"),
            Add("bob", VersionMap("bob" to 1), "three"),
            Add("charlie", VersionMap("charlie" to 1), "four")
        ).forEach { assertThat(alice.applyOperation(it)).isTrue() }

        assertThat(alice.data.versionMap)
            .isEqualTo(VersionMap("alice" to 2, "bob" to 1, "charlie" to 1))

        assertThat(
            alice.applyOperation(
                CrdtSet.Operation.FastForward(
                    oldClock = VersionMap("alice" to 2, "bob" to 1),
                    newClock = VersionMap("alice" to 27, "bob" to 45)
                )
            )
        ).isTrue()

        assertThat(alice.data.versionMap)
            .isEqualTo(VersionMap("alice" to 27, "bob" to 45, "charlie" to 1))
    }

    @Test
    fun fastForward_canAddElements() {
        listOf(
            Add("alice", VersionMap("alice" to 1), "one"),
            Add("bob", VersionMap("bob" to 1), "two")
        ).forEach { assertThat(alice.applyOperation(it)).isTrue() }

        // Do some fast-forwarding.
        assertThat(
            alice.applyOperation(
                CrdtSet.Operation.FastForward(
                    oldClock = VersionMap("alice" to 1, "bob" to 1),
                    newClock = VersionMap("alice" to 1, "bob" to 9),
                    added = mutableListOf(
                        CrdtSet.DataValue(VersionMap("alice" to 1, "bob" to 7), Reference("one")),
                        CrdtSet.DataValue(VersionMap("alice" to 1, "bob" to 9), Reference("four"))
                    )
                )
            )
        ).isTrue()

        // Now a couple of additional operations after the fast-forward.
        listOf(
            Remove("alice", VersionMap("alice" to 1, "bob" to 1), "two"),
            Add("alice", VersionMap("alice" to 2, "bob" to 1), "three")
        ).forEach { assertThat(alice.applyOperation(it)).isTrue() }

        // One should be merged with the new version, two was removed and shouldn't be added back again,
        // three was existing and shouldn't be deleted, and four is new.
        assertThat(alice.data.versionMap).isEqualTo(VersionMap("alice" to 2, "bob" to 9))
        assertThat(alice.data.values)
            .containsExactlyEntriesIn(
                mapOf(
                    // Merged
                    "one" to CrdtSet.DataValue(
                        VersionMap("alice" to 1, "bob" to 7), Reference("one")
                    ),
                    // Existing
                    "three" to CrdtSet.DataValue(
                        VersionMap("alice" to 2, "bob" to 1), Reference("three")
                    ),
                    // Added
                    "four" to CrdtSet.DataValue(
                        VersionMap("alice" to 1, "bob" to 9), Reference("four")
                    )
                )
            )
    }

    @Test
    fun fastForward_canRemoveElements() {
        listOf(
            Add("alice", VersionMap("alice" to 1), "one"),
            Add("alice", VersionMap("alice" to 2), "two"),
            Add("bob", VersionMap("bob" to 1), "three")
        ).forEach { assertThat(alice.applyOperation(it)).isTrue() }

        assertThat(
            alice.applyOperation(
                CrdtSet.Operation.FastForward(
                    oldClock = VersionMap("alice" to 1, "bob" to 1),
                    newClock = VersionMap("alice" to 1, "bob" to 5),
                    removed = mutableListOf(
                        Reference("one"),
                        Reference("two")
                    )
                )
            )
        ).isTrue()

        assertThat(alice.data.values).containsKey("two")
        assertThat(alice.data.values).containsKey("three")
        assertThat(alice.data.versionMap).isEqualTo(VersionMap("alice" to 2, "bob" to 5))
    }

    @Test
    fun fastForward_simplifiesSingleAddOp_fromASingleActor() {
        val simplified = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 1, "bob" to 1),
            newClock = VersionMap("alice" to 2, "bob" to 1),
            added = mutableListOf(
                CrdtSet.DataValue(VersionMap("alice" to 2, "bob" to 1), Reference("one"))
            )
        ).simplify()

        assertThat(simplified)
            .containsExactly(Add("alice", VersionMap("alice" to 2, "bob" to 1), "one"))
    }

    @Test
    fun fastForward_simplifiesMultipleAddOps_fromASingleActor() {
        val simplified = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 1, "bob" to 1),
            newClock = VersionMap("alice" to 3, "bob" to 1),
            added = mutableListOf(
                CrdtSet.DataValue(VersionMap("alice" to 3, "bob" to 1), Reference("two")),
                CrdtSet.DataValue(VersionMap("alice" to 2, "bob" to 1), Reference("one"))
            )
        ).simplify()

        assertThat(simplified)
            .containsExactly(
                Add("alice", VersionMap("alice" to 2, "bob" to 1), "one"),
                Add("alice", VersionMap("alice" to 3, "bob" to 1), "two")
            )
    }

    @Test
    fun fastForward_doesntSimplify_removeOps() {
        val ff = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 1),
            newClock = VersionMap("alice" to 1),
            removed = mutableListOf(
                Reference("one")
            )
        )

        assertThat(ff.simplify()).isEqualTo(listOf(ff))
    }

    @Test
    fun fastForward_doesntSimplify_pureVersionBumps() {
        val ff = CrdtSet.Operation.FastForward<Reference>(
            oldClock = VersionMap("alice" to 1),
            newClock = VersionMap("alice" to 5)
        )

        assertThat(ff.simplify()).isEqualTo(listOf(ff))
    }

    @Test
    fun fastForward_doesntSimplify_addOpsFromSingleActor_withVersionJumps() {
        val ff = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 0),
            newClock = VersionMap("alice" to 4),
            added = mutableListOf(
                CrdtSet.DataValue(VersionMap("alice" to 1), Reference("one")),
                CrdtSet.DataValue(VersionMap("alice" to 2), Reference("two")),
                CrdtSet.DataValue(VersionMap("alice" to 4), Reference("four"))
            )
        )

        assertThat(ff.simplify()).isEqualTo(listOf(ff))
    }

    @Test
    fun fastForward_doesntSimplify_addOpsFromMultipleActors() {
        val ff = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 1, "bob" to 1),
            newClock = VersionMap("alice" to 2, "bob" to 2),
            added = mutableListOf(
                CrdtSet.DataValue(VersionMap("alice" to 2), Reference("one")),
                CrdtSet.DataValue(VersionMap("bob" to 2), Reference("two"))
            )
        )

        assertThat(ff.simplify()).isEqualTo(listOf(ff))
    }

    @Test
    fun fastForward_doesntSimplify_addOps_whenNewClockIsAJump() {
        val ff = CrdtSet.Operation.FastForward(
            oldClock = VersionMap("alice" to 1),
            newClock = VersionMap("alice" to 3),
            added = mutableListOf(
                CrdtSet.DataValue(VersionMap("alice" to 2), Reference("one"))
            )
        )

        assertThat(ff.simplify()).isEqualTo(listOf(ff))
    }

    @Test
    fun returnsEmptyChange_whenMergingIdenticalModels() {
        // Both alice and bob are empty.
        val (modelChange1, otherChange1) = alice.merge(bob.data)

        assertThat(modelChange1.isEmpty()).isTrue()
        assertThat(otherChange1.isEmpty()).isTrue()

        // Both alice and bob will have the same data.
        alice.add("a", VersionMap("a" to 1), "foo")
        alice.add("b", VersionMap("a" to 1, "b" to 1), "bar")
        bob.merge(alice.data)

        val (modelChange2, otherChange2) = alice.merge(bob.data)
        assertThat(modelChange2.isEmpty()).isTrue()
        assertThat(otherChange2.isEmpty()).isTrue()

        val charlie = CrdtSet<Reference>()
        charlie.add("c", VersionMap("c" to 1), "baz")
        val (modelChange3, otherChange3) = alice.merge(charlie.data)

        assertThat(modelChange3.isEmpty()).isFalse()
        assertThat(otherChange3.isEmpty()).isFalse()
    }

    private data class Reference(override val id: ReferenceId) : Referencable

    /** Pseudo-constructor for [CrdtSet.Operation.Add]. */
    private fun Add(actor: Actor, versions: VersionMap, id: ReferenceId) =
        CrdtSet.Operation.Add(actor, versions, Reference(id))

    /** Pseudo-constructor for [CrdtSet.Operation.Remove]. */
    private fun Remove(actor: Actor, versions: VersionMap, id: ReferenceId) =
        CrdtSet.Operation.Remove(actor, versions, Reference(id))

    private fun CrdtSet<Reference>.add(
        actor: Actor,
        versions: VersionMap,
        id: ReferenceId
    ) = Add(actor, versions, id).also { applyOperation(it) }
}
