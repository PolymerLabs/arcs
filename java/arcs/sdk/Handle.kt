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

package arcs.sdk

/** Base interface for all handle classes. */
interface Handle {
    val name: String
}

/** A singleton handle with read access. */
interface ReadableSingleton<T : Entity> : Handle {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?

    fun onUpdate(action: (T?) -> Unit)
}

/** A singleton handle with write access. */
interface WritableSingleton<T : Entity> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(entity: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A singleton handle with read and write access. */
interface ReadWriteSingleton<T : Entity> : ReadableSingleton<T>, WritableSingleton<T>

/** A collection handle with read access. */
interface ReadableCollection<T : Entity> : Handle {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Assign a callback when the collection is Updated. */
    fun onUpdate(action: (Set<T>) -> Unit)

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>
}

/** A collection handle with write access. */
interface WritableCollection<T : Entity> : Handle {
    /** Adds the given [entity] to the collection. */
    suspend fun store(entity: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [entity] from the collection. */
    suspend fun remove(entity: T)
}

/** A collection handle with read and write access. */
interface ReadWriteCollection<T : Entity> : ReadableCollection<T>, WritableCollection<T>
