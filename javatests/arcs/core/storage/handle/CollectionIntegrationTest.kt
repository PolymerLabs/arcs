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
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
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

    private lateinit var store: Store<EntityCollectionData, EntityCollectionOp, EntityCollectionView>
    private lateinit var storageProxy:
        StorageProxy<EntityCollectionData, EntityCollectionOp, EntityCollectionView>
    private lateinit var collectionA: CollectionImpl<RawEntity>
    private lateinit var collectionB: CollectionImpl<RawEntity>

    @Before
    fun setUp() = runBlocking {
        RamDiskDriverProvider()

        store = Store(STORE_OPTIONS)
        storageProxy = StorageProxy(store.activate(), CrdtSet<RawEntity>())

        collectionA = CollectionImpl("collectionA", storageProxy)
        storageProxy.registerHandle(collectionA)
        collectionB = CollectionImpl("collectionB", storageProxy)
        storageProxy.registerHandle(collectionB)
        Unit
    }

    @After
    fun tearDown() {
        RamDisk.clear()
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(collectionA.value()).isEmpty()
        assertThat(collectionB.value()).isEmpty()
    }

    @Test
    fun addingElementToA_showsUpInB() = runBlockingTest {
        val person = Person("Miles", 55, true)

        collectionA.store(person.toRawEntity())
        assertThat(collectionA.value()).containsExactly(person.toRawEntity())
        assertThat(collectionB.value()).containsExactly(person.toRawEntity())
    }

    @Test
    fun removingElementFromA_isRemovedFromB() = runBlockingTest {
        val miles = Person("Miles", 55, true, emptySet())
        val jason = Person("Jason", 35, false, setOf("Watson"))

        collectionA.store(miles.toRawEntity())
        collectionB.store(jason.toRawEntity())

        assertThat(collectionA.value()).containsExactly(miles.toRawEntity(), jason.toRawEntity())
        assertThat(collectionB.value()).containsExactly(miles.toRawEntity(), jason.toRawEntity())

        collectionA.remove(jason.toRawEntity())
        assertThat(collectionA.value()).containsExactly(miles.toRawEntity())
        assertThat(collectionB.value()).containsExactly(miles.toRawEntity())
    }

    @Test
    fun clearingElementsFromA_clearsThemFromB() = runBlockingTest {
        collectionA.store(Person("a", 1, true, setOf("a")).toRawEntity())
        collectionA.store(Person("b", 2, false, emptySet()).toRawEntity())
        collectionA.store(Person("c", 3, true).toRawEntity())
        collectionA.store(Person("d", 4, false, setOf("d")).toRawEntity())
        collectionA.store(Person("e", 5, true).toRawEntity())
        collectionA.store(Person("f", 6, false).toRawEntity())
        collectionA.store(Person("g", 7, true).toRawEntity())

        assertThat(collectionB.value()).hasSize(7)

        collectionA.clear()
        assertThat(collectionA.value()).isEmpty()
        assertThat(collectionB.value()).isEmpty()
    }

    private data class Person(
        val name: String,
        val age: Int,
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

        private val SCHEMA = Schema(
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
            SchemaDescription(),
            "1234acf"
        )

        private val STORE_OPTIONS =
            StoreOptions<EntityCollectionData, EntityCollectionOp, EntityCollectionView>(
                storageKey = STORAGE_KEY,
                existenceCriteria = ExistenceCriteria.MayExist,
                type = CollectionType(EntityType(SCHEMA)),
                mode = StorageMode.ReferenceMode
            )
    }
}
