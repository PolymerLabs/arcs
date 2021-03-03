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

package arcs.android.devtools

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.RawReference
import arcs.core.util.JsonValue
import arcs.core.util.JsonValue.JsonArray
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNull
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString

/**
 * Turn the [VersionMap] into a [JsonObject].
 */
fun VersionMap.toJson() = JsonObject(
  actors.map { it to JsonNumber(this[it].toDouble()) }.toMap()
)

/**
 * Transform a [Referencable] into a [JsonValue].
 */
fun Referencable.toJson(): JsonValue<*> = when (this) {
  is RawReference -> JsonObject(
    "id" to JsonString(this.id),
    "storageKey" to JsonString(this.storageKey.toString()),
    "version" to (this.version?.toJson() ?: JsonNull),
    "creationTimestamp" to JsonNumber(this.creationTimestamp.toDouble()),
    "expirationTimestamp" to JsonNumber(
      this.expirationTimestamp.toDouble()
    ),
    "isHardReference" to JsonBoolean(isHardReference)
  )
  is RawEntity -> JsonObject(
    "id" to JsonString(id),
    "singletons" to JsonObject(
      singletons.mapValues { (_, value) -> value?.toJson() ?: JsonNull }
    ),
    "collections" to JsonObject(
      collections.mapValues { (_, value) -> JsonArray(value.map { it.toJson() }) }
    ),
    "creationTimestamp" to JsonNumber(creationTimestamp.toDouble()),
    "expirationTimestamp" to JsonNumber(expirationTimestamp.toDouble())
  )
  is ReferencablePrimitive<*> -> {
    when (val value = this.value) {
      is String -> JsonString(value)
      is Boolean -> JsonBoolean(value)
      is Double -> JsonNumber(value)
      is Byte -> JsonNumber(value.toDouble())
      is Int -> JsonNumber(value.toDouble())
      is Long -> JsonNumber(value.toDouble())
      is Float -> JsonNumber(value.toDouble())
      // TODO(b/162955831): ByteArray and BigInt
      else -> JsonString(valueRepr)
    }
  }
  is ReferencableList<*> -> JsonArray(value.map { it.toJson() })
  is CrdtEntity.ReferenceImpl -> unwrap().toJson()
  else -> JsonString(this.toString())
}
