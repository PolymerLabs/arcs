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

class DefaultSchemaSerializer : SchemaSerializer<String> {
  override fun serialize(schema: Schema): String {
    TODO("Implement serialization for Native")
  }

  override fun deserialize(payload: String): Schema {
    TODO("Implement serialization for Native")
  }
}
