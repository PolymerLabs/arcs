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

import arcs.core.data.HandleMode

/** Base interface for all handle classes. */
interface Handle {
    val name: String

    /** Assign a callback when the handle is synced for the first time. */
    suspend fun onReady(action: () -> Unit)

    /** Release resources needed by this, unregister all callbacks. */
    suspend fun close()
}

/** Base interface for types that can be stored in a [Handle] (see [Entity] and [Reference]). */
interface Storable

/** Configuration for a [Handle]. */
data class HandleSpec<T : Entity>(
    val baseName: String,
    val mode: HandleMode,
    val containerType: HandleContainerType,
    val entitySpec: EntitySpec<T>,
    val dataType: HandleDataType = HandleDataType.Entity
)

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
    suspend fun onUpdate(action: suspend (UpdateType) -> Unit)

    /** Assign a callback when the handle is desynced. */
    suspend fun onDesync(action: () -> Unit)

    /** Assign a callback when the handle is re-synced after being desynced. */
    suspend fun onResync(action: () -> Unit)

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
    suspend fun fetch(): T?
}

/** A singleton handle with write access. */
interface WriteSingletonHandle<T : Storable> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(element: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A singleton handle with read and write access. */
interface ReadWriteSingletonHandle<T : Storable> : ReadSingletonHandle<T>, WriteSingletonHandle<T>

/** A collection handle with read access. */
interface ReadCollectionHandle<T : Storable> : ReadableHandle<Set<T>> {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>
}

/** A collection handle with read access. */
interface QueryCollectionHandle<T : Storable, QueryArgs> : Handle {
    /** Returns a set with all the entities in the collection that match the associated query. */
    suspend fun query(args: QueryArgs): Set<T>
}

/** A collection handle with write access. */
interface WriteCollectionHandle<T : Storable> : Handle {
    /** Adds the given [element] to the collection. */
    suspend fun store(element: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [element] from the collection. */
    suspend fun remove(element: T)
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
interface WriteQueryCollectionHandle<T : Entity, QueryArgs> :
    WriteCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read, write and query access. */
interface ReadWriteQueryCollectionHandle<T : Storable, QueryArgs> :
    ReadWriteCollectionHandle<T>,
    WriteQueryCollectionHandle<T, QueryArgs>,
    ReadQueryCollectionHandle<T, QueryArgs>
