package arcs.core.storage.testutil

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.TypeVariable
import arcs.core.storage.DirectStoreMuxer
import arcs.core.storage.MuxedProxyCallback
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedDirectStoreMuxer
import arcs.core.type.Type

/** No-op implementation of [DirectStoreMuxer] used for testing. */
open class NoopDirectStoreMuxer : UntypedDirectStoreMuxer {
  override val storageKey: StorageKey = DummyStorageKey("dummy")
  override val backingType: Type = TypeVariable("dummy")

  override fun on(callback: MuxedProxyCallback<CrdtData, CrdtOperation, Any?>): Int = 0

  override fun off(token: Int) {}

  override suspend fun getLocalData(referenceId: String, callbackId: Int): CrdtData {
    throw NotImplementedError()
  }

  override suspend fun clearStoresCache() {}

  override suspend fun idle() {}

  override suspend fun onProxyMessage(
    muxedMessage: MuxedProxyMessage<CrdtData, CrdtOperation, Any?>
  ) {}

  override val stores =
    emptyMap<String, DirectStoreMuxer.StoreRecord<CrdtData, CrdtOperation, Any?>>()
}
