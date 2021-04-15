/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Write-back implementation for Arcs Stores.
 */
@OptIn(ExperimentalCoroutinesApi::class)
open class StoreWriteBack /* internal */ constructor(
  protocol: StorageKeyProtocol,
  queueSize: Int,
  forceEnable: Boolean,
  scope: CoroutineScope?
) : WriteBack {
  // Only apply write-back to physical storage media(s) unless forceEnable is specified.
  private val passThrough = atomic(
    !forceEnable && (scope == null || protocol != StorageKeyProtocol.Database)
  )

  // The number of active flush jobs.
  private val pendingJobsMutex = Mutex()
  private val pendingJobsFlow = MutableStateFlow(0)

  // Internal asynchronous write-back channel for scheduling flush jobs.
  private val channel: Channel<suspend () -> Unit> = Channel(queueSize)

  override val idlenessFlow: Flow<Boolean> = pendingJobsFlow
    .map { it == 0 }
    .distinctUntilChanged()

  private val log = TaggedLog { "StoreWriteBack" }

  init {
    // One of write-back thread(s) will wake up and execute flush jobs in FIFO order
    // when there are pending flush jobs in queue. Powerful features like batching,
    // merging, filtering, etc can be implemented at this call-site in the future.
    if (!passThrough.value && scope != null) {
      channel.consumeAsFlow()
        .onEach {
          // Neither black out pending flush jobs in this channel nor propagate
          // the exception within the scope to affect flush jobs at other stores.
          exitFlushSection {
            // TODO(wkorman): Consider adding TaggedLog support for logging
            // exceptions to get a stack trace without requiring a message.
            try {
              it()
            } catch (e: Exception) {
              log.info(e) { "Exception" }
            }
          }
        }
        .onCompletion {
          // Upon cancellation of the write-back scope, change to write-through mode,
          // consume all pending flush jobs then release all awaitings.
          passThrough.update { true }
          pendingJobsMutex.withLock {
            if (pendingJobsFlow.value > 0) log.warning {
              "WriteBack cancelled with ${pendingJobsFlow.value} pending jobs"
            }
            pendingJobsFlow.value = 0
          }
        }
        .launchIn(scope)
    }
  }

  override fun close() = channel.cancel()

  override suspend fun asyncFlush(job: suspend () -> Unit) {
    if (!passThrough.value) enterFlushSection {
      // Queue up a flush task can run average 3x-5x faster than launching it.
      // Fall back to write-through when the write-back channel is cancelled or closed.
      try {
        channel.send(job)
      } catch (_: Exception) {
        exitFlushSection { job() }
      }
    } else job()
  }

  override suspend fun awaitIdle() { idlenessFlow.first { it } }

  private suspend inline fun enterFlushSection(job: () -> Unit = {}) {
    pendingJobsMutex.withLock { pendingJobsFlow.value++ }
    job()
  }

  private suspend inline fun exitFlushSection(job: () -> Unit = {}) {
    job()
    pendingJobsMutex.withLock { pendingJobsFlow.value-- }
  }
}
