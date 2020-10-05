package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.MODEL_UPDATE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORAGE_KEY
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
  private val storeType: String,
  private val storageKey: String
) : StoreMessage {
  override val kind: String = MODEL_UPDATE_MESSAGE
  override val message: JsonValue<*>
    get() = JsonValue.JsonObject(
      "model" to getModel(actualMessage.model),
      STORE_TYPE to JsonValue.JsonString(storeType),
      STORAGE_KEY to JsonValue.JsonString(storageKey)
    )

  /**
   * Transform the [CrdtData] into JSON.
   */
  private fun getModel(model: CrdtData) = when (model) {
    is CrdtEntity.Data -> JsonValue.JsonObject(
      VERSIONMAP to model.versionMap.toJson(),
      "singletons" to singletonsJson(model.singletons),
      "collections" to collectionsJson(model.collections)
    )
    // TODO(b/162955831): other types
    else -> JsonValue.JsonNull
  }

  /**
   * Transform the map of names to collections into JSON.
   */
  private fun collectionsJson(
    collections: Map<FieldName, CrdtSet<CrdtEntity.Reference>>
  ) = JsonValue.JsonObject(
    collections.map {
      (name, collection) -> name to JsonValue.JsonObject(
        VERSIONMAP to collection.data.versionMap.toJson(),
        "values" to getValues(collection.data.values)
      )
    }.toMap()
  )

  /**
   * Transform the map of names to singletons into JSON.
   */
  private fun singletonsJson(
    singletons: Map<FieldName, CrdtSingleton<CrdtEntity.Reference>>
  ) = JsonValue.JsonObject(
    singletons.map {
      (name, singleton) -> name to JsonValue.JsonObject(
        VERSIONMAP to singleton.data.versionMap.toJson(),
        "values" to getValues(singleton.data.values)
      )
    }.toMap()
  )

  /**
   * Transform the values of fields into JSON.
   */
  private fun getValues(
    values: MutableMap<ReferenceId, CrdtSet.DataValue<CrdtEntity.Reference>>
  ) = JsonValue.JsonObject(values.mapValues { (ref, value) -> value.value.toJson() })
}
