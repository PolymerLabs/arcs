/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data

/** Encodes / Decodes [Schema]s. */
interface SchemaSerializer<T> {
  /** Converts a [Schema] into a serialization format. */
  fun serialize(schema: Schema): T

  /** Decodes a serialized payload into a [Schema]. */
  fun deserialize(payload: T): Schema
}
