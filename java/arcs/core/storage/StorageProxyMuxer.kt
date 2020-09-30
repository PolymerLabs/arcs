package arcs.core.storage

import arcs.core.analytics.Analytics
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.util.Scheduler
import arcs.core.util.Time

/** TODO: KDoc. */
class StorageProxyMuxer<Data : CrdtData, Op : CrdtOperationAtTime, T> private constructor(
  private val storageEndpoint: StorageEndpoint<Data, Op, T>,
  private val storageProxyFactory: (StorageEndpoint<Data, Op, T>) -> StorageProxy<Data, Op, T>
) {
  /** Maps from `muxId` to [StorageProxy]. */
  private val storageProxies = mutableMapOf<String, StorageProxy<Data, Op, T>>()

  /** Returns a [StorageProxy] for the given [muxId], creating a new one if necessary. */
  fun getStorageProxy(muxId: String): StorageProxy<Data, Op, T> {
    return storageProxies.getOrPut(muxId) {
      storageProxyFactory(Endpoint(muxId))
    }
  }

  private suspend fun onMessage(message: ProxyMessage<Data, Op, T>) {
    require(message is ProxyMessage.MuxedProxyMessage) { "Expected MuxedProxyMessage" }
    val storageProxy = storageProxies.getValue(message.muxId)
    storageProxy.onMessage(message.message)
  }

  /**
   * A [StorageEndpoint] implementation which just wraps every [ProxyMessage] with the right
   * [muxId] and forwards it to the main [storageEndpoint].
   */
  private inner class Endpoint(
      private val muxId: String
  ) : StorageEndpoint<Data, Op, T> {
    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) {
      storageEndpoint.onProxyMessage(ProxyMessage.MuxedProxyMessage(muxId, message))
    }

    override suspend fun idle() = storageEndpoint.idle()

    override suspend fun close() = storageEndpoint.close()
  }

  companion object {
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> create(
      options: StoreOptions,
      storageEndpointManager: StorageEndpointManager,
      crdt: CrdtModel<Data, Op, T>,
      scheduler: Scheduler,
      time: Time,
      analytics: Analytics? = null
    ): StorageProxyMuxer<Data, Op, T> {
      val deferred = DeferredProxyCallback<Data, Op, T>()
      val storageEndpoint = storageEndpointManager.get(options, deferred)

      val storageProxyFactory: (StorageEndpoint<Data, Op, T>) -> StorageProxy<Data, Op, T> = { endpoint ->
        StorageProxy.create(options.storageKey, endpoint, crdt, scheduler, time, analytics)
      }
      return StorageProxyMuxer(storageEndpoint, storageProxyFactory).also {
        deferred.callback = it::onMessage
      }
    }
  }
}