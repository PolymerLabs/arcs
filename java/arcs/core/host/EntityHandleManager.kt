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
package arcs.core.host

import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.common.toArcId
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.entity.CollectionHandle
import arcs.core.entity.CollectionProxy
import arcs.core.entity.CollectionStoreOptions
import arcs.core.entity.Entity
import arcs.core.entity.EntityDereferencerFactory
import arcs.core.entity.EntityStorageAdapter
import arcs.core.entity.Handle
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleDataType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadQueryCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.Reference
import arcs.core.entity.ReferenceStorageAdapter
import arcs.core.entity.SingletonHandle
import arcs.core.entity.SingletonProxy
import arcs.core.entity.SingletonStoreOptions
import arcs.core.entity.Storable
import arcs.core.entity.StorageAdapter
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteQueryCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StoreManager
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Scheduler
import arcs.core.util.Time
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Creates [Entity] handles based on [HandleMode], such as
 * [ReadSingletonHandle] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 *
 * The [scheduler] provided to the [EntityHandleManager] at construction-time will be shared across
 * all handles and storage-proxies created by the [EntityHandleManager].
 *
 * Call [close] on an instance that will no longer be used to ensure that all [StorageProxy]
 * instances created by this [EntityHandleManager] will also be closed.
 */
class EntityHandleManager(
    private val arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
    private val hostId: String = "nohost",
    private val time: Time,
    private val scheduler: Scheduler,
    private val stores: StoreManager = StoreManager(),
    private val activationFactory: ActivationFactory? = null,
    private val idGenerator: Id.Generator = Id.Generator.newSession()
) {
    private val proxyMutex = Mutex()
    private val singletonStorageProxies by guardedBy(
        proxyMutex,
        mutableMapOf<StorageKey, SingletonProxy<Referencable>>()
    )
    private val collectionStorageProxies by guardedBy(
        proxyMutex,
        mutableMapOf<StorageKey, CollectionProxy<Referencable>>()
    )
    private val dereferencerFactory =
        EntityDereferencerFactory(stores, scheduler, activationFactory)

    @Suppress("UNCHECKED_CAST")
    suspend fun createHandle(
        spec: HandleSpec<out Entity>,
        storageKey: StorageKey,
        ttl: Ttl = Ttl.Infinite
    ): Handle {
        val handleName = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            spec.baseName
        ).toString()
        return when (spec.dataType) {
            HandleDataType.Entity -> {
                val storageAdapter = EntityStorageAdapter(
                    handleName,
                    idGenerator,
                    spec.entitySpec,
                    ttl,
                    time,
                    dereferencerFactory
                )
                createHandle(handleName, spec, storageKey, storageAdapter)
            }
            HandleDataType.Reference -> {
                require(storageKey !is ReferenceModeStorageKey) {
                    "Reference-mode storage keys are not supported for reference-typed handles."
                }
                val storageAdapter = ReferenceStorageAdapter(
                    spec.entitySpec
                )
                createHandle(handleName, spec, storageKey, storageAdapter)
            }
        }
    }

    /** Overload of [createHandle] parameterized by a type [R] of the data that is to be stored. */
    private suspend fun <T : Storable, R : Referencable> createHandle(
        handleName: String,
        spec: HandleSpec<out Entity>,
        storageKey: StorageKey,
        storageAdapter: StorageAdapter<T, R>
    ): Handle {
        return when (spec.containerType) {
            HandleContainerType.Singleton -> createSingletonHandle(
                handleName,
                spec,
                storageKey,
                storageAdapter
            )
            HandleContainerType.Collection -> createCollectionHandle(
                handleName,
                spec,
                storageKey,
                storageAdapter
            )
        }
    }

    /** Close all [StorageProxy] instances in this [EntityHandleManager]. */
    suspend fun close() {
        proxyMutex.withLock {
            singletonStorageProxies.values.forEach { it.close() }
            collectionStorageProxies.values.forEach { it.close() }
            singletonStorageProxies.clear()
            collectionStorageProxies.clear()
        }
    }

    private suspend fun <T : Storable, R : Referencable> createSingletonHandle(
        handleName: String,
        spec: HandleSpec<out Entity>,
        storageKey: StorageKey,
        storageAdapter: StorageAdapter<T, R>
    ): Handle {
        val singletonHandle = SingletonHandle(
            name = handleName,
            spec = spec,
            storageProxy = singletonStoreProxy(
                storageKey,
                spec.entitySpec.SCHEMA,
                spec.dataType.toStorageMode()
            ),
            storageAdapter = storageAdapter,
            dereferencerFactory = dereferencerFactory
        )
        return when (spec.mode) {
            HandleMode.Read -> object : ReadSingletonHandle<T> by singletonHandle {}
            HandleMode.Write -> object : WriteSingletonHandle<T> by singletonHandle {}
            HandleMode.ReadWrite -> object : ReadWriteSingletonHandle<T> by singletonHandle {}
            else -> throw Error("Singleton Handles do not support mode ${spec.mode}")
        }
    }

    private suspend fun <T : Storable, R : Referencable> createCollectionHandle(
        handleName: String,
        spec: HandleSpec<out Entity>,
        storageKey: StorageKey,
        storageAdapter: StorageAdapter<T, R>
    ): Handle {
        val collectionHandle = CollectionHandle(
            name = handleName,
            spec = spec,
            storageProxy = collectionStoreProxy(
                storageKey,
                spec.entitySpec.SCHEMA,
                spec.dataType.toStorageMode()
            ),
            storageAdapter = storageAdapter,
            dereferencerFactory = dereferencerFactory
        )
        return when (spec.mode) {
            HandleMode.Read -> object : ReadCollectionHandle<T> by collectionHandle {}
            HandleMode.Write -> object : WriteCollectionHandle<T> by collectionHandle {}
            HandleMode.Query -> object : ReadQueryCollectionHandle<T, Any> by collectionHandle {}
            HandleMode.ReadWrite -> object : ReadWriteCollectionHandle<T> by collectionHandle {}
            HandleMode.ReadQuery ->
                object : ReadQueryCollectionHandle<T, Any> by collectionHandle {}
            HandleMode.WriteQuery ->
                object : WriteQueryCollectionHandle<T, Any> by collectionHandle {}
            HandleMode.ReadWriteQuery ->
                object : ReadWriteQueryCollectionHandle<T, Any> by collectionHandle {}
        }
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun <R : Referencable> singletonStoreProxy(
        storageKey: StorageKey,
        schema: Schema,
        storageMode: StorageMode
    ): SingletonProxy<R> = proxyMutex.withLock {
        singletonStorageProxies.getOrPut(storageKey) {
            val activeStore = stores.get(
                SingletonStoreOptions<Referencable>(
                    storageKey = storageKey,
                    type = SingletonType(EntityType(schema)),
                    mode = storageMode
                )
            ).activate(activationFactory)
            SingletonProxy(activeStore, CrdtSingleton(), scheduler)
        } as SingletonProxy<R>
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun <R : Referencable> collectionStoreProxy(
        storageKey: StorageKey,
        schema: Schema,
        storageMode: StorageMode
    ): CollectionProxy<R> = proxyMutex.withLock {
        collectionStorageProxies.getOrPut(storageKey) {
            val activeStore = stores.get(
                CollectionStoreOptions<Referencable>(
                    storageKey = storageKey,
                    type = CollectionType(EntityType(schema)),
                    mode = storageMode
                )
            ).activate(activationFactory)
            CollectionProxy(activeStore, CrdtSet(), scheduler)
        } as CollectionProxy<R>
    }
}

private fun HandleDataType.toStorageMode() = when (this) {
    HandleDataType.Entity -> StorageMode.ReferenceMode
    HandleDataType.Reference -> StorageMode.Direct
}
