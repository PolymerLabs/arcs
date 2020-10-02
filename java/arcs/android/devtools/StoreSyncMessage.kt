package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.SYNC_MESSAGE
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to inform DevTools that a [Store] received a
 * [SyncRequest].
 */
class StoreSyncMessage(
  private val actualMessage: ProxyMessage<*, *, *>,
  private val storeType: String,
  private val storageKey: String
) : DevToolsMessage {
  override val kind: String = SYNC_MESSAGE
  override val message: JsonValue<*>
    get() = JsonValue.JsonObject(
      DevToolsMessage.STORE_ID to JsonValue.JsonNumber(actualMessage.id?.toDouble() ?: 0.0),
      DevToolsMessage.STORE_TYPE to JsonValue.JsonString(storeType),
      DevToolsMessage.STORAGE_KEY to JsonValue.JsonString(storageKey)
    )
}
