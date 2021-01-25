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

import kotlinx.coroutines.flow.Flow

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
  fun close()

  /**
   * Write-back: queue up data updates and let write-back threads decide how and
   * when to flush all data updates to the next storage layer.
   */
  suspend fun asyncFlush(job: suspend () -> Unit)

  /** Await completion of all active flush jobs. */
  suspend fun awaitIdle()
}
