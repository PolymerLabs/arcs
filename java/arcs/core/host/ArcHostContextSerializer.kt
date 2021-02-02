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
package arcs.core.host

/** Serializes [ArcHostContext] to / from storage. */
interface ArcHostContextSerializer {
  /**
   * Deserializes [ArcHostContext] from persistent storage.
   *
   * Returns input context if nothing is found in storage.
   *
   * @param arcHostContext default context, must contain target arcId
   * @param arcHostId an identifier for an [ArcHost]
   */
  suspend fun readContextFromStorage(
    arcHostContext: ArcHostContext,
    arcHostId: String
  ): ArcHostContext

  /** Serializes [ArcHostContext] into storage asynchronously. */
  suspend fun writeContextToStorage(arcHostContext: ArcHostContext, arcHostId: String)

  /** Waits until all observed [ArcHostContext] serializations are flushed. */
  suspend fun drainSerializations()

  /** Cancels all pending concurrent jobs. */
  suspend fun cancel()
}
