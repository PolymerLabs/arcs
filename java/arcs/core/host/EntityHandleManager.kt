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

import arcs.core.analytics.Analytics
import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.common.toArcId
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.entity.CollectionHandle
import arcs.core.entity.CollectionProxy
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
import arcs.core.entity.ReferenceStorageAdapter
import arcs.core.entity.SingletonHandle
import arcs.core.entity.SingletonProxy
import arcs.core.entity.Storable
import arcs.core.entity.StorageAdapter
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteQueryCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.ActiveStore
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Dispatchers as ArcsDispatchers
import arcs.core.util.Scheduler
import arcs.core.util.Time
import arcs.core.util.guardedBy
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

typealias SingletonStore<T> = ActiveStore<CrdtSingleton.Data<T>, CrdtSingleton.IOperation<T>, T?>
typealias CollectionStore<T> = ActiveStore<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>
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
    private val idGenerator: Id.Generator = Id.Generator.newSession(),
    private val coroutineContext: CoroutineContext = ArcsDispatchers.client,
    private val analytics: Analytics? = null
) {

    @Deprecated(
        message = "prefer primary constructor",
        /* ktlint-disable max-line-length */
        replaceWith = ReplaceWith("EntityHandleManager(arcId, hostId, time, scheduler, StoreManager(activationFactory), idGenerator)")
        /* ktlint-enable max-line-length */
    )
    constructor(
        arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
        hostId: String = "nohost",
        time: Time,
        scheduler: Scheduler,
        activationFactory: ActivationFactory?,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ) : this(
        arcId,
        hostId,
        time,
        scheduler,
        StoreManager(activationFactory),
        idGenerator
    )

    private val proxyMutex = Mutex()
    private val singletonStorageProxies by guardedBy(
        proxyMutex,
        mutableMapOf<StorageKey, SingletonProxy<Referencable>>()
    )
    private val collectionStorageProxies by guardedBy(
        proxyMutex,
        mutableMapOf<StorageKey, CollectionProxy<Referencable>>()
    )
    private val dereferencerFactory = EntityDereferencerFactory(stores.activationFactory)

    @Deprecated("Will be replaced by ParticleContext lifecycle handling")
    suspend fun initiateProxySync() {
        proxyMutex.withLock {
            singletonStorageProxies.values.forEach { it.maybeInitiateSync() }
            collectionStorageProxies.values.forEach { it.maybeInitiateSync() }
        }
    }

    @ExperimentalCoroutinesApi
    suspend fun createHandle(
        spec: HandleSpec,
        storageKey: StorageKey,
        ttl: Ttl = Ttl.Infinite(),
        particleId: String = "",
        immediateSync: Boolean = true
    ): Handle {
        val handleName = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            spec.baseName
        ).toString()

        val storageAdapter = when (spec.dataType) {
            HandleDataType.Entity -> {
                EntityStorageAdapter(
                    handleName,
                    idGenerator,
                    spec.entitySpecs.single(),
                    ttl,
                    time,
                    dereferencerFactory,
                    storageKey
                )
            }
            HandleDataType.Reference -> {
                require(storageKey !is ReferenceModeStorageKey) {
                    "Reference-mode storage keys are not supported for reference-typed handles."
                }
                ReferenceStorageAdapter(
                    spec.entitySpecs.single(),
                    dereferencerFactory,
                    ttl,
                    time,
                    storageKey
                )
            }
        }

        val config = HandleConfig(
            handleName,
            spec,
            storageKey,
            storageAdapter,
            particleId,
            immediateSync
        )
        return createHandle(config)
    }

    /** Overload of [createHandle] parameterized by a type [R] of the data that is to be stored. */
    @ExperimentalCoroutinesApi
    private suspend fun <T : Storable, R : Referencable> createHandle(
        config: HandleConfig<T, R>
    ): Handle = when (config.spec.containerType) {
        HandleContainerType.Singleton -> createSingletonHandle(config)
        HandleContainerType.Collection -> createCollectionHandle(config)
    }

    /** Close all [StorageProxy] instances in this [EntityHandleManager]. */
    suspend fun close() {
        proxyMutex.withLock {
            // Needed to avoid receiving ModelUpdate after Proxy closed error
            scheduler.waitForIdle()
            singletonStorageProxies.values.forEach { it.close() }
            collectionStorageProxies.values.forEach { it.close() }
            singletonStorageProxies.clear()
            collectionStorageProxies.clear()
        }
    }

    data class HandleConfig<T : Storable, R : Referencable>(
        val handleName: String,
        val spec: HandleSpec,
        val storageKey: StorageKey,
        val storageAdapter: StorageAdapter<T, R>,
        val particleId: String,
        val immediateSync: Boolean
    )

    @ExperimentalCoroutinesApi
    private suspend fun <T : Storable, R : Referencable> createSingletonHandle(
        config: HandleConfig<T, R>
    ): Handle {
        val singletonConfig = SingletonHandle.Config(
            name = config.handleName,
            spec = config.spec,
            proxy = singletonStoreProxy(
                config.storageKey,
                config.spec.entitySpecs.single().SCHEMA
            ),
            storageAdapter = config.storageAdapter,
            dereferencerFactory = dereferencerFactory,
            particleId = config.particleId
        )

        val singletonHandle = SingletonHandle(singletonConfig)
        if (config.immediateSync) {
            singletonConfig.proxy.maybeInitiateSync()
        }
        return when (config.spec.mode) {
            HandleMode.Read -> object : ReadSingletonHandle<T> by singletonHandle {}
            HandleMode.Write -> object : WriteSingletonHandle<T> by singletonHandle {}
            HandleMode.ReadWrite -> object : ReadWriteSingletonHandle<T> by singletonHandle {}
            else -> throw Error("Singleton Handles do not support mode ${config.spec.mode}")
        }
    }

    @ExperimentalCoroutinesApi
    private suspend fun <T : Storable, R : Referencable> createCollectionHandle(
        config: HandleConfig<T, R>
    ): Handle {
        val collectionConfig = CollectionHandle.Config(
            name = config.handleName,
            spec = config.spec,
            proxy = collectionStoreProxy(
                config.storageKey,
                config.spec.entitySpecs.single().SCHEMA
            ),
            storageAdapter = config.storageAdapter,
            dereferencerFactory = dereferencerFactory,
            particleId = config.particleId
        )
        val collectionHandle = CollectionHandle(collectionConfig)
        if (config.immediateSync) {
            collectionConfig.proxy.maybeInitiateSync()
        }
        return when (config.spec.mode) {
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

    @ExperimentalCoroutinesApi
    @Suppress("UNCHECKED_CAST")
    private suspend fun <R : Referencable> singletonStoreProxy(
        storageKey: StorageKey,
        schema: Schema
    ): SingletonProxy<R> = proxyMutex.withLock {
        singletonStorageProxies.getOrPut(storageKey) {
            val store: SingletonStore<Referencable> = stores.get(
                StoreOptions(
                    storageKey = storageKey,
                    type = SingletonType(EntityType(schema)),
                    coroutineContext = coroutineContext
                )
            )
            SingletonProxy(store, CrdtSingleton(), scheduler, time, analytics)
        } as SingletonProxy<R>
    }

    @ExperimentalCoroutinesApi
    @Suppress("UNCHECKED_CAST")
    private suspend fun <R : Referencable> collectionStoreProxy(
        storageKey: StorageKey,
        schema: Schema
    ): CollectionProxy<R> = proxyMutex.withLock {
        collectionStorageProxies.getOrPut(storageKey) {
            val store: CollectionStore<Referencable> = stores.get(
                StoreOptions(
                    storageKey = storageKey,
                    type = CollectionType(EntityType(schema)),
                    coroutineContext = coroutineContext
                )
            )
            CollectionProxy(store, CrdtSet(), scheduler, time, analytics)
        } as CollectionProxy<R>
    }
}
