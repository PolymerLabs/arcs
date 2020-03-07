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
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.StorageKey
import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec
import arcs.core.storage.api.Handle
import arcs.core.storage.api.ReadCollectionHandle
import arcs.core.storage.api.ReadSingletonHandle
import arcs.core.storage.api.ReadWriteCollectionHandle
import arcs.core.storage.api.ReadWriteSingletonHandle
import arcs.core.storage.api.WriteCollectionHandle
import arcs.core.storage.api.WriteSingletonHandle
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
class EntityHandleManager(private val handleManager: HandleManager) {

    /**
     * Creates and returns a new [SingletonHandle] for managing an [Entity].
     *
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createSingletonHandle(
        entitySpec: EntitySpec<T>,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ): Handle {
        val storageHandle = handleManager.rawEntitySingletonHandle(
            storageKey,
            schema,
            canRead = handleMode != HandleMode.Write
        )
        return when (handleMode) {
            HandleMode.ReadWrite -> ReadWriteSingletonHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                idGenerator
            )
            HandleMode.Read -> ReadSingletonHandleImpl(
                entitySpec,
                handleName,
                storageHandle
            )
            HandleMode.Write -> WriteSingletonHandleImpl<T>(
                handleName,
                storageHandle,
                idGenerator
            )
        }
    }

    /**
     * Creates and returns a new [CollectionHandle] for a set of [Entity]s.
     *
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createCollectionHandle(
        entitySpec: EntitySpec<T>,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession()
    ): Handle {
        val storageHandle = handleManager.rawEntityCollectionHandle(
            storageKey,
            schema,
            canRead = handleMode != HandleMode.Write
        )
        return when (handleMode) {
            HandleMode.ReadWrite -> ReadWriteCollectionHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                idGenerator
            )
            HandleMode.Read -> ReadCollectionHandleImpl(
                entitySpec,
                handleName,
                storageHandle
            )
            HandleMode.Write -> WriteCollectionHandleImpl<T>(
                handleName,
                storageHandle,
                idGenerator
            )
        }
    }
}

internal open class ReadSingletonHandleImpl<T : Entity>(
    val entitySpec: EntitySpec<T>,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>
) : ReadSingletonHandle<T> {
    override val name: String
        get() = handleName

    private fun adaptValue(raw: RawEntity?) =
        raw?.let { entitySpec.deserialize(it) }

    override suspend fun fetch(): T? = adaptValue(storageHandle.fetch())

    override suspend fun onUpdate(action: (T?) -> Unit) {
        storageHandle.addOnUpdate { rawValue ->
            action(adaptValue(rawValue))
        }
    }

    override suspend fun onSync(action: (ReadSingletonHandle<T>) -> Unit) {
        storageHandle.addOnSync { action(this) }
    }

    override suspend fun onDesync(action: (ReadSingletonHandle<T>) -> Unit) {
        storageHandle.addOnDesync { action(this) }
    }

    override suspend fun removeAllCallbacks() {
        storageHandle.removeAllCallbacks()
    }
}

internal class WriteSingletonHandleImpl<T : Entity>(
    val handleName: String,
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteSingletonHandle<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.ensureIdentified(idGenerator, handleName).serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }
}

internal class ReadWriteSingletonHandleImpl<T : Entity>(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: SingletonHandle<RawEntity>,
    idGenerator: Id.Generator,
    private val writableSingleton: WriteSingletonHandleImpl<T> = WriteSingletonHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteSingletonHandle<T>,
    ReadSingletonHandleImpl<T>(entitySpec, handleName, storageHandle),
    WriteSingletonHandle<T> by writableSingleton {
    override val name: String
        get() = writableSingleton.name
}

internal open class ReadCollectionHandleImpl<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    val handleName: String,
    private val storageHandle: CollectionHandle<RawEntity>
) : ReadCollectionHandle<T> {
    override val name: String
        get() = handleName

    override suspend fun size(): Int = fetchAll().size

    override suspend fun isEmpty() = fetchAll().isEmpty()

    private fun adaptValues(raw: Set<RawEntity>) =
        raw.map { entitySpec.deserialize(it) }.toSet()

    override suspend fun fetchAll(): Set<T> = adaptValues(storageHandle.fetchAll())

    override suspend fun onUpdate(action: (Set<T>) -> Unit) {
        storageHandle.addOnUpdate { rawValues ->
            action(adaptValues(rawValues))
        }
    }

    override suspend fun onSync(action: () -> Unit) {
        storageHandle.addOnSync(action)
    }

    override suspend fun onDesync(action: () -> Unit) { }

    override suspend fun removeAllCallbacks() {
        storageHandle.removeAllCallbacks()
    }
}

internal class WriteCollectionHandleImpl<T : Entity>(
    val handleName: String,
    private val storageHandle: CollectionHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteCollectionHandle<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.ensureIdentified(idGenerator, handleName).serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }

    override suspend fun remove(entity: T) {
        storageHandle.remove(entity.serialize())
    }
}

internal class ReadWriteCollectionHandleImpl<T : Entity>(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: CollectionHandle<RawEntity>,
    idGenerator: Id.Generator,
    private val writableCollection: WriteCollectionHandleImpl<T> = WriteCollectionHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteCollectionHandle<T>,
    ReadCollectionHandleImpl<T>(entitySpec, handleName, storageHandle),
    WriteCollectionHandle<T> by writableCollection {
    override val name: String
        get() = writableCollection.name
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
