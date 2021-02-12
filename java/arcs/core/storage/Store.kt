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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time
import kotlinx.coroutines.CoroutineScope

/**
 * A constructor to create concrete [ActiveStore] for the provided [StoreOptions].
 * This object will create a [ReferenceModeStore] when invoked with [StoreOptions] where
 * [options.storageKey] is of type [ReferenceModeStorageKey], otherwise a [DirectStore] will
 * be created.
 */
@Suppress("UNCHECKED_CAST")
suspend fun <Data : CrdtData, Op : CrdtOperation, T> ActiveStore(
  options: StoreOptions,
  scope: CoroutineScope,
  driverFactory: DriverFactory,
  writeBackProvider: WriteBackProvider,
  devTools: DevToolsForStorage?,
  time: Time
): ActiveStore<Data, Op, T> = when (options.storageKey) {
  is ReferenceModeStorageKey ->
    ReferenceModeStore.create(
      options,
      scope,
      driverFactory,
      writeBackProvider,
      devTools,
      time
    ) as ActiveStore<Data, Op, T>
  else -> DirectStore.create(
    options,
    scope,
    driverFactory,
    writeBackProvider,
    devTools
  )
}
