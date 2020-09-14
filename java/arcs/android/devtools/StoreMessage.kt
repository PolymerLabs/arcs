package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.ACTOR
import arcs.android.devtools.DevToolsMessage.Companion.ADDED
import arcs.android.devtools.DevToolsMessage.Companion.ADD_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.CLEAR_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.OLD_CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.OPERATIONS
import arcs.android.devtools.DevToolsMessage.Companion.REMOVED
import arcs.android.devtools.DevToolsMessage.Companion.REMOVE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.STORE_ID
import arcs.android.devtools.DevToolsMessage.Companion.STORE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.TYPE
import arcs.android.devtools.DevToolsMessage.Companion.UPDATE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.VALUE
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
            STORE_ID to JsonValue.JsonNumber(actualMessage.id?.toDouble() ?: 0.0),
            OPERATIONS to JsonValue.JsonArray(getMessageAsList())
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
                            TYPE to JsonValue.JsonString(UPDATE_TYPE),
                            VALUE to getValue(op.value),
                            ACTOR to JsonValue.JsonString(op.actor),
                            CLOCK to op.clock.toJson()
                        )
                    )
                }
                is CrdtSingleton.Operation.Clear<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            TYPE to JsonValue.JsonString(CLEAR_TYPE),
                            ACTOR to JsonValue.JsonString(op.actor),
                            CLOCK to op.clock.toJson()
                        )
                    )
                }
                is CrdtSet.Operation.Add<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            TYPE to JsonValue.JsonString(ADD_TYPE),
                            ADDED to getValue(op.added),
                            ACTOR to JsonValue.JsonString(op.actor),
                            CLOCK to op.clock.toJson()
                        )
                    )
                }
                is CrdtSet.Operation.Clear<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            TYPE to JsonValue.JsonString(CLEAR_TYPE),
                            ACTOR to JsonValue.JsonString(op.actor),
                            CLOCK to op.clock.toJson()
                        )
                    )
                }
                is CrdtSet.Operation.Remove<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            TYPE to JsonValue.JsonString(REMOVE_TYPE),
                            VALUE to getValue(op.removed),
                            ACTOR to JsonValue.JsonString(op.actor),
                            CLOCK to op.clock.toJson()
                        )
                    )
                }
                is CrdtSet.Operation.FastForward<*> -> {
                    list.add(
                        JsonValue.JsonObject(
                            TYPE to JsonValue.JsonString(ADD_TYPE),
                            ADDED to getAddedListValue(op.added),
                            REMOVED to getRemovedListValue(op.removed),
                            OLD_CLOCK to JsonValue.JsonString(op.oldClock.toString()),
                            CLOCK to op.clock.toJson()
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
    private fun VersionMap.toJson(): JsonValue<*> {
        val map = mutableMapOf<String, JsonValue<*>>()
        actors.forEach {
            map.put(it, JsonValue.JsonNumber(this[it].toDouble()))
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
}
