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
import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope

/**
 * A [WriteBack] implementation for unit tests.
 *
 * Specifically it possesses the identical logic as [StoreWriteBack]s' but
 * adopts a special coroutine scope [TestCoroutineScope] which is required
 * for unit tests where no additional coroutine [Job]s are allowed active
 * after each [Test]. This is checked after each [Test] iteration and would
 * block the test itself till a timeout when there are pending/active [Job]s.
 *
 * E.g., runBlockingTest exception:
 * java.lang.IllegalStateException: This job has not completed yet
 * The workaround is configuring coroutine scope to [TestCoroutineScope]
 *
 * Reference:
 * https://medium.com/@eyalg/testing-androidx-room-kotlin-coroutines-2d1faa3e674f
 */
@ExperimentalCoroutinesApi
class WriteBackForTesting private constructor(
    protocol: String,
    queueSize: Int,
    forceEnable: Boolean
) : StoreWriteBack(
    protocol,
    queueSize,
    forceEnable,
    TestCoroutineScope(TestCoroutineDispatcher())
) {

    init { track(this) }

    companion object : WriteBackFactory {
        private var instances = CopyOnWriteArrayList<WriteBackForTesting>()

        /** Track [WriteBack] instances. */
        private fun track(instance: WriteBackForTesting) = instances.add(instance)

        /** Clear all created write-back instances after test iteration(s). */
        fun clear() = instances.clear()

        /** Await completion of the flush jobs of all created [WriteBack] instances. */
        fun awaitAllIdle() = runBlocking {
            for (instance in instances) instance.awaitIdle()
        }

        override fun create(protocol: String, queueSize: Int, forceEnable: Boolean): WriteBack =
            WriteBackForTesting(protocol, queueSize, forceEnable)
    }
}
