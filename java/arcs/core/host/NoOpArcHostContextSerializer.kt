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

/** An [ArcHostContextSerializer] that neither serializes or interacts with storage. */
class NoOpArcHostContextSerializer : ArcHostContextSerializer {
  override suspend fun readContextFromStorage(
    arcHostContext: ArcHostContext,
    arcHostId: String
  ): ArcHostContext = arcHostContext

  override suspend fun writeContextToStorage(arcHostContext: ArcHostContext, arcHostId: String) =
    Unit

  override suspend fun drainSerializations() = Unit

  override suspend fun cancel() = Unit
}
