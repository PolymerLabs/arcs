package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.ACTOR
import arcs.android.devtools.DevToolsMessage.Companion.ADDED
import arcs.android.devtools.DevToolsMessage.Companion.ADD_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.CLEAR_ALL_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.CLEAR_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.FAST_FORWARD_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.OLD_CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.OPERATIONS
import arcs.android.devtools.DevToolsMessage.Companion.REMOVED
import arcs.android.devtools.DevToolsMessage.Companion.REMOVE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.STORAGE_KEY
import arcs.android.devtools.DevToolsMessage.Companion.STORE_ID
import arcs.android.devtools.DevToolsMessage.Companion.STORE_OP_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.TYPE
import arcs.android.devtools.DevToolsMessage.Companion.UPDATE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.VALUE
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue

/**
 * An implementation of [StoreMessage] to inform DevTools that a [Store] received a
 * [CrdtOperation].
 */
class StoreOperationMessage(
  private val actualMessage: ProxyMessage.Operations<CrdtData, CrdtOperation, Any?>,
  private val storeType: String,
  private val storageKey: String
) : StoreMessage {
  override val kind: String = STORE_OP_MESSAGE
  override val message: JsonValue<*>
    get() = JsonValue.JsonObject(
      STORE_ID to JsonValue.JsonNumber(actualMessage.id?.toDouble() ?: 0.0),
      STORE_TYPE to JsonValue.JsonString(storeType),
      STORAGE_KEY to JsonValue.JsonString(storageKey),
      OPERATIONS to actualMessage.toJson()
    )

  /**
   * Turn the ProxyMessage into a List of JsonValues.
   */
  private fun ProxyMessage.Operations<CrdtData, CrdtOperation, Any?>.toJson() =
    JsonValue.JsonArray(
      operations.map { op ->
        when (op) {
          is CrdtSingleton.Operation.Update<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(UPDATE_TYPE),
              VALUE to op.value.toJson(),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtSingleton.Operation.Clear<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(CLEAR_TYPE),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtSet.Operation.Add<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(ADD_TYPE),
              ADDED to op.added.toJson(),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtSet.Operation.Clear<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(CLEAR_TYPE),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtSet.Operation.Remove<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(REMOVE_TYPE),
              REMOVED to JsonValue.JsonString(op.removed),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtSet.Operation.FastForward<*> -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(FAST_FORWARD_TYPE),
              ADDED to getAddedListValue(op.added),
              REMOVED to getRemovedListValue(op.removed),
              OLD_CLOCK to JsonValue.JsonString(op.oldClock.toString()),
              CLOCK to op.clock.toJson()
            )
          }
          is CrdtEntity.Operation.ClearAll -> {
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(CLEAR_ALL_TYPE),
              ACTOR to JsonValue.JsonString(op.actor),
              CLOCK to op.clock.toJson()
            )
          }
          else -> JsonValue.JsonString(op.toString())
        }
      }
    )

  /**
   * Return the items in the removed list as a JsonArray
   */
  private fun getRemovedListValue(list: MutableList<out Referencable>): JsonValue.JsonArray {
    val array = list.map {
      it.toJson()
    }
    return JsonValue.JsonArray(array)
  }

  /**
   * Return the items in the added list as a JsonArray
   */
  private fun getAddedListValue(
    list: MutableList<out CrdtSet.DataValue<out Referencable>>
  ): JsonValue.JsonArray {
    val array = list.map {
      it.value.toJson()
    }
    return JsonValue.JsonArray(array)
  }
}
