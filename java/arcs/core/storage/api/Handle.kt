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

/** Events that all handles must support. */
interface HandleLifecycle<H : Handle> {
    /** Assign a callback when the handle is synced. */
    fun onSync(action: suspend (H) -> Unit)

    /** Assign a callback when the handle is sdeynced. */
    fun onDesync(action: suspend (H) -> Unit)
}

interface ReadableHandleLifecycle<T, H : Handle> : HandleLifecycle<H> {
    fun onUpdate(action: suspend (T) -> Unit)
}

/** A singleton handle with read access. */
interface IReadableSingleton<T : Entity> : Handle {
    /** Returns the value of the singleton. */
    suspend fun fetch(): T?
}

/** A readable singleton with lifecycle methods. */
interface ReadableSingleton<T : Entity> : IReadableSingleton<T>,
    HandleLifecycle<ReadableSingleton<T>>, ReadableHandleLifecycle<T?, ReadableSingleton<T>>

/** A singleton handle with write access. */
interface IWritableSingleton<T : Entity> : Handle {
    /** Sets the value of the singleton. */
    suspend fun store(entity: T)

    /** Clears the value of the singleton. */
    suspend fun clear()
}

/** A writable singleton handle with lifecycle methods. */
interface WritableSingleton<T : Entity> : IWritableSingleton<T>,
    HandleLifecycle<WritableSingleton<T>>

/** A read write singleton handle with lifecycle methods. */
interface ReadWriteSingleton<T : Entity> : IReadableSingleton<T>, IWritableSingleton<T>,
    HandleLifecycle<ReadWriteSingleton<T>>, ReadableHandleLifecycle<T?, ReadWriteSingleton<T>>

/** A collection handle with read access. */
interface IReadableCollection<T : Entity> : Handle {
    /** The number of elements in the collection. */
    suspend fun size(): Int

    /** Returns true if the collection is empty. */
    suspend fun isEmpty(): Boolean

    /** Returns a set with all the entities in the collection. */
    suspend fun fetchAll(): Set<T>
}

/** A readable collection handle with lifecycle. */
interface ReadableCollection<T : Entity> : IReadableCollection<T>,
    ReadableHandleLifecycle<Set<T>, ReadableCollection<T>>

/** A writable collection handle with write access. */
interface IWritableCollection<T : Entity> : Handle {
    /** Adds the given [entity] to the collection. */
    suspend fun store(entity: T)

    /** Removes everything from the collection. */
    suspend fun clear()

    /** Removes the given [entity] from the collection. */
    suspend fun remove(entity: T)
}

/** A writable collection handle with lifecycle. */
interface WritableCollection<T : Entity> : IWritableCollection<T>,
    HandleLifecycle<WritableCollection<T>>

/** A collection handle with read and write access. */
interface ReadWriteCollection<T : Entity> : IReadableCollection<T>, IWritableCollection<T>,
    ReadableHandleLifecycle<Set<T>, ReadWriteCollection<T>>
