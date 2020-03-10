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

@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.core.storage.api

/** Base interface for all handle classes. */
interface Handle {
    val name: String
}

/** A singleton handle with read access. */
interface ReadSingletonHandle<T : Entity> : Handle {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?

    suspend fun onUpdate(action: (T?) -> Unit)

    /** Assign a callback when the handle is synced. */
    suspend fun onSync(action: (ReadSingletonHandle<T>) -> Unit)

    /** Assign a callback when the handle is desynced. */
    suspend fun onDesync(action: (ReadSingletonHandle<T>) -> Unit)

    /** Remove any attached callbacks for this [Handle]. */
    suspend fun removeAllCallbacks()
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

    /** Assign a callback when the collection is Updated. */
    suspend fun onUpdate(action: (Set<T>) -> Unit)

    /** Assign a callback when the collection handle is synced. */
    suspend fun onSync(action: () -> Unit)

    /** Assign a callback when the collection handle is desynced. */
    suspend fun onDesync(action: () -> Unit)

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>

    /** Remove any attached callbacks for this [Handle]. */
    suspend fun removeAllCallbacks()
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
