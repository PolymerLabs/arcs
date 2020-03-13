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

package arcs.core.storage.handle

import arcs.core.crdt.CrdtSet
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.Ttl
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias EntityCollectionData = CrdtSet.Data<RawEntity>
private typealias EntityCollectionOp = CrdtSet.IOperation<RawEntity>
private typealias EntityCollectionView = Set<RawEntity>

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class CollectionIntegrationTest {
    @get:Rule
    val logRule = LogRule()

    private lateinit var testStore: Store<EntityCollectionData, EntityCollectionOp, EntityCollectionView>
    private lateinit var storageProxy:
        StorageProxy<EntityCollectionData, EntityCollectionOp, EntityCollectionView>
    private lateinit var collectionA: CollectionHandle<RawEntity>
    private lateinit var collectionB: CollectionHandle<RawEntity>

    @Before
    fun setUp() = runBlocking {
        RamDiskDriverProvider()

        testStore = Store(STORE_OPTIONS)
        storageProxy = StorageProxy(testStore.activate(), CrdtSet<RawEntity>())

        collectionA = CollectionHandle("collectionA", storageProxy, null, Ttl.Infinite, TimeImpl(), schema = SCHEMA_A)
        storageProxy.registerHandle(collectionA)
        collectionB = CollectionHandle("collectionB", storageProxy, null, Ttl.Infinite, TimeImpl(), schema = SCHEMA_B)
        storageProxy.registerHandle(collectionB)
        Unit
    }

    @After
    fun tearDown() {
        RamDisk.clear()
        CapabilitiesResolver.reset()
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(collectionA.fetchAll()).isEmpty()
        assertThat(collectionB.fetchAll()).isEmpty()
    }

    @Test
    fun addingElementToA_showsUpInB() = runBlockingTest {
        val person = Person("Miles", 55.0, true)

        assertThat(collectionA.store(person.toRawEntity())).isTrue()
        assertThat(collectionA.fetchAll()).containsExactly(person.toRawEntity())
        assertThat(collectionB.fetchAll()).containsExactly(person.toRawEntity())
    }

    @Test
    fun addingElementsToA_showsUpInQueryOnB() = runBlockingTest {
        val miles = Person("Miles", 55.0, true, emptySet())
        val jason = Person("Jason", 35.0, false, setOf("Watson"))

        collectionA.store(miles.toRawEntity())
        collectionA.store(jason.toRawEntity())

        assertThat(collectionA.fetchAll()).containsExactly(miles.toRawEntity(), jason.toRawEntity())
        // Ensure that the query argument is being used.
        assertThat(collectionB.query(55.0)).containsExactly(miles.toRawEntity())
        assertThat(collectionB.query(35.0)).containsExactly(jason.toRawEntity())

        // Ensure that an empty set of results can be returned.
        assertThat(collectionB.query(60.0)).containsExactly()
    }

    @Test
    fun dataConsideredInvalidByRefinementThrows() = runBlockingTest {
        val miles = Person("Miles", 55.0, true, emptySet())
        val jason = Person("Jason", 35.0, false, setOf("Watson"))
        val timeTraveler = Person("the Doctor", -900.0, false, setOf("Watson"))

        collectionA.store(miles.toRawEntity())
        collectionA.store(jason.toRawEntity())

        assertThat(collectionA.fetchAll()).containsExactly(miles.toRawEntity(), jason.toRawEntity())

        assertSuspendingThrows(IllegalArgumentException::class) {
            collectionA.store(timeTraveler.toRawEntity())
        }
    }

    @Test
    fun queryingWithoutAQueryThrows() = runBlockingTest {
        val miles = Person("Miles", 55.0, true, emptySet())
        val jason = Person("Jason", 35.0, false, setOf("Watson"))

        collectionA.store(miles.toRawEntity())
        collectionA.store(jason.toRawEntity())

        assertThat(collectionA.fetchAll()).containsExactly(miles.toRawEntity(), jason.toRawEntity())
        assertSuspendingThrows(IllegalArgumentException::class) {
            collectionA.query(Unit)
        }
    }

    @Test
    fun removingElementFromA_isRemovedFromB() = runBlockingTest {
        val miles = Person("Miles", 55.0, true, emptySet())
        val jason = Person("Jason", 35.0, false, setOf("Watson"))

        collectionA.store(miles.toRawEntity())
        collectionB.store(jason.toRawEntity())

        assertThat(collectionA.fetchAll()).containsExactly(miles.toRawEntity(), jason.toRawEntity())
        assertThat(collectionB.fetchAll()).containsExactly(miles.toRawEntity(), jason.toRawEntity())

        assertThat(collectionA.remove(jason.toRawEntity())).isTrue()
        // duplicate remove fails
        assertThat(collectionA.remove(jason.toRawEntity())).isFalse()
        assertThat(collectionA.fetchAll()).containsExactly(miles.toRawEntity())
        assertThat(collectionB.fetchAll()).containsExactly(miles.toRawEntity())
    }

    @Test
    fun clearingElementsFromA_clearsThemFromB() = runBlockingTest {
        collectionA.store(Person("a", 1.0, true, setOf("a")).toRawEntity())
        collectionA.store(Person("b", 2.0, false, emptySet()).toRawEntity())
        collectionA.store(Person("c", 3.0, true).toRawEntity())
        collectionA.store(Person("d", 4.0, false, setOf("d")).toRawEntity())
        collectionA.store(Person("e", 5.0, true).toRawEntity())
        collectionA.store(Person("f", 6.0, false).toRawEntity())
        collectionA.store(Person("g", 7.0, true).toRawEntity())

        assertThat(collectionB.fetchAll()).hasSize(7)

        collectionA.clear()
        assertThat(collectionA.fetchAll()).isEmpty()
        assertThat(collectionB.fetchAll()).isEmpty()
    }

    @Test
    fun addElementsWithTtls() = runBlockingTest {
        val person = Person("John", 29.0, false)
        collectionA.store(person.toRawEntity())
        val creationTimestampA = collectionA.fetchAll().first().creationTimestamp
        assertThat(creationTimestampA).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(collectionA.fetchAll().first().expirationTimestamp)
            .isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)

        val collectionC = CollectionHandle("collectionC", storageProxy, null, Ttl.Days(2), TimeImpl(), schema = SCHEMA_A)
        storageProxy.registerHandle(collectionC)
        assertThat(collectionC.store(person.toRawEntity())).isTrue()
        val entityC = collectionC.fetchAll().first()
        assertThat(entityC.creationTimestamp).isGreaterThan(creationTimestampA)
        assertThat(entityC.expirationTimestamp).isGreaterThan(RawEntity.UNINITIALIZED_TIMESTAMP)

        val collectionD = CollectionHandle("collectionD", storageProxy, null, Ttl.Minutes(1), TimeImpl(), schema = SCHEMA_B)
        storageProxy.registerHandle(collectionD)
        assertThat(collectionD.store(person.toRawEntity())).isTrue()
        val entityD = collectionD.fetchAll().first()
        assertThat(entityD.creationTimestamp).isGreaterThan(creationTimestampA)
        assertThat(entityD.creationTimestamp).isGreaterThan(entityC.creationTimestamp)
        assertThat(entityD.expirationTimestamp).isGreaterThan(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(entityC.expirationTimestamp).isGreaterThan(entityD.expirationTimestamp)
    }

    private data class Person(
        val name: String,
        val age: Double,
        val isCool: Boolean,
        val pets: Set<String> = setOf("Fido")
    ) {
        fun toRawEntity(): RawEntity = RawEntity(
            hashCode().toString(),
            singletons = mapOf(
                "name" to name.toReferencable(),
                "age" to age.toReferencable(),
                "is_cool" to isCool.toReferencable()
            ),
            collections = mapOf(
                "pets" to pets.map { it.toReferencable() }.toSet()
            )
        )
    }

    companion object {
        private val STORAGE_KEY = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("entities"),
            storageKey = RamDiskStorageKey("entity_collection")
        )

        private val refinementAgeGtZero = { value: RawEntity ->
            (value.singletons["age"] as ReferencablePrimitive<Double>?)!!.value > 0
        }
        private val queryByAge = { value: RawEntity, args: Any ->
            value.singletons["age"] == (args as Double).toReferencable()
        }

        private val SCHEMA_A = Schema(
            listOf(SchemaName("Person")),
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "age" to FieldType.Number,
                    "is_cool" to FieldType.Boolean
                ),
                collections = mapOf(
                    "pets" to FieldType.Text
                )
            ),
            "1234acf",
            refinement = refinementAgeGtZero
        )

        private val SCHEMA_B = Schema(
            listOf(SchemaName("Person")),
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "age" to FieldType.Number,
                    "is_cool" to FieldType.Boolean
                ),
                collections = mapOf(
                    "pets" to FieldType.Text
                )
            ),
            "1234acf",
            refinement = refinementAgeGtZero,
            query = queryByAge
        )

        private val STORE_OPTIONS =
            StoreOptions<EntityCollectionData, EntityCollectionOp, EntityCollectionView>(
                storageKey = STORAGE_KEY,
                type = CollectionType(EntityType(SCHEMA_A)),
                mode = StorageMode.ReferenceMode
            )
    }
}
