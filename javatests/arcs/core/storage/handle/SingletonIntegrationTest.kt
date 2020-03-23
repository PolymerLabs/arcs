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
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
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
    private lateinit var singletonA: SingletonHandle<RawEntity>
    private lateinit var singletonB: SingletonHandle<RawEntity>

    @Before
    fun setUp() = runBlocking {
        RamDiskDriverProvider()

        store = Store(STORE_OPTIONS)
        storageProxy = StorageProxy(store.activate(), CrdtSingleton<RawEntity>())

        singletonA = SingletonHandle(
            "singletonA",
            storageProxy,
            Ttl.Infinite,
            TimeImpl(),
            schema = SCHEMA
        )
        singletonB = SingletonHandle(
            "singletonB",
            storageProxy,
            Ttl.Infinite,
            TimeImpl(),
            schema = SCHEMA
        )
        Unit
    }

    @After
    fun tearDown() {
        RamDisk.clear()
        CapabilitiesResolver.reset()
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(singletonA.fetch()).isNull()
        assertThat(singletonB.fetch()).isNull()
    }

    @Test
    fun settingOnA_showsUpInB() = runBlockingTest {
        val person = Person("Lou", 95, true)

        assertThat(singletonA.store(person.toRawEntity())).isTrue()
        assertThat(singletonA.fetch()).isEqualTo(person.toRawEntity())
        assertThat(singletonB.fetch()).isEqualTo(person.toRawEntity())
    }

    @Test
    fun reSettingOnB_showsUpInA() = runBlockingTest {
        val lou = Person("Lou", 95, true)
        val jan = Person("Jan", 28, true, emptySet())

        singletonA.store(lou.toRawEntity())
        assertThat(singletonA.fetch()).isEqualTo(lou.toRawEntity())
        assertThat(singletonB.fetch()).isEqualTo(lou.toRawEntity())

        singletonB.store(jan.toRawEntity())
        assertThat(singletonA.fetch()).isEqualTo(jan.toRawEntity())
        assertThat(singletonB.fetch()).isEqualTo(jan.toRawEntity())
    }

    @Test
    fun clearingOnA_clearsB() = runBlockingTest {
        val person = Person("Susan", 48, true)

        singletonA.store(person.toRawEntity())
        assertThat(singletonA.fetch()).isEqualTo(person.toRawEntity())
        assertThat(singletonB.fetch()).isEqualTo(person.toRawEntity())

        singletonB.clear()
        assertThat(singletonA.fetch()).isNull()
        assertThat(singletonB.fetch()).isNull()
    }

    @Test
    fun clearingOnA_clearsValueSetByB() = runBlockingTest {
        val lou = Person("Lou", 95, true)
        val jan = Person("Jan", 28, true, emptySet())
        singletonA.store(lou.toRawEntity())
        singletonB.fetch()
        singletonB.store(jan.toRawEntity())

        singletonA.clear()

        assertThat(singletonA.fetch()).isNull()
    }

    @Test
    fun addEntityWithTtl() = runBlockingTest {
        val person = Person("Jane", 29, false).toRawEntity()
        assertThat(singletonA.store(person)).isTrue()
        val creationTimestampA = requireNotNull(singletonA.fetch()).creationTimestamp;
        assertThat(creationTimestampA).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(requireNotNull(singletonA.fetch()).expirationTimestamp)
            .isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)

        val singletonC = SingletonHandle(
            "singletonC",
            storageProxy,
            Ttl.Days(2),
            TimeImpl(),
            schema = SCHEMA
        )
        assertThat(singletonC.store(person)).isTrue()
        val entityC = requireNotNull(singletonC.fetch())
        // Re-adding the same entity to same store does not change creation timestamp.
        assertThat(entityC.creationTimestamp).isEqualTo(creationTimestampA)
        assertThat(entityC.expirationTimestamp).isGreaterThan(RawEntity.UNINITIALIZED_TIMESTAMP)

        val singletonD = SingletonHandle(
            "singletonD",
            storageProxy,
            Ttl.Minutes(1),
            TimeImpl(),
            schema = SCHEMA
        )
        // If we add another person, it will have different timestamps.
        val person2 = Person("Jim", 19, false)
        assertThat(singletonD.store(person2.toRawEntity())).isTrue()
        val entityD = requireNotNull(singletonD.fetch())
        assertThat(entityD.creationTimestamp).isGreaterThan(creationTimestampA)
        assertThat(entityD.expirationTimestamp).isGreaterThan(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(entityC.expirationTimestamp).isGreaterThan(entityD.expirationTimestamp)
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
            "1234acf"
        )

        private val STORE_OPTIONS =
            StoreOptions<EntitySingletonData, EntitySingletonOp, EntitySingletonView>(
                storageKey = STORAGE_KEY,
                type = SingletonType(EntityType(SCHEMA)),
                mode = StorageMode.ReferenceMode
            )
    }
}
