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
import arcs.core.crdt.CrdtSingleton.Data
import arcs.core.crdt.CrdtSingleton.IOperation
import arcs.core.crdt.CrdtSingleton.Operation.Clear
import arcs.core.crdt.CrdtSingleton.Operation.Update
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CrdtSingleton]. */
@RunWith(JUnit4::class)
class CrdtSingletonTest {
    private lateinit var alice: CrdtSingleton<Reference>
    private lateinit var bob: CrdtSingleton<Reference>

    @Before
    fun setup() {
        alice = CrdtSingleton()
        bob = CrdtSingleton()
    }

    @Test
    fun startsWithNullConsumerView() {
        assertThat(alice.consumerView).isNull()
    }

    @Test
    fun set_fromSingleActor() {
        val one = Reference("1")
        val two = Reference("2")
        val three = Reference("3")

        alice.applyOperation(Update("alice", VersionMap("alice" to 1), one))
        assertThat(alice.consumerView).isEqualTo(one)

        alice.applyOperation(Update("alice", VersionMap("alice" to 2), two))
        assertThat(alice.consumerView).isEqualTo(two)

        // Update requires a version increment, so this should not work.
        assertThat(
            alice.applyOperation(Update("alice", VersionMap("alice" to 2), three))
        ).isFalse()
        assertThat(alice.consumerView).isEqualTo(two)
    }

    @Test
    fun clear_clearsValues() {
        val one = Reference("1")
        alice.applyOperation(Update("alice", VersionMap("alice" to 1), one))

        // Clear requires the same version number, so this does not really clear it.
        alice.applyOperation(Clear("alice", VersionMap("alice" to 0)))
        assertThat(alice.consumerView).isEqualTo(one)

        // Up-to-date version number, does clear it.
        assertThat(
            alice.applyOperation(Clear("alice", VersionMap("alice" to 1)))
        ).isTrue()
        assertThat(alice.consumerView).isNull()
    }

    @Test
    fun multipleActors_setAndClear() {
        val one = Reference("1")
        val two = Reference("2")

        alice.applyOperation(Update("alice", VersionMap("alice" to 1), one))
        assertThat(alice.data.values)
            .containsExactlyEntriesIn(
                mutableMapOf("1" to CrdtSet.DataValue(VersionMap("alice" to 1), one))
            )
        assertThat(alice.consumerView).isEqualTo(one)

        // Another actor concurrently sets a value, both values will be kept.
        alice.applyOperation(Update("bob", VersionMap("bob" to 1), two))
        assertThat(alice.data.values)
            .containsExactlyEntriesIn(
                mutableMapOf(
                    "1" to CrdtSet.DataValue(VersionMap("alice" to 1), one),
                    "2" to CrdtSet.DataValue(VersionMap("bob" to 1), two)
                )
            )
        assertThat(alice.consumerView).isEqualTo(one)

        // Bob setting a new value after also seeing A's value, old value is removed.
        alice.applyOperation(Update("bob", VersionMap("alice" to 1, "bob" to 2), two))
        assertThat(alice.data.values)
            .containsExactlyEntriesIn(
                mutableMapOf("2" to CrdtSet.DataValue(VersionMap("alice" to 1, "bob" to 2), two))
            )
        assertThat(alice.consumerView).isEqualTo(two)

        alice.applyOperation(Clear("alice", VersionMap("alice" to 1, "bob" to 2)))
        assertThat(alice.data.values).isEmpty()
        assertThat(alice.consumerView).isNull()
    }

    @Test
    fun merge_mergesTwoSingletons() {
        val one = Reference("1")
        val two = Reference("2")

        alice.applyOperation(Update("alice", VersionMap("alice" to 1), one))
        bob.applyOperation(Update("bob", VersionMap("bob" to 1), two))

        val result = alice.merge(bob.data)
        val aliceModel = requireNotNull(
            result.modelChange as? CrdtChange.Data<Data<Reference>, IOperation<Reference>>
        )
        val bobModel = requireNotNull(
            result.otherChange as? CrdtChange.Data<Data<Reference>, IOperation<Reference>>
        )
        val expectedVersion = VersionMap("alice" to 1, "bob" to 1)
        val expectedValues = mapOf(
            one.id to CrdtSet.DataValue(VersionMap("alice" to 1), one),
            two.id to CrdtSet.DataValue(VersionMap("bob" to 1), two)
        )

        assertThat(aliceModel.data.versionMap).isEqualTo(expectedVersion)
        assertThat(aliceModel.data.values).containsExactlyEntriesIn(expectedValues)
        assertThat(bobModel.data.versionMap).isEqualTo(expectedVersion)
        assertThat(bobModel.data.values).containsExactlyEntriesIn(expectedValues)

        // Even though "2" is also in the set, "1" is returned because of sorting by reference id.
        assertThat(alice.consumerView).isEqualTo(one)

        // We can now clear with the updated version.
        assertThat(
            alice.applyOperation(Clear("alice", expectedVersion))
        ).isTrue()
        assertThat(alice.consumerView).isNull()
    }

    private data class Reference(override val id: ReferenceId) : Referencable
}
