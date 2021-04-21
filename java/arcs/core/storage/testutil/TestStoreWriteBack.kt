package arcs.core.storage.testutil

import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.StoreWriteBack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel

/** Test [StoreWriteBack] implementation for use in unit tests. */
class TestStoreWriteBack(protocol: StorageKeyProtocol, scope: CoroutineScope) : StoreWriteBack(
  protocol = protocol,
  queueSize = Channel.UNLIMITED,
  forceEnable = false,
  scope = scope
) {
  var closed: Boolean = false
    private set

  override fun close() {
    super.close()
    closed = true
  }
}
