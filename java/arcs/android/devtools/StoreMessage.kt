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
     * Get the primitive value of a [Referencable].
     */
    fun getValue(value: Referencable?): JsonValue<*> {
        when (value) {
            is Reference -> {
                return JsonValue.JsonObject(
                    "id" to JsonValue.JsonString(value.id),
                    "storageKey" to JsonValue.JsonString(value.storageKey.toKeyString()),
                    "version" to (value.version?.toJson() ?: JsonValue.JsonNull),
                    "creationTimestamp" to JsonValue.JsonNumber(value.creationTimestamp.toDouble()),
                    "expirationTimestamp" to JsonValue.JsonNumber(
                        value.expirationTimestamp.toDouble()
                    )
                )
            }
            is RawEntity -> {
                val map = mutableMapOf<String, JsonValue<*>>()
                value.singletons.forEach { name, referenceable ->
                    map[name] = getValue(referenceable)
                }
                return JsonValue.JsonObject(map)
            }
            is ReferencablePrimitive<*> -> {
                val valueValue = value.value
                return when (valueValue) {
                    is String -> JsonValue.JsonString(valueValue)
                    is Boolean -> JsonValue.JsonBoolean(valueValue)
                    is Double -> JsonValue.JsonNumber(valueValue)
                    is Byte -> JsonValue.JsonNumber(valueValue.toDouble())
                    is Int -> JsonValue.JsonNumber(valueValue.toDouble())
                    is Long -> JsonValue.JsonNumber(valueValue.toDouble())
                    is Float -> JsonValue.JsonNumber(valueValue.toDouble())
                    // TODO(heimlich): ByteArray and BigInt
                    else -> JsonValue.JsonString(value.valueRepr)
                }
            }
            else -> {
                return JsonValue.JsonString(value.toString())
            }
        }
        return JsonValue.JsonNull
    }
}
