package arcs.android.devtools

/**
 * An interface for messages between [DevToolsService] and the client.
 */
interface DevToolsMessage {

    /** The type of DevToolsMessage */
    val kind: String
    /** The message to be passed */
    val message: String

    /** Return a JSON string that can be passed to the client. */
    fun toJson(): String

    /** Track message types */
    companion object {
        val RAW_MESSAGE: String = "RawStoreMessage"
    }
}
