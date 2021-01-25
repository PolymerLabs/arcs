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

import arcs.core.data.proto.SchemaProto
import arcs.core.data.proto.decode
import arcs.core.data.proto.encode
import arcs.core.util.toBase64Bytes
import arcs.core.util.toBase64String

/** Converts between [Schema]s and Base64-Bytes Strings. */
class DefaultSchemaSerializer : SchemaSerializer<String> {
  override fun serialize(schema: Schema): String {
    return schema.encode().toByteArray().toBase64String()
  }

  override fun deserialize(payload: String): Schema {
    return SchemaProto.parseFrom(payload.toBase64Bytes()).decode()
  }
}
