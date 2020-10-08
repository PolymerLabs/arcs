package arcs.android.devtools

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.Reference
import arcs.core.util.JsonValue

/**
 * A child class of [DevToolsMessage] that better represents messages from [Store]s.
 */
interface StoreMessage : DevToolsMessage {

  /**
   * Turn the [VersionMap] into a [JsonValue.JsonObject].
   */
  fun VersionMap.toJson() = JsonValue.JsonObject(
    actors.map { it to JsonValue.JsonNumber(this[it].toDouble()) }.toMap()
  )

  /**
   * Transform a [Referencable] to Json.
   */
  fun Referencable.toJson(): JsonValue<*> = when (this) {
    is Reference -> JsonValue.JsonObject(
      "id" to JsonValue.JsonString(this.id),
      "storageKey" to JsonValue.JsonString(this.storageKey.toKeyString()),
      "version" to (this.version?.toJson() ?: JsonValue.JsonNull),
      "creationTimestamp" to JsonValue.JsonNumber(this.creationTimestamp.toDouble()),
      "expirationTimestamp" to JsonValue.JsonNumber(
        this.expirationTimestamp.toDouble()
      )
    )
    is RawEntity -> JsonValue.JsonObject(
      "creationTimestamp" to JsonValue.JsonNumber(creationTimestamp.toDouble()),
      "expirationTimestamp" to JsonValue.JsonNumber(creationTimestamp.toDouble()),
      "singletons" to JsonValue.JsonObject(
        singletons.mapValues { (_, value) -> value?.toJson() ?: JsonValue.JsonNull }
      ),
      "collections" to JsonValue.JsonObject(
        collections.mapValues { (_, value) -> JsonValue.JsonArray(value.map { it.toJson() }) }
      )
    )
    is ReferencablePrimitive<*> -> {
      when (val valueValue = this.value) {
        is String -> JsonValue.JsonString(valueValue)
        is Boolean -> JsonValue.JsonBoolean(valueValue)
        is Double -> JsonValue.JsonNumber(valueValue)
        is Byte -> JsonValue.JsonNumber(valueValue.toDouble())
        is Int -> JsonValue.JsonNumber(valueValue.toDouble())
        is Long -> JsonValue.JsonNumber(valueValue.toDouble())
        is Float -> JsonValue.JsonNumber(valueValue.toDouble())
        // TODO(b/162955831): ByteArray and BigInt
        else -> JsonValue.JsonString(valueRepr)
      }
    }
    is CrdtEntity.ReferenceImpl -> unwrap().toJson()
    else -> JsonValue.JsonString(this.toString())
  }
}
