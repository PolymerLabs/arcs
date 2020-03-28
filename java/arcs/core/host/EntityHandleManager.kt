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
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.entity.Entity
import arcs.core.entity.EntityDereferencerFactory
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.Reference
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode.ReferenceMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreManager
import arcs.core.storage.handle.CollectionProxy
import arcs.core.storage.handle.CollectionStoreOptions
import arcs.core.storage.handle.SingletonProxy
import arcs.core.storage.handle.SingletonStoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time

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
    ): BaseHandleAdapter {
        val name = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            baseName
        ).toString()

        val entityPrep = EntityPreparer<T>(
            name,
            idGenerator,
            entitySpec.SCHEMA,
            ttl,
            time
        )

        val store = stores.get(
            SingletonStoreOptions<RawEntity>(
                storageKey = storageKey,
                type = SingletonType(EntityType(entitySpec.SCHEMA)),
                mode = ReferenceMode
            )
        ).activate(activationFactory)

        val storageProxy = singletonStorageProxies.getOrPut(storageKey) {
            SingletonProxy(store, CrdtSingleton())
        }

        return when (mode) {
            HandleMode.Read -> ReadSingletonHandleAdapter(
                name = name,
                entitySpec = entitySpec,
                storageProxy = storageProxy,
                dereferencerFactory = dereferencerFactory
            )
            HandleMode.Write -> WriteSingletonHandleAdapter<T>(
                name = name,
                storageProxy = storageProxy,
                entityPreparer = entityPrep
            )
            HandleMode.ReadWrite -> ReadWriteSingletonHandleAdapter(
                name = name,
                entitySpec = entitySpec,
                storageProxy = storageProxy,
                entityPreparer = entityPrep,
                dereferencerFactory = dereferencerFactory
            )
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
    ): BaseHandleAdapter {
        val name = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            baseName
        ).toString()

        val entityPrep = EntityPreparer<T>(
            name,
            idGenerator,
            entitySpec.SCHEMA,
            ttl,
            time
        )

        val store = stores.get(
            CollectionStoreOptions<RawEntity>(
                storageKey = storageKey,
                type = CollectionType(EntityType(entitySpec.SCHEMA)),
                mode = ReferenceMode
            )
        ).activate(activationFactory)

        val storageProxy = collectionStorageProxies.getOrPut(storageKey) {
            CollectionProxy(store, CrdtSet())
        }

        return when (mode) {
            HandleMode.Read -> ReadCollectionHandleAdapter(
                name = name,
                entitySpec = entitySpec,
                storageProxy = storageProxy,
                dereferencerFactory = dereferencerFactory
            )
            HandleMode.Write -> WriteCollectionHandleAdapter(
                name = name,
                storageProxy = storageProxy,
                entityPreparer = entityPrep
            )
            HandleMode.ReadWrite -> ReadWriteCollectionHandleAdapter(
                name = name,
                entitySpec = entitySpec,
                storageProxy = storageProxy,
                entityPreparer = entityPrep,
                dereferencerFactory = dereferencerFactory
            )
        }
    }
}

/** A concrete readable singleton handle implementation. */
class ReadSingletonHandleAdapter<T : Entity>(
    name: String,
    entitySpec: EntitySpec<T>,
    storageProxy: SingletonProxy<RawEntity>,
    dereferencerFactory: EntityDereferencerFactory
) : BaseHandleAdapter(name, storageProxy),
    ReadSingletonHandle<T>,
    ReadSingletonOperations<T> by ReadSingletonOperationsImpl<T>(
        name,
        entitySpec,
        storageProxy,
        dereferencerFactory
    )

/** A concrete writable singleton handle implementation. */
class WriteSingletonHandleAdapter<T : Entity>(
    name: String,
    storageProxy: SingletonProxy<RawEntity>,
    entityPreparer: EntityPreparer<T>
) : BaseHandleAdapter(name, storageProxy),
    WriteSingletonHandle<T>,
    WriteSingletonOperations<T> by WriteSingletonOperationsImpl<T>(
        name,
        storageProxy,
        entityPreparer
    )

/** A concrete readable + writable singleton handle implementation. */
class ReadWriteSingletonHandleAdapter<T : Entity>(
    name: String,
    entitySpec: EntitySpec<T>,
    storageProxy: SingletonProxy<RawEntity>,
    entityPreparer: EntityPreparer<T>,
    dereferencerFactory: EntityDereferencerFactory
) : BaseHandleAdapter(name, storageProxy),
    ReadWriteSingletonHandle<T>,
    ReadSingletonOperations<T> by ReadSingletonOperationsImpl<T>(
        name,
        entitySpec,
        storageProxy,
        dereferencerFactory
    ),
    WriteSingletonOperations<T> by WriteSingletonOperationsImpl<T>(
        name,
        storageProxy,
        entityPreparer
    )

