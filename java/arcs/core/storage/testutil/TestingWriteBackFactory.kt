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

package arcs.core.storage.testutil

import arcs.core.storage.StoreWriteBack
import arcs.core.storage.WriteBack
import arcs.core.storage.WriteBackFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope

/**
 * A [WriteBackFactory] implementation for unit tests.
 *
 * By default, it will create [StoreWriteBack] instances using newly constructed
 * [TestCoroutineScope], but you can provide a different scope at construction time if desired.
 *
 * Using the [TestCoroutineScope] here helps us to avoid the issue where a test will fail with:
 *
 * E.g., runBlockingTest exception:
 * java.lang.IllegalStateException: This job has not completed yet
 * The workaround is configuring coroutine scope to [TestCoroutineScope]
 *
 * Reference:
 * https://medium.com/@eyalg/testing-androidx-room-kotlin-coroutines-2d1faa3e674f
 *
 * It also provides a way to wait for all currently created instances to become idle, which is
 * useful in tests.
 */
class TestingWriteBackFactory(
  val scope: CoroutineScope = TestCoroutineScope(TestCoroutineDispatcher())
) : WriteBackFactory {
  private var instances = emptyList<StoreWriteBack>()

  /** Await completion of the flush jobs of all created [WriteBack] instances. */
  suspend fun awaitAllIdle() = synchronized(instances) { instances }.forEach { it.awaitIdle() }

  override fun create(protocol: String, queueSize: Int, forceEnable: Boolean): WriteBack =
    StoreWriteBack(
      protocol,
      queueSize,
      forceEnable,
      scope
    ).also {
      synchronized(instances) {
        instances = instances + it
      }
    }
}
