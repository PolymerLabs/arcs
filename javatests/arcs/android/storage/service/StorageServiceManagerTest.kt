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

package arcs.android.storage.service

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.HandleMode
import arcs.core.entity.DummyEntity
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.SchemaRegistry
import arcs.core.host.EntityHandleManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidDriverAndKeyConfigurator
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.coroutineContext

/** Tests for [StorageServiceManager]. */
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerTest {
    private suspend fun buildManager() = StorageServiceManager(coroutineContext)
    var time = FakeTime()
    private val entityHandleManager = EntityHandleManager(
        time = time,
        scheduler = JvmSchedulerProvider(EmptyCoroutineContext).invoke("test")
    )

    @Before
    fun setUp() {
        AndroidDriverAndKeyConfigurator.configure(ApplicationProvider.getApplicationContext())
        SchemaRegistry.register(DummyEntity)
    }

    @Test
    fun clearAll() = runBlockingTest {
        val handle = createSingletonHandle()
        val entity = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        handle.store(entity)

        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)
        manager.clearAll(deferredResult)

        assertThat(deferredResult.await()).isTrue()
        assertThat(handle.fetch()).isNull()
    }

    @Test
    fun clearDataBetween() = runBlockingTest {
        val entity1 = DummyEntity().apply { num = 1.0 }
        val entity2 = DummyEntity().apply { num = 2.0 }
        val entity3 = DummyEntity().apply { num = 3.0 }

        val handle = createCollectionHandle(time)
        time.millis = 1L
        handle.store(entity1)
        time.millis = 2L
        handle.store(entity2)
        time.millis = 3L
        handle.store(entity3)

        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)
        manager.clearDataBetween(2,2, deferredResult)

        assertThat(deferredResult.await()).isTrue()
        assertThat(handle.fetchAll()).containsExactly(entity1, entity3)
    }

    private suspend fun createSingletonHandle() =
        entityHandleManager.createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                HandleContainerType.Singleton,
                DummyEntity
            ),
            ReferenceModeStorageKey(
                backingKey = DatabaseStorageKey.Persistent("backing", DummyEntity.SCHEMA_HASH),
                storageKey = DatabaseStorageKey.Persistent("container", DummyEntity.SCHEMA_HASH)
            )
        ) as ReadWriteSingletonHandle<DummyEntity>

    private suspend fun createCollectionHandle(time: Time) =
        entityHandleManager.createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                DummyEntity
            ),
            ReferenceModeStorageKey(
                backingKey = DatabaseStorageKey.Persistent("backing", DummyEntity.SCHEMA_HASH),
                storageKey = DatabaseStorageKey.Persistent("container", DummyEntity.SCHEMA_HASH)
            )
        ) as ReadWriteCollectionHandle<DummyEntity>
}
