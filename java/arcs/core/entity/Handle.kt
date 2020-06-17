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

package arcs.core.entity

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.type.Type
import java.lang.IllegalStateException
import kotlin.coroutines.resume
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.suspendCancellableCoroutine

/** Base interface for all handle classes. */
interface Handle {
    val name: String

    /**
     * If you need to access or mutate the [Handle]'s data from outside of a particle or handle
     * lifecycle callback, you must use this dispatcher (or the handleDispatcher from your particle)
     * to run your operations.
     *
     * TODO(b/155229971): Add handleDispatcher to particle interface.
     */
    val dispatcher: CoroutineDispatcher

    // TODO(b/157188866): move this to ReadableHandle (write-only handles should not receive this)
    /** Assign a callback when the handle is synced for the first time. */
    fun onReady(action: () -> Unit)

    /** Release resources needed by this, unregister all callbacks. */
    fun close()

    /** Internal method used to connect [StorageProxy] events to the [ParticleContext]. */
    fun registerForStorageEvents(notify: (StorageEvent) -> Unit)
}

/** Suspends until the [Handle] has synced with the store. */
suspend fun <T : Handle> T.awaitReady(): T = suspendCancellableCoroutine<T> { cont ->
    this.onReady {
        if (cont.isActive) cont.resume(this@awaitReady)
    }
}

/** Base interface for types that can be stored in a [Handle] (see [Entity] and [Reference]). */
interface Storable

/** Configuration for a [Handle]. */
data class HandleSpec(
    val baseName: String,
    val mode: HandleMode,
    val type: Type,
    val entitySpecs: Set<EntitySpec<*>>
) {

    @Deprecated(
        "Use main constructor",
        ReplaceWith(
            //ktlint-disable: max-line-length
            "HandleSpec(baseName, mode, toType(entitySpec, dataType, containerType), setOf(entitySpec))"
            //ktlint-enable: max-line-length
        )
    )
    constructor(
        baseName: String,
        mode: HandleMode,
        containerType: HandleContainerType,
        entitySpec: EntitySpec<*>,
        dataType: HandleDataType = HandleDataType.Entity
    ) : this(
        baseName,
        mode,
        toType(entitySpec, dataType, containerType),
        setOf(entitySpec)
    )

    @Deprecated("Use all entity specs.", ReplaceWith("entitySpecs.single()"))
    val entitySpec: EntitySpec<*>
        get() = entitySpecs.single()

    val containerType: HandleContainerType
        get() = when (type) {
            is CollectionType<*> -> HandleContainerType.Collection
            is SingletonType<*> -> HandleContainerType.Singleton
            else -> throw IllegalStateException("Handle type should be a Collection or a Singleton")
        }

    val dataType: HandleDataType
        get() = when (innerType) {
            is EntityType -> HandleDataType.Entity
            is ReferenceType<*> -> HandleDataType.Reference
            else -> throw IllegalStateException("Unrecognized Type: ${innerType.tag}")
        }

    private val innerType: Type
        get() = when (type) {
            is CollectionType<*> -> type.collectionType
            is SingletonType<*> -> type.containedType
            else -> throw IllegalStateException("Handle type should be a Collection or a Singleton")
        }

    companion object {
        fun toType(
            entitySpec: EntitySpec<*>,
            dataType: HandleDataType,
            containerType: HandleContainerType
        ): Type {
            val innerType = when (dataType) {
                HandleDataType.Entity -> EntityType(entitySpec.SCHEMA)
                HandleDataType.Reference -> ReferenceType(EntityType(entitySpec.SCHEMA))
            }
            return when (containerType) {
                HandleContainerType.Collection -> CollectionType(innerType)
                HandleContainerType.Singleton -> SingletonType(innerType)
            }
        }
    }
}

typealias HandleMode = HandleMode

/** The type of container that a [Handle] represents. */
enum class HandleContainerType {
    Singleton,
    Collection
}

/** The type of data stored in a [Handle]. */
enum class HandleDataType {
    Entity,
    Reference
}

interface ReadableHandle<UpdateType> : Handle {
    /** Assign a callback when the handle's data changes. */
    fun onUpdate(action: (UpdateType) -> Unit)

    /** Assign a callback when the handle is desynced. */
    fun onDesync(action: () -> Unit)

    /** Assign a callback when the handle is re-synced after being desynced. */
    fun onResync(action: () -> Unit)

    /**
     * Creates and returns a [Reference] to the given entity.
     *
     * The entity must already be stored and present in the handle before calling this method.
     *
     * Note that this method only works for handles which store [Entity] types (i.e. not handles
     * containing [Reference]s). [E] must be the same type the handle stores.
     */
    suspend fun <E : Entity> createReference(entity: E): Reference<E>
}

/** A singleton handle with read access. */
interface ReadSingletonHandle<T : Storable> : ReadableHandle<T?> {
    /** Returns the value of the singleton. */
    fun fetch(): T?
}

/** A singleton handle with write access. */
interface WriteSingletonHandle<T : Storable> : Handle {
    /** Sets the value of the singleton. */
    fun store(element: T): Job

    /** Clears the value of the singleton. */
    fun clear(): Job
}

/** A singleton handle with read and write access. */
interface ReadWriteSingletonHandle<T : Storable> : ReadSingletonHandle<T>, WriteSingletonHandle<T>

/** A collection handle with read access. */
interface ReadCollectionHandle<T : Storable> : ReadableHandle<Set<T>> {
    /** The number of elements in the collection. */
    fun size(): Int

    /** Returns true if the collection is empty. */
    fun isEmpty(): Boolean

    /** Returns a set with all the entities in the collection. */
    fun fetchAll(): Set<T>
}

/** A collection handle with write access. */
interface WriteCollectionHandle<T : Storable> : Handle {
    /** Adds the given [element] to the collection. */
    fun store(element: T): Job

    /** Removes everything from the collection. */
    fun clear(): Job

    /** Removes the given [element] from the collection. */
    fun remove(element: T): Job
}

/** A collection handle with query access. */
interface QueryCollectionHandle<T : Storable, QueryArgs> : Handle {
    /** Returns a set with all the entities in the collection that match the associated query. */
    suspend fun query(args: QueryArgs): Set<T>
}

/** A collection handle with read and write access. */
interface ReadWriteCollectionHandle<T : Storable> :
    ReadCollectionHandle<T>, WriteCollectionHandle<T>

/** A collection handle with read and query access. */
interface ReadQueryCollectionHandle<T : Storable, QueryArgs> :
    ReadCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>

/** A collection handle with write and query access. */
interface WriteQueryCollectionHandle<T : Storable, QueryArgs> :
    WriteCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read, write and query access. */
interface ReadWriteQueryCollectionHandle<T : Storable, QueryArgs> :
    ReadWriteCollectionHandle<T>,
    WriteQueryCollectionHandle<T, QueryArgs>,
    ReadQueryCollectionHandle<T, QueryArgs>
