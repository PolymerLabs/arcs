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

import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * A [DevToolsStorageManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class DevToolsStorageManager(
  /** The stores managed by StorageService. */
  val stores: ReferencedStores,
  val proxy: IDevToolsProxy
) : IDevToolsStorageManager.Stub() {

  override fun getStorageKeys() = stores.storageKeys().joinToString { it.toKeyString() }

  override fun getDevToolsProxy(): IDevToolsProxy {
    return proxy
  }
}
