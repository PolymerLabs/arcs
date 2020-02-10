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

package arcs.core.storage.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test

/** Tests for the [HoldQueue]. */
@ExperimentalCoroutinesApi
class HoldQueueTest {
    @Test
    fun enqueue_enqueuesSingleEntity() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions = VersionMap("alice" to 1, "bob" to 1)
        val callback = suspend { }

        holdQueue.enqueue(
            listOf("foo".toHoldQueueEntity(versions.copy())),
            callback
        )

        val expectedRecord = HoldQueue.Record(mutableMapOf("foo" to versions), callback)

        val queueData = holdQueue.queue

        assertThat(queueData.size).isEqualTo(1)
        assertThat(queueData).containsExactly("foo", listOf(expectedRecord))
        Unit
    }

    @Test
    fun enqueue_enqueuesMultipleEntities() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions = VersionMap("alice" to 1, "bob" to 2)
        val callback = suspend { }

        listOf("foo", "bar", "baz")
            .map { it.toRef() }
            .enqueueAll(holdQueue, versions.copy(), callback)

        val expectedRecords = listOf(
            HoldQueue.Record(
                mutableMapOf("foo" to versions, "bar" to versions, "baz" to versions),
                callback
            )
        )
        val queueData = holdQueue.queue

        assertThat(queueData.size).isEqualTo(3)
        assertThat(queueData).containsExactly(
            "foo",
            expectedRecords,
            "bar",
            expectedRecords,
            "baz",
            expectedRecords
        )
        Unit
    }

    @Test
    fun enqueue_appendsToExistingReferenceRecordList() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions1 = VersionMap("alice" to 1, "bob" to 2)
        val versions2 = VersionMap("alice" to 2, "bob" to 2)
        val callback = suspend { }

        holdQueue.enqueue(
            listOf("foo".toHoldQueueEntity(versions1)),
            callback
        )
        holdQueue.enqueue(
            listOf("foo".toHoldQueueEntity(versions2)),
            callback
        )

        val expectedRecords = listOf(
            HoldQueue.Record(mutableMapOf("foo" to versions1), callback),
            HoldQueue.Record(mutableMapOf("foo" to versions2), callback)
        )
        val queueData = holdQueue.queue

        assertThat(queueData).containsExactly("foo", expectedRecords)
    }

    @Test
    fun processReferenceId_callsOnRelease_forSingleEntity() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions = VersionMap("alice" to 1, "bob" to 2)
        var called = false
        val callback = suspend {
            called = true
        }

        holdQueue.enqueue(listOf("foo".toHoldQueueEntity(versions.copy())), callback)

        // Bump alice's version, so it dominates the original.
        versions["alice"]++

        holdQueue.processReferenceId("foo", versions)

        assertThat(called).isTrue()
    }

    @Test
    fun processReferenceId_doesNotCallOnRelease_forOlderVersions() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions = VersionMap("alice" to 1, "bob" to 2)
        var called = false
        val callback = suspend {
            called = true
        }

        holdQueue.enqueue(listOf("foo".toHoldQueueEntity(versions.copy())), callback)

        // Bump alice's version down, so it is dominated by the original.
        versions["alice"]--

        holdQueue.processReferenceId("foo", versions)

        assertThat(called).isFalse()
    }

    @Test
    fun processReferenceId_onlyCallsOnRelease_whenRecordIsEmpty() = runBlockingTest {
        val holdQueue = HoldQueue()
        val versions = VersionMap("alice" to 1, "bob" to 2)
        var called = false
        val callback = suspend {
            called = true
        }

        holdQueue.enqueue(
            listOf(
                "foo".toHoldQueueEntity(versions.copy()),
                "bar".toHoldQueueEntity(versions.copy())
            ),
            callback
        )

        // Bump alices version up, so it dominates the original
        versions["alice"]++

        // Process "foo", but because the records aren't empty after this, the callback shouldn't fire.
        // Also, foo's record list should be gone now.
        holdQueue.processReferenceId("foo", versions)
        assertThat(called).isFalse()
        assertThat(holdQueue.queue).doesNotContainKey("foo")

        // Process "bar". This should mean bar's record's id collection is empty and the callback is
        // called.
        holdQueue.processReferenceId("bar", versions)
        assertThat(called).isTrue()
        assertThat(holdQueue.queue).isEmpty()
    }

    private data class Reference(override val id: ReferenceId) : Referencable

    private fun String.toRef(): Reference = Reference(this)
    private fun String.toHoldQueueEntity(versions: VersionMap): HoldQueue.Entity =
        toRef().toHoldQueueEntity(versions)
}
