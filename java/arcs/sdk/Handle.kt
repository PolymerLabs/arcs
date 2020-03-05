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
typealias ReadSingletonHandle<T> = arcs.core.storage.api.ReadSingletonHandle<T>

/** A singleton handle with write access. */
typealias WriteSingletonHandle<T> = arcs.core.storage.api.WriteSingletonHandle<T>

/** A singleton handle with read and write access. */
typealias ReadWriteSingletonHandle<T> = arcs.core.storage.api.ReadWriteSingletonHandle<T>

/** A collection handle with read access. */
typealias ReadCollectionHandle<T> = arcs.core.storage.api.ReadCollectionHandle<T>

/** A collection handle with write access. */
typealias WriteCollectionHandle<T> = arcs.core.storage.api.WriteCollectionHandle<T>

/** A collection handle with query access. */
typealias QueryCollectionHandle<T, QueryArgs> =
    arcs.core.storage.api.QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteCollectionHandle<T> = arcs.core.storage.api.ReadWriteCollectionHandle<T>

/** A collection handle with read and write access. */
typealias ReadQueryCollectionHandle<T, QueryArgs> =
        arcs.core.storage.api.ReadQueryCollectionHandle<T, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteQueryCollectionHandle<T, QueryArgs> =
        arcs.core.storage.api.ReadWriteQueryCollectionHandle<T, QueryArgs>
