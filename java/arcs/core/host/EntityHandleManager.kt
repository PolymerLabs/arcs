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

/**
 * Creates [Entity] handles based on [HandleMode], such as
 * [ReadSingletonHandle] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 *
 * Instances of this class are not thread-safe.
 *
 * TODO(csilvestrini): Add support for creating Singleton/Set handles of [Reference]s.
 */
class EntityHandleManager(
    private val arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
    private val hostId: String = "nohost",
    private val time: Time,
    private val stores: StoreManager = StoreManager(),
    private val activationFactory: ActivationFactory? = null
) {
    private val singletonStorageProxies = mutableMapOf<StorageKey, SingletonProxy<RawEntity>>()
    private val collectionStorageProxies = mutableMapOf<StorageKey, CollectionProxy<RawEntity>>()
    private val dereferencerFactory = EntityDereferencerFactory(stores, activationFactory)

    /**
     * Creates and returns a new singleton handle for managing an [Entity].
     *
     * @property mode indicates whether the handle is allowed to read or write
     * @property baseName part of the name for the handle
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createSingletonHandle(
        mode: HandleMode,
        baseName: String,
        entitySpec: EntitySpec<T>,
        storageKey: StorageKey,
        ttl: Ttl = Ttl.Infinite,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ): Handle =
        idGenerator.handleName(baseName).let { name ->
            SingletonHandle(
                name = idGenerator.handleName(baseName),
                entitySpec = entitySpec,
                storageProxy = singletonStoreProxy(storageKey, entitySpec),
                entityPreparer = EntityPreparer(name, idGenerator, entitySpec.SCHEMA, ttl, time),
                dereferencerFactory = dereferencerFactory
            )
        }.let { handle ->
            return when (mode) {
                HandleMode.Read -> object : ReadSingletonHandle<T> by handle {}
                HandleMode.Write -> object : WriteSingletonHandle<T> by handle {}
                HandleMode.ReadWrite -> object : ReadWriteSingletonHandle<T> by handle {}
            }
        }

    /**
     * Creates and returns a new collection handle for a set of [Entity]s.
     *
     * @property mode indicates whether the handle is allowed to read or write
     * @property baseName part of the name for the handle
     * @property storageKey a [StorageKey]
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createCollectionHandle(
        mode: HandleMode,
        baseName: String,
        entitySpec: EntitySpec<T>,
        storageKey: StorageKey,
        ttl: Ttl = Ttl.Infinite,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ): Handle =
        idGenerator.handleName(baseName).let { name ->
            CollectionHandle(
                name = idGenerator.handleName(baseName),
                entitySpec = entitySpec,
                storageProxy = collectionStoreProxy(storageKey, entitySpec),
                entityPreparer = EntityPreparer(name, idGenerator, entitySpec.SCHEMA, ttl, time),
                dereferencerFactory = dereferencerFactory
            )
        }.let {
            when (mode) {
                HandleMode.Read -> when (entitySpec.SCHEMA.query) {
                    null -> object : ReadCollectionHandle<T> by it {}
                    else -> object : ReadQueryCollectionHandle<T, Any> by it {}
                }
                HandleMode.Write -> object : WriteCollectionHandle<T> by it {}
                HandleMode.ReadWrite -> when (entitySpec.SCHEMA.query) {
                    null -> object : ReadWriteCollectionHandle<T> by it {}
                    else -> object : ReadWriteQueryCollectionHandle<T, Any> by it {}
                }
            }
        }

    private fun Id.Generator.handleName(baseName: String) = newChildId(
        newChildId(arcId.toArcId(), hostId),
        baseName
    ).toString()

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
        singletonStorageProxies.getOrPut(storageKey) {
            SingletonProxy(activeStore, CrdtSingleton())
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
        collectionStorageProxies.getOrPut(storageKey) {
            CollectionProxy(activeStore, CrdtSet())
        }
    }
}
