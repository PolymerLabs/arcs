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
typealias ReadableSingleton<T> = arcs.core.storage.api.ReadableSingleton<T>

/** A singleton handle with write access. */
typealias WritableSingleton<T> = arcs.core.storage.api.WritableSingleton<T>

/** A singleton handle with read and write access. */
typealias ReadWriteSingleton<T> = arcs.core.storage.api.ReadWriteSingleton<T>

/** A collection handle with read access. */
typealias ReadableCollection<T> = arcs.core.storage.api.ReadableCollection<T>

/** A collection handle with write access. */
typealias WritableCollection<T> = arcs.core.storage.api.WritableCollection<T>

/** A collection handle with read and write access. */
typealias ReadWriteCollection<T> = arcs.core.storage.api.ReadWriteCollection<T>
