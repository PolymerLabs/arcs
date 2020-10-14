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

import arcs.core.storage.keys.Protocols
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.consumeEach
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

typealias Protocol = String
typealias WriteBackProvider = (Protocol) -> WriteBack

/**
 * A layer to decouple local data updates and underlying storage layers flushes.
 *
 * The modern storage stacks including VFS page dirty write-back, io-scheduler
 * merging and re-ordering, flash device turbo-write and/or buffer flush, etc
 * are all implemented in an efficient way where no data/metadata is written
 * through to storage media for every single write operation unless explicitly
 * being requested.
 */
interface WriteBack {
  /** A flow which can be collected to observe idle->busy->idle transitions. */
  val idlenessFlow: Flow<Boolean>

  /** Dispose of this [WriteBack] and any resources it's using. */
  fun close() = Unit

  /**
   * Write-through: flush directly all data updates to the next storage layer.
   */
  suspend fun flush(job: suspend () -> Unit)

  /**
   * Write-back: queue up data updates and let write-back threads decide how and
   * when to flush all data updates to the next storage layer.
   */
  suspend fun asyncFlush(job: suspend () -> Unit)

  /** Await completion of all active flush jobs. */
  suspend fun awaitIdle()
}

/**
 * Write-back implementation for Arcs Stores.
 */
@OptIn(ExperimentalCoroutinesApi::class)
open class StoreWriteBack /* internal */ constructor(
  protocol: String,
  queueSize: Int,
  forceEnable: Boolean,
  val scope: CoroutineScope?
) : WriteBack {
  // Only apply write-back to physical storage media(s) unless forceEnable is specified.
  private val passThrough = atomic(
    !forceEnable && (scope == null || protocol != Protocols.DATABASE_DRIVER)
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
          if (!channel.isEmpty && !channel.isClosedForReceive) {
            channel.consumeEach {
              exitFlushSection {
                try {
                  it()
                } catch (e: Exception) {
                  log.info(e) { "Exception" }
                }
              }
            }
          }
          pendingJobsMutex.withLock { pendingJobsFlow.value = 0 }
        }
        .launchIn(scope)
    }
  }

  override fun close() = channel.cancel()

  override suspend fun flush(job: suspend () -> Unit) {
    if (!passThrough.value) flushSection { job() }
    else job()
  }

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

  private suspend inline fun flushSection(job: () -> Unit) {
    enterFlushSection()
    job()
    exitFlushSection()
  }

  private suspend inline fun enterFlushSection(job: () -> Unit = {}) {
    pendingJobsMutex.withLock { pendingJobsFlow.value++ }
    job()
  }

  private suspend inline fun exitFlushSection(job: () -> Unit = {}) {
    job()
    pendingJobsMutex.withLock { pendingJobsFlow.value-- }
  }
}
