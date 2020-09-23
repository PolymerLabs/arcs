package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.MODEL_UPDATE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.VERSIONMAP
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.FieldName
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue

/**
 * An implementation of [StoreMessage] to inform DevTools that a [Store] received a
 * [ModelUpdate].
 */
class ModelUpdateMessage(
    private val actualMessage: ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>,
    private val storeType: String
) : StoreMessage {
    override val kind: String = MODEL_UPDATE_MESSAGE
    override val message: JsonValue<*>
        get() = JsonValue.JsonObject(
            "model" to getModel(actualMessage.model),
            STORE_TYPE to JsonValue.JsonString(storeType)
        )

    /**
     * Transform the [CrdtData] into JSON.
     */
    private fun getModel(model: CrdtData): JsonValue<*> {
        when (model) {
            is CrdtEntity.Data -> {
                return JsonValue.JsonObject(
                    VERSIONMAP to model.versionMap.toJson(),
                    "singletons" to singletonsJson(model.singletons),
                    "collections" to collectionsJson(model.collections)
                )
            }
            // TODO(heimlich): other types
        }
        return JsonValue.JsonNull
    }

    /**
     * Transform the map of names to collections into JSON.
     */
    private fun collectionsJson(
        collections: Map<FieldName, CrdtSet<CrdtEntity.Reference>>
    ): JsonValue<*> {
        val myList = mutableListOf<JsonValue<*>>()
        collections.forEach { (name, collection) ->
            myList.add(JsonValue.JsonObject(
                name to JsonValue.JsonObject(
                    VERSIONMAP to collection.data.versionMap.toJson(),
                    "values" to getValues(collection.data.values)
                )
            ))
        }
        return JsonValue.JsonArray(myList)
    }

    /**
     * Transform the map of names to singletons into JSON.
     */
    private fun singletonsJson(
        singletons: Map<FieldName, CrdtSingleton<CrdtEntity.Reference>>
    ): JsonValue<*> {
        val myList = mutableListOf<JsonValue<*>>()
        singletons.forEach { (name, singleton) ->
            myList.add(JsonValue.JsonObject(
                name to JsonValue.JsonObject(
                    VERSIONMAP to singleton.data.versionMap.toJson(),
                    "values" to getValues(singleton.data.values)
                )
            ))
        }
        return JsonValue.JsonArray(myList)
    }

    /**
     * Transform the values of fields into JSON.
     */
    private fun getValues(
        values: MutableMap<ReferenceId, CrdtSet.DataValue<CrdtEntity.Reference>>
    ): JsonValue<*> {
        val myMap = mutableMapOf<String, JsonValue<*>>()
        values.forEach { (ref, value) ->
            myMap[ref] = getValue(value.value)
        }
        return JsonValue.JsonObject(myMap)
    }
}
