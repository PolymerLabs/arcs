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
package arcs.jvm.host

import arcs.core.host.AbstractArcHost.HandleManagerProvider
import arcs.core.host.EntityHandleManager
import arcs.jvm.util.JvmTime
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

/**
 * Provides an [EntityHandleManager] for a JVM-based platform.
 */
class JvmHandleManagerProvider(
    coroutineContext: CoroutineContext = EmptyCoroutineContext
) : HandleManagerProvider {

    val schedulerProvider = JvmSchedulerProvider(coroutineContext)

    override fun invoke(arcId: String, hostId: String) = EntityHandleManager(
            arcId = arcId,
            hostId = hostId,
            time = JvmTime,
            scheduler = schedulerProvider.invoke(arcId)
        )
}
