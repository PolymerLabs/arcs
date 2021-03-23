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
import arcs.core.entity.WriteQueryCollectionHandle
import arcs.core.entity.WriteSingletonHandle

/** Base interface for all handle classes. */
typealias Handle = Handle

/** A singleton handle with read access. */
typealias ReadSingletonHandle<E> = ReadSingletonHandle<E>

/** A singleton handle with write access. */
typealias WriteSingletonHandle<I> = WriteSingletonHandle<I>

/** A singleton handle with read and write access. */
typealias ReadWriteSingletonHandle<E, I> = ReadWriteSingletonHandle<E, I>

/** A collection handle with read access. */
typealias ReadCollectionHandle<E> = ReadCollectionHandle<E>

/** A collection handle with write access. */
typealias WriteCollectionHandle<I> = WriteCollectionHandle<I>

/** A collection handle with query access. */
typealias QueryCollectionHandle<E, QueryArgs> = QueryCollectionHandle<E, QueryArgs>

/** A collection handle with read and write access. */
typealias ReadWriteCollectionHandle<E, I> = ReadWriteCollectionHandle<E, I>

/** A collection handle with read and query access. */
typealias ReadQueryCollectionHandle<E, QueryArgs> = ReadQueryCollectionHandle<E, QueryArgs>

/** A collection handle with write and query access. */
typealias WriteQueryCollectionHandle<I, QueryArgs> = WriteQueryCollectionHandle<I, QueryArgs>

/** A collection handle with read, write and query access. */
typealias ReadWriteQueryCollectionHandle<E, I, QueryArgs> =
  ReadWriteQueryCollectionHandle<E, I, QueryArgs>
