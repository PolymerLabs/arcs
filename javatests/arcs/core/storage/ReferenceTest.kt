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

package arcs.core.storage

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.UNINITIALIZED_TIMESTAMP
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

typealias CollectionStore<T> = ActiveStore<CrdtSet.Data<T>, CrdtSet.Operation<T>, Set<T>>

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class ReferenceTest {
    @get:Rule
    val log = LogRule()
    private val collectionKey = RamDiskStorageKey("friends")
    private val backingKey = RamDiskStorageKey("people")
    private val dereferencer = RawEntityDereferencer(Person.SCHEMA)

    @Test
    fun dereference() = runBlocking {
        RamDiskDriverProvider()
        val refModeKey = ReferenceModeStorageKey(backingKey, collectionKey)
        val options =
            StoreOptions(
                storageKey = refModeKey,
                type = CollectionType(EntityType(Person.SCHEMA))
            )
        val store: CollectionStore<RawEntity> = DefaultActivationFactory(options)

        val addPeople = listOf(
            CrdtSet.Operation.Add(
                "bob",
                VersionMap("bob" to 1),
                Person("Sundar", 51).toRawEntity()
            ),
            CrdtSet.Operation.Add(
                "bob",
                VersionMap("bob" to 2),
                Person("Jason", 35).toRawEntity()
            ),
            CrdtSet.Operation.Add(
                "bob",
                VersionMap("bob" to 3),
                Person("Watson", 6).toRawEntity()
            )
        )
        assertThat(store.onProxyMessage(ProxyMessage.Operations(addPeople, 1))).isTrue()

        log("Setting up direct store to collection of references")
        val collectionOptions =
            StoreOptions(
                storageKey = collectionKey,
                type = CollectionType(ReferenceType(EntityType(Person.SCHEMA)))
            )

        @Suppress("UNCHECKED_CAST")
        val directCollection: CollectionStore<Reference> = DefaultActivationFactory(collectionOptions)

        val job = Job()
        val me = directCollection.on(ProxyCallback {
            if (it is ProxyMessage.ModelUpdate<*, *, *>) job.complete()
        })
        assertThat(directCollection.onProxyMessage(ProxyMessage.SyncRequest(me)))
            .isTrue()
        directCollection.idle()
        job.join()

        val collectionItems = (directCollection as DirectStore).getLocalData()
        assertThat(collectionItems.values).hasSize(3)

        val expectedPeople = listOf(
            Person("Sundar", 51),
            Person("Jason", 35),
            Person("Watson", 6)
        ).associateBy { it.hashCode().toString() }

        collectionItems.values.values.forEach {
            val ref = it.value
            ref.dereferencer = dereferencer
            val expectedPerson = expectedPeople[ref.id] ?: error("Bad reference: $ref")
            val dereferenced = ref.dereference()
            val actualPerson = requireNotNull(dereferenced).toPerson()

            assertThat(actualPerson).isEqualTo(expectedPerson)
        }
    }

    @Test
    fun ensureTimestampsAreSet() {
        val ref = Reference("reference_id", backingKey, null)
        assertThat(ref.creationTimestamp).isEqualTo(UNINITIALIZED_TIMESTAMP)
        assertThat(ref.expirationTimestamp).isEqualTo(UNINITIALIZED_TIMESTAMP)

        ref.ensureTimestampsAreSet(FakeTime(10), Ttl.Minutes(1))
        assertThat(ref.creationTimestamp).isEqualTo(10)
        assertThat(ref.expirationTimestamp).isEqualTo(60010)

        // Calling again doesn't change the value.
        ref.ensureTimestampsAreSet(FakeTime(20), Ttl.Minutes(2))
        assertThat(ref.creationTimestamp).isEqualTo(10)
        assertThat(ref.expirationTimestamp).isEqualTo(60010)
    }

    private data class Person(
        val name: String,
        val age: Int
    ) {
        fun toRawEntity(): RawEntity = RawEntity(
            id = "${hashCode()}",
            singletons = mapOf(
                "name" to name.toReferencable(),
                "age" to age.toDouble().toReferencable()
            ),
            collections = emptyMap()
        )

        companion object {
            val SCHEMA = Schema(
                emptySet(),
                SchemaFields(
                    singletons = mapOf(
                        "name" to FieldType.Text,
                        "age" to FieldType.Number
                    ),
                    collections = emptyMap()
                ),
                "abcdef"
            )
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun RawEntity.toPerson() = Person(
        name = requireNotNull(singletons["name"] as? ReferencablePrimitive<String>).value,
        age = requireNotNull(singletons["age"] as? ReferencablePrimitive<Double>).value.toInt()
    )
}
