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

package arcs.core.storage.api

import arcs.core.data.HandleMode

/** Base interface for all handle classes. */
interface Handle {
    val name: String

    /** Indicates whether this handle is read-only, write-only, or read-write. */
    val mode: HandleMode

    /** Assign a callback when the handle is synced. */
    fun onSync(action: (Handle) -> Unit)

    /** Assign a callback when the handle is desynced. */
    fun onDesync(action: (Handle) -> Unit)
}

/** A singleton handle with read access. */
interface ReadSingletonHandle<T : Entity> : Handle {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?

    fun onUpdate(action: (T?) -> Unit)
}

/** A singleton handle with write access. */
interface WriteSingletonHandle<T : Entity> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(entity: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A singleton handle with read and write access. */
interface ReadWriteSingletonHandle<T : Entity> : ReadSingletonHandle<T>, WriteSingletonHandle<T>

/** A collection handle with read access. */
interface ReadCollectionHandle<T : Entity> : Handle {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>

    /** Assign a callback when the collection is Updated. */
    fun onUpdate(action: (Set<T>) -> Unit)
}

/** A collection handle with read access. */
interface QueryCollectionHandle<T : Entity, QueryArgs> : Handle {
    /** Returns a set with all the entities in the collection that match the associated query. */
    suspend fun query(args: QueryArgs): Set<T>
}

/** A collection handle with write access. */
interface WriteCollectionHandle<T : Entity> : Handle {
    /** Adds the given [entity] to the collection. */
    suspend fun store(entity: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [entity] from the collection. */
    suspend fun remove(entity: T)
}

/** A collection handle with read and write access. */
interface ReadWriteCollectionHandle<T : Entity> : ReadCollectionHandle<T>, WriteCollectionHandle<T>

/** A collection handle with read and query access. */
interface ReadQueryCollectionHandle<T : Entity, QueryArgs> :
    ReadCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read, write and query access. */
interface ReadWriteQueryCollectionHandle<T : Entity, QueryArgs> :
    ReadCollectionHandle<T>, WriteCollectionHandle<T>, QueryCollectionHandle<T, QueryArgs>
