package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.SYNC_MESSAGE
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to inform DevTools that a [Store] received a
 * [SyncRequest].
 */
class StoreSyncMessage(override val message: JsonValue.JsonNumber) : DevToolsMessage {
  override val kind: String = SYNC_MESSAGE
}
