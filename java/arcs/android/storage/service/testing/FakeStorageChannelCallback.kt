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

package arcs.android.storage.service.testing

import arcs.android.storage.service.IStorageChannel
import arcs.android.storage.service.IStorageChannelCallback
import kotlinx.coroutines.CompletableDeferred

/**
 * Implementation of [IStorageChannelCallback] for testing. Records the channel that has been
 * created and provides a helper method for waiting for the `onCreate` method to be called.
 */
class FakeStorageChannelCallback : IStorageChannelCallback.Stub() {
  private val deferredChannel = CompletableDeferred<IStorageChannel>()

  override fun onCreate(channel: IStorageChannel) {
    deferredChannel.complete(channel)
  }

  suspend fun waitForOnCreate(): IStorageChannel {
    return deferredChannel.await()
  }
}
