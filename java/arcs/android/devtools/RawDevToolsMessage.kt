package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.RAW_MESSAGE
import org.json.JSONObject

/**
 * An implementation of [DevToolsMessage] to pass raw [ProxyMessage]s.
 */
class RawDevToolsMessage(override val message: String) : DevToolsMessage {
    override val kind: String = RAW_MESSAGE

    override fun toJson(): String {
        val jo = JSONObject()
        jo.put("kind", kind)
        jo.put("message", message)
        return jo.toString()
    }
}
