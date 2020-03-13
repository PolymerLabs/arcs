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
package arcs.core.storage.ttl

import arcs.core.data.*
import arcs.core.data.util.toReferencable
import arcs.core.storage.DriverFactory
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.CollectionHandle
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RemovalManager]. */
@RunWith(JUnit4::class)
class RemovalManagerTest {
    private val backingKey = RamDiskStorageKey("entities")

    val entity1 = RawEntity(
        "entity1",
        singletons = mapOf("name" to "Jason".toReferencable()),
        collections = emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons = mapOf("name" to "Ben".toReferencable()),
        collections = emptyMap()
    )
    val entity3 = RawEntity(
        "entity3",
        singletons = mapOf("name" to "Yuan".toReferencable()),
        collections = emptyMap()
    )

    private val schema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = emptyMap()
        ),
        "1234acf"
    )

    private val singletonRefKey = RamDiskStorageKey("single-ent")
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = singletonRefKey
    )

    private val setRefKey = RamDiskStorageKey("set-ent")
    private val setKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = setRefKey
    )

    private val hmTime = FakeTimeImpl(1234567L)
    private lateinit var singletonHandle: SingletonHandle<RawEntity>
    private lateinit var collectionHandle: CollectionHandle<RawEntity>

    @Before
    fun setup() = handleManagerTest { hm ->
        RamDisk.clear()
        DriverFactory.register(RamDiskDriverProvider())
        singletonHandle = hm.rawEntitySingletonHandle(
            singletonKey,
            schema,
            null,
            "name1",
            Ttl.Minutes(5)
        )

        collectionHandle = hm.rawEntityCollectionHandle(
            setKey,
            schema,
            null,
            "name2",
            Ttl.Hours(2)
        )

        singletonHandle.store(entity1)
        collectionHandle.store(entity2)
        // Forward handle manager's time 1000 milliseconds, so that entity2 is inserted "later".
        hmTime.millis += 1000L
        collectionHandle.store(entity3)
    }

    @Test
    fun removeExpired_singletonNotExpired() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        assertThat(requireNotNull(singletonHandle.fetch()).expirationTimestamp)
            .isGreaterThan(removalManager.time.currentTimeMillis)

        removalManager.removeExpired(singletonHandle)

        assertThat(singletonHandle.fetch()).isNotNull()
    }

    @Test
    fun removeExpired_singletonExpired() = handleManagerTest {
        val expirationTimestamp = requireNotNull(singletonHandle.fetch()).expirationTimestamp
        val removalManager = MyRemovalManager(FakeTimeImpl(expirationTimestamp.plus(100)))
        assertThat(expirationTimestamp).isLessThan(removalManager.time.currentTimeMillis)

        removalManager.removeExpired(singletonHandle)

        assertThat(singletonHandle.fetch()).isNull()
    }

    fun removeExpired_collectionNoneExpired() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        removalManager.removeExpired(collectionHandle)
        assertThat(collectionHandle.fetchAll()).hasSize(2)
    }

    fun removeExpired_collectionOneExpired() = handleManagerTest {
        val expirationTimestamp =
            requireNotNull(collectionHandle.fetchAll().first()).expirationTimestamp
        val removalManager = MyRemovalManager(FakeTimeImpl(expirationTimestamp.plus(100)))
        removalManager.removeExpired(collectionHandle)
        assertThat(collectionHandle.fetchAll()).hasSize(1)
    }

    fun removeExpired_collectionAllExpired() = handleManagerTest {
        val expirationTimestamp =
            requireNotNull(collectionHandle.fetchAll().first()).expirationTimestamp
        val removalManager = MyRemovalManager(FakeTimeImpl(expirationTimestamp.plus(2000)))
        removalManager.removeExpired(collectionHandle)
        assertThat(collectionHandle.fetchAll()).hasSize(0)
    }

    @Test
    fun removeCreatedBetween_singletonNotInRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        removalManager.removeCreatedBetween(singletonHandle, TimeRange(100, 200))
        assertThat(singletonHandle.fetch()).isNotNull()
    }

    @Test
    fun removeCreatedBetween_singletonInRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        val creationTimestamp = requireNotNull(singletonHandle.fetch()).creationTimestamp
        removalManager.removeCreatedBetween(
            singletonHandle,
            TimeRange(creationTimestamp.minus(100), creationTimestamp.plus(200))
        )
        assertThat(singletonHandle.fetch()).isNull()
    }

    @Test
    fun removeCreatedBetween_collectionNotInRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        removalManager.removeCreatedBetween(collectionHandle, TimeRange(1, 2))
        assertThat(collectionHandle.fetchAll()).hasSize(2)
    }

    @Test
    fun removeCreatedBetween_collectionOneInRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        val minCreation = requireNotNull(
            collectionHandle.fetchAll().minBy { it.creationTimestamp }).creationTimestamp
        removalManager.removeCreatedBetween(collectionHandle, TimeRange(minCreation.plus(100)))
        assertThat(collectionHandle.fetchAll()).containsExactly(entity2)
    }

    @Test
    fun removeCreatedBetween_collectionAllInRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        val minCreation = requireNotNull(
            collectionHandle.fetchAll().minBy { it.creationTimestamp }).creationTimestamp
        val maxCreation = requireNotNull(
            collectionHandle.fetchAll().maxBy { it.creationTimestamp }).creationTimestamp
        removalManager.removeCreatedBetween(
            collectionHandle,
            TimeRange(minCreation.minus(100), maxCreation.plus(2000))
        )
        assertThat(collectionHandle.fetchAll()).hasSize(0)
    }

    @Test
    fun removeCreatedBetween_collectionUnlimitedRange() = handleManagerTest {
        val removalManager = MyRemovalManager(hmTime)
        removalManager.removeCreatedBetween(collectionHandle, TimeRange())
        assertThat(collectionHandle.fetchAll()).hasSize(0)
    }

    class FakeTimeImpl(var millis: Long) : Time() {
        override val currentTimeNanos: Long
            get() = throw NotImplementedError()
        override val currentTimeMillis: Long
            get() = millis
    }

    private class MyRemovalManager(time: Time) : RemovalManager(time)

    // TODO: Make runBlockingTest work.
    private fun handleManagerTest(
        block: suspend CoroutineScope.(HandleManager) -> Unit
    ) = runBlocking {
        val hm = HandleManager(hmTime)
        this@runBlocking.block(hm)
        Unit
    }

}
