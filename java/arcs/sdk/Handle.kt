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

interface Handle {
    val name: String
}

interface ReadableSingleton<T : Entity> : Handle {
    fun get(): T?
}

interface WritableSingleton<T : Entity> : Handle {
    fun set(entity: T)
    fun clear()
}

interface ReadWriteSingleton<T : Entity> : ReadableSingleton<T>, WritableSingleton<T>

interface ReadableCollection<T : Entity> : Handle {
    val size: Int
    fun isEmpty(): Boolean
    operator fun iterator(): Iterator<T>
}

interface WritableCollection<T : Entity> : Handle {
    fun store(entity: T)
    fun clear()
    fun remove(entity: T)
}

interface ReadWriteCollection<T : Entity> : ReadableCollection<T>, WritableCollection<T>
