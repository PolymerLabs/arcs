package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.STORE_SYNC
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to inform DevTools that a [Store] received a
 * [SyncRequest].
 */
class StoreSyncMessage(override val message: JsonValue.JsonNumber) : DevToolsMessage {
    override val kind: String = STORE_SYNC
}
