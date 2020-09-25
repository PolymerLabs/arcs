package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.RAW_MESSAGE
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to pass raw [ProxyMessage]s.
 */
class RawDevToolsMessage(override val message: JsonValue.JsonString) : DevToolsMessage {
  override val kind: String = RAW_MESSAGE
}
