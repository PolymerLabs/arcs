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

/** Base interface for all handle classes. */
interface Handle {
    val name: String
}

/** A singleton handle with read access. */
interface ReadSingleton<T : Entity> : Handle {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?

    suspend fun onUpdate(action: (T?) -> Unit)

    /** Assign a callback when the handle is synced. */
    suspend fun onSync(action: (ReadSingleton<T>) -> Unit)

    /** Assign a callback when the handle is sdeynced. */
    suspend fun onDesync(action: (ReadSingleton<T>) -> Unit)
}

/** A singleton handle with write access. */
interface WriteSingleton<T : Entity> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(entity: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A singleton handle with read and write access. */
interface ReadWriteSingleton<T : Entity> : ReadSingleton<T>, WriteSingleton<T>

/** A collection handle with read access. */
interface ReadCollection<T : Entity> : Handle {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Assign a callback when the collection is Updated. */
    suspend fun onUpdate(action: (Set<T>) -> Unit)

    /** Assign a callback when the collection handle is synced. */
    suspend fun onSync(action: (ReadCollection<T>) -> Unit)

    /** Assign a callback when the collection handle is desynced. */
    suspend fun onDesync(action: (ReadCollection<T>) -> Unit)

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>
}

/** A collection handle with write access. */
interface WriteCollection<T : Entity> : Handle {
    /** Adds the given [entity] to the collection. */
    suspend fun store(entity: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [entity] from the collection. */
    suspend fun remove(entity: T)
}

/** A collection handle with read and write access. */
interface ReadWriteCollection<T : Entity> : ReadCollection<T>, WriteCollection<T>