/** A concrete readable collection handle implementation. */
class ReadCollectionHandleAdapter<T : Entity>(
    name: String,
    entitySpec: EntitySpec<T>,
    storageProxy: CollectionProxy<RawEntity>,
    dereferencerFactory: EntityDereferencerFactory
) : BaseHandleAdapter(name, storageProxy),
    ReadCollectionHandle<T>,
    ReadCollectionOperations<T> by ReadCollectionOperationsImpl<T>(
        name,
        entitySpec,
        storageProxy,
        dereferencerFactory
    )

/** A concrete writable collection handle implementation. */
class WriteCollectionHandleAdapter<T : Entity>(
    name: String,
    storageProxy: CollectionProxy<RawEntity>,
    entityPreparer: EntityPreparer<T>
) : BaseHandleAdapter(name, storageProxy),
    WriteCollectionHandle<T>,
    WriteCollectionOperations<T> by WriteCollectionOperationsImpl<T>(
        name,
        storageProxy,
        entityPreparer
    )

/** A concrete readable & writable collection handle implementation. */
class ReadWriteCollectionHandleAdapter<T : Entity>(
    name: String,
    entitySpec: EntitySpec<T>,
    storageProxy: CollectionProxy<RawEntity>,
    entityPreparer: EntityPreparer<T>,
    dereferencerFactory: EntityDereferencerFactory
) : BaseHandleAdapter(name, storageProxy),
    ReadWriteCollectionHandle<T>,
    ReadCollectionOperations<T> by ReadCollectionOperationsImpl<T>(
        name,
        entitySpec,
        storageProxy,
        dereferencerFactory
    ),
    WriteCollectionOperations<T> by WriteCollectionOperationsImpl<T>(
        name,
        storageProxy,
        entityPreparer
    )

/** Implementation of singleton read operations to mix into concrete instances. */
private class ReadSingletonOperationsImpl<T : Entity>(
    private val name: String,
    private val entitySpec: EntitySpec<T>,
    private val storageProxy: SingletonProxy<RawEntity>,
    private val dereferencerFactory: EntityDereferencerFactory
) : ReadSingletonOperations<T> {

    private fun adaptValue(value: RawEntity?): T? = value?.let {
        dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, value)
        entitySpec.deserialize(value)
    }

    override suspend fun fetch() = adaptValue(storageProxy.getParticleView())

    override suspend fun onUpdate(action: suspend (T?) -> Unit) = storageProxy.addOnUpdate(name) {
        action(adaptValue(it))
    }

    override suspend fun createReference(entity: T): Reference<T> {
        val entityId = requireNotNull(entity.entityId) {
            "Entity must have an ID before it can be referenced."
        }
        val storageKey = requireNotNull(storageProxy.storageKey as? ReferenceModeStorageKey) {
            "ReferenceModeStorageKey required in order to create references."
        }
        if (fetch()?.entityId != entityId) {
            throw IllegalArgumentException("Entity is not stored in the Singleton.")
        }

        return Reference(
            entitySpec,
            StorageReference(entity.serialize().id, storageKey.backingKey, null).also {
                it.dereferencer = dereferencerFactory.create(entitySpec.SCHEMA)
            }
        )
    }
}

/** Implementation of singleton write operations to mix into concrete instances. */
private class WriteSingletonOperationsImpl<T : Entity>(
    private val name: String,
    private val storageProxy: SingletonProxy<RawEntity>,
    private val entityPreparer: EntityPreparer<T>
) : WriteSingletonOperations<T> {
    override suspend fun store(entity: T) {
        storageProxy.applyOp(CrdtSingleton.Operation.Update(
            name,
            storageProxy.getVersionMap().increment(name),
            entityPreparer.prepareEntity(entity)
        ))
    }

    override suspend fun clear() {
        storageProxy.applyOp(CrdtSingleton.Operation.Clear(
            name,
            storageProxy.getVersionMap()
        ))
    }
}

