package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.RAW_MESSAGE

/**
 * An implementation of [DevToolsMessage] to pass raw [ProxyMessage]s.
 */
class RawDevToolsMessage(override val message: String) : DevToolsMessage {
    override val kind: String = RAW_MESSAGE

    override fun toJson(): String {
        return "{kind: \"$kind\", message: \"$message\"}"
    }
}
