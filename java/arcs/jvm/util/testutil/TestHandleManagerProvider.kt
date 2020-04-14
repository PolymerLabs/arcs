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
package arcs.jvm.util.testutil

import arcs.core.host.AbstractArcHost.HandleManagerProvider
import arcs.core.host.EntityHandleManager
import arcs.jvm.host.JvmSchedulerProvider
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Provides an [EntityHandleManager] for a JVM-based platform.
 */
class TestHandleManagerProvider(
    coroutineContext: CoroutineContext = EmptyCoroutineContext
) : HandleManagerProvider {

    val schedulerProvider = JvmSchedulerProvider(coroutineContext)

    override fun invoke(arcId: String, hostId: String) = EntityHandleManager(
            arcId = arcId,
            hostId = hostId,
            time = FakeTime(),
            scheduler = schedulerProvider.invoke(arcId)
        )
}
