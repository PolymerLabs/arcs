/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage

import arcs.android.storage.StorageServiceMessageProto
import arcs.android.storage.service.IStorageChannel
import arcs.android.storage.service.suspendForResultCallback
import arcs.android.storage.toProto
import arcs.core.common.CounterFlow
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.util.TaggedLog
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first

/**
 * An implementation of [StorageEndpoint] that communicates with its [ActiveStore] via an
 * [IStorageChannel].
 *
 * This is not currently in use but it is intended to replace [AndroidStorageEndpoint]. These will
 * be provided by [AndroidStorageServiceEndpointManager].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AndroidStorageEndpointNg<Data : CrdtData, Op : CrdtOperation, T> constructor(
  private val service: IStorageChannel,
  private val onClose: () -> Unit
) : StorageEndpoint<Data, Op, T> {
  private val outgoingMessagesCount = CounterFlow(0)

  private val log = TaggedLog { "AndroidStorageEndpointNg" }

  private val closed = atomic(false)

  init {
    if (!BuildFlags.STORAGE_SERVICE_NG) {
      throw BuildFlagDisabledError("STORAGE_SERVICE_NG")
    }
  }

  override suspend fun idle() {
    check(!closed.value) { "Can not call idle after close" }
    log.debug { "Waiting for service store to be idle" }
    outgoingMessagesCount.flow.first { it == 0 }
    suspendForResultCallback { resultCallback ->
      service.idle(TIMEOUT_IDLE_WAIT_MILLIS, resultCallback)
    }
    log.debug { "Endpoint is idle" }
  }

  override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) {
    check(!closed.value) { "onProxyMessage can not be called after close" }
    outgoingMessagesCount.increment()
    try {
      suspendForResultCallback { resultCallback ->
        service.sendMessage(
          StorageServiceMessageProto.newBuilder()
            .setProxyMessage(message.toProto())
            .build()
            .toByteArray(),
          resultCallback
        )
      }
    } catch (e: CrdtException) {
      log.debug(e) { "CrdtException occurred in onProxyMessage" }
    } finally {
      outgoingMessagesCount.decrement()
    }
  }

  override suspend fun close() {
    closed.value = true
    suspendForResultCallback { resultCallback ->
      service.close(resultCallback)
    }
    onClose()
  }

  companion object {
    private const val TIMEOUT_IDLE_WAIT_MILLIS = 10000L
  }
}
