package arcs.android.devtools

import arcs.core.common.Referencable
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
     * Turn the clock [VersionMap] into a [JsonValue.JsonObject].
     */
    fun VersionMap.toJson(): JsonValue<*> {
        val map = mutableMapOf<String, JsonValue<*>>()
        actors.forEach {
            map.put(it, JsonValue.JsonNumber(this[it].toDouble()))
        }
        return JsonValue.JsonObject(map)
    }

    /**
     * Transform a [Referencable] to Json.
     */
    fun Referencable.toJson(): JsonValue<*> = when (this) {
        is Reference -> {
            JsonValue.JsonObject(
                "id" to JsonValue.JsonString(this.id),
                "storageKey" to JsonValue.JsonString(this.storageKey.toKeyString()),
                "version" to (this.version?.toJson() ?: JsonValue.JsonNull),
                "creationTimestamp" to JsonValue.JsonNumber(this.creationTimestamp.toDouble()),
                "expirationTimestamp" to JsonValue.JsonNumber(
                    this.expirationTimestamp.toDouble()
                )
            )
        }
        is RawEntity -> {
            val map = mutableMapOf<String, JsonValue<*>>()
            this.singletons.forEach { name, referenceable ->
                map[name] = referenceable?.toJson() ?: JsonValue.JsonNull
            }
            JsonValue.JsonObject(map)
        }
        is ReferencablePrimitive<*> -> {
            val valueValue = this.value
            when (valueValue) {
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
        else -> {
            JsonValue.JsonString(this.toString())
        }
    }
}
