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
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.Handle as StorageHandle
import arcs.core.storage.StorageKey
import arcs.core.storage.handle.CollectionHandle
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SingletonHandle

/**
 * Wraps a [HandleManager] and creates [Entity] handles based on [HandleMode], such as
 * [ReadSingletonHandle] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 *
 * TODO(cromwellian): Add support for creating Singleton/Set handles of [Reference]s.
 */
class EntityHandleManager(
    private val handleManager: HandleManager,
    private val arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
    private val hostId: String = "nohost"
) {

    /**
     * Creates and returns a new [SingletonHandle] for managing an [Entity].
     *
     * @property mode indicates whether the handle is allowed to read or write
     * @property name name for the handle
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createSingletonHandle(
        mode: HandleMode,
        name: String,
        entitySpec: EntitySpec<T>,
        storageKey: StorageKey,
        schema: Schema,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ) = handleManager.rawEntitySingletonHandle(
        storageKey,
        schema,
        name = idGenerator.newChildId(
            idGenerator.newChildId(arcId.toArcId(), hostId),
            name
        ).toString()
    ).let {
        when (mode) {
            HandleMode.Read -> ReadSingletonHandleAdapter(entitySpec, it)
            HandleMode.Write -> WriteSingletonHandleAdapter<T>(it, idGenerator)
            HandleMode.ReadWrite ->
                ReadWriteSingletonHandleAdapter(entitySpec, it, idGenerator)
        }
    }

    /**
     * Creates and returns a new [CollectionHandle] for a set of [Entity]s.
     *
     * @property mode indicates whether the handle is allowed to read or write
     * @property name name for the handle
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createCollectionHandle(
        mode: HandleMode,
        name: String,
        entitySpec: EntitySpec<T>,
        storageKey: StorageKey,
        schema: Schema,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ) = handleManager.rawEntityCollectionHandle(
            storageKey,
            schema,
            name = idGenerator.newChildId(
                idGenerator.newChildId(arcId.toArcId(), hostId),
                name
            ).toString()
        ).let {
        when (mode) {
            HandleMode.Read -> ReadCollectionHandleAdapter(entitySpec, it)
            HandleMode.Write -> WriteCollectionHandleAdapter<T>(it, idGenerator)
            HandleMode.ReadWrite ->
                ReadWriteCollectionHandleAdapter(entitySpec, it, idGenerator)
        }
    }
}

/** A concrete readable singleton handle implementation. */
class ReadSingletonHandleAdapter<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: SingletonHandle<RawEntity>
) : BaseHandleAdapter(storageHandle),
    ReadSingletonHandle<T>,
    ReadSingletonOperations<T> by ReadSingletonOperationsImpl<T>(entitySpec, storageHandle)

/** A concrete writable singleton handle implementation. */
class WriteSingletonHandleAdapter<T : Entity>(
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : BaseHandleAdapter(storageHandle),
    WriteSingletonHandle<T>,
    WriteSingletonOperations<T> by WriteSingletonOperationsImpl<T>(storageHandle, idGenerator)

/** A concrete readable + writable singleton handle implementation. */
class ReadWriteSingletonHandleAdapter<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : BaseHandleAdapter(storageHandle),
    ReadWriteSingletonHandle<T>,
    ReadSingletonOperations<T> by ReadSingletonOperationsImpl<T>(entitySpec, storageHandle),
    WriteSingletonOperations<T> by WriteSingletonOperationsImpl<T>(storageHandle, idGenerator)

/** A concrete readable collection handle implementation. */
class ReadCollectionHandleAdapter<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: CollectionHandle<RawEntity>
) : BaseHandleAdapter(storageHandle),
    ReadCollectionHandle<T>,
    ReadCollectionOperations<T> by ReadCollectionOperationsImpl<T>(entitySpec, storageHandle)

/** A concrete writable collection handle implementation. */
class WriteCollectionHandleAdapter<T : Entity>(
    private val storageHandle: CollectionHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : BaseHandleAdapter(storageHandle),
    WriteCollectionHandle<T>,
    WriteCollectionOperations<T> by WriteCollectionOperationsImpl<T>(storageHandle, idGenerator)

/** A concrete readable & writable collection handle implementation. */
class ReadWriteCollectionHandleAdapter<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: CollectionHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : BaseHandleAdapter(storageHandle),
    ReadWriteCollectionHandle<T>,
    ReadCollectionOperations<T> by ReadCollectionOperationsImpl<T>(entitySpec, storageHandle),
    WriteCollectionOperations<T> by WriteCollectionOperationsImpl<T>(storageHandle, idGenerator)

/** Implementation of singleton read operations to mix into concrete instances. */
private class ReadSingletonOperationsImpl<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: SingletonHandle<RawEntity>
) : ReadSingletonOperations<T> {
    override suspend fun fetch() = storageHandle.fetch()?.let { entitySpec.deserialize(it) }

    override suspend fun onUpdate(action: (T?) -> Unit) = storageHandle.addOnUpdate {
        action(it?.let { entitySpec.deserialize(it) })
    }
}

/** Implementation of singleton write operations to mix into concrete instances. */
private class WriteSingletonOperationsImpl<T : Entity>(
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteSingletonOperations<T> {
    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.apply { ensureIdentified(idGenerator, storageHandle.name) }.serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }
}

/** Implementation of collection read operations to mix into concrete instances. */
private class ReadCollectionOperationsImpl<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: CollectionHandle<RawEntity>
) : ReadCollectionOperations<T> {
    override suspend fun size() = fetchAll().size
    override suspend fun isEmpty() = fetchAll().isEmpty()

    private fun Set<RawEntity>.adaptValues() =
        map { entitySpec.deserialize(it) }.toSet()

    override suspend fun fetchAll() = storageHandle.fetchAll().adaptValues()

    override suspend fun onUpdate(action: (Set<T>) -> Unit) = storageHandle.addOnUpdate {
        action(it.adaptValues())
    }
}

/** Implementation of collection write operations to mix into concrete instances. */
private class WriteCollectionOperationsImpl<T : Entity>(
    private val storageHandle: CollectionHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteCollectionOperations<T> {
    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.apply { ensureIdentified(idGenerator, storageHandle.name) }.serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }

    override suspend fun remove(entity: T) {
        storageHandle.remove(entity.serialize())
    }
}

/** Base functionality common to all read/write singleton and collection handles. */
abstract class BaseHandleAdapter(
    private val storageHandle: StorageHandle<*, *, *>
) : Handle {
    // VisibleForTesting
    val actorName = storageHandle.name

    override val name = storageHandle.name

    override suspend fun onSync(action: () -> Unit) = storageHandle.addOnSync(action)

    override suspend fun onDesync(action: () -> Unit) = storageHandle.addOnDesync(action)

    override suspend fun close() {
        storageHandle.close()
    }
}

/** Delegate this interface in a concrete singleton handle impl to mixin read operations. */
interface UpdateOperations<T> {
    suspend fun onUpdate(action: (T) -> Unit)
}

/** Delegate this interface in a concrete singleton handle impl to mixin read operations. */
private interface ReadSingletonOperations<T : Entity> : UpdateOperations<T?> {
    suspend fun fetch(): T?
}

/** Delegate this interface in a concrete singleton handle impl to mixin write operations. */
private interface WriteSingletonOperations<T : Entity> {
    suspend fun store(entity: T)
    suspend fun clear()
}

/** Delegate this interface in a concrete collection handle impl to mixin read operations. */
private interface ReadCollectionOperations<T : Entity> : UpdateOperations<Set<T>> {
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


