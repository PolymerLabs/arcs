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

    /** Assign a callback when the handle is synced. */
    suspend fun onSync(action: () -> Unit)

    /** Assign a callback when the handle is desynced. */
    suspend fun onDesync(action: () -> Unit)

    /** Release resources needed by this, unregister all callbacks. */
    suspend fun close()
}

interface HandleContent

data class HandleSpec<T : Entity>(
    val baseName: String,
    val mode: HandleMode,
    val containerType: HandleContainerType,
    val entitySpec: EntitySpec<T>,
    val dataType: HandleDataType = HandleDataType.Entity
)

typealias HandleMode = HandleMode

enum class HandleContainerType {
    Singleton,
    Collection
}

enum class HandleDataType {
    Entity,
    Reference
}

interface ReadableHandle<UpdateType> : Handle {
    suspend fun onUpdate(action: suspend (UpdateType) -> Unit)
}

/** A singleton handle with read access. */
interface ReadSingletonHandle<T : HandleContent> : ReadableHandle<T?> {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?
}

/** A singleton handle with write access. */
interface WriteSingletonHandle<T : HandleContent> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(entity: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A singleton handle with read and write access. */
interface ReadWriteSingletonHandle<T : HandleContent> :
    ReadSingletonHandle<T>, WriteSingletonHandle<T>

/** A collection handle with read access. */
interface ReadCollectionHandle<T : HandleContent> : ReadableHandle<Set<T>> {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>
}

/** A collection handle with read access. */
interface QueryCollectionHandle<T : HandleContent, QueryArgs> : Handle {
    /** Returns a set with all the entities in the collection that match the associated query. */
    suspend fun query(args: QueryArgs): Set<T>
}

/** A collection handle with write access. */
interface WriteCollectionHandle<T : HandleContent> : Handle {
    /** Adds the given [entity] to the collection. */
    suspend fun store(entity: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [entity] from the collection. */
    suspend fun remove(entity: T)
}

/** A collection handle with read and write access. */
interface ReadWriteCollectionHandle<T : HandleContent> :
    ReadCollectionHandle<T>, WriteCollectionHandle<T>

/** A collection handle with read and query access. */
interface ReadQueryCollectionHandle<T : HandleContent, QueryArgs> :
    ReadCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read, write and query access. */
interface ReadWriteQueryCollectionHandle<T : HandleContent, QueryArgs> :
    ReadWriteCollectionHandle<T>, ReadQueryCollectionHandle<T, QueryArgs>
