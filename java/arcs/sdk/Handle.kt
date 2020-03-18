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

import arcs.core.entity.Handle
import arcs.core.entity.QueryCollectionHandle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadQueryCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle

/** Base interface for all handle classes. */
typealias Handle = Handle

/** A singleton handle with read access. */
typealias ReadSingletonHandle<T> = ReadSingletonHandle<T>

/** A singleton handle with write access. */
typealias WriteSingletonHandle<T> = WriteSingletonHandle<T>

/** A singleton handle with read and write access. */
typealias ReadWriteSingletonHandle<T> = ReadWriteSingletonHandle<T>

/** A collection handle with read access. */
typealias ReadCollectionHandle<T> = ReadCollectionHandle<T>

/** A collection handle with write access. */
typealias WriteCollectionHandle<T> = WriteCollectionHandle<T>

/** A collection handle with query access. */
typealias QueryCollectionHandle<T, QueryArgs> =
    QueryCollectionHandle<T, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteCollectionHandle<T> = ReadWriteCollectionHandle<T>

/** A collection handle with read and query access. */
typealias ReadQueryCollectionHandle<T, QueryArgs> =
    ReadQueryCollectionHandle<T, QueryArgs>

/** A collection handle with read, write and query access. */
typealias ReadWriteQueryCollectionHandle<T, QueryArgs> =
    ReadWriteQueryCollectionHandle<T, QueryArgs>
