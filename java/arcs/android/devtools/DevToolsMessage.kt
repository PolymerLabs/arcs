package arcs.android.devtools

import arcs.core.crdt.CrdtOperation
import arcs.core.util.JsonValue

/**
 * An interface for messages between [DevToolsService] and the client.
 */
interface DevToolsMessage {
  /** The type of DevToolsMessage */
  val kind: String

  /** The message to be passed */
  val message: JsonValue<*>

  /** Return a JSON string that can be passed to the client. */
  fun toJson() = JsonValue.JsonObject(
    mapOf(
      KIND to JsonValue.JsonString(kind),
      MESSAGE to message
    )
  ).toString()

  /** Track message constants */
  companion object {
    /** A [RAW_MESSAGE] should be used to send raw [ProxyMessage]s to the client. */
    const val RAW_MESSAGE = "RawStoreMessage"

    /** A [STORE_SYNC] should be used to notify the client that a store has synced. */
    const val SYNC_MESSAGE = "StoreSyncMessage"

    /** A [MODEL_UPDATE_MESSAGE] is used when a [ModelUpdate] [ProxyMessage] is received. */
    const val MODEL_UPDATE_MESSAGE = "ModelUpdateMessage"

    /** A [STORE_OP_MESSAGE] should be used when an [Operation] [ProxyMessage] is received. */
    const val STORE_OP_MESSAGE = "StoreOperationMessage"

    /** A [CLEAR_TYPE] should be used when a clear message is received. */
    const val CLEAR_TYPE = "clear"

    /** A [CLEAR_ALL_TYPE] should be used when a clear all message is received. */
    const val CLEAR_ALL_TYPE = "clearAll"

    /** An [UPDATE_TYPE] should be used when a [CrdtSingleton.Operation.Update] is received. */
    const val UPDATE_TYPE = "update"

    /** An [ADD_TYPE] should be used when a [CrdtSet.Operation.Add] is received. */
    const val ADD_TYPE = "add"

    /** A [REMOVE_TYPE] should be used when a [CrdtSet.Operation.Remove] is received. */
    const val REMOVE_TYPE = "remove"

    /** A [REMOVE_TYPE] should be used when a [CrdtSet.Operation.Fastforward] is received. */
    const val FAST_FORWARD_TYPE = "fastForward"

    // String constants to be used in JSON messages.
    /** JSON key for [kind]. */
    const val KIND = "kind"

    /** JSON key for [message]. */
    const val MESSAGE = "message"

    /** JSON key for [Store.id]. */
    const val STORE_ID = "id"

    /** JSON key for [CrdtOperation]. */
    const val OPERATIONS = "operations"

    /** JSON key for the [CrdtOperation]'s type. */
    const val TYPE = "type"

    /** JSON key for the [actor] of the [CrdtOperation]. */
    const val ACTOR = "actor"

    /** JSON key for the update value from a [CrdtOperation]. */
    const val VALUE = "value"

    /** Json Key for the values added in a [CrdtOperation]. */
    const val ADDED = "added"

    /** Json Key for the values removed in a [CrdtOperation]. */
    const val REMOVED = "removed"

    /** Json Key for the old clock in a [FastForward] operation. */
    const val OLD_CLOCK = "oldClock"

    /** Json Key for the clock in a [CrdtOperation]. */
    const val CLOCK = "clock"

    /** Json key for the versionmap. */
    const val VERSIONMAP = "versionMap"

    /** Json key for the type of [Store] the message comes from. */
    const val STORE_TYPE = "storeType"

    /** To be used as the [STORE_TYPE] for a [ReferenceModeStore]. */
    const val REFERENCEMODE = "referenceMode"

    /** To be used as the [STORE_TYPE] for a [DirectStore]. */
    const val DIRECT = "direct"

    /** Json key for the representation of the Storage Key */
    const val STORAGE_KEY = "storageKey"
  }
}
