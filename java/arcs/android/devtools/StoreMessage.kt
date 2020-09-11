package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.STORE_MESSAGE
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to inform DevTools that a [Store] received a
 * [CrdtOperation].
 */
class StoreMessage(
    private val actualMessage: ProxyMessage.Operations<CrdtData, CrdtOperation, Any?>
) : DevToolsMessage {
    override val kind: String = STORE_MESSAGE
    override val message: JsonValue<*>
        get() = JsonValue.JsonObject(
            "id" to JsonValue.JsonNumber(actualMessage.id?.toDouble() ?: 0.0),
            "operations" to JsonValue.JsonArray(getMessageAsList())
        )

    /**
     * Turn the ProxyMessage into a List of JsonValues.
     */
    private fun getMessageAsList(): List<JsonValue<*>> {
        val list = mutableListOf<JsonValue<*>>()
        actualMessage.operations.forEach { op ->
            when (op) {
                is CrdtSingleton.Operation.Update<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            "type" to JsonValue.JsonString(UPDATE_TYPE),
                            "value" to getValue(op.value),
                            "actor" to JsonValue.JsonString(op.actor),
                            "clock" to getJsonClock(op.clock)
                        )
                    )
                }
                is CrdtSingleton.Operation.Clear<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                                "type" to JsonValue.JsonString(CLEAR_TYPE),
                                "actor" to JsonValue.JsonString(op.actor),
                                "clock" to JsonValue.JsonString(op.clock.toString())
                        )
                    )
                }
                is CrdtSet.Operation.Add<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            "type" to JsonValue.JsonString(ADD_TYPE),
                            "added" to getValue(op.added),
                            "actor" to JsonValue.JsonString(op.actor),
                            "clock" to JsonValue.JsonString(op.clock.toString())
                        )
                    )
                }
                is CrdtSet.Operation.Clear<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            "type" to JsonValue.JsonString(CLEAR_TYPE),
                            "actor" to JsonValue.JsonString(op.actor),
                            "clock" to JsonValue.JsonString(op.clock.toString())
                        )
                    )
                }
                is CrdtSet.Operation.Remove<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            "type" to JsonValue.JsonString(REMOVE_TYPE),
                            "value" to getValue(op.removed),
                            "actor" to JsonValue.JsonString(op.actor),
                            "clock" to JsonValue.JsonString(op.clock.toString())
                        )
                    )
                }
                is CrdtSet.Operation.FastForward<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            "type" to JsonValue.JsonString(ADD_TYPE),
                            "added" to getAddedListValue(op.added),
                            "removed" to getRemovedListValue(op.removed),
                            "oldClock" to JsonValue.JsonString(op.oldClock.toString()),
                            "clock" to JsonValue.JsonString(op.clock.toString())
                        )
                    )
                }
            }
        }
        return list
    }

    /**
     * Turn the clock [VersionMap] into a [JsonValue.JsonObject].
     */
    private fun getJsonClock(clock: VersionMap): JsonValue<*> {
        val map = mutableMapOf<String, JsonValue<*>>()
        clock.actors.forEach {
            map.put(it, JsonValue.JsonNumber(clock[it].toDouble()))
        }
        return JsonValue.JsonObject(map)
    }

    /**
     * Return the items in the removed list as a JsonArray
     */
    private fun getRemovedListValue(list: MutableList<out Referencable>): JsonValue.JsonArray {
        val array = mutableListOf<JsonValue<*>>()
        list.forEach {
            array.add(getValue(it))
        }
        return JsonValue.JsonArray(array)
    }

    /**
     * Return the items in the added list as a JsonArray
     */
    private fun getAddedListValue(
        list: MutableList<out CrdtSet.DataValue<out Referencable>>
    ): JsonValue.JsonArray {
        val array = mutableListOf<JsonValue<*>>()
        list.forEach {
            array.add(getValue(it.value))
        }
        return JsonValue.JsonArray(array)
    }

    /**
     * Get the primitive value of a [Referencable].
     */
    private fun getValue(value: Referencable?): JsonValue<*> {
        when (value) {
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
        }
        return JsonValue.JsonNull
    }

    companion object {
        /** A [CLEAR_TYPE] should be used when a clear message is received. */
        const val CLEAR_TYPE = "clear"
        /** An [UPDATE_TYPE] should be used when a [CrdtSingleton.Operation.Update] is received. */
        const val UPDATE_TYPE = "update"
        /** An [ADD_TYPE] should be used when a [CrdtSet.Operation.Add] is received. */
        const val ADD_TYPE = "add"
        /** A [REMOVE_TYPE] should be used when a [CrdtSet.Operation.Remove] is received. */
        const val REMOVE_TYPE = "remove"
    }
}
