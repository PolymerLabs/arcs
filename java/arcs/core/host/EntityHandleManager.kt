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
import arcs.core.common.toArcId
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.entity.CollectionHandle
import arcs.core.entity.CollectionProxy
import arcs.core.entity.CollectionStoreOptions
import arcs.core.entity.Entity
import arcs.core.entity.EntityDereferencerFactory
import arcs.core.entity.EntityPreparer
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadQueryCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.Reference
import arcs.core.entity.SingletonHandle
import arcs.core.entity.SingletonProxy
import arcs.core.entity.SingletonStoreOptions
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode.ReferenceMode
import arcs.core.storage.StoreManager
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
 * TODO(csilvestrini): Add support for creating Singleton/Set handles of [Reference]s.
 */
class EntityHandleManager(
    private val arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
    private val hostId: String = "nohost",
    private val time: Time,
    private val activationFactory: ActivationFactory? = null,
    private val idGenerator: Id.Generator = Id.Generator.newSession()
) {
    private val stores = StoreManager()

    private val storageProxyMutex = Mutex()
    private val singletonStorageProxies by
        guardedBy(storageProxyMutex, mutableMapOf<StorageKey, SingletonProxy<RawEntity>>())
    private val collectionStorageProxies by
        guardedBy(storageProxyMutex, mutableMapOf<StorageKey, CollectionProxy<RawEntity>>())

    private val dereferencerFactory = EntityDereferencerFactory(stores, activationFactory)

    suspend fun <T : Entity> createHandle(
        spec: HandleSpec<T>,
        storageKey: StorageKey,
        ttl: Ttl = Ttl.Infinite
    ): Handle {
        val handleName = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            spec.baseName
        ).toString()
        val entityPreparer = EntityPreparer<T>(
            handleName,
            idGenerator,
            spec.entitySpec.SCHEMA,
            ttl,
            time
        )
        return when (spec.containerType) {
            HandleContainerType.Singleton -> createSingletonHandle(
                handleName,
                spec,
                storageKey,
                entityPreparer
            )
            HandleContainerType.Collection -> createCollectionHandle(
                handleName,
                spec,
                storageKey,
                entityPreparer
            )
        }
    }

    private suspend fun <T : Entity> createSingletonHandle(
        handleName: String,
        spec: HandleSpec<T>,
        storageKey: StorageKey,
        entityPreparer: EntityPreparer<T>
    ): Handle {
        val singletonHandle = SingletonHandle(
            name = handleName,
            spec = spec,
            storageProxy = singletonStoreProxy(storageKey, spec.entitySpec),
            entityPreparer = entityPreparer,
            dereferencerFactory = dereferencerFactory
        )
        return when (spec.mode) {
            HandleMode.Read -> object : ReadSingletonHandle<T> by singletonHandle {}
            HandleMode.Write -> object : WriteSingletonHandle<T> by singletonHandle {}
            HandleMode.ReadWrite -> object : ReadWriteSingletonHandle<T> by singletonHandle {}
        }
    }

    private suspend fun <T : Entity> createCollectionHandle(
        handleName: String,
        spec: HandleSpec<T>,
        storageKey: StorageKey,
        entityPreparer: EntityPreparer<T>
    ): Handle {
        val collectionHandle = CollectionHandle(
            name = handleName,
            spec = spec,
            storageProxy = collectionStoreProxy(storageKey, spec.entitySpec),
            entityPreparer = entityPreparer,
            dereferencerFactory = dereferencerFactory
        )
        return when (spec.mode) {
            HandleMode.Read -> when (spec.entitySpec.SCHEMA.query) {
                null -> object : ReadCollectionHandle<T> by collectionHandle {}
                else -> object : ReadQueryCollectionHandle<T, Any> by collectionHandle {}
            }
            HandleMode.Write -> object : WriteCollectionHandle<T> by collectionHandle {}
            HandleMode.ReadWrite -> when (spec.entitySpec.SCHEMA.query) {
                null -> object : ReadWriteCollectionHandle<T> by collectionHandle {}
                else -> object : ReadWriteQueryCollectionHandle<T, Any> by
                collectionHandle {}
            }
        }
    }

    private suspend fun <T : Entity> singletonStoreProxy(
        storageKey: StorageKey,
        entitySpec: EntitySpec<T>
    ) = stores.get(
        SingletonStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = SingletonType(EntityType(entitySpec.SCHEMA)),
            mode = ReferenceMode
        )
    ).activate(activationFactory).let { activeStore ->
        storageProxyMutex.withLock {
            singletonStorageProxies.getOrPut(storageKey) {
                SingletonProxy(activeStore, CrdtSingleton())
            }
        }
    }

    private suspend fun <T : Entity> collectionStoreProxy(
        storageKey: StorageKey,
        entitySpec: EntitySpec<T>
    ) = stores.get(
        CollectionStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = CollectionType(EntityType(entitySpec.SCHEMA)),
            mode = ReferenceMode
        )
    ).activate(activationFactory).let { activeStore ->
        storageProxyMutex.withLock {
            collectionStorageProxies.getOrPut(storageKey) {
                CollectionProxy(activeStore, CrdtSet())
            }
        }
    }
}
