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
package arcs.android.storage.service

import arcs.core.common.SuspendableLazy
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.StoreOptions
import arcs.core.storage.WriteBackProvider
import kotlinx.coroutines.CoroutineScope

/**
 * This class wraps an [ActiveStore] constructor. The first time an instance of this class is
 * invoked, the store instance is created.
 *
 * This allows us to create a [BindingContext] without blocking the thread that the bind call
 * occurs on.
 */
class DeferredStore<Data : CrdtData, Op : CrdtOperation, T>(
  options: StoreOptions,
  scope: CoroutineScope,
  driverFactory: DriverFactory,
  writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?
) {
  private val store = SuspendableLazy<ActiveStore<Data, Op, T>> {
    ActiveStore(options, scope, driverFactory, writeBackProvider, devToolsProxy)
  }

  suspend operator fun invoke() = store()
}
