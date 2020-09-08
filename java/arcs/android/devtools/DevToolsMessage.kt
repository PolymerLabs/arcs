package arcs.android.devtools

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
    fun toJson() = JsonValue.JsonObject(mapOf(
        "kind" to JsonValue.JsonString(kind),
        "message" to message
    )).toString()

    /** Track message types */
    companion object {
        /** A [RAW_MESSAGE] should be used to send raw [ProxyMessage]s to the client. */
        const val RAW_MESSAGE = "RawStoreMessage"
        const val STORE_SYNC = "StoreSyncMessage"
    }
}
