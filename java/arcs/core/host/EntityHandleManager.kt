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
import arcs.core.storage.Handle as StorageHandle
import arcs.core.storage.StorageKey
import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec
import arcs.core.storage.api.Handle
import arcs.core.storage.api.ReadSingletonHandle
import arcs.core.storage.api.ReadWriteCollectionHandle
import arcs.core.storage.api.ReadWriteSingletonHandle
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
    ): SingletonHandleAdapter<T> {
        val storageHandle = handleManager.rawEntitySingletonHandle(
            storageKey,
            schema,
            canRead = mode.canRead,
            name = idGenerator.newChildId(
                idGenerator.newChildId(arcId.toArcId(), hostId),
                name
            ).toString()
        )
        return SingletonHandleAdapter(mode, name, entitySpec, storageHandle, idGenerator)
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
    ): CollectionHandleAdapter<T> {
        val storageHandle = handleManager.rawEntityCollectionHandle(
            storageKey,
            schema,
            canRead = mode.canRead,
            name = idGenerator.newChildId(
                idGenerator.newChildId(arcId.toArcId(), hostId),
                name
            ).toString()
        )
        return CollectionHandleAdapter(mode, name, entitySpec, storageHandle, idGenerator)
    }
}

/** Base functionality common to all read/write singleton and collection handles. */
sealed class HandleAdapter(
    override val mode: HandleMode,
    override val name: String,
    private val storageHandle: StorageHandle<*, *, *>
) : Handle {

    override suspend fun onSync(action: () -> Unit) {
        storageHandle.addOnSync(action)
    }

    override suspend fun onDesync(action: () -> Unit) {
        storageHandle.addOnDesync(action)
    }

    protected fun checkCanRead() {
        if (!mode.canRead) {
            throw IllegalArgumentException("Handle $name does not support reads.")
        }
    }

    protected fun checkCanWrite() {
        if (!mode.canWrite) {
            throw IllegalArgumentException("Handle $name does not support writes.")
        }
    }
}

/** Wraps [SingletonHandle] and makes it suitable for use in the SDK with [Entity]s. */
class SingletonHandleAdapter<T : Entity>(
    mode: HandleMode,
    name: String,
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : HandleAdapter(mode, name, storageHandle), ReadWriteSingletonHandle<T> {

    // VisibleForTesting
    val actorName = storageHandle.name

    override suspend fun store(entity: T) {
        checkCanWrite()
        storageHandle.store(
            entity.ensureIdentified(idGenerator, name).serialize()
        )
    }

    override suspend fun clear() {
        checkCanWrite()
        storageHandle.clear()
    }

    override suspend fun fetch(): T? {
        checkCanRead()
        return storageHandle.fetch()?.let { rawEntity ->
            entitySpec.deserialize(rawEntity)
        }
    }

    override suspend fun onUpdate(action: (T?) -> Unit) {
        checkCanRead()
        storageHandle.addOnUpdate {
            action(it?.let { entitySpec.deserialize(it) })
        }
    }
}

/** Wraps [CollectionHandle] and makes it suitable for use in the SDK with [Entity]s. */
class CollectionHandleAdapter<T : Entity>(
    mode: HandleMode,
    name: String,
    private val entitySpec: EntitySpec<T>,
    private val storageHandle: CollectionHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : HandleAdapter(mode, name, storageHandle), ReadWriteCollectionHandle<T> {

    // VisibleForTesting
    val actorName = storageHandle.name

    override suspend fun size(): Int {
        checkCanRead()
        return fetchAll().size
    }

    override suspend fun isEmpty(): Boolean {
        checkCanRead()
        return fetchAll().isEmpty()
    }

    override suspend fun fetchAll(): Set<T> {
        checkCanRead()
        return storageHandle.fetchAll().map {
            entitySpec.deserialize(it)
        }.toSet()
    }

    override suspend fun onUpdate(action: (Set<T>) -> Unit) {
        checkCanRead()
        storageHandle.addOnUpdate { raw ->
            action(raw.map { entitySpec.deserialize(it) }.toSet())
        }
    }

    override suspend fun store(entity: T) {
        checkCanWrite()
        storageHandle.store(
            entity.ensureIdentified(idGenerator, name).serialize()
        )
    }

    override suspend fun clear() {
        checkCanWrite()
        storageHandle.clear()
    }

    override suspend fun remove(entity: T) {
        checkCanWrite()
        storageHandle.remove(entity.serialize())
    }
}

private fun <T : Entity> T.ensureIdentified(idGenerator: Id.Generator, handleName: String): T {
    if (this.internalId == "") {
        this.internalId = idGenerator.newChildId(
            // TODO: should we allow this to be plumbed through?
            idGenerator.newArcId("dummy-arc"),
            handleName
        ).toString()
    }
    return this
}
