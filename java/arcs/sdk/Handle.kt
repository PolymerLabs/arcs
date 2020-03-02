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
typealias Handle = arcs.core.storage.api.Handle

/** A singleton handle with read access. */
typealias ReadSingleton<T> = arcs.core.storage.api.ReadSingleton<T>

/** A singleton handle with write access. */
typealias WriteSingleton<T> = arcs.core.storage.api.WriteSingleton<T>

/** A singleton handle with read and write access. */
typealias ReadWriteSingleton<T> = arcs.core.storage.api.ReadWriteSingleton<T>

/** A collection handle with read access. */
typealias ReadCollection<T> = arcs.core.storage.api.ReadCollection<T>

/** A collection handle with write access. */
typealias WriteCollection<T> = arcs.core.storage.api.WriteCollection<T>

/** A collection handle with query access. */
typealias QueryCollection<T, QueryArgs> = arcs.core.storage.api.QueryCollection<T, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteCollection<T> = arcs.core.storage.api.ReadWriteCollection<T>

/** A collection handle with read and write access. */
typealias ReadQueryCollection<T, QueryArgs> = arcs.core.storage.api.ReadQueryCollection<T, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteQueryCollection<T, QueryArgs> = arcs.core.storage.api.ReadWriteQueryCollection<T, QueryArgs>
