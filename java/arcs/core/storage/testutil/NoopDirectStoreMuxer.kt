package arcs.core.storage.testutil

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.TypeVariable
import arcs.core.storage.CallbackToken
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

  override suspend fun on(
    callback: MuxedProxyCallback<CrdtData, CrdtOperation, Any?>
  ): CallbackToken = 0

  override suspend fun off(callbackToken: CallbackToken) {}

  override suspend fun getLocalData(muxId: String, callbackToken: CallbackToken): CrdtData {
    throw NotImplementedError()
  }

  override suspend fun clearStoresCache() {}

  override suspend fun idle() {}

  override suspend fun onProxyMessage(
    muxedMessage: MuxedProxyMessage<CrdtData, CrdtOperation, Any?>
  ) {}

  override suspend fun getStore(
    muxId: String,
    callbackToken: CallbackToken
  ): DirectStoreMuxer.StoreRecord<CrdtData, CrdtOperation, Any?> {
    throw NotImplementedError()
  }

  override val stores =
    emptyMap<String, DirectStoreMuxer.StoreRecord<CrdtData, CrdtOperation, Any?>>()
}