/** Implementation of collection read operations to mix into concrete instances. */
private class ReadCollectionOperationsImpl<T : Entity>(
    private val name: String,
    private val entitySpec: EntitySpec<T>,
    private val storageProxy: CollectionProxy<RawEntity>,
    private val dereferencerFactory: EntityDereferencerFactory
) : ReadCollectionOperations<T> {
    override suspend fun size() = fetchAll().size
    override suspend fun isEmpty() = fetchAll().isEmpty()

    private fun adaptValues(values: Set<RawEntity>) = values.mapTo(mutableSetOf()) {
        dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, it)
        entitySpec.deserialize(it)
    }

    override suspend fun fetchAll() = adaptValues(storageProxy.getParticleView())

    override suspend fun onUpdate(action: suspend (Set<T>) -> Unit) =
        storageProxy.addOnUpdate(name) {
            action(adaptValues(it))
        }

    override suspend fun createReference(entity: T): Reference<T> {
        val entityId = requireNotNull(entity.entityId) {
            "Entity must have an ID before it can be referenced."
        }
        val storageKey = requireNotNull(storageProxy.storageKey as? ReferenceModeStorageKey) {
            "ReferenceModeStorageKey required in order to create references."
        }
        if (!fetchAll().any { it.entityId == entityId }) {
            throw IllegalArgumentException("Entity is not stored in the Collection.")
        }

        return Reference(
            entitySpec,
            StorageReference(entity.serialize().id, storageKey.backingKey, null).also {
                it.dereferencer = dereferencerFactory.create(entitySpec.SCHEMA)
            }
        )
    }
}

/** Implementation of collection write operations to mix into concrete instances. */
private class WriteCollectionOperationsImpl<T : Entity>(
    private val name: String,
    private val storageProxy: CollectionProxy<RawEntity>,
    private val entityPreparer: EntityPreparer<T>
) : WriteCollectionOperations<T> {
    override suspend fun store(entity: T) {
        storageProxy.applyOp(CrdtSet.Operation.Add(
            name,
            storageProxy.getVersionMap().increment(name),
            entityPreparer.prepareEntity(entity)
        ))
    }

    override suspend fun clear() {
        storageProxy.getParticleView().forEach {
            storageProxy.applyOp(CrdtSet.Operation.Remove(
                name,
                storageProxy.getVersionMap(),
                it
            ))
        }
    }

    override suspend fun remove(entity: T) {
        storageProxy.applyOp(CrdtSet.Operation.Remove(
            name,
            storageProxy.getVersionMap(),
            entity.serialize()
        ))
    }
}

/** Base functionality common to all read/write singleton and collection handles. */
abstract class BaseHandleAdapter(
    override val name: String,
    private val storageProxy: StorageProxy<*, *, *>
) : Handle {
    override suspend fun onSync(action: () -> Unit) = storageProxy.addOnSync(name, action)

    override suspend fun onDesync(action: () -> Unit) = storageProxy.addOnDesync(name, action)

    override suspend fun close() {
        storageProxy.removeCallbacksForName(name)
    }
}

/** Delegate this interface in a concrete singleton handle impl to mixin read operations. */
private interface UpdateOperations<T> {
    suspend fun onUpdate(action: suspend (T) -> Unit)
}

private interface ReferenceOperations<T : Entity> {
    suspend fun createReference(entity: T): Reference<T>
}

/** Delegate this interface in a concrete singleton handle impl to mixin read operations. */
private interface ReadSingletonOperations<T : Entity> :
    UpdateOperations<T?>, ReferenceOperations<T> {
    suspend fun fetch(): T?
}

/** Delegate this interface in a concrete singleton handle impl to mixin write operations. */
private interface WriteSingletonOperations<T : Entity> {
    suspend fun store(entity: T)
    suspend fun clear()
}

/** Delegate this interface in a concrete collection handle impl to mixin read operations. */
private interface ReadCollectionOperations<T : Entity> :
    UpdateOperations<Set<T>>, ReferenceOperations<T> {
    suspend fun size(): Int
    suspend fun isEmpty(): Boolean
    suspend fun fetchAll(): Set<T>
}

/** Delegate this interface in a concrete collection handle impl to mixin write operations. */
private interface WriteCollectionOperations<T : Entity> {
    suspend fun store(entity: T)
    suspend fun clear()
    suspend fun remove(entity: T)
}

/** Prepares the provided entity and serializes it for storage */
@Suppress("GoodTime") // use Instant
class EntityPreparer<T : Entity>(
    val handleName: String,
    val idGenerator: Id.Generator,
    val schema: Schema,
    val ttl: Ttl,
    val time: Time
) {
    fun prepareEntity(entity: T): RawEntity {
        entity.ensureIdentified(idGenerator, handleName)

        val rawEntity = entity.serialize()

        rawEntity.creationTimestamp = time.currentTimeMillis
        require(schema.refinement(rawEntity)) {
            "Invalid entity stored to handle $handleName(failed refinement)"
        }
        if (ttl != Ttl.Infinite) {
            rawEntity.expirationTimestamp = ttl.calculateExpiration(time)
        }
        return rawEntity
    }
}
