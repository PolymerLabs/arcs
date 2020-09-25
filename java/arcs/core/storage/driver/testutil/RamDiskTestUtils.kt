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

@file:Suppress("EXPERIMENTAL_API_USAGE")

package arcs.core.storage.driver.testutil

import arcs.core.crdt.CrdtData
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.channels.sendBlocking
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/** Suspends until the [RamDisk] contains a value for the provided [storageKey]. */
suspend fun RamDisk.waitUntilSet(storageKey: StorageKey) = callbackFlow<Unit> {
  val listener: ((StorageKey, Any?) -> Unit) = listener@{ changedKey, data ->
    if (changedKey != storageKey || data == null) return@listener
    sendBlocking(Unit)
  }
  addListener(listener)

  val startValue = memory.get<CrdtData>(storageKey)
  if (startValue?.data != null) send(Unit)
  awaitClose { runBlocking { removeListener(listener) } }
}.first()
