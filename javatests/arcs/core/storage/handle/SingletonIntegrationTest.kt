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

import arcs.core.crdt.CrdtSingleton
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
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

private typealias EntitySingletonData = CrdtSingleton.Data<RawEntity>
private typealias EntitySingletonOp = CrdtSingleton.IOperation<RawEntity>
private typealias EntitySingletonView = RawEntity?

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SingletonIntegrationTest {
    @get:Rule
    val logRule = LogRule()

    private lateinit var store: Store<EntitySingletonData, EntitySingletonOp, EntitySingletonView>
    private lateinit var storageProxy:
        StorageProxy<EntitySingletonData, EntitySingletonOp, EntitySingletonView>
    private lateinit var singletonA: SingletonImpl<RawEntity>
    private lateinit var singletonB: SingletonImpl<RawEntity>

    @Before
    fun setUp() = runBlocking {
        RamDiskDriverProvider()

        store = Store(STORE_OPTIONS)
        storageProxy = StorageProxy(store.activate(), CrdtSingleton<RawEntity>())

        singletonA = SingletonImpl("singletonA", storageProxy)
        storageProxy.registerHandle(singletonA)
        singletonB = SingletonImpl("singletonB", storageProxy)
        storageProxy.registerHandle(singletonB)
        Unit
    }

    @After
    fun tearDown() {
        RamDisk.clear()
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(singletonA.value()).isNull()
        assertThat(singletonB.value()).isNull()
    }

    @Test
    fun settingOnA_showsUpInB() = runBlockingTest {
        val person = Person("Lou", 95, true)

        singletonA.set(person.toRawEntity())
        assertThat(singletonA.value()).isEqualTo(person.toRawEntity())
        assertThat(singletonB.value()).isEqualTo(person.toRawEntity())
    }

    @Test
    fun reSettingOnB_showsUpInA() = runBlockingTest {
        val lou = Person("Lou", 95, true)
        val jan = Person("Jan", 28, true, emptySet())

        singletonA.set(lou.toRawEntity())
        assertThat(singletonA.value()).isEqualTo(lou.toRawEntity())
        assertThat(singletonB.value()).isEqualTo(lou.toRawEntity())

        singletonB.set(jan.toRawEntity())
        assertThat(singletonA.value()).isEqualTo(jan.toRawEntity())
        assertThat(singletonB.value()).isEqualTo(jan.toRawEntity())
    }

    @Test
    fun clearingOnA_clearsB() = runBlockingTest {
        val person = Person("Susan", 48, true)

        singletonA.set(person.toRawEntity())
        assertThat(singletonA.value()).isEqualTo(person.toRawEntity())
        assertThat(singletonB.value()).isEqualTo(person.toRawEntity())

        singletonB.clear()
        assertThat(singletonA.value()).isNull()
        assertThat(singletonB.value()).isNull()
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
            StoreOptions<EntitySingletonData, EntitySingletonOp, EntitySingletonView>(
                storageKey = STORAGE_KEY,
                existenceCriteria = ExistenceCriteria.MayExist,
                type = SingletonType(EntityType(SCHEMA)),
                mode = StorageMode.ReferenceMode
            )
    }
}
