package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation

class FakeStorageEndpointManager(
  private val fakeEndpoint: StoreEndpointFake<*, *, *>
) : StorageEndpointManager {
  override suspend fun <Data : CrdtData, Op : CrdtOperation, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    @Suppress("UNCHECKED_CAST")
    return fakeEndpoint as StorageEndpoint<Data, Op, T>
  }
}
